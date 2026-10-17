import Phaser from 'phaser';
import { CSS_COLORS, DEPTH, FONT_MONO, FONT_UI, GAME_HEIGHT, GAME_WIDTH, PALETTE, TOTAL_CHAMBERS } from '../config';
import { formatClock } from '../systems/Scoring';

const TOP_Y = 20;
const RIGHT_X = GAME_WIDTH - 52;

/** Top band: chamber name, hearts, clock. Bottom band: key hints. Drawn on the wall frame. */
export class HUD {
  private readonly clock: Phaser.GameObjects.Text;
  private readonly hearts: Phaser.GameObjects.Graphics;
  private readonly muted: Phaser.GameObjects.Text;
  private shownSeconds = -1;
  private shownHearts = -1;

  constructor(scene: Phaser.Scene, chamber: number, title: string, keyHints: string) {
    const label = scene.add
      .text(52, TOP_Y, `CHAMBER ${pad(chamber)} / ${pad(TOTAL_CHAMBERS)}`, {
        fontFamily: FONT_UI,
        fontSize: '12px',
        color: CSS_COLORS.muted,
      })
      .setOrigin(0, 0.5)
      .setLetterSpacing(2)
      .setDepth(DEPTH.hud);
    scene.add
      .text(label.x + label.width + 14, TOP_Y, title.toUpperCase(), {
        fontFamily: FONT_UI,
        fontSize: '14px',
        fontStyle: 'bold',
        color: CSS_COLORS.text,
      })
      .setOrigin(0, 0.5)
      .setLetterSpacing(2)
      .setDepth(DEPTH.hud);

    const pause = scene.add.graphics().setDepth(DEPTH.hud);
    pause.fillStyle(PALETTE.muted, 0.8);
    pause.fillRect(RIGHT_X - 8, TOP_Y - 7, 3, 14);
    pause.fillRect(RIGHT_X - 2, TOP_Y - 7, 3, 14);

    this.clock = scene.add
      .text(RIGHT_X - 20, TOP_Y, '00:00', { fontFamily: FONT_MONO, fontSize: '16px', color: CSS_COLORS.text })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.hud);

    this.hearts = scene.add.graphics().setDepth(DEPTH.hud);
    this.muted = scene.add
      .text(RIGHT_X - 160, TOP_Y, 'MUTED', { fontFamily: FONT_UI, fontSize: '11px', color: CSS_COLORS.muted })
      .setOrigin(1, 0.5)
      .setLetterSpacing(2)
      .setDepth(DEPTH.hud)
      .setVisible(false);

    scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 20, keyHints, {
        fontFamily: FONT_UI,
        fontSize: '12px',
        color: CSS_COLORS.muted,
      })
      .setOrigin(0.5)
      .setLetterSpacing(2)
      .setDepth(DEPTH.hud);
  }

  setTime(seconds: number): void {
    const whole = Math.floor(seconds);
    if (whole === this.shownSeconds) return;
    this.shownSeconds = whole;
    this.clock.setText(formatClock(seconds));
  }

  setHearts(count: number, max: number): void {
    if (count === this.shownHearts) return;
    this.shownHearts = count;
    const g = this.hearts;
    g.clear();
    const right = this.clock.x - this.clock.width - 18;
    for (let i = 0; i < max; i++) {
      const x = right - (max - 1 - i) * 20;
      drawHeart(g, x, TOP_Y, i < count);
    }
  }

  setMuted(muted: boolean): void {
    this.muted.setVisible(muted);
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function drawHeart(g: Phaser.GameObjects.Graphics, x: number, y: number, full: boolean): void {
  const r = 3.6;
  const V = Phaser.Math.Vector2;
  const points = [new V(x - 2 * r, y - 0.6), new V(x, y + 2.2 * r), new V(x + 2 * r, y - 0.6)];
  if (full) {
    g.fillStyle(PALETTE.fire, 1);
    g.fillCircle(x - r, y - r * 0.6, r);
    g.fillCircle(x + r, y - r * 0.6, r);
    g.fillPoints(points, true);
  } else {
    g.lineStyle(1.5, PALETTE.muted, 0.7);
    g.strokeCircle(x - r, y - r * 0.6, r);
    g.strokeCircle(x + r, y - r * 0.6, r);
  }
}
