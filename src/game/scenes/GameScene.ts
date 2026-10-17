import Phaser from 'phaser';
import { CHAMBER_BOUNDS, CSS_COLORS, DEPTH, FONT_UI, PALETTE, SCENE_KEYS } from '../config';
import { getLevel, hasLevel } from '../data/levels';
import type { Hint, Level } from '../data/levelTypes';
import { BeaconView } from '../art/BeaconView';
import { audio, type SfxName } from '../audio/AudioEngine';
import { CheckpointView } from '../art/CheckpointView';
import { EclipseEngineView } from '../art/EclipseEngineView';
import { EchoView } from '../art/EchoView';
import { createInteriorMask, drawChamber } from '../art/ChamberArt';
import { GateView, type GateCondition } from '../art/GateView';
import { KeeperView } from '../art/KeeperView';
import { PortalView } from '../art/PortalView';
import { RuneView } from '../art/RuneView';
import { ScannerView } from '../art/ScannerView';
import { ShadowView } from '../art/ShadowView';
import { CAPTURE, CAPTURE_CAPTIONS } from '../captureMode';
import { getProgress, setPreference, setProgress } from '../progressState';
import { echoAlpha } from '../systems/EchoSystem';
import { recordClear } from '../systems/Progress';
import { RoomSim, STARTING_HEARTS, type FrameInput, type SimEvent } from '../systems/RoomSim';
import { chargeFraction } from '../systems/RuneSystem';
import { scannerProximity } from '../systems/ScannerSystem';
import { computeStars } from '../systems/Scoring';
import { clampDelta } from '../systems/time';
import { HUD } from '../ui/HUD';
import { MemoryMeter } from '../ui/MemoryMeter';
import { flash, shake } from '../ui/feedback';
import { createPauseOverlay, showClearOverlay, showFailOverlay } from '../ui/Overlays';

type GameSceneData = { levelId?: number };

type MoveKeys = Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;

type Action = 'ignite' | 'echo' | 'restart' | 'pause' | 'mute' | 'confirm';
const ACTION_KEYS: Record<Action, string> = {
  ignite: 'E',
  echo: 'Q',
  restart: 'R',
  pause: 'ESC',
  mute: 'M',
  confirm: 'ENTER',
};

const KEY_HINTS = 'WASD MOVE   ·   E IGNITE   ·   R RETRY   ·   ESC PAUSE';
const KEY_HINTS_ECHO = 'WASD MOVE   ·   E IGNITE   ·   Q ECHO   ·   R RETRY   ·   ESC PAUSE';
const WIN_OVERLAY_DELAY_MS = 650;
const FAIL_RESTART_DELAY_MS = 1300;
/** How long the capture-mode caption stays before fading (seconds). */
const CAPTION_SECONDS = 6.7;

/** Which sound each simulation event plays; `won` is handled with the win sequence. */
const EVENT_SOUNDS: Partial<Record<SimEvent['type'], SfxName | ((e: SimEvent) => SfxName)>> = {
  ignited: (e) => (e.type === 'ignited' && !e.primary ? 'relay' : 'ignite'),
  runePowered: 'rune',
  runeReleased: 'runeOff',
  echoCreated: 'echo',
  echoDenied: 'deny',
  gateOpened: 'gateOpen',
  gateClosed: 'gateClose',
  hit: 'hit',
  respawned: 'respawn',
  checkpoint: 'checkpoint',
  failed: 'fail',
  won: 'win',
};

/** One chamber attempt. Game rules live in RoomSim; this scene reads input and renders. */
export class GameScene extends Phaser.Scene {
  private levelId = 1;
  private level!: Level;
  private sim!: RoomSim;
  private keys!: MoveKeys;
  /** Action keys pressed since the last update. */
  private readonly pressed = new Set<Action>();
  private hud!: HUD;
  private keeper!: KeeperView;
  private primary!: BeaconView;
  private relays: BeaconView[] = [];
  private gate!: GateView;
  private portal!: PortalView;
  private runes: RuneView[] = [];
  private keeperShadow!: ShadowView;
  private echoShadow!: ShadowView;
  private echo: EchoView | null = null;
  private memory: MemoryMeter | null = null;
  private scanners: ScannerView[] = [];
  /** The echo's shadow drawn again over scanner light, so shelter visibly blocks the fire. */
  private bandShade: ShadowView | null = null;
  private checkpoints: CheckpointView[] = [];
  private engine: EclipseEngineView | null = null;
  private finalClear: { clearTime: number; stars: number } | null = null;
  /** Danger flag last frame, so the warning beep fires on its rising edge. */
  private wasDanger = false;
  private darkness!: Phaser.GameObjects.Rectangle;
  private hints: { hint: Hint; text: Phaser.GameObjects.Text; gone: boolean }[] = [];
  private pauseOverlay!: Phaser.GameObjects.Container;
  private paused = false;
  /** The attempt is finished, won or failed; input is ignored except restart. */
  private over = false;
  private canContinue = false;

  constructor() {
    super(SCENE_KEYS.game);
  }

  init(data: GameSceneData): void {
    this.levelId = data.levelId ?? 1;
    this.paused = false;
    this.over = false;
    this.canContinue = false;
    this.relays = [];
    this.runes = [];
    this.hints = [];
    this.echo = null;
    this.memory = null;
    this.scanners = [];
    this.bandShade = null;
    this.checkpoints = [];
    this.engine = null;
    this.finalClear = null;
    this.wasDanger = false;
    this.pressed.clear();
  }

  create(): void {
    this.level = getLevel(this.levelId);
    this.sim = new RoomSim(this.level);
    this.cameras.main.setBackgroundColor(PALETTE.night);
    // The clock and tween manager outlive a restart, so undo a pause from the last attempt.
    this.time.paused = false;
    this.tweens.resumeAll();

    drawChamber(this, this.level);
    const mask = createInteriorMask(this);

    const b = CHAMBER_BOUNDS;
    this.darkness = this.add
      .rectangle(b.x, b.y, b.w, b.h, PALETTE.night, 0.5)
      .setOrigin(0)
      .setDepth(DEPTH.darkness);

    this.runes = this.level.runes.map((r) => new RuneView(this, r.position, r.mode));
    this.keeperShadow = new ShadowView(this, mask);
    // The echo's shadow has a cyan edge so players can tell whose shade is whose.
    this.echoShadow = new ShadowView(this, mask, PALETTE.night, PALETTE.cyan);
    this.scanners = this.level.scanners.map((sc) => new ScannerView(this, sc, mask));
    if (this.scanners.length > 0) {
      const laneShape = this.make.graphics({}, false);
      laneShape.fillStyle(0xffffff, 1);
      for (const view of this.scanners) view.addLaneTo(laneShape);
      this.bandShade = new ShadowView(this, laneShape.createGeometryMask(), PALETTE.night, PALETTE.cyan, {
        depth: DEPTH.scannerShade,
        nearAlpha: 0.85,
        farAlpha: 0.75,
      });
    }
    this.checkpoints = this.level.checkpoints.map((p) => new CheckpointView(this, p));
    this.primary = new BeaconView(this, this.level.primaryBeacon, true, mask);
    this.relays = this.level.relayBeacons.map((p) => new BeaconView(this, p, false, mask));
    this.gate = new GateView(this, this.level.gate);
    this.portal = new PortalView(this, this.level.goal);
    this.keeper = new KeeperView(this, this.level.spawn);

    this.hints = this.level.hints.map((hint) => {
      const text = this.add
        .text(hint.position.x, hint.position.y, hint.text, {
          fontFamily: FONT_UI,
          fontSize: '15px',
          color: hint.show === 'ignite' ? CSS_COLORS.ice : CSS_COLORS.muted,
        })
        .setOrigin(0.5)
        .setLetterSpacing(hint.show === 'ignite' ? 2 : 0)
        .setDepth(DEPTH.hint)
        .setAlpha(hint.show === 'start' && !CAPTURE ? 1 : 0);
      // In capture mode the shotlist caption owns the top of the screen first.
      if (hint.show === 'start' && CAPTURE) this.tweens.add({ targets: text, alpha: 1, delay: CAPTION_SECONDS * 1000, duration: 400 });
      return { hint, text, gone: false };
    });

    this.hud = new HUD(this, this.level.id, this.level.title, this.level.echo ? KEY_HINTS_ECHO : KEY_HINTS, this.level.runes.length);
    if (CAPTURE) this.showCaptureCaption();
    if (this.level.echo) this.memory = new MemoryMeter(this);
    this.hud.setHearts(STARTING_HEARTS, STARTING_HEARTS);
    this.hud.setMuted(getProgress().muted);
    this.refreshGateBadges();

    this.pauseOverlay = createPauseOverlay(this, () => this.setPaused(false));

    const keyboard = this.input.keyboard!;
    this.keys = keyboard.addKeys({
      up: 'UP',
      down: 'DOWN',
      left: 'LEFT',
      right: 'RIGHT',
      w: 'W',
      a: 'A',
      s: 'S',
      d: 'D',
    }) as MoveKeys;
    // Actions listen for keydown instead of polling JustDown: Phaser processes a
    // frame's key events together, so a tap shorter than one frame would be lost.
    for (const [action, key] of Object.entries(ACTION_KEYS) as [Action, string][]) {
      keyboard.on(`keydown-${key}`, (event: KeyboardEvent) => {
        if (!event.repeat) this.pressed.add(action);
      });
    }

    // Losing focus pauses so nothing can hurt the keeper while the player is away (GDD §10).
    this.game.events.on(Phaser.Core.Events.BLUR, this.autoPause, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.autoPause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.autoPause, this);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.autoPause, this);
    });

    audio.startAmbience('chamber');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      audio.setCrackle(0);
      audio.setScannerProximity(0);
      audio.setPaused(false);
    });

    this.cameras.main.fadeIn(220, 5, 8, 15);
  }

  override update(time: number, delta: number): void {
    const k = this.keys;
    // Consume every press each frame so one made in one state never leaks into the next.
    const pressed = new Set(this.pressed);
    this.pressed.clear();
    const dt = clampDelta(delta);

    if (pressed.has('mute')) this.toggleMute();
    if (pressed.has('restart')) {
      this.scene.restart({ levelId: this.levelId });
      return;
    }

    if (this.over) {
      this.portal.update(dt);
      this.engine?.update(dt);
      if (this.canContinue && pressed.has('confirm')) this.continueAfterWin();
      else if (this.canContinue && pressed.has('pause')) this.scene.start(SCENE_KEYS.levelSelect, { focus: this.levelId });
      return;
    }

    if (pressed.has('pause')) this.setPaused(!this.paused);
    if (this.paused) return;

    const input: FrameInput = {
      up: k.up.isDown || k.w.isDown,
      down: k.down.isDown || k.s.isDown,
      left: k.left.isDown || k.a.isDown,
      right: k.right.isDown || k.d.isDown,
      ignite: pressed.has('ignite'),
      echo: pressed.has('echo'),
    };
    for (const event of this.sim.step(dt, input)) this.handleEvent(event);

    const s = this.sim.state;
    this.keeper.sync(s.keeper, s.facing, s.danger, s.invulnerable, time);
    this.scanners.forEach((view, i) => view.update(s.scanners[i]!, s.time, time));
    this.keeperShadow.update(s.keeperShadow);
    this.echoShadow.update(s.echoShadow);
    this.bandShade?.update(s.echoShadow);
    if (this.echo && s.echo && s.echoPos) this.echo.update(s.echoPos, echoAlpha(s.echo.t), s.echo.loops);
    this.memory?.update(s.memory, s.echoReady, s.echo ? s.echo.t : null);
    this.runes.forEach((view, i) => {
      const rune = s.runes[i]!;
      view.setCharge(chargeFraction(rune), rune.phase);
    });
    const ignitable = this.sim.ignitableIndex();
    this.primary.setInRange(ignitable === 0);
    this.relays.forEach((relay, i) => relay.setInRange(ignitable === i + 1));
    this.primary.update(time);
    this.engine?.update(dt);
    for (const relay of this.relays) relay.update(time);
    this.portal.update(dt);
    this.hud.setTime(s.elapsed);
    this.hud.setObjectives(s);

    audio.setWarmth(s.primaryLit ? 1 : 0);
    audio.setCrackle((s.primaryLit ? 1 : 0) + s.relaysLit.filter(Boolean).length);
    audio.setScannerProximity(scannerProximity(this.level.scanners, s.scanners, s.keeper));
    if (s.danger && !this.wasDanger) audio.sfx('danger');
    this.wasDanger = s.danger;
  }

  private handleEvent(event: SimEvent): void {
    const sound = EVENT_SOUNDS[event.type];
    if (sound) audio.sfx(typeof sound === 'function' ? sound(event) : sound);
    switch (event.type) {
      case 'ignited': {
        const view = event.primary ? this.primary : this.relays[event.relayIndex];
        view?.ignite();
        shake(this, 80, 0.003);
        if (this.level.finale) {
          if (event.primary) this.engine = new EclipseEngineView(this, this.level.primaryBeacon);
          this.engine?.setPower(this.sim.state.relaysLit.filter(Boolean).length);
        }
        if (event.primary) {
          this.tweens.add({ targets: this.darkness, alpha: 0, duration: 600, ease: 'Sine.easeOut' });
          this.dismissHints('ignite');
          this.revealHints('ignite');
        }
        if (this.sim.state.relaysLit.every(Boolean)) this.dismissHints('relays');
        this.refreshGateBadges();
        break;
      }
      case 'echoCreated':
        this.echo?.retire();
        this.echo = new EchoView(this, this.sim.state.echoPos ?? this.sim.state.keeper);
        this.dismissHints('echo');
        this.revealHints('echo');
        break;
      case 'hit':
        this.keeper.hit();
        shake(this, 120, 0.006);
        flash(this, 120, 246, 91, 62);
        this.hud.setHearts(event.hearts, STARTING_HEARTS);
        break;
      case 'respawned':
        break;
      case 'checkpoint':
        this.checkpoints[event.index]?.reach();
        break;
      case 'failed':
        this.onFailed();
        break;
      case 'echoDenied':
        this.memory?.deny();
        break;
      case 'runePowered':
        this.runes[event.index]?.powerUp();
        if (this.sim.state.runesPowered.every(Boolean)) this.dismissHints('runes');
        this.refreshGateBadges();
        break;
      case 'runeReleased':
        this.runes[event.index]?.powerDown();
        this.refreshGateBadges();
        break;
      case 'gateOpened':
        this.gate.setOpen(true);
        this.portal.setActive(true);
        break;
      case 'gateClosed':
        this.gate.setOpen(false);
        this.portal.setActive(false);
        break;
      case 'won':
        this.onWon(event.clearTime, event.hits);
        break;
    }
  }

  /** Trailer capture: the shotlist caption fades in over the top of the chamber, then away. */
  private showCaptureCaption(): void {
    const caption = CAPTURE_CAPTIONS[this.level.id];
    if (!caption) return;
    const band = this.add.rectangle(CHAMBER_BOUNDS.x + CHAMBER_BOUNDS.w / 2, 78, CHAMBER_BOUNDS.w, 52, PALETTE.night, 0.72);
    const text = this.add
      .text(band.x, band.y, caption, { fontFamily: FONT_UI, fontSize: '24px', fontStyle: 'bold', color: CSS_COLORS.text })
      .setOrigin(0.5)
      .setLetterSpacing(2);
    const group = [band, text];
    for (const o of group) o.setDepth(DEPTH.overlay - 1).setAlpha(0);
    this.tweens.add({ targets: group, alpha: 1, delay: 300, duration: 500 });
    this.tweens.add({
      targets: group,
      alpha: 0,
      delay: (CAPTION_SECONDS - 0.7) * 1000,
      duration: 700,
      onComplete: () => group.forEach((o) => o.destroy()),
    });
  }

  /** True once the event that removes this hint has already happened. */
  private hintSatisfied(hint: Hint): boolean {
    const s = this.sim.state;
    if (hint.hide === 'ignite') return s.primaryLit;
    if (hint.hide === 'relays') return s.relaysLit.every(Boolean);
    if (hint.hide === 'runes') return s.runesPowered.every(Boolean);
    if (hint.hide === 'echo') return s.echo !== null;
    return false;
  }

  /** Fades in every hint that appears on `show`, unless it is already satisfied. */
  private revealHints(show: Hint['show']): void {
    for (const h of this.hints) {
      if (h.hint.show === show && !h.gone && !this.hintSatisfied(h.hint)) {
        this.tweens.add({ targets: h.text, alpha: 1, delay: 400, duration: 400 });
      }
    }
  }

  private onFailed(): void {
    this.over = true;
    showFailOverlay(this);
    this.time.delayedCall(FAIL_RESTART_DELAY_MS, () => this.scene.restart({ levelId: this.levelId }));
  }

  /** Fades out and removes every hint with the given trigger, once. */
  private dismissHints(hide: Hint['hide']): void {
    for (const h of this.hints) {
      if (h.hint.hide !== hide || h.gone) continue;
      h.gone = true;
      this.tweens.killTweensOf(h.text);
      this.tweens.add({ targets: h.text, alpha: 0, duration: 300, onComplete: () => h.text.destroy() });
    }
  }

  private refreshGateBadges(): void {
    const s = this.sim.state;
    const conditions: GateCondition[] = [
      { kind: 'flame', met: s.primaryLit },
      ...s.relaysLit.map((met): GateCondition => ({ kind: 'relay', met })),
      ...s.runesPowered.map((met): GateCondition => ({ kind: 'rune', met })),
    ];
    this.gate.setConditions(conditions);
  }

  private onWon(clearTime: number, hits: number): void {
    this.over = true;
    this.hud.setTime(clearTime);
    this.portal.burst();
    shake(this, 120, 0.004);
    this.tweens.add({
      targets: this.keeper.container,
      x: this.level.goal.x,
      y: this.level.goal.y,
      scale: 0,
      angle: 360,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.easeIn',
    });
    const stars = computeStars(clearTime, hits, this.level.parTime);
    const result = recordClear(getProgress(), this.levelId, clearTime, stars);
    setProgress(result.progress);
    const record = result.progress.best[this.levelId]!;
    if (this.level.finale) this.finalClear = { clearTime, stars };
    const label = this.level.finale ? 'SUNRISE' : hasLevel(this.levelId + 1) ? 'NEXT CHAMBER' : 'CHAMBERS';
    this.time.delayedCall(WIN_OVERLAY_DELAY_MS, () => {
      showClearOverlay(this, {
        title: this.level.title,
        clearTime,
        parTime: this.level.parTime,
        stars,
        hits,
        bestTime: record.bestTime,
        bestStars: record.bestStars,
        newBestTime: result.newBestTime,
        newBestStars: result.newBestStars,
        continueLabel: label,
      });
      this.canContinue = true;
    });
  }

  private continueAfterWin(): void {
    if (this.finalClear) {
      this.scene.start(SCENE_KEYS.ending, this.finalClear);
      return;
    }
    const next = this.levelId + 1;
    if (hasLevel(next)) this.scene.start(SCENE_KEYS.game, { levelId: next });
    else this.scene.start(SCENE_KEYS.levelSelect, { focus: this.levelId });
  }

  private autoPause(): void {
    if (!this.over) this.setPaused(true);
  }

  private setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    this.pauseOverlay.setVisible(paused);
    this.time.paused = paused;
    audio.setPaused(paused);
    if (paused) this.tweens.pauseAll();
    else {
      this.tweens.resumeAll();
      // Drop keys held or pressed while paused so nothing fires on resume.
      this.input.keyboard?.resetKeys();
    }
  }

  private toggleMute(): void {
    const muted = !getProgress().muted;
    audio.setMuted(muted);
    this.hud.setMuted(muted);
    setPreference({ muted });
  }
}
