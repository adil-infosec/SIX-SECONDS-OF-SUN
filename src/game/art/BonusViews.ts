import Phaser from 'phaser';
import { CSS_COLORS, DEPTH, FONT_MONO, PALETTE } from '../config';
import type { Level, Mover, Prism, Rotor } from '../data/levelTypes';
import { rotorAngle } from '../systems/HazardGeometry';
import type { Rect, Vec2 } from '../systems/math';
import { SCANNER_WARNING_SECONDS } from '../systems/ScannerSystem';
import { blockTexture } from './ChamberArt';
import { glowKey, TEXTURE_KEYS } from './ProceduralTextures';

/**
 * Views for the bonus-chamber mechanics: sliding stone pillars, the rotating
 * fire lamp, prism crystals with their light cones, and the links drawn
 * between grouped and sequenced runes. They only draw what RoomSim decides.
 */

/** A sliding stone pillar, riding a groove cut in the floor along its path. */
export class MoverView {
  private readonly image: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, mover: Mover, levelId: number) {
    const r = mover.rect;
    const groove = scene.add.graphics().setDepth(DEPTH.decor);
    const path: Rect = mover.axis === 'x' ? { ...r, w: r.w + mover.range } : { ...r, h: r.h + mover.range };
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    groove.fillStyle(PALETTE.night, 0.55);
    if (mover.axis === 'x') groove.fillRect(path.x, cy - 4, path.w, 8);
    else groove.fillRect(cx - 4, path.y, 8, path.h);
    groove.fillStyle(PALETTE.violet, 0.6);
    for (const [x, y] of mover.axis === 'x'
      ? [[path.x + 6, cy], [path.x + path.w - 6, cy]]
      : [[cx, path.y + 6], [cx, path.y + path.h - 6]]) {
      groove.fillCircle(x!, y!, 3);
    }
    this.image = scene.add.image(r.x - 2, r.y - 2, blockTexture(scene, levelId, r.w, r.h)).setOrigin(0).setDepth(DEPTH.solid);
  }

  update(rect: Rect): void {
    this.image.setPosition(rect.x - 2, rect.y - 2);
  }
}

/**
 * The rotating fire lamp: an iron hub with a turning lens, the burning beam
 * out to where the first block stops it, a dashed telegraph where the beam
 * will be in 0.35 s, and embers spraying from the beam's tip.
 */
export class RotorView {
  private readonly rotor: Rotor;
  private readonly beam: Phaser.GameObjects.Graphics;
  private readonly telegraph: Phaser.GameObjects.Graphics;
  private readonly lens: Phaser.GameObjects.Graphics;
  private readonly embers: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, rotor: Rotor, mask: Phaser.Display.Masks.GeometryMask) {
    this.rotor = rotor;
    const { x, y } = rotor.center;
    this.telegraph = scene.add.graphics().setDepth(DEPTH.scanner);
    this.telegraph.setMask(mask);
    this.beam = scene.add.graphics().setDepth(DEPTH.scanner).setBlendMode(Phaser.BlendModes.ADD);
    this.beam.setMask(mask);

    const hub = scene.add.graphics().setDepth(DEPTH.beacon);
    hub.fillStyle(PALETTE.night, 0.7);
    hub.fillCircle(x + 2, y + 4, 19);
    hub.fillStyle(0x3a3f52, 1);
    hub.fillCircle(x, y, 17);
    hub.lineStyle(2, PALETTE.fire, 0.9);
    hub.strokeCircle(x, y, 17);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      hub.fillStyle(PALETTE.gold, 0.85);
      hub.fillRect(x + Math.cos(a) * 13 - 1.5, y + Math.sin(a) * 13 - 1.5, 3, 3);
    }
    scene.add.image(x, y, glowKey('fire')).setScale(0.32).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.beacon);
    this.lens = scene.add.graphics({ x, y }).setDepth(DEPTH.beacon);
    this.lens.fillStyle(PALETTE.night, 1);
    this.lens.fillCircle(0, 0, 8);
    this.lens.fillStyle(PALETTE.gold, 1);
    this.lens.fillRect(2, -3, 9, 6);
    this.lens.fillStyle(0xfff4d6, 1);
    this.lens.fillCircle(0, 0, 3);

    this.embers = scene.add.particles(x, y, TEXTURE_KEYS.sparks, {
      frame: ['gold', 'amber', 'fire'],
      lifespan: { min: 250, max: 550 },
      speed: { min: 20, max: 90 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      frequency: 30,
    });
    this.embers.setDepth(DEPTH.fx);
    this.embers.setMask(mask);
  }

  /** `time` is the room clock (for the telegraph); `timeMs` drives the flicker. */
  update(angle: number, reach: number, time: number, timeMs: number): void {
    const { x, y } = this.rotor.center;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const tx = x + ux * reach;
    const ty = y + uy * reach;
    const flicker = 0.85 + 0.15 * Math.sin(timeMs / 40);
    const g = this.beam;
    g.clear();
    // Glow layers out to the hit distance, so what burns is what glows.
    for (const [width, color, alpha] of [
      [32, PALETTE.fire, 0.22 * flicker],
      [18, PALETTE.amber, 0.45 * flicker],
      [8, PALETTE.gold, 0.95],
      [2.5, 0xfff4d6, 1],
    ] as const) {
      g.lineStyle(width, color, alpha);
      g.lineBetween(x, y, tx, ty);
    }
    g.fillStyle(PALETTE.gold, 0.8 * flicker);
    g.fillCircle(tx, ty, 9);
    this.lens.rotation = angle;
    this.embers.setPosition(tx, ty);

    const ahead = rotorAngle(this.rotor, time + SCANNER_WARNING_SECONDS);
    const t = this.telegraph;
    t.clear();
    t.lineStyle(2, PALETTE.fire, 0.35 + 0.25 * Math.sin(timeMs / 90));
    for (let s = 24; s < this.rotor.length; s += 18) {
      const e = Math.min(s + 8, this.rotor.length);
      t.lineBetween(x + Math.cos(ahead) * s, y + Math.sin(ahead) * s, x + Math.cos(ahead) * e, y + Math.sin(ahead) * e);
    }
  }
}

/**
 * A prism: a crystal set into its relay brazier. Unlit, a faint dashed cone
 * shows which way it will throw light; lit (after the primary), a beam joins
 * it to the primary and its light cone glows.
 */
export class PrismView {
  private readonly scene: Phaser.Scene;
  private readonly prism: Prism;
  private readonly origin: Vec2;
  private readonly primary: Vec2;
  private readonly cone: Phaser.GameObjects.Graphics;
  private readonly crystal: Phaser.GameObjects.Graphics;
  private lit = false;

  constructor(scene: Phaser.Scene, prism: Prism, origin: Vec2, primary: Vec2, mask: Phaser.Display.Masks.GeometryMask) {
    this.scene = scene;
    this.prism = prism;
    this.origin = origin;
    this.primary = primary;
    this.cone = scene.add.graphics().setDepth(DEPTH.decor);
    this.cone.setMask(mask);
    this.crystal = scene.add.graphics().setDepth(DEPTH.fx);
    this.draw();
  }

  setLit(lit: boolean): void {
    if (lit === this.lit) return;
    this.lit = lit;
    this.draw();
    if (lit) {
      this.cone.setAlpha(0);
      this.scene.tweens.add({ targets: this.cone, alpha: 1, duration: 500, ease: 'Sine.easeOut' });
    }
  }

  private draw(): void {
    const { x, y } = this.origin;
    const { angle, spread, range } = this.prism;
    const g = this.cone;
    g.clear();
    const a0 = angle - spread / 2;
    const a1 = angle + spread / 2;
    if (this.lit) {
      g.setBlendMode(Phaser.BlendModes.ADD);
      // The cone in bands that fade with distance.
      for (let i = 0; i < 5; i++) {
        const r = range * ((i + 1) / 5);
        g.fillStyle(PALETTE.gold, 0.045);
        g.slice(x, y, r, a0, a1, false);
        g.fillPath();
      }
      g.lineStyle(1.5, PALETTE.gold, 0.5);
      g.lineBetween(x, y, x + Math.cos(a0) * range, y + Math.sin(a0) * range);
      g.lineBetween(x, y, x + Math.cos(a1) * range, y + Math.sin(a1) * range);
      // Light carried from the primary into the prism.
      g.lineStyle(3, PALETTE.amber, 0.45);
      g.lineBetween(this.primary.x, this.primary.y, x, y);
      g.lineStyle(1, 0xfff4d6, 0.8);
      g.lineBetween(this.primary.x, this.primary.y, x, y);
    } else {
      g.setBlendMode(Phaser.BlendModes.NORMAL);
      g.lineStyle(1.5, PALETTE.ice, 0.3);
      for (const a of [a0, a1]) {
        for (let s = 30; s < range; s += 16) {
          const e = Math.min(s + 7, range);
          g.lineBetween(x + Math.cos(a) * s, y + Math.sin(a) * s, x + Math.cos(a) * e, y + Math.sin(a) * e);
        }
      }
    }

    const c = this.crystal;
    c.clear();
    const V = Phaser.Math.Vector2;
    const gem = [new V(x, y - 15), new V(x + 8, y - 4), new V(x, y + 8), new V(x - 8, y - 4)];
    c.fillStyle(this.lit ? PALETTE.ice : PALETTE.violet, this.lit ? 0.9 : 0.75);
    c.fillPoints(gem, true);
    c.lineStyle(1.5, this.lit ? 0xffffff : PALETTE.ice, 0.9);
    c.strokePoints(gem, true);
    c.lineBetween(x - 8, y - 4, x + 8, y - 4);
    c.fillStyle(0xffffff, 0.7);
    c.fillTriangle(x, y - 15, x + 8, y - 4, x + 2, y - 4);
  }
}

/** A countdown ring around a timed rune: amber, emptying as its window runs out. */
export class RuneTimerView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly pos: Vec2;
  private shown = -2;

  constructor(scene: Phaser.Scene, pos: Vec2) {
    this.pos = pos;
    this.g = scene.add.graphics().setDepth(DEPTH.rune);
    // Clock ticks around the rune mark it as timed even before it is lit.
    const ticks = scene.add.graphics().setDepth(DEPTH.runeBase);
    ticks.lineStyle(2, PALETTE.amber, 0.6);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ticks.lineBetween(pos.x + Math.cos(a) * 31, pos.y + Math.sin(a) * 31, pos.x + Math.cos(a) * 35, pos.y + Math.sin(a) * 35);
    }
  }

  /** `fraction` of the window left, or null when the rune is not counting down. */
  update(fraction: number | null): void {
    const rounded = fraction === null ? -1 : Math.round(fraction * 60) / 60;
    if (rounded === this.shown) return;
    this.shown = rounded;
    const g = this.g;
    g.clear();
    if (fraction === null) return;
    const start = -Math.PI / 2;
    g.lineStyle(4, PALETTE.amber, 1);
    g.beginPath();
    g.arc(this.pos.x, this.pos.y, 33, start, start + fraction * Math.PI * 2);
    g.strokePath();
  }
}

/**
 * Links between runes that work together: a dotted bracket joins a group
 * (they charge only together), and a dashed arrow runs from a rune to the
 * one that requires it, with A and B marking the order.
 */
export function drawRuneLinks(scene: Phaser.Scene, level: Level): void {
  const g = scene.add.graphics().setDepth(DEPTH.runeBase);
  const byId = new Map(level.runes.map((r) => [r.id, r]));
  const groups = new Map<string, Vec2[]>();
  for (const r of level.runes) if (r.group) groups.set(r.group, [...(groups.get(r.group) ?? []), r.position]);
  for (const members of groups.values()) {
    g.fillStyle(PALETTE.violet, 0.8);
    for (let i = 1; i < members.length; i++) dotted(g, members[i - 1]!, members[i]!, 30);
  }
  for (const r of level.runes) {
    const from = r.requires ? byId.get(r.requires) : undefined;
    if (!from) continue;
    const a = from.position;
    const b = r.position;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / d;
    const uy = (b.y - a.y) / d;
    g.lineStyle(2, PALETTE.amber, 0.45);
    for (let s = 40; s < d - 44; s += 18) g.lineBetween(a.x + ux * s, a.y + uy * s, a.x + ux * Math.min(s + 9, d - 44), a.y + uy * Math.min(s + 9, d - 44));
    const tip = { x: b.x - ux * 40, y: b.y - uy * 40 };
    g.fillStyle(PALETTE.amber, 0.7);
    g.fillTriangle(tip.x + ux * 8, tip.y + uy * 8, tip.x - uy * 6, tip.y + ux * 6, tip.x + uy * 6, tip.y - ux * 6);
    for (const [p, label] of [[a, 'A'], [b, 'B']] as const) {
      scene.add
        .text(p.x + 30, p.y - 30, label, { fontFamily: FONT_MONO, fontSize: '13px', fontStyle: 'bold', color: CSS_COLORS.amber })
        .setOrigin(0.5)
        .setDepth(DEPTH.rune);
    }
  }
}

/** Dots from `a` to `b`, skipping `gap` px at each end (where the runes are). */
function dotted(g: Phaser.GameObjects.Graphics, a: Vec2, b: Vec2, gap: number): void {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  for (let s = gap; s <= d - gap; s += 8) g.fillCircle(a.x + ((b.x - a.x) * s) / d, a.y + ((b.y - a.y) * s) / d, 1.6);
}
