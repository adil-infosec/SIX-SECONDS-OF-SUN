import Phaser from 'phaser';
import { CSS_COLORS, DEPTH, FONT_UI, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';

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

export function starPoints(cx: number, cy: number, outer: number, inner: number): Phaser.Math.Vector2[] {
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return points;
}
