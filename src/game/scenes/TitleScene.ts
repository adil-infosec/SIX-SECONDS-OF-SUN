import Phaser from 'phaser';
import { CSS_COLORS, FONT_MONO, FONT_UI, GAME_HEIGHT, GAME_WIDTH, PALETTE, SCENE_KEYS, TOTAL_CHAMBERS, VERSION } from '../config';
import { glowKey } from '../art/ProceduralTextures';
import { audio } from '../audio/AudioEngine';
import { CAPTURE } from '../captureMode';
import { getLevel } from '../data/levels';
import { getProgress, setPreference } from '../progressState';
import { addLogo } from '../ui/Logo';
import { addCornerMeta, addKeyHints, addMenuBackdrop, drawGlassPanel, GlassButton, IconButton } from '../ui/MenuStyle';

const CENTER_X = GAME_WIDTH / 2;
const LOGO_Y = 112;
const TITLE_Y = 242;
const TITLE = 'SIX SECONDS OF SUN';

type MenuItem = { label: string; detail: string; run: () => void };

/**
 * Title and main menu, after the title-screen design: the game logo over the
 * observatory backdrop, then PLAY (next open chamber), LEVEL SELECT and HOW
 * TO PLAY, with sound and settings buttons in the top corner. Arrows / W S
 * choose, Enter or Space confirms, M toggles sound, the mouse hovers and
 * clicks. If the logo image is missing, a drawn wordmark stands in for it.
 */
export class TitleScene extends Phaser.Scene {
  private buttons: GlassButton[] = [];
  private selected = 0;
  private panel?: Phaser.GameObjects.Container;
  private leaving = false;
  private soundButton?: IconButton;
  /** The settings panel's rows while it is open: [sound, screen shake]. */
  private settingsRows: GlassButton[] = [];

  constructor() {
    super(SCENE_KEYS.title);
  }

  init(): void {
    this.buttons = [];
    this.panel = undefined;
    this.leaving = false;
    this.settingsRows = [];
  }

  create(): void {
    addMenuBackdrop(this);
    const logoHeight = addLogo(this, CENTER_X, 30, 560);
    if (logoHeight > 0) this.drawTagline(30 + logoHeight + 14);
    else {
      this.drawEclipseLogo();
      this.drawTitle();
    }

    const progress = getProgress();
    const next = CAPTURE ? 1 : Math.min(TOTAL_CHAMBERS, progress.unlocked);
    const cleared = Object.keys(progress.best).length;
    addCornerMeta(this, {
      status: 'OBSERVATORY ONLINE',
      left: `CHAMBER ${String(next).padStart(2, '0')} · ${getLevel(next).title.toUpperCase()}`,
      right: `SIX SECONDS OF SUN · v${VERSION}`,
    });
    this.soundButton = new IconButton(this, GAME_WIDTH - 72, 30, progress.muted ? 'mute' : 'sound', () => this.toggleMute());
    new IconButton(this, GAME_WIDTH - 30, 30, 'gear', () => !this.panel && !this.leaving && this.openSettings());
    const items: MenuItem[] = [
      { label: 'PLAY', detail: `CH ${String(next).padStart(2, '0')}`, run: () => this.leave(SCENE_KEYS.game, { levelId: next }) },
      { label: 'LEVEL SELECT', detail: `${cleared}/${TOTAL_CHAMBERS}`, run: () => this.leave(SCENE_KEYS.levelSelect) },
      { label: 'HOW TO PLAY', detail: '?', run: () => this.openHelp() },
    ];
    // PLAY leads, wider and taller, like the design.
    const layout = [
      { y: 370, w: 420, h: 50 },
      { y: 425, w: 384, h: 42 },
      { y: 473, w: 384, h: 42 },
    ];
    this.buttons = items.map(
      (item, i) =>
        new GlassButton(this, CENTER_X, layout[i]!.y, layout[i]!.w, layout[i]!.h, item.label, item.detail, {
          hover: () => !this.panel && this.select(i),
          press: () => {
            if (this.panel || this.leaving) return;
            this.select(i);
            this.confirm(items);
          },
        }),
    );
    // Capture takes start on the chamber list, as the recording guide describes.
    this.select(CAPTURE ? 1 : 0, false);

    addKeyHints(this, CENTER_X, GAME_HEIGHT - 31, [
      ['↑ ↓', 'CHOOSE'],
      ['ENTER', 'CONFIRM'],
      ['ESC', 'BACK'],
    ]);

    const kb = this.input.keyboard!;
    const move = (d: number) => {
      if (this.panel || this.leaving) return;
      this.select(Phaser.Math.Wrap(this.selected + d, 0, this.buttons.length));
    };
    kb.on('keydown-UP', () => move(-1));
    kb.on('keydown-W', () => move(-1));
    kb.on('keydown-DOWN', () => move(1));
    kb.on('keydown-S', () => move(1));
    // Ignore key repeat so a held Enter from the ending cannot jump straight into a chamber.
    const confirm = (e: KeyboardEvent) => {
      if (e.repeat || this.leaving) return;
      if (this.panel) this.closePanel();
      else this.confirm(items);
    };
    kb.on('keydown-ENTER', confirm);
    kb.on('keydown-SPACE', confirm);
    kb.on('keydown-ESC', (e: KeyboardEvent) => !e.repeat && this.panel && this.closePanel());
    kb.on('keydown-M', () => this.toggleMute());
    kb.on('keydown-V', () => this.settingsRows.length > 0 && this.toggleShake());

    audio.startAmbience('title');
    this.cameras.main.fadeIn(300, 5, 8, 15);
  }

  private toggleMute(): void {
    const muted = !getProgress().muted;
    audio.setMuted(muted);
    setPreference({ muted });
    this.soundButton?.setIcon(muted ? 'mute' : 'sound');
    this.refreshSettings();
  }

  private toggleShake(): void {
    setPreference({ reducedShake: !getProgress().reducedShake });
    this.refreshSettings();
  }

  /** Under the logo: FIRE ✦ SHADOW ✦ TIME in cyan with amber stars. */
  private drawTagline(y: number): void {
    const words = ['FIRE', 'SHADOW', 'TIME'];
    const parts: Phaser.GameObjects.Text[] = [];
    let x = 0;
    words.forEach((word, i) => {
      const w = this.add.text(x, 0, word, { fontFamily: FONT_UI, fontSize: '14px', fontStyle: 'bold', color: CSS_COLORS.cyan }).setOrigin(0, 0.5).setLetterSpacing(8);
      x += w.width + 18;
      parts.push(w);
      if (i < words.length - 1) {
        const star = this.add.text(x, 0, '✦', { fontFamily: FONT_UI, fontSize: '13px', color: CSS_COLORS.amber }).setOrigin(0, 0.5);
        x += star.width + 18;
        parts.push(star);
      }
    });
    this.add.container(CENTER_X - (x - 18) / 2, y, parts);
  }

  private select(index: number, sound = true): void {
    if (sound && index !== this.selected) audio.sfx('uiMove');
    this.selected = index;
    this.buttons.forEach((b, i) => b.setSelected(i === index));
  }

  private confirm(items: MenuItem[]): void {
    audio.sfx('uiConfirm');
    items[this.selected]!.run();
  }

  private leave(key: string, data?: object): void {
    if (this.leaving) return;
    this.leaving = true;
    const cam = this.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key, data));
    cam.fadeOut(220, 5, 8, 15);
  }

  /** Gold sun with a dark moon over it, light rays and a turning clock ring, all breathing. */
  private drawEclipseLogo(): void {
    const aura = this.add.image(CENTER_X, LOGO_Y, glowKey('amber')).setScale(1.25).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: aura, scale: 1.45, alpha: 0.7, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const rays = this.add.graphics({ x: CENTER_X, y: LOGO_Y }).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const spread = i % 2 === 0 ? 0.06 : 0.035;
      const reach = i % 2 === 0 ? 150 : 118;
      rays.fillStyle(PALETTE.gold, i % 2 === 0 ? 0.07 : 0.045);
      rays.fillTriangle(
        Math.cos(a - spread) * 56,
        Math.sin(a - spread) * 56,
        Math.cos(a + spread) * 56,
        Math.sin(a + spread) * 56,
        Math.cos(a) * reach,
        Math.sin(a) * reach,
      );
    }
    this.tweens.add({ targets: rays, angle: 360, duration: 90_000, repeat: -1 });

    const sun = this.add.graphics({ x: CENTER_X, y: LOGO_Y });
    sun.fillStyle(PALETTE.amber, 0.35);
    sun.fillCircle(0, 0, 54);
    sun.fillStyle(PALETTE.gold, 1);
    sun.fillCircle(0, 0, 48);
    sun.fillStyle(PALETTE.night, 1);
    sun.fillCircle(13, -8, 45);

    const ring = this.add.graphics({ x: CENTER_X, y: LOGO_Y });
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const major = i % 5 === 0;
      const inner = major ? 64 : 69;
      const outer = 75;
      ring.lineStyle(major ? 2.5 : 1.2, major ? PALETTE.cyan : PALETTE.muted, major ? 0.9 : 0.45);
      ring.lineBetween(Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    ring.lineStyle(1, PALETTE.ice, 0.18);
    ring.strokeCircle(0, 0, 82);
    this.tweens.add({ targets: ring, angle: 360, duration: 75_000, repeat: -1 });
  }

  /**
   * The wordmark in layers, back to front: a wide breathing aura, a cyan
   * "echo" copy that drifts behind like a six-second ghost, a blurred amber
   * glow copy, and the gold gradient face. Then the kicker and tagline rule.
   */
  private drawTitle(): void {
    const style = { fontFamily: FONT_UI, fontSize: '52px', fontStyle: 'bold' } as const;
    const spacing = 8;

    const aura = this.add
      .image(CENTER_X, TITLE_Y, glowKey('amber'))
      .setDisplaySize(820, 150)
      .setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: aura, alpha: 0.4, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const echoAura = this.add.image(CENTER_X - 30, TITLE_Y + 4, glowKey('ice')).setDisplaySize(620, 90).setAlpha(0.08).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: echoAura, x: CENTER_X + 30, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const echo = this.add
      .text(CENTER_X - 5, TITLE_Y + 3, TITLE, { ...style, color: CSS_COLORS.cyan })
      .setOrigin(0.5)
      .setLetterSpacing(spacing)
      .setAlpha(0.3)
      .setShadow(0, 0, CSS_COLORS.cyan, 12, false, true);
    this.tweens.add({ targets: echo, x: CENTER_X + 5, alpha: 0.16, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const glow = this.add
      .text(CENTER_X, TITLE_Y, TITLE, { ...style, color: CSS_COLORS.amber })
      .setOrigin(0.5)
      .setLetterSpacing(spacing)
      .setShadow(0, 0, CSS_COLORS.amber, 26, false, true)
      .setAlpha(0.75);
    this.tweens.add({ targets: glow, alpha: 0.45, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const face = this.add
      .text(CENTER_X, TITLE_Y, TITLE, { ...style, color: CSS_COLORS.gold, stroke: '#2A1606', strokeThickness: 2 })
      .setOrigin(0.5)
      .setLetterSpacing(spacing);
    const fill = face.context.createLinearGradient(0, 0, 0, face.height);
    fill.addColorStop(0.15, '#FFF6DC');
    fill.addColorStop(0.55, CSS_COLORS.gold);
    fill.addColorStop(0.95, CSS_COLORS.amber);
    face.setFill(fill);

    this.add
      .text(CENTER_X, TITLE_Y - 44, 'FIRE  ·  SHADOW  ·  TIME', { fontFamily: FONT_MONO, fontSize: '12px', color: CSS_COLORS.cyan })
      .setOrigin(0.5)
      .setLetterSpacing(6)
      .setAlpha(0.85);

    const tagline = this.add
      .text(CENTER_X, TITLE_Y + 48, 'Light the fire. Shape the shadow. Borrow six seconds.', {
        fontFamily: FONT_UI,
        fontSize: '15px',
        fontStyle: 'italic',
        color: CSS_COLORS.muted,
      })
      .setOrigin(0.5);
    const rule = this.add.graphics();
    const half = tagline.width / 2 + 18;
    for (const side of [-1, 1]) {
      const from = CENTER_X + side * half;
      const to = CENTER_X + side * (half + 120);
      rule.lineStyle(1, PALETTE.gold, 0.35);
      rule.lineBetween(from, TITLE_Y + 48, to, TITLE_Y + 48);
      rule.fillStyle(PALETTE.gold, 0.8);
      rule.fillPoints(diamond(from - side * 6, TITLE_Y + 48, 3.5), true);
    }
  }

  // ---- HOW TO PLAY panel ----

  private openHelp(): void {
    if (this.panel) return;
    const cx = CENTER_X;
    const w = 680;
    const h = 384;
    const top = (GAME_HEIGHT - h) / 2 - 6;

    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.night, 0.86).setOrigin(0).setInteractive();
    shade.on('pointerdown', () => this.closePanel());
    const panel = this.add.graphics();
    drawGlassPanel(panel, cx - w / 2, top, w, h, 18, { border: 0x3a4b6e, borderAlpha: 1, fillAlpha: 0.97 });

    const parts: Phaser.GameObjects.GameObject[] = [shade, panel];
    parts.push(
      this.add
        .text(cx, top + 34, 'HOW TO PLAY', { fontFamily: FONT_UI, fontSize: '22px', fontStyle: 'bold', color: CSS_COLORS.gold })
        .setOrigin(0.5)
        .setLetterSpacing(6)
        .setShadow(0, 0, CSS_COLORS.amber, 12, false, true),
    );

    const pillars: [string, string, string, (g: Phaser.GameObjects.Graphics, x: number, y: number) => void][] = [
      ['FIRE', CSS_COLORS.amber, 'Press E at a brazier to light it. Light makes shadows.', drawFlameIcon],
      ['SHADOW', CSS_COLORS.gold, 'Stand between the flame and a rune. Your shadow powers it.', drawShadowIcon],
      ['TIME', CSS_COLORS.cyan, 'Press Q to replay your last six seconds. Your echo casts a shadow too.', drawClockIcon],
    ];
    pillars.forEach(([name, color, body, icon], i) => {
      const x = cx + (i - 1) * 216;
      const g = this.add.graphics();
      icon(g, x, top + 96);
      parts.push(
        g,
        this.add.text(x, top + 138, name, { fontFamily: FONT_UI, fontSize: '15px', fontStyle: 'bold', color }).setOrigin(0.5).setLetterSpacing(5),
        this.add
          .text(x, top + 158, body, { fontFamily: FONT_UI, fontSize: '13px', color: CSS_COLORS.muted, align: 'center', wordWrap: { width: 186 } })
          .setOrigin(0.5, 0)
          .setLineSpacing(3),
      );
    });

    const divider = this.add.graphics();
    divider.lineStyle(1, PALETTE.ice, 0.18);
    divider.lineBetween(cx - w / 2 + 40, top + 236, cx + w / 2 - 40, top + 236);
    parts.push(divider);

    const controls: [string, string][] = [
      ['WASD', 'MOVE (OR ARROWS)'],
      ['E', 'IGNITE'],
      ['Q', 'ECHO'],
      ['R', 'RETRY'],
      ['ESC', 'PAUSE'],
      ['M', 'SOUND'],
    ];
    controls.forEach(([key, action], i) => {
      const x = cx + ((i % 3) - 1) * 216;
      const y = top + 270 + Math.floor(i / 3) * 40;
      const cap = this.add.text(0, 0, key, { fontFamily: FONT_MONO, fontSize: '13px', fontStyle: 'bold', color: CSS_COLORS.text }).setOrigin(0.5);
      const capW = Math.max(30, cap.width + 16);
      const label = this.add.text(0, 0, action, { fontFamily: FONT_UI, fontSize: '12px', color: CSS_COLORS.muted }).setOrigin(0, 0.5).setLetterSpacing(2);
      const left = x - (capW + 10 + label.width) / 2;
      const capBox = this.add.graphics();
      drawGlassPanel(capBox, left, y - 13, capW, 26, 6, { border: PALETTE.ice, borderAlpha: 0.45, fillAlpha: 0.8 });
      cap.setPosition(left + capW / 2, y);
      label.setPosition(left + capW + 10, y);
      parts.push(capBox, cap, label);
    });

    parts.push(
      addKeyHints(this, cx, top + h - 22, [
        ['ENTER', 'CLOSE'],
        ['ESC', 'BACK'],
      ]),
    );

    const help = this.add.container(0, 0, parts).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: help, alpha: 1, duration: 180, ease: 'Quad.easeOut' });
    this.panel = help;
  }

  /** Settings: sound and screen shake, each a row you click (or press M / V) to switch. */
  private openSettings(): void {
    const cx = CENTER_X;
    const w = 460;
    const h = 250;
    const top = (GAME_HEIGHT - h) / 2;
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.night, 0.86).setOrigin(0).setInteractive();
    shade.on('pointerdown', () => this.closePanel());
    const panel = this.add.graphics();
    drawGlassPanel(panel, cx - w / 2, top, w, h, 18, { border: 0x3a4b6e, borderAlpha: 1, fillAlpha: 0.97 });
    const heading = this.add
      .text(cx, top + 34, 'SETTINGS', { fontFamily: FONT_UI, fontSize: '22px', fontStyle: 'bold', color: CSS_COLORS.gold })
      .setOrigin(0.5)
      .setLetterSpacing(6)
      .setShadow(0, 0, CSS_COLORS.amber, 12, false, true);
    const rows = [
      { label: 'SOUND', run: () => this.toggleMute() },
      { label: 'SCREEN SHAKE', run: () => this.toggleShake() },
    ];
    this.settingsRows = rows.map((row, i) => {
      const button = new GlassButton(this, cx, top + 96 + i * 56, 360, 42, row.label, '', {
        hover: () => this.settingsRows.forEach((b, j) => b.setSelected(i === j)),
        press: () => {
          audio.sfx('uiMove');
          row.run();
        },
      });
      return button;
    });
    this.refreshSettings();
    const hints = addKeyHints(this, cx, top + h - 26, [
      ['M', 'SOUND'],
      ['V', 'SHAKE'],
      ['ESC', 'CLOSE'],
    ]);
    const container = this.add.container(0, 0, [shade, panel, heading, ...this.settingsRows.map((b) => b.root), hints]).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: container, alpha: 1, duration: 180, ease: 'Quad.easeOut' });
    this.panel = container;
  }

  /** Shows ON / OFF on the open settings rows. */
  private refreshSettings(): void {
    const [sound, shake] = this.settingsRows;
    if (!sound || !shake) return;
    const p = getProgress();
    sound.setDetail(p.muted ? 'OFF' : 'ON');
    shake.setDetail(p.reducedShake ? 'OFF' : 'ON');
  }

  private closePanel(): void {
    const help = this.panel;
    if (!help) return;
    this.panel = undefined;
    this.settingsRows = [];
    audio.sfx('uiMove');
    this.tweens.add({ targets: help, alpha: 0, duration: 140, onComplete: () => help.destroy() });
  }
}

function diamond(x: number, y: number, r: number): Phaser.Math.Vector2[] {
  return [new Phaser.Math.Vector2(x, y - r), new Phaser.Math.Vector2(x + r, y), new Phaser.Math.Vector2(x, y + r), new Phaser.Math.Vector2(x - r, y)];
}

function drawFlameIcon(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(PALETTE.amber, 0.18);
  g.fillCircle(x, y + 4, 30);
  g.fillStyle(PALETTE.fire, 1);
  g.fillCircle(x, y + 8, 13);
  g.fillTriangle(x - 13, y + 6, x + 13, y + 6, x + 2, y - 24);
  g.fillStyle(PALETTE.gold, 1);
  g.fillCircle(x, y + 11, 7);
  g.fillTriangle(x - 7, y + 10, x + 7, y + 10, x + 1, y - 8);
}

function drawShadowIcon(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(PALETTE.gold, 0.2);
  g.fillCircle(x - 34, y, 16);
  g.fillStyle(PALETTE.gold, 1);
  g.fillCircle(x - 34, y, 8);
  g.fillStyle(0x000000, 0.55);
  g.fillPoints([new Phaser.Math.Vector2(x - 10, y - 6), new Phaser.Math.Vector2(x + 32, y - 20), new Phaser.Math.Vector2(x + 32, y + 20), new Phaser.Math.Vector2(x - 10, y + 6)], true);
  g.lineStyle(1, PALETTE.muted, 0.5);
  g.strokePoints([new Phaser.Math.Vector2(x - 10, y - 6), new Phaser.Math.Vector2(x + 32, y - 20), new Phaser.Math.Vector2(x + 32, y + 20), new Phaser.Math.Vector2(x - 10, y + 6)], true);
  g.fillStyle(PALETTE.text, 1);
  g.fillCircle(x - 12, y, 6);
  g.lineStyle(2, PALETTE.activated, 0.9);
  g.strokeRect(x + 22, y - 8, 16, 16);
}

function drawClockIcon(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(1.5, PALETTE.cyan, 0.3);
  g.strokeCircle(x - 6, y + 3, 20);
  g.lineStyle(2.5, PALETTE.cyan, 1);
  g.strokeCircle(x, y, 20);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.lineBetween(x + Math.cos(a) * 15, y + Math.sin(a) * 15, x + Math.cos(a) * 18, y + Math.sin(a) * 18);
  }
  g.lineStyle(2.5, PALETTE.ice, 1);
  g.lineBetween(x, y, x, y - 11);
  g.lineBetween(x, y, x + 8, y + 4);
}
