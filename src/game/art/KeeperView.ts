import Phaser from 'phaser';
import { DEPTH, PALETTE } from '../config';
import { PLAYER_RADIUS } from '../systems/MovementSystem';
import type { Vec2 } from '../systems/math';
import { glowKey } from './ProceduralTextures';

/** The lightkeeper: off-white body, gold clockwork brace, a notch showing which way they face. */
export class KeeperView {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly facingMark: Phaser.GameObjects.Graphics;
  private readonly danger: Phaser.GameObjects.Graphics;
  private readonly burn: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, pos: Vec2) {
    this.scene = scene;
    const aura = scene.add
      .image(0, 0, glowKey('ice'))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.32)
      .setAlpha(0.3);
    const body = scene.add.graphics();
    body.fillStyle(PALETTE.night, 0.5);
    body.fillCircle(1.5, 3, PLAYER_RADIUS);
    body.fillStyle(PALETTE.text, 1);
    body.fillCircle(0, 0, PLAYER_RADIUS);
    body.lineStyle(2.5, PALETTE.gold, 1);
    body.strokeCircle(0, 0, PLAYER_RADIUS - 1);
    body.lineStyle(1.5, PALETTE.amber, 0.8);
    body.strokeCircle(0, 0, 5);

    this.facingMark = scene.add.graphics();
    this.facingMark.fillStyle(PALETTE.night, 1);
    this.facingMark.fillTriangle(PLAYER_RADIUS - 1, 0, PLAYER_RADIUS - 6, -3.5, PLAYER_RADIUS - 6, 3.5);

    // Warning ring: shown while a scanner is about to reach the keeper.
    this.danger = scene.add.graphics();
    this.danger.lineStyle(2.5, PALETTE.fire, 1);
    this.danger.strokeCircle(0, 0, PLAYER_RADIUS + 6);
    this.danger.setVisible(false);

    this.burn = scene.add
      .image(0, 0, glowKey('fire'))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.5)
      .setAlpha(0);

    this.container = scene.add
      .container(pos.x, pos.y, [aura, this.danger, body, this.facingMark, this.burn])
      .setDepth(DEPTH.keeper);
  }

  /**
   * `danger`: a scanner will touch the keeper within 0.35 s.
   * `invulnerable`: seconds of post-hit protection left (the keeper blinks).
   */
  sync(pos: Vec2, facing: Vec2, danger: boolean, invulnerable: number, timeMs: number): void {
    this.container.setPosition(pos.x, pos.y);
    this.facingMark.rotation = Math.atan2(facing.y, facing.x);
    this.danger.setVisible(danger);
    if (danger) this.danger.setAlpha(0.55 + 0.45 * Math.sin(timeMs / 40)).setScale(1 + 0.08 * Math.sin(timeMs / 60));
    this.container.setAlpha(invulnerable > 0 && Math.floor(timeMs / 90) % 2 === 0 ? 0.35 : 1);
  }

  /** Fire flash at the moment of a hit. */
  hit(): void {
    this.burn.setAlpha(1).setScale(0.3);
    this.scene.tweens.add({ targets: this.burn, alpha: 0, scale: 0.9, duration: 380, ease: 'Cubic.easeOut' });
  }
}
