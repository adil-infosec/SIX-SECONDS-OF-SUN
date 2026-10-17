import Phaser from 'phaser';
import { DEPTH, PALETTE } from '../config';
import type { Vec2 } from '../systems/math';
import { glowKey } from './ProceduralTextures';

/** Exit portal: dim while the gate is sealed, a bright spinning spiral once it can be used. */
export class PortalView {
  private readonly scene: Phaser.Scene;
  private readonly pos: Vec2;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly outer: Phaser.GameObjects.Graphics;
  private readonly inner: Phaser.GameObjects.Graphics;
  private active = false;

  constructor(scene: Phaser.Scene, pos: Vec2) {
    this.scene = scene;
    this.pos = pos;
    this.glow = scene.add
      .image(pos.x, pos.y, glowKey('gold'))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.portal)
      .setScale(0.5)
      .setAlpha(0.12);
    this.outer = this.ring(25, 6, 2);
    this.inner = this.ring(15, 4, 1.5);
    this.setActive(false);
  }

  setActive(active: boolean): void {
    this.active = active;
    const alpha = active ? 1 : 0.3;
    this.scene.tweens.killTweensOf([this.outer, this.inner, this.glow]);
    this.scene.tweens.add({ targets: [this.outer, this.inner], alpha, duration: 300 });
    this.scene.tweens.add({ targets: this.glow, alpha: active ? 0.55 : 0.12, scale: active ? 0.9 : 0.5, duration: 400 });
  }

  update(dtSeconds: number): void {
    const speed = this.active ? 2.2 : 0.4;
    this.outer.rotation += dtSeconds * speed;
    this.inner.rotation -= dtSeconds * speed * 1.6;
  }

  /** Spiral flash when the keeper steps through. */
  burst(): void {
    this.scene.tweens.add({ targets: [this.outer, this.inner], scale: 1.8, alpha: 0, duration: 600, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({ targets: this.glow, scale: 2.4, alpha: 0.9, yoyo: true, duration: 300 });
  }

  private ring(radius: number, segments: number, width: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics({ x: this.pos.x, y: this.pos.y }).setDepth(DEPTH.portal);
    const arc = (Math.PI * 2) / segments;
    for (let i = 0; i < segments; i++) {
      g.lineStyle(width, i % 2 === 0 ? PALETTE.gold : PALETTE.cyan, 0.9);
      g.beginPath();
      g.arc(0, 0, radius, i * arc, i * arc + arc * 0.6);
      g.strokePath();
    }
    return g;
  }
}
