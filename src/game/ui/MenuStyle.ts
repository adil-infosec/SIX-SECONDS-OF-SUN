import Phaser from 'phaser';
import { CSS_COLORS, FONT_MONO, FONT_UI, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';
import { glowKey, TEXTURE_KEYS } from '../art/ProceduralTextures';

/**
 * Shared look for every menu page, after the title-screen mockup: a deep
 * navy vignette with dial rings, a faint floor grid and tilted glass side
 * panels; pill buttons with a soft gradient and a slate rim that turn amber
 * and glow when selected; rounded-square icon buttons; letter-spaced captions
 * in the corners; key hints with the keys in gold. Gradients and glows are
 * painted once into canvas textures, so the Canvas renderer fallback matches.
 */

const RES = 2;
const UI = {
  rim: '#2E3B57',
  rimLight: 'rgba(255,255,255,0.06)',
  amberRim: '#FBB351',
  fillTop: '#13213D',
  fillBottom: '#0A1428',
  activeTop: '#22385F',
  activeBottom: '#0F1C37',
  key: '#F5B544',
  word: '#8193AE',
} as const;

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
  g.fillStyle(style.fill ?? 0x0e1830, style.fillAlpha ?? 0.72);
  g.fillRoundedRect(x, y, w, h, r);
  g.fillStyle(0xffffff, 0.04);
  // Sheen: a thin band along the top edge, so it never cuts across a panel's content.
  g.fillRoundedRect(x + 2, y + 2, w - 4, Math.min(h * 0.42, 22), { tl: r - 2, tr: r - 2, bl: 0, br: 0 });
  g.lineStyle(1, 0xffffff, 0.06);
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

// ---- backdrop ----

const BACKDROP_KEY = 'tex-menu-backdrop';
const DIAL_Y = 200;

/**
 * Background shared by the menus: the painted vignette, rings, floor grid
 * and side panels, a slowly turning tick dial over them, and embers drifting up.
 */
export function addMenuBackdrop(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor(PALETTE.night);
  if (!scene.textures.exists(BACKDROP_KEY)) paintBackdrop(scene);
  scene.add.image(0, 0, BACKDROP_KEY).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

  const dial = scene.add.graphics({ x: GAME_WIDTH / 2, y: DIAL_Y });
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const major = i % 15 === 0;
    dial.lineStyle(major ? 2 : 1, major ? PALETTE.ice : PALETTE.muted, major ? 0.16 : 0.07);
    const r0 = major ? 318 : 324;
    dial.lineBetween(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * 332, Math.sin(a) * 332);
  }
  scene.tweens.add({ targets: dial, angle: 360, duration: 360_000, repeat: -1 });

  const embers = scene.add.particles(0, 0, TEXTURE_KEYS.sparks, {
    frame: ['gold', 'amber'],
    x: { min: 0, max: GAME_WIDTH },
    y: GAME_HEIGHT + 10,
    lifespan: { min: 8000, max: 13000 },
    speedY: { min: -12, max: -30 },
    speedX: { min: -6, max: 6 },
    scale: { start: 0.45, end: 0.1 },
    alpha: { start: 0.7, end: 0 },
    frequency: 420,
    blendMode: Phaser.BlendModes.ADD,
  });
  embers.fastForward(9000);
}

function paintBackdrop(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas(BACKDROP_KEY, GAME_WIDTH * RES, GAME_HEIGHT * RES);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.scale(RES, RES);
  const cx = GAME_WIDTH / 2;

  // Vignette: purple-navy at the heart, near black at the edges.
  const v = ctx.createRadialGradient(cx, 230, 20, cx, 270, 640);
  v.addColorStop(0, '#1C1C36');
  v.addColorStop(0.4, '#111A33');
  v.addColorStop(1, '#040B18');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Big observatory rings.
  ctx.lineWidth = 1;
  for (const [r, a] of [[200, 0.05], [262, 0.07], [420, 0.06], [540, 0.05]] as const) {
    ctx.strokeStyle = `rgba(140,170,215,${a})`;
    ctx.beginPath();
    ctx.arc(cx, DIAL_Y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(140,170,215,0.12)';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 412, DIAL_Y + Math.sin(a) * 412);
    ctx.lineTo(cx + Math.cos(a) * 428, DIAL_Y + Math.sin(a) * 428);
    ctx.stroke();
  }

  // Floor grid in perspective toward a vanishing point behind the title.
  const horizon = 360;
  ctx.strokeStyle = 'rgba(81,216,237,0.05)';
  for (let i = -14; i <= 14; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 22, horizon);
    ctx.lineTo(cx + i * 110, GAME_HEIGHT);
    ctx.stroke();
  }
  for (let k = 0; k < 7; k++) {
    const y = horizon + (GAME_HEIGHT - horizon) * Math.pow(k / 6, 1.8);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(GAME_WIDTH, y);
    ctx.stroke();
  }
  const fade = ctx.createLinearGradient(0, horizon - 10, 0, horizon + 60);
  fade.addColorStop(0, 'rgba(17,26,51,1)');
  fade.addColorStop(1, 'rgba(17,26,51,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, horizon - 10, GAME_WIDTH, 70);

  // Tilted glass panels down both sides.
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? 30 : GAME_WIDTH - 30;
    const x1 = side < 0 ? 188 : GAME_WIDTH - 188;
    ctx.beginPath();
    ctx.moveTo(x0, 64);
    ctx.lineTo(x1, 46);
    ctx.lineTo(x1, 440);
    ctx.lineTo(x0, 452);
    ctx.closePath();
    ctx.fillStyle = 'rgba(14,24,46,0.5)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,170,215,0.1)';
    ctx.stroke();
  }

  // Cog-tooth arcs in two corners.
  for (const [ox, oy, r, from, to] of [[40, 520, 120, -1.7, -0.2], [930, 70, 110, 1.4, 2.9]] as const) {
    ctx.fillStyle = 'rgba(140,170,215,0.06)';
    for (let a = from; a <= to; a += 0.16) {
      ctx.save();
      ctx.translate(ox + Math.cos(a) * r, oy + Math.sin(a) * r);
      ctx.rotate(a);
      ctx.fillRect(-6, -6, 12, 12);
      ctx.restore();
    }
  }
  tex.refresh();
}

/**
 * A soft night-colored shade that fades out to its edges, for setting light
 * art (the logo) against a bright background like the sunrise.
 */
export function addSoftShade(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha: number): Phaser.GameObjects.Image {
  const key = 'tex-soft-shade';
  if (!scene.textures.exists(key)) {
    const size = 256;
    const tex = scene.textures.createCanvas(key, size, size);
    if (tex) {
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, 'rgba(10,16,35,1)');
      g.addColorStop(0.55, 'rgba(10,16,35,0.85)');
      g.addColorStop(1, 'rgba(10,16,35,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      tex.refresh();
    }
  }
  return scene.add.image(x, y, key).setDisplaySize(w, h).setAlpha(alpha);
}

// ---- captions and hints ----

type CornerText = { status?: string; left?: string; right?: string };

/** Letter-spaced captions in the corners; the status line gets a pulsing cyan dot. */
export function addCornerMeta(scene: Phaser.Scene, text: CornerText): void {
  const style = { fontFamily: FONT_UI, fontSize: '11px', color: CSS_COLORS.muted } as const;
  if (text.status) {
    const dot = scene.add.circle(28, 24, 4, PALETTE.cyan);
    scene.add.image(28, 24, glowKey('ice')).setScale(0.12).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: dot, alpha: 0.35, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.add.text(40, 24, text.status, style).setOrigin(0, 0.5).setLetterSpacing(4);
  }
  // Bottom captions sit on the very edge, below the row of key hints.
  if (text.left) scene.add.text(24, GAME_HEIGHT - 13, text.left, style).setOrigin(0, 0.5).setLetterSpacing(3);
  if (text.right) scene.add.text(GAME_WIDTH - 24, GAME_HEIGHT - 13, text.right, style).setOrigin(1, 0.5).setLetterSpacing(3);
}

/** A centered row of `[key, action]` hints: keys in gold, actions muted. */
export function addKeyHints(scene: Phaser.Scene, x: number, y: number, hints: readonly (readonly [string, string])[], gap = 26): Phaser.GameObjects.Container {
  const parts: Phaser.GameObjects.Text[] = [];
  let cursor = 0;
  for (const [key, action] of hints) {
    const k = scene.add.text(cursor, 0, key, { fontFamily: FONT_UI, fontSize: '12px', fontStyle: 'bold', color: UI.key }).setOrigin(0, 0.5).setLetterSpacing(3);
    cursor += k.width + 8;
    const a = scene.add.text(cursor, 0, action, { fontFamily: FONT_UI, fontSize: '12px', color: UI.word }).setOrigin(0, 0.5).setLetterSpacing(3);
    cursor += a.width + gap;
    parts.push(k, a);
  }
  const width = cursor - gap;
  return scene.add.container(x - width / 2, y, parts);
}

// ---- pill and icon textures ----

/** A pill (or rounded square) painted at 2x with gradient fill, rim and, when active, an amber glow. */
function shapeTexture(scene: Phaser.Scene, w: number, h: number, radius: number, active: boolean): string {
  const key = `tex-ui-${w}x${h}r${radius}-${active ? 'on' : 'off'}`;
  if (scene.textures.exists(key)) return key;
  const pad = 22;
  const tex = scene.textures.createCanvas(key, (w + pad * 2) * RES, (h + pad * 2) * RES);
  if (!tex) return key;
  const ctx = tex.getContext();
  ctx.scale(RES, RES);
  const path = () => {
    ctx.beginPath();
    ctx.roundRect(pad, pad, w, h, radius);
  };
  if (active) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,165,60,0.75)';
    ctx.shadowBlur = 18;
    path();
    ctx.fillStyle = UI.activeBottom;
    ctx.fill();
    ctx.restore();
  } else {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    path();
    ctx.fillStyle = UI.fillBottom;
    ctx.fill();
    ctx.restore();
  }
  const g = ctx.createLinearGradient(0, pad, 0, pad + h);
  g.addColorStop(0, active ? UI.activeTop : UI.fillTop);
  g.addColorStop(1, active ? UI.activeBottom : UI.fillBottom);
  path();
  ctx.fillStyle = g;
  ctx.fill();
  // Sheen along the top inside edge.
  ctx.save();
  path();
  ctx.clip();
  ctx.strokeStyle = UI.rimLight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(pad + 1.5, pad + 1.5, w - 3, h - 3, Math.max(1, radius - 1.5));
  ctx.stroke();
  ctx.restore();
  path();
  ctx.lineWidth = active ? 2.2 : 1.4;
  ctx.strokeStyle = active ? UI.amberRim : UI.rim;
  ctx.stroke();
  tex.refresh();
  return key;
}

type ButtonHandlers = { hover: () => void; press: () => void };

/** A pill menu button: slate rim at rest; amber rim, glow, gold label, chevrons and a small lift when selected. */
export class GlassButton {
  readonly root: Phaser.GameObjects.Container;
  private readonly frameOff: Phaser.GameObjects.Image;
  private readonly frameOn: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;
  private readonly chevrons: Phaser.GameObjects.Text[];
  private selected = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    detail: string,
    handlers: ButtonHandlers,
  ) {
    const r = h / 2;
    this.frameOff = scene.add.image(0, 0, shapeTexture(scene, w, h, r, false)).setScale(1 / RES);
    this.frameOn = scene.add.image(0, 0, shapeTexture(scene, w, h, r, true)).setScale(1 / RES).setAlpha(0);
    const size = h >= 46 ? 19 : 16;
    this.label = scene.add
      .text(0, 0, text, { fontFamily: FONT_UI, fontSize: `${size}px`, fontStyle: 'bold', color: CSS_COLORS.text })
      .setOrigin(0.5)
      .setLetterSpacing(h >= 46 ? 8 : 6);
    this.detail = scene.add
      .text(w / 2 - 26, 0, detail, { fontFamily: FONT_MONO, fontSize: '12px', fontStyle: 'bold', color: CSS_COLORS.muted })
      .setOrigin(1, 0.5)
      .setLetterSpacing(2);
    this.chevrons = [-1, 1].map((side) =>
      scene.add
        .text(side * (this.label.width / 2 + 26), 0, side < 0 ? '›' : '‹', { fontFamily: FONT_UI, fontSize: `${size + 4}px`, fontStyle: 'bold', color: CSS_COLORS.gold })
        .setOrigin(0.5, 0.56)
        .setAlpha(0),
    );
    const hit = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    hit.on('pointerover', handlers.hover);
    hit.on('pointerdown', handlers.press);
    this.root = scene.add.container(x, y, [this.frameOff, this.frameOn, this.label, this.detail, ...this.chevrons, hit]);
    this.paint();
  }

  setSelected(selected: boolean): void {
    if (selected === this.selected) return;
    this.selected = selected;
    this.paint();
    const tweens = this.scene.tweens;
    tweens.killTweensOf([this.root, this.frameOn, ...this.chevrons]);
    tweens.add({ targets: this.root, scale: selected ? 1.04 : 1, duration: 170, ease: 'Quad.easeOut' });
    tweens.add({ targets: this.frameOn, alpha: selected ? 1 : 0, duration: 170 });
    tweens.add({ targets: this.chevrons, alpha: selected ? 1 : 0, duration: 170 });
    const home = (i: number) => (i === 0 ? -1 : 1) * (this.label.width / 2 + 26);
    if (selected) {
      this.chevrons.forEach((c, i) =>
        tweens.add({ targets: c, x: home(i) + (i === 0 ? 6 : -6), duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
      );
      tweens.add({ targets: this.frameOn, alpha: { from: 1, to: 0.8 }, delay: 200, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      this.chevrons.forEach((c, i) => c.setX(home(i)));
    }
  }

  setDetail(text: string): void {
    this.detail.setText(text);
  }

  private paint(): void {
    this.label.setColor(this.selected ? CSS_COLORS.gold : CSS_COLORS.text);
    this.label.setShadow(0, 0, CSS_COLORS.amber, this.selected ? 12 : 0, false, true);
    this.detail.setColor(this.selected ? CSS_COLORS.gold : CSS_COLORS.muted);
  }
}

export type IconName = 'sound' | 'mute' | 'gear' | 'back';

/** A rounded-square icon button; its rim turns amber on hover. */
export class IconButton {
  readonly root: Phaser.GameObjects.Container;
  private readonly glyph: Phaser.GameObjects.Graphics;
  private readonly frameOn: Phaser.GameObjects.Image;
  private icon: IconName;
  private hover = false;

  constructor(scene: Phaser.Scene, x: number, y: number, icon: IconName, onPress: () => void, size = 34) {
    this.icon = icon;
    const off = scene.add.image(0, 0, shapeTexture(scene, size, size, 9, false)).setScale(1 / RES);
    this.frameOn = scene.add.image(0, 0, shapeTexture(scene, size, size, 9, true)).setScale(1 / RES).setAlpha(0);
    this.glyph = scene.add.graphics();
    const hit = scene.add.zone(0, 0, size, size).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => this.setHover(true));
    hit.on('pointerout', () => this.setHover(false));
    hit.on('pointerdown', onPress);
    this.root = scene.add.container(x, y, [off, this.frameOn, this.glyph, hit]);
    this.draw();
  }

  setIcon(icon: IconName): void {
    this.icon = icon;
    this.draw();
  }

  private setHover(hover: boolean): void {
    this.hover = hover;
    this.frameOn.setAlpha(hover ? 1 : 0);
    this.draw();
  }

  private draw(): void {
    const g = this.glyph;
    g.clear();
    const c = this.hover ? PALETTE.gold : 0xc8d3e6;
    g.lineStyle(1.8, c, 1);
    if (this.icon === 'sound' || this.icon === 'mute') {
      g.fillStyle(c, 0);
      g.beginPath();
      g.moveTo(-8, -3);
      g.lineTo(-4, -3);
      g.lineTo(1, -7);
      g.lineTo(1, 7);
      g.lineTo(-4, 3);
      g.lineTo(-8, 3);
      g.closePath();
      g.strokePath();
      if (this.icon === 'sound') {
        g.beginPath();
        g.arc(2, 0, 5, -0.9, 0.9);
        g.strokePath();
        g.beginPath();
        g.arc(2, 0, 9, -0.9, 0.9);
        g.strokePath();
      } else {
        g.lineBetween(5, -4, 11, 4);
        g.lineBetween(11, -4, 5, 4);
      }
    } else if (this.icon === 'gear') {
      g.strokeCircle(0, 0, 4);
      g.beginPath();
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = i % 2 === 0 ? 10 : 7.5;
        if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.strokePath();
    } else {
      g.lineBetween(7, 0, -7, 0);
      g.lineBetween(-7, 0, -2, -5);
      g.lineBetween(-7, 0, -2, 5);
    }
  }
}
