import Phaser from 'phaser';
import { CHAMBER_BOUNDS, CSS_COLORS, DEPTH, FONT_UI, PALETTE, SCENE_KEYS } from '../config';
import { getLevel, hasLevel } from '../data/levels';
import type { Hint, Level } from '../data/levelTypes';
import { BeaconView } from '../art/BeaconView';
import { createInteriorMask, drawChamber } from '../art/ChamberArt';
import { GateView, type GateCondition } from '../art/GateView';
import { KeeperView } from '../art/KeeperView';
import { PortalView } from '../art/PortalView';
import { RuneView } from '../art/RuneView';
import { ShadowView } from '../art/ShadowView';
import { RoomSim, STARTING_HEARTS, type FrameInput, type SimEvent } from '../systems/RoomSim';
import { chargeFraction } from '../systems/RuneSystem';
import { computeStars } from '../systems/Scoring';
import { clampDelta } from '../systems/time';
import { HUD } from '../ui/HUD';
import { createPauseOverlay, showClearOverlay } from '../ui/Overlays';

type GameSceneData = { levelId?: number };

type MoveKeys = Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;

type Action = 'ignite' | 'restart' | 'pause' | 'mute' | 'confirm';
const ACTION_KEYS: Record<Action, string> = {
  ignite: 'E',
  restart: 'R',
  pause: 'ESC',
  mute: 'M',
  confirm: 'ENTER',
};

const KEY_HINTS = 'WASD MOVE   ·   E IGNITE   ·   R RETRY   ·   ESC PAUSE';
const WIN_OVERLAY_DELAY_MS = 650;

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
  private darkness!: Phaser.GameObjects.Rectangle;
  private hints: { hint: Hint; text: Phaser.GameObjects.Text; gone: boolean }[] = [];
  private pauseOverlay!: Phaser.GameObjects.Container;
  private paused = false;
  private won = false;
  private canContinue = false;

  constructor() {
    super(SCENE_KEYS.game);
  }

  init(data: GameSceneData): void {
    this.levelId = data.levelId ?? 1;
    this.paused = false;
    this.won = false;
    this.canContinue = false;
    this.relays = [];
    this.runes = [];
    this.hints = [];
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

    this.runes = this.level.runes.map((r) => new RuneView(this, r.position));
    this.keeperShadow = new ShadowView(this, mask);
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
          color: hint.show === 'afterIgnite' ? CSS_COLORS.ice : CSS_COLORS.muted,
        })
        .setOrigin(0.5)
        .setLetterSpacing(hint.show === 'afterIgnite' ? 2 : 0)
        .setDepth(DEPTH.hint)
        .setAlpha(hint.show === 'beforeIgnite' ? 1 : 0);
      return { hint, text, gone: false };
    });

    this.hud = new HUD(this, this.level.id, this.level.title, KEY_HINTS);
    this.hud.setHearts(STARTING_HEARTS, STARTING_HEARTS);
    this.hud.setMuted(this.sound.mute);
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

    if (this.won) {
      this.portal.update(dt);
      if (pressed.has('confirm') && this.canContinue) this.continueAfterWin();
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
    };
    for (const event of this.sim.step(dt, input)) this.handleEvent(event);

    const s = this.sim.state;
    this.keeper.sync(s.keeper, s.facing);
    this.keeperShadow.update(s.keeperShadow);
    this.runes.forEach((view, i) => {
      const rune = s.runes[i]!;
      view.setCharge(chargeFraction(rune), rune.phase);
    });
    const ignitable = this.sim.ignitableIndex();
    this.primary.setInRange(ignitable === 0);
    this.relays.forEach((relay, i) => relay.setInRange(ignitable === i + 1));
    this.primary.update(time);
    for (const relay of this.relays) relay.update(time);
    this.portal.update(dt);
    this.hud.setTime(s.elapsed);
  }

  private handleEvent(event: SimEvent): void {
    switch (event.type) {
      case 'ignited': {
        const view = event.primary ? this.primary : this.relays[event.relayIndex];
        view?.ignite();
        this.cameras.main.shake(80, 0.003);
        if (event.primary) {
          this.tweens.add({ targets: this.darkness, alpha: 0, duration: 600, ease: 'Sine.easeOut' });
          this.dismissHints('beforeIgnite');
          if (!this.sim.state.runesPowered.every(Boolean)) {
            for (const h of this.hints) {
              if (h.hint.show === 'afterIgnite' && !h.gone) {
                this.tweens.add({ targets: h.text, alpha: 1, delay: 400, duration: 400 });
              }
            }
          }
        }
        this.refreshGateBadges();
        break;
      }
      case 'runePowered':
        this.runes[event.index]?.powerUp();
        if (this.sim.state.runesPowered.every(Boolean)) this.dismissHints('afterIgnite');
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

  /** Fades out and removes every hint of the given kind, once. */
  private dismissHints(show: Hint['show']): void {
    for (const h of this.hints) {
      if (h.hint.show !== show || h.gone) continue;
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
    this.won = true;
    this.hud.setTime(clearTime);
    this.portal.burst();
    this.cameras.main.shake(120, 0.004);
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
    const label = hasLevel(this.levelId + 1) ? 'NEXT CHAMBER' : 'TITLE';
    this.time.delayedCall(WIN_OVERLAY_DELAY_MS, () => {
      showClearOverlay(this, this.level.title, clearTime, this.level.parTime, stars, label);
      this.canContinue = true;
    });
  }

  private continueAfterWin(): void {
    const next = this.levelId + 1;
    if (hasLevel(next)) this.scene.start(SCENE_KEYS.game, { levelId: next });
    else this.scene.start(SCENE_KEYS.title);
  }

  private autoPause(): void {
    if (!this.won) this.setPaused(true);
  }

  private setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    this.pauseOverlay.setVisible(paused);
    this.time.paused = paused;
    if (paused) this.tweens.pauseAll();
    else {
      this.tweens.resumeAll();
      // Drop keys held or pressed while paused so nothing fires on resume.
      this.input.keyboard?.resetKeys();
    }
  }

  private toggleMute(): void {
    this.sound.mute = !this.sound.mute;
    this.hud.setMuted(this.sound.mute);
  }
}
