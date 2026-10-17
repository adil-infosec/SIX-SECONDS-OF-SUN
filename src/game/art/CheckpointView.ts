import Phaser from 'phaser';
import { CSS_COLORS, DEPTH, FONT_UI, PALETTE } from '../config';
import { CHECKPOINT_RADIUS } from '../systems/RoomSim';
import type { Vec2 } from '../systems/math';

/** Floor marker: a dim dashed ring that turns solid cyan when the keeper reaches it. */
export class CheckpointView {
  private readonly scene: Phaser.Scene;
  private readonly pos: Vec2;
  private readonly ring: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, pos: Vec2) {
    this.scene = scene;
    this.pos = pos;
    this.ring = scene.add.graphics().setDepth(DEPTH.decor);
    this.draw(false);
  }

  reach(): void {
    this.draw(true);
    this.scene.tweens.add({ targets: this.ring, alpha: { from: 0.3, to: 1 }, duration: 300 });
    const label = this.scene.add
      .text(this.pos.x, this.pos.y - 30, 'CHECKPOINT', {
        fontFamily: FONT_UI,
        fontSize: '12px',
        fontStyle: 'bold',
        color: CSS_COLORS.ice,
      })
      .setOrigin(0.5)
      .setLetterSpacing(3)
      .setDepth(DEPTH.hint);
    this.scene.tweens.add({ targets: label, y: label.y - 14, alpha: 0, delay: 600, duration: 600, onComplete: () => label.destroy() });
  }

  private draw(reached: boolean): void {
    const g = this.ring;
    const { x, y } = this.pos;
    g.clear();
    const r = CHECKPOINT_RADIUS - 6;
    if (reached) {
      g.fillStyle(PALETTE.cyan, 0.12);
      g.fillCircle(x, y, r);
      g.lineStyle(2, PALETTE.cyan, 0.9);
      g.strokeCircle(x, y, r);
      return;
    }
    g.lineStyle(1.5, PALETTE.muted, 0.45);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.beginPath();
      g.arc(x, y, r, a, a + Math.PI / 10);
      g.strokePath();
    }
  }
}
