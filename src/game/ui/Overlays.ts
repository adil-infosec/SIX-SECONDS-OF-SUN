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

/** Out of hearts: a brief "extinguished" card before the room restarts on its own. */
export function showFailOverlay(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const dim = scene.add.rectangle(CX, CY, GAME_WIDTH, GAME_HEIGHT, PALETTE.night, 0.7);
  const title = text(scene, CX, CY - 18, 'EXTINGUISHED', 32, CSS_COLORS.fire, true).setLetterSpacing(8);
  const hint = text(scene, CX, CY + 26, 'THE CHAMBER RESETS…', 13, CSS_COLORS.muted).setLetterSpacing(3);
  const overlay = scene.add.container(0, 0, [dim, title, hint]).setDepth(DEPTH.overlay).setAlpha(0);
  scene.tweens.add({ targets: overlay, alpha: 1, duration: 200 });
  return overlay;
}

export type ClearSummary = {
  title: string;
  clearTime: number;
  parTime: number;
  stars: StarCount;
  hits: number;
  bestTime: number;
  bestStars: StarCount;
  newBestTime: boolean;
  newBestStars: boolean;
  continueLabel: string;
};

export function showClearOverlay(scene: Phaser.Scene, r: ClearSummary): Phaser.GameObjects.Container {
  const { title, clearTime, parTime, stars, continueLabel } = r;
  const dim = scene.add.rectangle(CX, CY, GAME_WIDTH, GAME_HEIGHT, PALETTE.night, 0.72);
  const panel = scene.add.graphics();
  panel.fillStyle(PALETTE.slate, 0.96);
  panel.fillRoundedRect(CX - 240, CY - 140, 480, 290, 14);
  panel.lineStyle(2, PALETTE.gold, 0.8);
  panel.strokeRoundedRect(CX - 240, CY - 140, 480, 290, 14);

  const heading = text(scene, CX, CY - 102, 'CHAMBER CLEAR', 28, CSS_COLORS.gold, true).setLetterSpacing(6);
  const name = text(scene, CX, CY - 66, title, 16, CSS_COLORS.text);

  const starGfx = scene.add.graphics();
  for (let i = 0; i < 3; i++) {
    const x = CX + (i - 1) * 48;
    const filled = i < stars;
    const points = starPoints(x, CY - 16, 17, 7.5);
    if (filled) {
      starGfx.fillStyle(PALETTE.gold, 1);
      starGfx.fillPoints(points, true);
    } else {
      starGfx.lineStyle(2, PALETTE.muted, 0.6);
      starGfx.strokePoints(points, true);
    }
  }

  const hitsLabel = r.hits === 0 ? 'NO HITS' : r.hits === 1 ? '1 HIT' : `${r.hits} HITS`;
  const time = scene.add
    .text(CX, CY + 26, `TIME ${formatClearTime(clearTime)}   ·   PAR ${formatClearTime(parTime)}   ·   ${hitsLabel}`, {
      fontFamily: FONT_MONO,
      fontSize: '15px',
      color: CSS_COLORS.muted,
    })
    .setOrigin(0.5);
  const isNew = r.newBestTime || r.newBestStars;
  const best = scene.add
    .text(
      CX,
      CY + 56,
      isNew
        ? `NEW BEST${r.newBestTime ? '  ·  ' + formatClearTime(r.bestTime) : ''}${r.newBestStars ? '  ·  ' + '★'.repeat(r.bestStars) : ''}`
        : `BEST ${formatClearTime(r.bestTime)}   ·   ${'★'.repeat(r.bestStars)}`,
      { fontFamily: FONT_MONO, fontSize: '14px', color: isNew ? CSS_COLORS.activated : CSS_COLORS.muted },
    )
    .setOrigin(0.5);
  const keys = text(scene, CX, CY + 106, `ENTER  ${continueLabel}     R  REPLAY     ESC  CHAMBERS`, 13, CSS_COLORS.text)
    .setLetterSpacing(2);

  const overlay = scene.add
    .container(0, 0, [dim, panel, heading, name, starGfx, time, best, keys])
    .setDepth(DEPTH.overlay)
    .setAlpha(0);
  scene.tweens.add({ targets: overlay, alpha: 1, duration: 260 });
  return overlay;
}

export function starPoints(cx: number, cy: number, outer: number, inner: number): Phaser.Math.Vector2[] {
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return points;
}
