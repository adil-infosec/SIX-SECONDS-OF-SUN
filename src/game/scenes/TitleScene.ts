import Phaser from 'phaser';
import { CSS_COLORS, FONT_UI, GAME_WIDTH, PALETTE, SCENE_KEYS } from '../config';
import { TEXTURE_KEYS } from '../art/ProceduralTextures';

const CENTER_X = GAME_WIDTH / 2;
const LOGO_Y = 190;

export class TitleScene extends Phaser.Scene {
  private clockRing?: Phaser.GameObjects.Graphics;

  constructor() {
    super(SCENE_KEYS.title);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.night);
    this.drawEclipseLogo();

    this.add
      .text(CENTER_X, 330, 'SIX SECONDS OF SUN', {
        fontFamily: FONT_UI,
        fontSize: '46px',
        fontStyle: 'bold',
        color: CSS_COLORS.text,
      })
      .setOrigin(0.5)
      .setLetterSpacing(6);

    this.add
      .text(CENTER_X, 378, 'Light the fire. Shape the shadow. Borrow six seconds.', {
        fontFamily: FONT_UI,
        fontSize: '18px',
        fontStyle: 'italic',
        color: CSS_COLORS.muted,
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(CENTER_X, 460, 'PRESS ENTER', {
        fontFamily: FONT_UI,
        fontSize: '20px',
        color: CSS_COLORS.gold,
      })
      .setOrigin(0.5)
      .setLetterSpacing(4);

    this.tweens.add({
      targets: prompt,
      alpha: 0.35,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  override update(_time: number, delta: number): void {
    if (this.clockRing) this.clockRing.rotation += (delta / 1000) * 0.08;
  }

  /** Gold sun with a dark moon offset over it, ringed by clock ticks. */
  private drawEclipseLogo(): void {
    this.add
      .image(CENTER_X, LOGO_Y, TEXTURE_KEYS.glow)
      .setTint(PALETTE.amber)
      .setScale(1.5)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD);

    const sun = this.add.graphics();
    sun.fillStyle(PALETTE.gold, 1);
    sun.fillCircle(CENTER_X, LOGO_Y, 62);
    sun.fillStyle(PALETTE.night, 1);
    sun.fillCircle(CENTER_X + 16, LOGO_Y - 10, 58);

    const ring = this.add.graphics({ x: CENTER_X, y: LOGO_Y });
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const major = i % 5 === 0;
      const inner = major ? 84 : 90;
      const outer = 98;
      ring.lineStyle(major ? 3 : 1.5, major ? PALETTE.cyan : PALETTE.muted, major ? 0.9 : 0.45);
      ring.lineBetween(
        Math.cos(angle) * inner,
        Math.sin(angle) * inner,
        Math.cos(angle) * outer,
        Math.sin(angle) * outer,
      );
    }
    this.clockRing = ring;
  }
}
