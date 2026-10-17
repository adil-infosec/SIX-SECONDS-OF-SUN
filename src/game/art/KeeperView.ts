import Phaser from 'phaser';
import { DEPTH, PALETTE } from '../config';
import { PLAYER_RADIUS } from '../systems/MovementSystem';
import type { Vec2 } from '../systems/math';
import { TEXTURE_KEYS } from './ProceduralTextures';

/** The lightkeeper: off-white body, gold clockwork brace, a notch showing which way they face. */
export class KeeperView {
  readonly container: Phaser.GameObjects.Container;
  private readonly facingMark: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, pos: Vec2) {
    const aura = scene.add
      .image(0, 0, TEXTURE_KEYS.glow)
      .setTint(PALETTE.ice)
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

    this.container = scene.add.container(pos.x, pos.y, [aura, body, this.facingMark]).setDepth(DEPTH.keeper);
  }

  sync(pos: Vec2, facing: Vec2): void {
    this.container.setPosition(pos.x, pos.y);
    this.facingMark.rotation = Math.atan2(facing.y, facing.x);
  }
}
