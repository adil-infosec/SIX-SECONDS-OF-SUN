import Phaser from 'phaser';
import { CSS_COLORS, FONT_MONO, FONT_UI, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';
import { glowKey, TEXTURE_KEYS } from '../art/ProceduralTextures';

/**
 * Shared look for the title and chamber list: a dark observatory backdrop,
 * frosted glass panels and glass buttons. Everything is drawn with plain
 * fills, strokes, pre-colored glow textures and text shadows, so it looks
 * the same on the Canvas renderer fallback (no tints, gradients or shaders).
 */

type PanelStyle = {
  border: number;
  borderAlpha: number;
  fill?: number;
  fillAlpha?: number;
  /** Soft outer rings in the border color, for the selected state. */
  halo?: boolean;
};

/** A dark frosted panel: drop shadow, translucent fill, top sheen, hairline and border. */
export function drawGlassPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number, style: PanelStyle): void {
  g.fillStyle(0x000000, 0.3);
  g.fillRoundedRect(x, y + 6, w, h, r);
  g.fillStyle(style.fill ?? PALETTE.slate, style.fillAlpha ?? 0.66);
  g.fillRoundedRect(x, y, w, h, r);
  g.fillStyle(0xffffff, 0.045);
  g.fillRoundedRect(x + 2, y + 2, w - 4, h * 0.42, { tl: r - 2, tr: r - 2, bl: 0, br: 0 });
  g.lineStyle(1, 0xffffff, 0.07);
  g.strokeRoundedRect(x + 2.5, y + 2.5, w - 5, h - 5, Math.max(1, r - 2));
  if (style.halo) {
    g.lineStyle(6, style.border, 0.08);
    g.strokeRoundedRect(x - 5, y - 5, w + 10, h + 10, r + 5);
    g.lineStyle(3, style.border, 0.2);
    g.strokeRoundedRect(x - 2.5, y - 2.5, w + 5, h + 5, r + 2.5);
  }
  g.lineStyle(1.5, style.border, style.borderAlpha);
  g.strokeRoundedRect(x, y, w, h, r);
}

/** Thin corner brackets, like a targeting frame. */
export function drawCornerBrackets(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, len: number, color: number, alpha: number): void {
  g.lineStyle(1.5, color, alpha);
  g.lineBetween(x, y + len, x, y);
  g.lineBetween(x, y, x + len, y);
  g.lineBetween(x + w - len, y + h, x + w, y + h);
  g.lineBetween(x + w, y + h, x + w, y + h - len);
}

/**
 * Background shared by the menus: soft amber and cyan light pools, a huge
 * slowly turning clock dial and embers drifting up. Drawn behind everything.
 */
export function addMenuBackdrop(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor(PALETTE.night);

  const pools: [number, number, Parameters<typeof glowKey>[0], number, number][] = [
    [GAME_WIDTH / 2, GAME_HEIGHT + 40, 'amber', 4.2, 0.22],
    [90, 40, 'ice', 2.6, 0.08],
    [GAME_WIDTH - 60, GAME_HEIGHT - 80, 'ice', 2.2, 0.06],
  ];
  for (const [x, y, color, scale, alpha] of pools) {
    const pool = scene.add.image(x, y, glowKey(color)).setScale(scale).setAlpha(alpha).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: pool, alpha: alpha * 1.6, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  const dial = scene.add.graphics({ x: GAME_WIDTH / 2, y: GAME_HEIGHT * 0.36 });
  dial.lineStyle(1, PALETTE.ice, 0.05);
  dial.strokeCircle(0, 0, 330);
  dial.strokeCircle(0, 0, 250);
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const major = i % 10 === 0;
    dial.lineStyle(major ? 2 : 1, major ? PALETTE.ice : PALETTE.muted, major ? 0.09 : 0.05);
    dial.lineBetween(Math.cos(a) * (major ? 312 : 320), Math.sin(a) * (major ? 312 : 320), Math.cos(a) * 330, Math.sin(a) * 330);
  }
  scene.tweens.add({ targets: dial, angle: 360, duration: 360_000, repeat: -1 });

  const embers = scene.add.particles(0, 0, TEXTURE_KEYS.sparks, {
    frame: ['gold', 'amber', 'ice'],
    x: { min: 0, max: GAME_WIDTH },
    y: GAME_HEIGHT + 10,
    lifespan: { min: 7000, max: 12000 },
    speedY: { min: -14, max: -34 },
    speedX: { min: -8, max: 8 },
    scale: { start: 0.55, end: 0.1 },
    alpha: { start: 0.55, end: 0 },
    frequency: 320,
    blendMode: Phaser.BlendModes.ADD,
  });
  embers.fastForward(9000);

  // A faint scanline grid over the floor of the screen adds depth.
  const grid = scene.add.graphics();
  grid.lineStyle(1, PALETTE.ice, 0.035);
  for (let y = GAME_HEIGHT - 150; y < GAME_HEIGHT; y += 18) grid.lineBetween(0, y, GAME_WIDTH, y);
}

type ButtonHandlers = { hover: () => void; press: () => void };

/** A glass menu button: cyan rim at rest, amber glow, chevrons and a small lift when selected. */
export class GlassButton {
  readonly root: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;
  private readonly chevrons: Phaser.GameObjects.Text[];
  private selected = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly w: number,
    private readonly h: number,
    text: string,
    detail: string,
    handlers: ButtonHandlers,
  ) {
    this.glow = scene.add
      .image(0, 0, glowKey('amber'))
      .setDisplaySize(w * 1.45, h * 3.2)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.frame = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, text, { fontFamily: FONT_UI, fontSize: '17px', fontStyle: 'bold', color: CSS_COLORS.text })
      .setOrigin(0.5)
      .setLetterSpacing(5);
    this.detail = scene.add
      .text(w / 2 - 16, 0, detail, { fontFamily: FONT_MONO, fontSize: '11px', color: CSS_COLORS.muted })
      .setOrigin(1, 0.5)
      .setLetterSpacing(1);
    this.chevrons = [-1, 1].map((side) =>
      scene.add
        .text(side * (this.label.width / 2 + 22), 0, side < 0 ? '›' : '‹', { fontFamily: FONT_UI, fontSize: '22px', color: CSS_COLORS.gold })
        .setOrigin(0.5, 0.56)
        .setAlpha(0),
    );
    const hit = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    hit.on('pointerover', handlers.hover);
    hit.on('pointerdown', handlers.press);

    this.root = scene.add.container(x, y, [this.glow, this.frame, this.label, this.detail, ...this.chevrons, hit]);
    this.draw();
  }

  setSelected(selected: boolean): void {
    if (selected === this.selected) return;
    this.selected = selected;
    this.draw();
    const tweens = this.scene.tweens;
    tweens.killTweensOf([this.root, this.glow, ...this.chevrons]);
    tweens.add({ targets: this.root, scale: selected ? 1.05 : 1, duration: 170, ease: 'Quad.easeOut' });
    tweens.add({ targets: this.chevrons, alpha: selected ? 1 : 0, duration: 170 });
    if (selected) {
      this.chevrons.forEach((c, i) =>
        tweens.add({ targets: c, x: (i === 0 ? -1 : 1) * (this.label.width / 2 + 16), duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
      );
      tweens.add({ targets: this.glow, alpha: { from: 0.32, to: 0.6 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      this.chevrons.forEach((c, i) => c.setX((i === 0 ? -1 : 1) * (this.label.width / 2 + 22)));
      tweens.add({ targets: this.glow, alpha: 0, duration: 200 });
    }
  }

  private draw(): void {
    const { w, h } = this;
    this.frame.clear();
    drawGlassPanel(this.frame, -w / 2, -h / 2, w, h, h / 2, {
      border: this.selected ? PALETTE.amber : PALETTE.ice,
      borderAlpha: this.selected ? 0.95 : 0.28,
      fillAlpha: this.selected ? 0.78 : 0.6,
      halo: this.selected,
    });
    this.label.setColor(this.selected ? CSS_COLORS.gold : CSS_COLORS.text);
    this.label.setShadow(0, 0, CSS_COLORS.amber, this.selected ? 14 : 0, false, true);
    this.detail.setColor(this.selected ? CSS_COLORS.amber : CSS_COLORS.muted);
  }
}
