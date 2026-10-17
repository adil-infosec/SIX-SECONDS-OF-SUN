import Phaser from 'phaser';
import { CSS_COLORS, DEPTH, FONT_MONO, FONT_UI, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';
import { formatClearTime, type StarCount } from '../systems/Scoring';

const CX = GAME_WIDTH / 2;
const CY = GAME_HEIGHT / 2;

function text(scene: Phaser.Scene, x: number, y: number, value: string, size: number, color: string, bold = false) {
  return scene.add
    .text(x, y, value, { fontFamily: FONT_UI, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', color })
    .setOrigin(0.5);
}

/** Full-screen dim layer with centered content; clicking it calls `onClick`. */
export function createPauseOverlay(scene: Phaser.Scene, onClick: () => void): Phaser.GameObjects.Container {
  const dim = scene.add.rectangle(CX, CY, GAME_WIDTH, GAME_HEIGHT, PALETTE.night, 0.78).setInteractive();
  dim.on('pointerdown', onClick);
  const title = text(scene, CX, CY - 24, 'PAUSED', 34, CSS_COLORS.text, true).setLetterSpacing(8);
  const hint = text(scene, CX, CY + 24, 'ESC OR CLICK TO CONTINUE   ·   R RESTART   ·   M MUTE', 13, CSS_COLORS.muted)
    .setLetterSpacing(2);
  return scene.add.container(0, 0, [dim, title, hint]).setDepth(DEPTH.overlay).setVisible(false);
}

export function showClearOverlay(
  scene: Phaser.Scene,
  title: string,
  clearTime: number,
  parTime: number,
  stars: StarCount,
  continueLabel: string,
): Phaser.GameObjects.Container {
  const dim = scene.add.rectangle(CX, CY, GAME_WIDTH, GAME_HEIGHT, PALETTE.night, 0.72);
  const panel = scene.add.graphics();
  panel.fillStyle(PALETTE.slate, 0.96);
  panel.fillRoundedRect(CX - 220, CY - 130, 440, 260, 14);
  panel.lineStyle(2, PALETTE.gold, 0.8);
  panel.strokeRoundedRect(CX - 220, CY - 130, 440, 260, 14);

  const heading = text(scene, CX, CY - 92, 'CHAMBER CLEAR', 28, CSS_COLORS.gold, true).setLetterSpacing(6);
  const name = text(scene, CX, CY - 56, title, 16, CSS_COLORS.text);

  const starGfx = scene.add.graphics();
  for (let i = 0; i < 3; i++) {
    const x = CX + (i - 1) * 48;
    const filled = i < stars;
    const points = starPoints(x, CY - 6, 17, 7.5);
    if (filled) {
      starGfx.fillStyle(PALETTE.gold, 1);
      starGfx.fillPoints(points, true);
    } else {
      starGfx.lineStyle(2, PALETTE.muted, 0.6);
      starGfx.strokePoints(points, true);
    }
  }

  const time = scene.add
    .text(CX, CY + 40, `TIME ${formatClearTime(clearTime)}   ·   PAR ${formatClearTime(parTime)}`, {
      fontFamily: FONT_MONO,
      fontSize: '15px',
      color: CSS_COLORS.muted,
    })
    .setOrigin(0.5);
  const keys = text(scene, CX, CY + 92, `ENTER  ${continueLabel}      R  REPLAY`, 14, CSS_COLORS.text).setLetterSpacing(3);

  const overlay = scene.add
    .container(0, 0, [dim, panel, heading, name, starGfx, time, keys])
    .setDepth(DEPTH.overlay)
    .setAlpha(0);
  scene.tweens.add({ targets: overlay, alpha: 1, duration: 260 });
  return overlay;
}

function starPoints(cx: number, cy: number, outer: number, inner: number): Phaser.Math.Vector2[] {
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return points;
}
