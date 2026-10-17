import Phaser from 'phaser';
import { DEPTH, PALETTE } from '../config';
import { PLAYER_RADIUS } from '../systems/MovementSystem';
import type { Vec2 } from '../systems/math';
import { facingOf, frameName, sheetKey, SPRITE_ORIGIN, SPRITE_SCALE, walkAnimKey, type Facing } from './CharacterSprites';
import { glowKey } from './ProceduralTextures';

/** The lightkeeper: a chibi sprite in an amber cap that walks in four directions and idles facing the last one. */
export class KeeperView {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private facing: Facing = 'down';
  private walking = false;
  private last: Vec2 | null = null;
  private readonly danger: Phaser.GameObjects.Graphics;
  private readonly burn: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, pos: Vec2) {
    this.scene = scene;
    const aura = scene.add
      .image(0, 0, glowKey('ice'))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.32)
      .setAlpha(0.3);
    // Contact shadow under the feet.
    const ground = scene.add.graphics();
    ground.fillStyle(PALETTE.night, 0.45);
    ground.fillEllipse(0, PLAYER_RADIUS - 1, PLAYER_RADIUS * 1.7, PLAYER_RADIUS * 0.6);
    this.sprite = scene.add
      .sprite(0, 0, sheetKey('keeper'), frameName('down', 0))
      .setOrigin(SPRITE_ORIGIN.x, SPRITE_ORIGIN.y)
      .setScale(SPRITE_SCALE);

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
      .container(pos.x, pos.y, [aura, this.danger, ground, this.sprite, this.burn])
      .setDepth(DEPTH.keeper);
  }

  /**
   * `danger`: a scanner will touch the keeper within 0.35 s.
   * `invulnerable`: seconds of post-hit protection left (the keeper blinks).
   */
  sync(pos: Vec2, facing: Vec2, danger: boolean, invulnerable: number, timeMs: number): void {
    // Walking means the keeper moved since the last frame; a hit freeze or a wall stops the cycle.
    const moved = this.last !== null && Math.hypot(pos.x - this.last.x, pos.y - this.last.y) > 0.05;
    this.last = { x: pos.x, y: pos.y };
    this.container.setPosition(pos.x, pos.y);
    this.setPose(facingOf(facing.x, facing.y, this.facing), moved);
    this.danger.setVisible(danger);
    if (danger) this.danger.setAlpha(0.55 + 0.45 * Math.sin(timeMs / 40)).setScale(1 + 0.08 * Math.sin(timeMs / 60));
    this.container.setAlpha(invulnerable > 0 && Math.floor(timeMs / 90) % 2 === 0 ? 0.35 : 1);
  }

  private setPose(facing: Facing, walking: boolean): void {
    if (facing === this.facing && walking === this.walking) return;
    this.facing = facing;
    this.walking = walking;
    if (walking) this.sprite.play(walkAnimKey('keeper', facing), true);
    else this.sprite.stop().setFrame(frameName(facing, 0));
  }

  /** Fire flash at the moment of a hit. */
  hit(): void {
    this.burn.setAlpha(1).setScale(0.3);
    this.scene.tweens.add({ targets: this.burn, alpha: 0, scale: 0.9, duration: 380, ease: 'Cubic.easeOut' });
  }
}
