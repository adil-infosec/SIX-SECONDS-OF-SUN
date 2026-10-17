import Phaser from 'phaser';
import { DEPTH, PALETTE } from '../config';
import { PLAYER_RADIUS } from '../systems/MovementSystem';
import type { Vec2 } from '../systems/math';
import { glowKey } from './ProceduralTextures';

const TRAIL_POINTS = 14;
const TRAIL_MIN_STEP = 3;
const REPLACE_FADE_MS = 200;

/**
 * The cyan afterimage: transparent body with a bright outline, a soft aura
 * and a fading trail. It shows where the echo is; RoomSim decides what it does.
 */
export class EchoView {
  private readonly scene: Phaser.Scene;
  private readonly body: Phaser.GameObjects.Container;
  private readonly trail: Phaser.GameObjects.Graphics;
  private readonly points: Vec2[] = [];
  private loops = 0;
  private retiring = false;

  constructor(scene: Phaser.Scene, pos: Vec2) {
    this.scene = scene;
    const aura = scene.add
      .image(0, 0, glowKey('ice'))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.36)
      .setAlpha(0.35);
    const shape = scene.add.graphics();
    shape.fillStyle(PALETTE.cyan, 0.16);
    shape.fillCircle(0, 0, PLAYER_RADIUS);
    shape.lineStyle(2, PALETTE.cyan, 1);
    shape.strokeCircle(0, 0, PLAYER_RADIUS);
    shape.lineStyle(1, PALETTE.ice, 0.8);
    shape.strokeCircle(0, 0, 5);
    this.body = scene.add.container(pos.x, pos.y, [aura, shape]).setDepth(DEPTH.echo).setScale(0.6);
    scene.tweens.add({ targets: this.body, scale: 1, duration: 150, ease: 'Back.easeOut' });
    this.trail = scene.add.graphics().setDepth(DEPTH.echo).setBlendMode(Phaser.BlendModes.ADD);
  }

  /** `alpha` is the loop-boundary fade; `loops` resets the trail when playback wraps. */
  update(pos: Vec2, alpha: number, loops: number): void {
    if (this.retiring) return;
    this.body.setPosition(pos.x, pos.y).setAlpha(alpha);
    if (loops !== this.loops) {
      this.loops = loops;
      this.points.length = 0;
    }
    const last = this.points[this.points.length - 1];
    if (!last || Math.hypot(pos.x - last.x, pos.y - last.y) >= TRAIL_MIN_STEP) {
      this.points.push({ ...pos });
      if (this.points.length > TRAIL_POINTS) this.points.shift();
    }
    this.drawTrail(alpha);
  }

  /** Fades out over 0.2 s and destroys itself (when a new echo replaces it). */
  retire(): void {
    this.retiring = true;
    this.scene.tweens.add({
      targets: [this.body, this.trail],
      alpha: 0,
      duration: REPLACE_FADE_MS,
      onComplete: () => {
        this.body.destroy();
        this.trail.destroy();
      },
    });
  }

  private drawTrail(alpha: number): void {
    const g = this.trail;
    g.clear();
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1]!;
      const b = this.points[i]!;
      const k = i / this.points.length;
      g.lineStyle(1 + k * 4, PALETTE.cyan, 0.35 * k * alpha);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }
}
