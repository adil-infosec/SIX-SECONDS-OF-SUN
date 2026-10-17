import Phaser from 'phaser';
import { DEPTH, PALETTE } from '../config';
import type { Rect } from '../systems/math';

export type ConditionKind = 'flame' | 'rune' | 'relay';
export type GateCondition = { kind: ConditionKind; met: boolean };

const BADGE_RADIUS = 9;
const BADGE_GAP = 22;

/**
 * Lattice gate in the exit wall. Closed: bright fire-red bars with a lock.
 * Open: the two halves retract into the wall above and below. Small badges
 * beside it show each door condition by shape and fill, not color alone.
 */
export class GateView {
  private readonly scene: Phaser.Scene;
  private readonly rect: Rect;
  private readonly upper: Phaser.GameObjects.Graphics;
  private readonly lower: Phaser.GameObjects.Graphics;
  private readonly lock: Phaser.GameObjects.Graphics;
  private readonly badges: Phaser.GameObjects.Graphics;
  private open = false;

  constructor(scene: Phaser.Scene, rect: Rect) {
    this.scene = scene;
    this.rect = rect;

    const maskShape = scene.make.graphics({}, false);
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(rect.x, rect.y, rect.w, rect.h);
    const mask = maskShape.createGeometryMask();

    const half = rect.h / 2;
    this.upper = this.drawHalf(rect.y, half).setMask(mask);
    this.lower = this.drawHalf(rect.y + half, half).setMask(mask);

    const frame = scene.add.graphics().setDepth(DEPTH.gate);
    frame.fillStyle(PALETTE.gold, 0.9);
    frame.fillRect(rect.x - 3, rect.y - 3, rect.w + 6, 3);
    frame.fillRect(rect.x - 3, rect.y + rect.h, rect.w + 6, 3);

    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    this.lock = scene.add.graphics({ x: cx, y: cy }).setDepth(DEPTH.gate);
    this.lock.fillStyle(PALETTE.gold, 1);
    this.lock.fillCircle(0, 0, 7);
    this.lock.fillStyle(PALETTE.night, 1);
    this.lock.fillCircle(0, -1.5, 2.2);
    this.lock.fillRect(-1, -1, 2, 5);

    this.badges = scene.add.graphics().setDepth(DEPTH.gate);
  }

  setOpen(open: boolean): void {
    if (open === this.open) return;
    this.open = open;
    const half = this.rect.h / 2;
    const duration = 320;
    this.scene.tweens.killTweensOf([this.upper, this.lower, this.lock]);
    this.scene.tweens.add({ targets: this.upper, y: open ? -half : 0, duration, ease: 'Cubic.easeInOut' });
    this.scene.tweens.add({ targets: this.lower, y: open ? half : 0, duration, ease: 'Cubic.easeInOut' });
    this.scene.tweens.add({ targets: this.lock, alpha: open ? 0 : 1, scale: open ? 0.4 : 1, duration: 200 });
  }

  /** Badges stacked on the room side of the gate, above the doorway. */
  setConditions(conditions: readonly GateCondition[]): void {
    const g = this.badges;
    g.clear();
    const x = this.rect.x - 22;
    const top = this.rect.y - BADGE_GAP * conditions.length;
    conditions.forEach((c, i) => {
      const y = top + i * BADGE_GAP + BADGE_RADIUS;
      g.fillStyle(PALETTE.night, 0.85);
      g.fillCircle(x, y, BADGE_RADIUS + 2);
      g.lineStyle(1.5, c.met ? PALETTE.activated : PALETTE.muted, c.met ? 1 : 0.6);
      g.strokeCircle(x, y, BADGE_RADIUS + 2);
      const color = c.kind === 'rune' ? PALETTE.violet : PALETTE.gold;
      if (c.met) g.fillStyle(c.kind === 'rune' ? PALETTE.activated : color, 1);
      else g.lineStyle(1.5, PALETTE.muted, 0.8);
      const shape = badgeShape(c.kind, x, y);
      if (c.met) g.fillPoints(shape, true);
      else g.strokePoints(shape, true);
    });
  }

  private drawHalf(y: number, h: number): Phaser.GameObjects.Graphics {
    const r = this.rect;
    const g = this.scene.add.graphics().setDepth(DEPTH.gate);
    g.fillStyle(PALETTE.night, 0.9);
    g.fillRect(r.x, y, r.w, h);
    g.lineStyle(2, PALETTE.fire, 0.95);
    for (let by = y + 6; by < y + h; by += 12) g.lineBetween(r.x + 2, by, r.x + r.w - 2, by);
    g.lineStyle(1.5, PALETTE.amber, 0.7);
    g.lineBetween(r.x + 4, y, r.x + 4, y + h);
    g.lineBetween(r.x + r.w - 4, y, r.x + r.w - 4, y + h);
    return g;
  }
}

/** Flame = teardrop, rune = diamond, relay = small flame on a stem. */
function badgeShape(kind: ConditionKind, x: number, y: number): Phaser.Math.Vector2[] {
  const V = Phaser.Math.Vector2;
  if (kind === 'rune') return [new V(x, y - 6), new V(x + 6, y), new V(x, y + 6), new V(x - 6, y)];
  const s = kind === 'relay' ? 0.75 : 1;
  const points: Phaser.Math.Vector2[] = [new V(x, y - 7 * s)];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 6 + (i / 8) * (Math.PI * 4) / 3;
    points.push(new V(x + Math.cos(a) * 4.5 * s, y + 1.5 * s + Math.sin(a) * 4.5 * s));
  }
  return points;
}
