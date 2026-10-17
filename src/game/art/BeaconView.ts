import Phaser from 'phaser';
import { CSS_COLORS, DEPTH, FONT_UI, PALETTE } from '../config';
import type { Vec2 } from '../systems/math';
import { glowKey, TEXTURE_KEYS, type GlowColor } from './ProceduralTextures';

const PULSE_INTERVAL_MS = 1800;

/** A brazier: dark bowl until lit, then a flickering flame, embers, room light and radial pulses. */
export class BeaconView {
  private readonly scene: Phaser.Scene;
  private readonly pos: Vec2;
  private readonly primary: boolean;
  private readonly mask: Phaser.Display.Masks.GeometryMask;
  private readonly bowl: Phaser.GameObjects.Graphics;
  private readonly flame: Phaser.GameObjects.Image[] = [];
  private readonly core: Phaser.GameObjects.Arc;
  private readonly embers: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly keycap: Phaser.GameObjects.Container;
  private roomLight?: Phaser.GameObjects.Image;
  private lit = false;
  private inRange = false;

  constructor(scene: Phaser.Scene, pos: Vec2, primary: boolean, mask: Phaser.Display.Masks.GeometryMask) {
    this.scene = scene;
    this.pos = pos;
    this.primary = primary;
    this.mask = mask;
    const size = primary ? 1 : 0.72;

    const base = scene.add.graphics().setDepth(DEPTH.beacon);
    base.fillStyle(PALETTE.night, 0.6);
    base.fillCircle(pos.x + 2, pos.y + 4, 24 * size);
    base.fillStyle(PALETTE.wall, 1);
    base.fillCircle(pos.x, pos.y, 22 * size);
    base.lineStyle(2, PALETTE.gold, 0.55);
    base.strokeCircle(pos.x, pos.y, 22 * size);
    const notches = primary ? 8 : 4;
    for (let i = 0; i < notches; i++) {
      const a = (i / notches) * Math.PI * 2;
      base.fillStyle(PALETTE.gold, 0.7);
      base.fillCircle(pos.x + Math.cos(a) * 22 * size, pos.y + Math.sin(a) * 22 * size, 2.2);
    }

    this.bowl = scene.add.graphics().setDepth(DEPTH.beacon);
    this.drawBowl(false, size);

    const layers: [GlowColor, number, number][] = [
      ['fire', 0.42, 0.9],
      ['amber', 0.28, 0.95],
      ['gold', 0.16, 1],
    ];
    for (const [color, scale, alpha] of layers) {
      this.flame.push(
        scene.add
          .image(pos.x, pos.y, glowKey(color))
          .setScale(scale * size)
          .setAlpha(alpha)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(DEPTH.beacon)
          .setVisible(false),
      );
    }
    this.core = scene.add.circle(pos.x, pos.y, 5 * size, 0xfff4d6).setDepth(DEPTH.beacon).setVisible(false);

    this.embers = scene.add.particles(pos.x, pos.y, TEXTURE_KEYS.sparks, {
      frame: ['gold', 'amber', 'fire'],
      lifespan: { min: 900, max: 1500 },
      speedX: { min: -14, max: 14 },
      speedY: { min: -48, max: -16 },
      scale: { start: 0.9 * size, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      frequency: 140,
      quantity: 1,
      emitting: false,
    });
    this.embers.setDepth(DEPTH.fx);

    // Small `E` key cap shown above an unlit brazier while the keeper is in range.
    const cap = scene.add.graphics();
    cap.fillStyle(PALETTE.night, 0.9);
    cap.fillRoundedRect(-10, -10, 20, 20, 4);
    cap.lineStyle(1.5, PALETTE.gold, 1);
    cap.strokeRoundedRect(-10, -10, 20, 20, 4);
    const key = scene.add
      .text(0, 0, 'E', { fontFamily: FONT_UI, fontSize: '13px', fontStyle: 'bold', color: CSS_COLORS.gold })
      .setOrigin(0.5);
    this.keycap = scene.add
      .container(pos.x, pos.y - 36 * size - 4, [cap, key])
      .setDepth(DEPTH.hint)
      .setVisible(false);
  }

  /** Shows or hides the `E` key cap; ignored once lit. */
  setInRange(inRange: boolean): void {
    const show = inRange && !this.lit;
    if (show === this.inRange) return;
    this.inRange = show;
    this.keycap.setVisible(show);
    if (show) {
      this.keycap.setScale(0.6);
      this.scene.tweens.add({ targets: this.keycap, scale: 1, duration: 140, ease: 'Back.easeOut' });
    }
  }

  ignite(): void {
    if (this.lit) return;
    this.lit = true;
    this.setInRange(false);
    const size = this.primary ? 1 : 0.72;
    this.drawBowl(true, size);
    for (const f of this.flame) f.setVisible(true);
    this.core.setVisible(true);
    this.embers.start();

    // 0.25 s bloom (GDD §8.2).
    const bloom = this.scene.add
      .image(this.pos.x, this.pos.y, glowKey('gold'))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.light)
      .setScale(0.2)
      .setAlpha(1);
    this.scene.tweens.add({
      targets: bloom,
      scale: 2.4 * size,
      alpha: 0,
      duration: 250,
      ease: 'Cubic.easeOut',
      onComplete: () => bloom.destroy(),
    });

    if (this.primary) {
      this.roomLight = this.scene.add
        .image(this.pos.x, this.pos.y, glowKey('amber'))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.light)
        .setScale(4.2)
        .setAlpha(0);
      this.roomLight.setMask(this.mask);
      this.scene.tweens.add({ targets: this.roomLight, alpha: 0.3, duration: 450, ease: 'Sine.easeOut' });
      this.pulse();
      this.scene.time.addEvent({ delay: PULSE_INTERVAL_MS, loop: true, callback: () => this.pulse() });
    }

    const label = this.scene.add
      .text(this.pos.x, this.pos.y - 40, this.primary ? 'BEACON LIT' : 'RELAY LIT', {
        fontFamily: FONT_UI,
        fontSize: '15px',
        fontStyle: 'bold',
        color: CSS_COLORS.gold,
      })
      .setOrigin(0.5)
      .setLetterSpacing(3)
      .setDepth(DEPTH.hint);
    this.scene.tweens.add({
      targets: label,
      y: label.y - 26,
      alpha: 0,
      delay: 500,
      duration: 900,
      ease: 'Sine.easeIn',
      onComplete: () => label.destroy(),
    });
  }

  update(timeMs: number): void {
    if (!this.lit) return;
    const t = timeMs / 1000;
    const flicker = 1 + 0.08 * Math.sin(t * 13.1) + 0.05 * Math.sin(t * 7.3 + 1.7);
    const size = this.primary ? 1 : 0.72;
    const scales = [0.42, 0.28, 0.16];
    this.flame.forEach((f, i) => f.setScale(scales[i]! * size * (flicker + i * 0.02)));
    if (this.roomLight) this.roomLight.setScale(4.2 * (0.98 + 0.02 * flicker));
  }

  private drawBowl(lit: boolean, size: number): void {
    const g = this.bowl;
    g.clear();
    g.fillStyle(PALETTE.night, 1);
    g.fillCircle(this.pos.x, this.pos.y, 14 * size);
    g.lineStyle(2, lit ? PALETTE.amber : PALETTE.violet, lit ? 1 : 0.8);
    g.strokeCircle(this.pos.x, this.pos.y, 14 * size);
    if (!lit) {
      g.fillStyle(PALETTE.fire, 0.25);
      g.fillCircle(this.pos.x - 4 * size, this.pos.y + 2 * size, 3 * size);
      g.fillCircle(this.pos.x + 4 * size, this.pos.y - 1 * size, 2.5 * size);
      g.fillCircle(this.pos.x, this.pos.y + 5 * size, 2 * size);
    }
  }

  private pulse(): void {
    const ring = this.scene.add.graphics().setDepth(DEPTH.light).setBlendMode(Phaser.BlendModes.ADD);
    ring.setMask(this.mask);
    const wave = { r: 26, a: 0.4 };
    this.scene.tweens.add({
      targets: wave,
      r: 460,
      a: 0,
      duration: 2400,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        ring.clear();
        ring.lineStyle(2, PALETTE.amber, wave.a);
        ring.strokeCircle(this.pos.x, this.pos.y, wave.r);
      },
      onComplete: () => ring.destroy(),
    });
  }
}
