import Phaser from 'phaser';
import { CSS_COLORS, DEPTH, FONT_MONO, FONT_UI, GAME_WIDTH, PALETTE } from '../config';
import { glowKey, TEXTURE_KEYS } from '../art/ProceduralTextures';
import { ECHO_SECONDS } from '../systems/EchoSystem';

const X = GAME_WIDTH / 2;
const Y = 20;
const RADIUS = 13;
const STRIP_X = X + 30;
const STRIP_W = 112;
const STRIP_Y = Y + 6;
/** Milliseconds between playback sparks while an echo runs. */
const SPARK_MS = 55;

/**
 * Top-center HUD for the echo (GDD §8.3): a glowing MEMORY ring that fills
 * with recorded seconds around the `Q` key, pulsing cyan once an echo can be
 * made, and a 6-second playback bar whose marker sheds small cyan sparks
 * while the current echo plays. Redraws only when a value changes.
 */
export class MemoryMeter {
  private readonly scene: Phaser.Scene;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly wave: Phaser.GameObjects.Graphics;
  private readonly strip: Phaser.GameObjects.Graphics;
  private readonly key: Phaser.GameObjects.Text;
  private readonly seconds: Phaser.GameObjects.Text;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private shown = '';
  private ready = false;
  private lastSpark = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.glow = scene.add.image(X, Y, glowKey('ice')).setScale(0.3).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.hud);
    this.wave = scene.add.graphics({ x: X, y: Y }).setDepth(DEPTH.hud).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.wave.lineStyle(2, PALETTE.cyan, 1);
    this.wave.strokeCircle(0, 0, RADIUS + 1);
    this.ring = scene.add.graphics().setDepth(DEPTH.hud);
    this.strip = scene.add.graphics().setDepth(DEPTH.hud);
    this.key = scene.add
      .text(X, Y, 'Q', { fontFamily: FONT_UI, fontSize: '13px', fontStyle: 'bold', color: CSS_COLORS.muted })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    scene.add
      .text(STRIP_X, Y - 7, 'MEMORY', { fontFamily: FONT_UI, fontSize: '9px', color: CSS_COLORS.muted })
      .setOrigin(0, 0.5)
      .setLetterSpacing(2)
      .setDepth(DEPTH.hud);
    this.seconds = scene.add
      .text(STRIP_X + STRIP_W, Y - 7, '0.0s', { fontFamily: FONT_MONO, fontSize: '10px', color: CSS_COLORS.muted })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.hud);
    this.sparks = scene.add
      .particles(0, 0, TEXTURE_KEYS.sparks, {
        frame: ['ice', 'activated'],
        lifespan: { min: 260, max: 480 },
        speed: { min: 12, max: 40 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.4, end: 0 },
        alpha: { start: 1, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(DEPTH.hud);
  }

  /** `echoT` is the current echo's playback time, or null with no echo. */
  update(memorySeconds: number, ready: boolean, echoT: number | null): void {
    const fill = Math.min(1, memorySeconds / ECHO_SECONDS);
    const marker = echoT === null ? -1 : echoT / ECHO_SECONDS;
    if (marker >= 0) {
      const now = this.scene.time.now;
      if (now - this.lastSpark >= SPARK_MS) {
        this.lastSpark = now;
        this.sparks.emitParticleAt(STRIP_X + marker * STRIP_W, STRIP_Y, 1);
      }
    }
    if (ready !== this.ready) this.setReady(ready);

    const signature = `${fill.toFixed(2)}|${ready}|${marker.toFixed(3)}`;
    if (signature === this.shown) return;
    this.shown = signature;
    this.seconds.setText(`${Math.min(ECHO_SECONDS, memorySeconds).toFixed(1)}s`).setColor(ready ? CSS_COLORS.ice : CSS_COLORS.muted);

    const g = this.ring;
    g.clear();
    g.fillStyle(PALETTE.night, 0.92);
    g.fillCircle(X, Y, RADIUS + 3);
    g.lineStyle(3, PALETTE.muted, 0.18);
    g.strokeCircle(X, Y, RADIUS);
    // Six faint second ticks around the dial.
    g.lineStyle(1, PALETTE.ice, 0.35);
    for (let i = 0; i < ECHO_SECONDS; i++) {
      const a = -Math.PI / 2 + (i / ECHO_SECONDS) * Math.PI * 2;
      g.lineBetween(X + Math.cos(a) * (RADIUS + 3), Y + Math.sin(a) * (RADIUS + 3), X + Math.cos(a) * (RADIUS + 5), Y + Math.sin(a) * (RADIUS + 5));
    }
    if (fill > 0) {
      const end = -Math.PI / 2 + fill * Math.PI * 2;
      // A wide faint stroke under a bright thin one reads as an illuminated arc.
      g.lineStyle(6, ready ? PALETTE.cyan : PALETTE.ice, ready ? 0.25 : 0.12);
      g.beginPath();
      g.arc(X, Y, RADIUS, -Math.PI / 2, end);
      g.strokePath();
      g.lineStyle(2.5, ready ? PALETTE.cyan : PALETTE.ice, ready ? 1 : 0.65);
      g.beginPath();
      g.arc(X, Y, RADIUS, -Math.PI / 2, end);
      g.strokePath();
      g.fillStyle(PALETTE.ice, 1);
      g.fillCircle(X + Math.cos(end) * RADIUS, Y + Math.sin(end) * RADIUS, 2);
    }
    this.key.setColor(ready ? CSS_COLORS.ice : CSS_COLORS.muted);
    this.key.setShadow(0, 0, CSS_COLORS.cyan, ready ? 10 : 0, false, true);

    const s = this.strip;
    s.clear();
    s.fillStyle(PALETTE.night, 0.9);
    s.fillRoundedRect(STRIP_X - 1, STRIP_Y - 3.5, STRIP_W + 2, 7, 3.5);
    s.lineStyle(1, PALETTE.ice, 0.22);
    s.strokeRoundedRect(STRIP_X - 1, STRIP_Y - 3.5, STRIP_W + 2, 7, 3.5);
    s.lineStyle(1, PALETTE.muted, 0.35);
    for (let i = 1; i < ECHO_SECONDS; i++) {
      const x = STRIP_X + (i / ECHO_SECONDS) * STRIP_W;
      s.lineBetween(x, STRIP_Y - 2, x, STRIP_Y + 2);
    }
    if (marker >= 0) {
      const x = STRIP_X + marker * STRIP_W;
      s.fillStyle(PALETTE.cyan, 0.25);
      s.fillRoundedRect(STRIP_X, STRIP_Y - 3, Math.max(3, x - STRIP_X), 6, 3);
      s.fillStyle(PALETTE.cyan, 0.9);
      s.fillRoundedRect(STRIP_X, STRIP_Y - 1.5, Math.max(3, x - STRIP_X), 3, 1.5);
      s.fillStyle(PALETTE.ice, 0.35);
      s.fillCircle(x, STRIP_Y, 6);
      s.fillStyle(PALETTE.ice, 1);
      s.fillCircle(x, STRIP_Y, 3);
    }
  }

  /** Brief shake and red flash when `Q` is pressed too early. */
  deny(): void {
    this.key.setColor(CSS_COLORS.fire);
    this.scene.tweens.add({ targets: this.key, x: X + 3, duration: 40, yoyo: true, repeat: 2, onComplete: () => this.key.setX(X) });
    this.shown = '';
  }

  /** READY: the ring breathes a cyan glow and sends out a ripple around `Q`. */
  private setReady(ready: boolean): void {
    this.ready = ready;
    const tweens = this.scene.tweens;
    tweens.killTweensOf([this.glow, this.wave]);
    if (!ready) {
      this.glow.setAlpha(0);
      this.wave.setAlpha(0);
      return;
    }
    tweens.add({ targets: this.glow, alpha: { from: 0.25, to: 0.7 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    tweens.add({ targets: this.wave, alpha: { from: 0.9, to: 0 }, scale: { from: 1, to: 1.9 }, duration: 1100, repeat: -1, ease: 'Quad.easeOut' });
  }
}
