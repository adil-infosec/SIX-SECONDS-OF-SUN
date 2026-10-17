import Phaser from 'phaser';
import { CSS_COLORS, DEPTH, FONT_UI, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';
import { addKeyHints, drawGlassPanel, GlassButton } from './MenuStyle';

const CX = GAME_WIDTH / 2;
const CY = GAME_HEIGHT / 2;

function text(scene: Phaser.Scene, x: number, y: number, value: string, size: number, color: string, bold = false) {
  return scene.add
    .text(x, y, value, { fontFamily: FONT_UI, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', color })
    .setOrigin(0.5);
}

export type PauseActions = { resume: () => void; restart: () => void; chambers: () => void };

/**
 * Paused: a glass card over the dimmed room with RESUME, RESTART and
 * CHAMBERS. Clicking outside the card also resumes; Esc, R and M work as before.
 */
export function createPauseOverlay(scene: Phaser.Scene, title: string, actions: PauseActions): Phaser.GameObjects.Container {
  const dim = scene.add.rectangle(CX, CY, GAME_WIDTH, GAME_HEIGHT, PALETTE.night, 0.8).setInteractive();
  dim.on('pointerdown', actions.resume);
  const w = 420;
  const h = 312;
  const top = CY - h / 2;
  const panel = scene.add.graphics();
  drawGlassPanel(panel, CX - w / 2, top, w, h, 20, { border: 0x3a4b6e, borderAlpha: 1, fillAlpha: 0.96 });
  // The card swallows clicks so only the dim area outside it resumes.
  const card = scene.add.zone(CX, CY, w, h).setInteractive();
  const kicker = text(scene, CX, top + 30, title.toUpperCase(), 12, CSS_COLORS.cyan).setLetterSpacing(4);
  const heading = text(scene, CX, top + 62, 'PAUSED', 30, CSS_COLORS.gold, true)
    .setLetterSpacing(10)
    .setShadow(0, 0, CSS_COLORS.amber, 14, false, true);
  const items: [string, string, () => void][] = [
    ['RESUME', 'ESC', actions.resume],
    ['RESTART', 'R', actions.restart],
    ['CHAMBERS', '', actions.chambers],
  ];
  const buttons: GlassButton[] = [];
  const select = (i: number) => buttons.forEach((b, j) => b.setSelected(i === j));
  items.forEach(([label, key, run], i) => {
    buttons.push(new GlassButton(scene, CX, top + 120 + i * 52, 320, 42, label, key, { hover: () => select(i), press: run }));
  });
  select(0);
  const hints = addKeyHints(scene, CX, top + h - 24, [
    ['ESC', 'RESUME'],
    ['R', 'RESTART'],
    ['M', 'SOUND'],
  ]);
  return scene.add
    .container(0, 0, [dim, panel, card, kicker, heading, ...buttons.map((b) => b.root), hints])
    .setDepth(DEPTH.overlay)
    .setVisible(false);
}

/** Out of hearts: a brief "extinguished" card before the room restarts on its own. */
export function showFailOverlay(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const dim = scene.add.rectangle(CX, CY, GAME_WIDTH, GAME_HEIGHT, PALETTE.night, 0.7);
  const panel = scene.add.graphics();
  drawGlassPanel(panel, CX - 230, CY - 70, 460, 140, 20, { border: PALETTE.fire, borderAlpha: 0.9, fillAlpha: 0.94, halo: true });
  const title = text(scene, CX, CY - 16, 'EXTINGUISHED', 32, CSS_COLORS.fire, true)
    .setLetterSpacing(10)
    .setShadow(0, 0, CSS_COLORS.fire, 14, false, true);
  const hint = text(scene, CX, CY + 28, 'THE CHAMBER RESETS…', 13, CSS_COLORS.muted).setLetterSpacing(4);
  const overlay = scene.add.container(0, 0, [dim, panel, title, hint]).setDepth(DEPTH.overlay).setAlpha(0);
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
