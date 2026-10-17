import Phaser from 'phaser';
import { CSS_COLORS, FONT_MONO, FONT_UI, GAME_HEIGHT, GAME_WIDTH, PALETTE, SCENE_KEYS, TOTAL_CHAMBERS } from '../config';
import { glowKey } from '../art/ProceduralTextures';
import { audio } from '../audio/AudioEngine';
import { getProgress } from '../progressState';

const CX = GAME_WIDTH / 2;
const HORIZON = 400;
const SUN_START_Y = 470;
const SUN_END_Y = 290;
const SUN_R = 70;

/** Seconds into the sequence at which each beat begins. */
const BEATS = {
  rise: 0.6,
  line1: 2.2,
  line2: 4.6,
  line3: 7,
  title: 9.6,
  prompt: 11.6,
} as const;

const LINES = ['The flame was lit.', 'The shadow held.', 'Six seconds were enough.'];

/**
 * Sunrise payoff after the last chamber (GDD §9, room 6): night sky warms
 * to dawn, the eclipse slides off the rising sun, three lines name the
 * three themes, then the title. About 12 seconds; any key or click skips.
 */
export class EndingScene extends Phaser.Scene {
  private finished = false;
  private dawn!: Phaser.GameObjects.Graphics;
  private stars!: Phaser.GameObjects.Graphics;
  private sun!: Phaser.GameObjects.Container;
  private moon!: Phaser.GameObjects.Arc;
  private rays!: Phaser.GameObjects.Graphics;
  private ring!: Phaser.GameObjects.Graphics;
  private lines: Phaser.GameObjects.Text[] = [];
  private finale: Phaser.GameObjects.Text[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private skip!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.ending);
  }

  init(): void {
    this.finished = false;
    this.lines = [];
    this.finale = [];
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.night);
    this.drawSky();
    this.drawSun();
    this.drawGround();
    this.drawText();

    const t = (s: number) => s * 1000;
    this.tweens.add({ targets: this.dawn, alpha: 1, delay: t(BEATS.rise), duration: t(8), ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.stars, alpha: 0, delay: t(BEATS.rise + 2), duration: t(5) });
    this.tweens.add({ targets: this.sun, y: SUN_END_Y, delay: t(BEATS.rise), duration: t(8), ease: 'Sine.easeOut' });
    // The eclipse ends: the moon slides off the sun and fades.
    this.tweens.add({
      targets: this.moon,
      x: 170,
      y: -40,
      alpha: 0,
      delay: t(BEATS.line2),
      duration: t(4.2),
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({ targets: [this.rays, this.ring], alpha: 0.7, delay: t(BEATS.line3), duration: t(2) });

    LINES.forEach((_, i) => {
      const at = [BEATS.line1, BEATS.line2, BEATS.line3][i]!;
      const line = this.lines[i]!;
      this.tweens.add({ targets: line, alpha: 1, y: line.y - 8, delay: t(at), duration: 700 });
      const next = [BEATS.line2, BEATS.line3, BEATS.title][i]!;
      this.tweens.add({ targets: line, alpha: 0, delay: t(next - 0.5), duration: 400 });
    });
    this.tweens.add({ targets: this.finale, alpha: 1, delay: t(BEATS.title), duration: 900 });
    this.time.delayedCall(t(BEATS.prompt), () => this.finish());

    const kb = this.input.keyboard!;
    for (const key of ['ENTER', 'SPACE', 'ESC']) kb.on(`keydown-${key}`, (e: KeyboardEvent) => !e.repeat && this.advance());
    this.input.on('pointerdown', () => this.advance());
    audio.startAmbience('ending');
    audio.sunrise([BEATS.line1, BEATS.line2, BEATS.line3], BEATS.title);
    this.cameras.main.fadeIn(600, 5, 8, 15);
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.rays.rotation += dt * 0.05;
    this.ring.rotation -= dt * 0.08;
  }

  /** First press skips to the final frame; the next one leaves for the chamber list. */
  private advance(): void {
    if (!this.finished) this.finish();
    else this.scene.start(SCENE_KEYS.levelSelect, { focus: TOTAL_CHAMBERS });
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.dawn.setAlpha(1);
    this.stars.setAlpha(0);
    this.sun.y = SUN_END_Y;
    this.moon.setAlpha(0);
    this.rays.setAlpha(0.7);
    this.ring.setAlpha(0.7);
    for (const l of this.lines) l.setAlpha(0);
    for (const f of this.finale) f.setAlpha(1);
    this.skip.setVisible(false);
    this.prompt.setVisible(true);
    this.tweens.add({ targets: this.prompt, alpha: 0.35, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private drawSky(): void {
    const night = this.add.graphics();
    night.fillStyle(PALETTE.night, 1);
    night.fillGradientStyle(PALETTE.night, PALETTE.night, PALETTE.slate, PALETTE.slate, 1);
    night.fillRect(0, 0, GAME_WIDTH, HORIZON);

    this.dawn = this.add.graphics().setAlpha(0);
    // Canvas keeps this solid amber; WebGL draws the gradient.
    this.dawn.fillStyle(PALETTE.amber, 0.6);
    this.dawn.fillGradientStyle(PALETTE.violet, PALETTE.violet, PALETTE.amber, PALETTE.amber, 1);
    this.dawn.fillRect(0, 0, GAME_WIDTH, HORIZON);

    this.stars = this.add.graphics();
    const rng = new Phaser.Math.RandomDataGenerator(['six-seconds']);
    for (let i = 0; i < 70; i++) {
      this.stars.fillStyle(PALETTE.text, rng.realInRange(0.25, 0.85));
      this.stars.fillCircle(rng.between(0, GAME_WIDTH), rng.between(0, HORIZON - 40), rng.realInRange(0.6, 1.6));
    }
  }

  private drawSun(): void {
    const glow = this.add.image(0, 0, glowKey('amber')).setBlendMode(Phaser.BlendModes.ADD).setScale(2.6).setAlpha(0.7);
    const core = this.add.image(0, 0, glowKey('gold')).setBlendMode(Phaser.BlendModes.ADD).setScale(1.1);
    const disk = this.add.circle(0, 0, SUN_R, PALETTE.gold);
    this.moon = this.add.circle(14, -6, SUN_R - 4, PALETTE.night);

    this.rays = this.add.graphics().setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      this.rays.lineStyle(i % 2 === 0 ? 4 : 2, PALETTE.gold, 0.5);
      this.rays.lineBetween(Math.cos(a) * (SUN_R + 18), Math.sin(a) * (SUN_R + 18), Math.cos(a) * (SUN_R + 70), Math.sin(a) * (SUN_R + 70));
    }
    this.ring = this.add.graphics().setAlpha(0);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const major = i % 5 === 0;
      this.ring.lineStyle(major ? 3 : 1.5, major ? PALETTE.cyan : PALETTE.ice, major ? 0.9 : 0.5);
      this.ring.lineBetween(Math.cos(a) * (SUN_R + 96), Math.sin(a) * (SUN_R + 96), Math.cos(a) * (SUN_R + 108), Math.sin(a) * (SUN_R + 108));
    }
    this.sun = this.add.container(CX, SUN_START_Y, [glow, this.rays, this.ring, core, disk, this.moon]);
  }

  /** Dark land with the observatory dome, drawn over the lower half of the sun. */
  private drawGround(): void {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.night, 1);
    g.fillRect(0, HORIZON, GAME_WIDTH, GAME_HEIGHT - HORIZON);
    g.fillStyle(PALETTE.night, 1);
    g.fillRect(CX + 170, HORIZON - 46, 120, 46);
    g.beginPath();
    g.arc(CX + 230, HORIZON - 46, 48, Math.PI, 0);
    g.closePath();
    g.fillPath();
    g.fillRect(CX + 226, HORIZON - 120, 8, 30);
    g.lineStyle(2, PALETTE.gold, 0.6);
    g.lineBetween(0, HORIZON, GAME_WIDTH, HORIZON);
  }

  private drawText(): void {
    for (const line of LINES) {
      this.lines.push(
        this.add
          .text(CX, 118, line, { fontFamily: FONT_UI, fontSize: '26px', fontStyle: 'italic', color: CSS_COLORS.text })
          .setOrigin(0.5)
          .setAlpha(0),
      );
    }
    const progress = getProgress();
    const cleared = Object.keys(progress.best).length;
    const stars = Object.values(progress.best).reduce((sum, r) => sum + r.bestStars, 0);
    this.finale = [
      this.add
        .text(CX, 84, 'SIX SECONDS OF SUN', { fontFamily: FONT_UI, fontSize: '40px', fontStyle: 'bold', color: CSS_COLORS.text })
        .setOrigin(0.5)
        .setLetterSpacing(6),
      this.add
        .text(CX, 128, 'THANK YOU FOR PLAYING', { fontFamily: FONT_UI, fontSize: '16px', color: CSS_COLORS.gold })
        .setOrigin(0.5)
        .setLetterSpacing(5),
      this.add
        .text(CX, 456, `${cleared} / ${TOTAL_CHAMBERS} CHAMBERS   ·   ★ ${stars} / ${TOTAL_CHAMBERS * 3}`, {
          fontFamily: FONT_MONO,
          fontSize: '15px',
          color: CSS_COLORS.muted,
        })
        .setOrigin(0.5),
    ];
    for (const f of this.finale) f.setAlpha(0);
    this.prompt = this.add
      .text(CX, 500, 'ENTER  CHAMBERS', { fontFamily: FONT_UI, fontSize: '15px', color: CSS_COLORS.text })
      .setOrigin(0.5)
      .setLetterSpacing(4)
      .setVisible(false);
    this.skip = this.add
      .text(GAME_WIDTH - 24, GAME_HEIGHT - 20, 'ENTER  SKIP', { fontFamily: FONT_UI, fontSize: '11px', color: CSS_COLORS.muted })
      .setOrigin(1, 0.5)
      .setLetterSpacing(2);
  }
}
