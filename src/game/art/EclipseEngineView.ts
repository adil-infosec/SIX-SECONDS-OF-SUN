import Phaser from 'phaser';
import { DEPTH, PALETTE } from '../config';
import type { Vec2 } from '../systems/math';

/**
 * The finale's sun core (GDD §9, room 6): once lit, clockwork rings turn
 * around the beacon, counter-rotating, and brighten as each relay joins.
 */
export class EclipseEngineView {
  private readonly scene: Phaser.Scene;
  private readonly rings: Phaser.GameObjects.Graphics[];
  private power = 0;

  constructor(scene: Phaser.Scene, pos: Vec2) {
    this.scene = scene;
    this.rings = [
      ring(scene, pos, 40, 12, PALETTE.gold),
      ring(scene, pos, 54, 20, PALETTE.amber),
      ring(scene, pos, 68, 6, PALETTE.cyan),
    ];
    for (const r of this.rings) r.setAlpha(0).setScale(0.6);
  }

  /** `level`: 0 when the core is first lit, rising by one per relay. */
  setPower(level: number): void {
    this.power = level;
    const alpha = Math.min(1, 0.45 + level * 0.25);
    this.scene.tweens.add({ targets: this.rings, alpha, scale: 1, duration: 500, ease: 'Back.easeOut' });
  }

  update(dtSeconds: number): void {
    const speed = 0.25 + this.power * 0.15;
    this.rings.forEach((r, i) => {
      r.rotation += dtSeconds * speed * (i % 2 === 0 ? 1 : -1.4);
    });
  }
}

function ring(scene: Phaser.Scene, pos: Vec2, radius: number, ticks: number, color: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics({ x: pos.x, y: pos.y }).setDepth(DEPTH.beacon).setBlendMode(Phaser.BlendModes.ADD);
  const arc = (Math.PI * 2) / ticks;
  g.lineStyle(2, color, 0.8);
  for (let i = 0; i < ticks; i++) {
    g.beginPath();
    g.arc(0, 0, radius, i * arc, i * arc + arc * 0.55);
    g.strokePath();
  }
  return g;
}
