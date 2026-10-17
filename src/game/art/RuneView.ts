import Phaser from 'phaser';
import { CSS_COLORS, DEPTH, FONT_UI, PALETTE } from '../config';
import type { Vec2 } from '../systems/math';
import type { RunePhase } from '../systems/RuneSystem';
import { glowKey, TEXTURE_KEYS } from './ProceduralTextures';

const DISK_RADIUS = 20;
const RING_RADIUS = 26;
const SPARKS = 6;

/**
 * Shadow rune on the floor. The engraving sits below shadows; the charge
 * ring, powered glow and sigil highlight sit above them, so a covered rune
 * still reads clearly. State is shown by ring fill and glow, not color alone.
 */
export class RuneView {
  private readonly scene: Phaser.Scene;
  private readonly pos: Vec2;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly litSigil: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private shownCharge = -1;
  private shownPhase: RunePhase | null = null;

  constructor(scene: Phaser.Scene, pos: Vec2) {
    this.scene = scene;
    this.pos = pos;

    const base = scene.add.graphics().setDepth(DEPTH.runeBase);
    base.fillStyle(PALETTE.night, 0.7);
    base.fillCircle(pos.x, pos.y, DISK_RADIUS + 4);
    base.lineStyle(2, PALETTE.violet, 0.75);
    base.strokeCircle(pos.x, pos.y, DISK_RADIUS);
    drawSigil(base, pos, PALETTE.violet, 0.8);

    this.glow = scene.add
      .image(pos.x, pos.y, glowKey('activated'))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.rune)
      .setScale(0.5)
      .setAlpha(0);

    this.litSigil = scene.add.graphics().setDepth(DEPTH.rune).setAlpha(0);
    this.litSigil.lineStyle(2, PALETTE.activated, 1);
    this.litSigil.strokeCircle(pos.x, pos.y, DISK_RADIUS);
    drawSigil(this.litSigil, pos, PALETTE.activated, 1);

    this.ring = scene.add.graphics().setDepth(DEPTH.rune);

    this.sparks = scene.add.particles(pos.x, pos.y, TEXTURE_KEYS.sparks, {
      frame: ['activated', 'ice'],
      lifespan: { min: 350, max: 650 },
      speed: { min: 60, max: 140 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.sparks.setDepth(DEPTH.fx);
    this.setCharge(0, 'inactive');
  }

  /** Redraws the charge ring; `fraction` is 0..1. Cheap when nothing changed. */
  setCharge(fraction: number, phase: RunePhase): void {
    const rounded = Math.round(fraction * 100) / 100;
    if (rounded === this.shownCharge && phase === this.shownPhase) return;
    this.shownCharge = rounded;
    this.shownPhase = phase;
    const g = this.ring;
    g.clear();
    g.lineStyle(3, PALETTE.muted, 0.18);
    g.strokeCircle(this.pos.x, this.pos.y, RING_RADIUS);
    if (rounded <= 0) return;
    const start = -Math.PI / 2;
    g.lineStyle(3, phase === 'powered' ? PALETTE.activated : PALETTE.ice, 1);
    g.beginPath();
    g.arc(this.pos.x, this.pos.y, RING_RADIUS, start, start + rounded * Math.PI * 2);
    g.strokePath();
  }

  powerUp(): void {
    this.scene.tweens.killTweensOf([this.glow, this.litSigil]);
    this.scene.tweens.add({ targets: this.litSigil, alpha: 1, duration: 150 });
    this.glow.setAlpha(0.9).setScale(0.3);
    this.scene.tweens.add({ targets: this.glow, alpha: 0.45, scale: 0.6, duration: 450, ease: 'Cubic.easeOut' });
    this.sparks.explode(SPARKS);

    const label = this.scene.add
      .text(this.pos.x, this.pos.y - 44, 'SHADOW LOCK', {
        fontFamily: FONT_UI,
        fontSize: '15px',
        fontStyle: 'bold',
        color: CSS_COLORS.activated,
      })
      .setOrigin(0.5)
      .setLetterSpacing(3)
      .setDepth(DEPTH.hint)
      .setScale(0.8);
    this.scene.tweens.add({ targets: label, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: label,
      y: label.y - 18,
      alpha: 0,
      delay: 700,
      duration: 700,
      ease: 'Sine.easeIn',
      onComplete: () => label.destroy(),
    });
  }

  powerDown(): void {
    this.scene.tweens.killTweensOf([this.glow, this.litSigil]);
    this.scene.tweens.add({ targets: [this.glow, this.litSigil], alpha: 0, duration: 200 });
  }
}

/** Eclipse sigil: inner circle, an offset crescent cut and four short rays. */
function drawSigil(g: Phaser.GameObjects.Graphics, p: Vec2, color: number, alpha: number): void {
  g.lineStyle(1.5, color, alpha);
  g.strokeCircle(p.x, p.y, 8);
  g.beginPath();
  g.arc(p.x + 4, p.y - 2, 7, Math.PI * 0.55, Math.PI * 1.45);
  g.strokePath();
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    g.lineBetween(p.x + Math.cos(a) * 11, p.y + Math.sin(a) * 11, p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 16);
  }
}
