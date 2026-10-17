import Phaser from 'phaser';
import { CSS_COLORS, DEPTH, FONT_UI, PALETTE } from '../config';
import type { Vec2 } from '../systems/math';
import { glowKey, TEXTURE_KEYS, type GlowColor } from './ProceduralTextures';

const PULSE_INTERVAL_MS = 1800;

/**
 * A brazier: a stone plinth with gold studs holding an iron bowl. Unlit, the
 * coals glow a dim violet; lit, the coals burn, flame tongues dance above the
 * bowl with a stream of flame particles and embers, the room fills with light
 * and radial pulses roll out.
 */
export class BeaconView {
  private readonly scene: Phaser.Scene;
  private readonly pos: Vec2;
  private readonly primary: boolean;
  private readonly mask: Phaser.Display.Masks.GeometryMask;
  private readonly bowl: Phaser.GameObjects.Graphics;
  private readonly flame: Phaser.GameObjects.Image[] = [];
  private readonly core: Phaser.GameObjects.Arc;
  private readonly embers: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly flames: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly tongues: Phaser.GameObjects.Graphics;
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

    this.drawPlinth(scene.add.graphics().setDepth(DEPTH.beacon), size);

    this.bowl = scene.add.graphics().setDepth(DEPTH.beacon);
    this.drawBowl(false, size);

    const layers: [GlowColor, number, number][] = [
      ['fire', 0.42, 0.7],
      ['amber', 0.28, 0.6],
      ['gold', 0.16, 0.7],
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
    this.flames = scene.add.particles(pos.x, pos.y - 4 * size, TEXTURE_KEYS.sparks, {
      frame: ['fire', 'amber', 'gold'],
      lifespan: { min: 320, max: 620 },
      speedX: { min: -12, max: 12 },
      speedY: { min: -70, max: -34 },
      scale: { start: 1.5 * size, end: 0.2 },
      alpha: { start: 0.85, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      frequency: 32,
      quantity: 1,
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 7 * size) } as Phaser.Types.GameObjects.Particles.EmitZoneData,
      emitting: false,
    });
    this.flames.setDepth(DEPTH.beacon);
    this.tongues = scene.add.graphics().setDepth(DEPTH.beacon).setBlendMode(Phaser.BlendModes.ADD);

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
    this.flames.start();

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
    this.drawTongues(t, size);
  }

  /** Three layered flame tongues licking up from the bowl, each with its own sway. */
  private drawTongues(t: number, size: number): void {
    const g = this.tongues;
    g.clear();
    const { x, y } = this.pos;
    const layers: [number, number, number, number][] = [
      [PALETTE.fire, 0.45, 12, 28],
      [PALETTE.amber, 0.5, 8.5, 20],
      [PALETTE.gold, 0.55, 5, 12],
    ];
    layers.forEach(([color, alpha, half, height], i) => {
      const sway = Math.sin(t * (7 + i * 2.3) + i) * 2.2 * size;
      const lick = (1 + 0.16 * Math.sin(t * (11 + i * 3.1) + i * 2)) * height * size;
      const w = half * size;
      g.fillStyle(color, alpha);
      g.beginPath();
      g.moveTo(x - w, y + 2 * size);
      g.lineTo(x - w * 0.55, y - lick * 0.45);
      g.lineTo(x + sway, y - lick);
      g.lineTo(x + w * 0.55, y - lick * 0.5);
      g.lineTo(x + w, y + 2 * size);
      g.closePath();
      g.fillPath();
      g.fillCircle(x, y + 1 * size, w);
    });
  }

  /** Square stone plinth with a bevel, a front face and gold corner studs. */
  private drawPlinth(g: Phaser.GameObjects.Graphics, size: number): void {
    const { x, y } = this.pos;
    const s = 24 * size;
    g.fillStyle(PALETTE.night, 0.6);
    g.fillRect(x - s + 3, y - s + 6, s * 2, s * 2);
    g.fillStyle(0x1b2338, 1);
    g.fillRect(x - s, y - s + 4, s * 2, s * 2);
    g.fillStyle(PALETTE.wall, 1);
    g.fillRect(x - s, y - s, s * 2, s * 2 - 2);
    g.fillStyle(0x34446a, 1);
    g.fillRect(x - s, y - s, s * 2, 2);
    g.fillRect(x - s, y - s, 2, s * 2 - 2);
    g.lineStyle(2, PALETTE.night, 1);
    g.strokeRect(x - s, y - s, s * 2, s * 2 + 4);
    // Carved ring around the bowl, then studs: four corners, plus edge studs on the primary.
    g.lineStyle(1.5, PALETTE.gold, 0.35);
    g.strokeCircle(x, y, 18 * size);
    const studs: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    if (this.primary) studs.push([0, -1], [0, 1], [-1, 0], [1, 0]);
    for (const [sx, sy] of studs) {
      g.fillStyle(PALETTE.night, 1);
      g.fillRect(x + sx * (s - 5) - 3, y + sy * (s - 5) - 3, 6, 6);
      g.fillStyle(PALETTE.gold, 0.85);
      g.fillRect(x + sx * (s - 5) - 2, y + sy * (s - 5) - 2, 4, 4);
    }
  }

  private drawBowl(lit: boolean, size: number): void {
    const g = this.bowl;
    const { x, y } = this.pos;
    g.clear();
    // Iron bowl: dark rim with a highlight, coals inside.
    g.fillStyle(0x0d0f18, 1);
    g.fillCircle(x, y + 1.5, 15 * size);
    g.fillStyle(0x3a3f52, 1);
    g.fillCircle(x, y, 15 * size);
    g.fillStyle(PALETTE.night, 1);
    g.fillCircle(x, y, 11.5 * size);
    g.lineStyle(1.5, 0x6f7891, 0.9);
    g.beginPath();
    g.arc(x, y, 14 * size, Math.PI * 1.05, Math.PI * 1.75);
    g.strokePath();
    g.lineStyle(2, lit ? PALETTE.amber : PALETTE.violet, lit ? 1 : 0.7);
    g.strokeCircle(x, y, 15 * size);
    const coals: [number, number, number][] = [[-4, 2, 3], [4, -1, 2.6], [0, 5, 2.2], [-1, -4, 2], [5, 4, 1.8]];
    for (const [dx, dy, r] of coals) {
      g.fillStyle(lit ? PALETTE.amber : PALETTE.violet, lit ? 0.95 : 0.35);
      g.fillCircle(x + dx * size, y + dy * size, r * size);
      if (lit) {
        g.fillStyle(PALETTE.gold, 1);
        g.fillCircle(x + dx * size - 0.6, y + dy * size - 0.6, r * size * 0.45);
      }
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
