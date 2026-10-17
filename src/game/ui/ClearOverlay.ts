import Phaser from 'phaser';
import { CSS_COLORS, DEPTH, FONT_MONO, FONT_UI, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';
import { glowKey, TEXTURE_KEYS } from '../art/ProceduralTextures';
import { audio } from '../audio/AudioEngine';
import { formatClearTime, type StarCount } from '../systems/Scoring';
import { drawGlassPanel, GlassButton } from './MenuStyle';
import { starPoints } from './Overlays';

const CX = GAME_WIDTH / 2;
const CY = GAME_HEIGHT / 2;
const PANEL_W = 540;
const PANEL_H = 364;
/** When the first star lands, and the gap between stars. */
const FIRST_STAR_MS = 520;
const STAR_GAP_MS = 340;

export type ClearSummary = {
  chamber: number;
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
  /** Mouse actions; the keyboard (Enter, R, Esc) is handled by the scene as before. */
  onContinue: () => void;
  onRetry: () => void;
};

/**
 * Chamber cleared: a frosted glass card over the dimmed room with a glowing
 * banner, the stars landing one by one with a burst of light, three stat
 * cards (time, hits, best) and glowing NEXT / RETRY buttons. It only shows
 * results; progress has already been saved by the scene.
 */
export function showClearOverlay(scene: Phaser.Scene, r: ClearSummary): Phaser.GameObjects.Container {
  const dim = scene.add.rectangle(CX, CY, GAME_WIDTH, GAME_HEIGHT, PALETTE.night, 0.62).setDepth(DEPTH.overlay).setAlpha(0);
  scene.tweens.add({ targets: dim, alpha: 1, duration: 260 });

  const card = scene.add.container(CX, CY).setDepth(DEPTH.overlay).setAlpha(0).setScale(0.9);
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    card.add(o);
    return o;
  };
  const top = -PANEL_H / 2;

  // Banner light behind the heading: a soft amber pool and slow rays.
  const pool = add(scene.add.image(0, top + 58, glowKey('amber')).setDisplaySize(560, 170).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD));
  scene.tweens.add({ targets: pool, alpha: 0.55, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const rays = add(scene.add.graphics({ x: 0, y: top + 60 }).setBlendMode(Phaser.BlendModes.ADD));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    rays.fillStyle(PALETTE.gold, 0.05);
    rays.fillTriangle(Math.cos(a - 0.07) * 30, Math.sin(a - 0.07) * 30, Math.cos(a + 0.07) * 30, Math.sin(a + 0.07) * 30, Math.cos(a) * 230, Math.sin(a) * 120);
  }
  scene.tweens.add({ targets: rays, angle: 360, duration: 40_000, repeat: -1 });

  const panel = add(scene.add.graphics());
  drawGlassPanel(panel, -PANEL_W / 2, top, PANEL_W, PANEL_H, 20, { border: PALETTE.gold, borderAlpha: 0.75, fillAlpha: 0.9, halo: true });
  // Banner ribbon across the top of the card.
  panel.fillStyle(PALETTE.amber, 0.1);
  panel.fillRoundedRect(-PANEL_W / 2 + 1, top + 1, PANEL_W - 2, 92, { tl: 19, tr: 19, bl: 0, br: 0 });
  panel.lineStyle(1, PALETTE.gold, 0.35);
  panel.lineBetween(-PANEL_W / 2 + 24, top + 93, PANEL_W / 2 - 24, top + 93);

  add(
    scene.add
      .text(0, top + 26, `CHAMBER ${String(r.chamber).padStart(2, '0')}  ·  ${r.title.toUpperCase()}`, {
        fontFamily: FONT_MONO,
        fontSize: '12px',
        color: CSS_COLORS.cyan,
      })
      .setOrigin(0.5)
      .setLetterSpacing(3),
  );
  const headingStyle = { fontFamily: FONT_UI, fontSize: '34px', fontStyle: 'bold' } as const;
  const headingGlow = add(
    scene.add
      .text(0, top + 60, 'CHAMBER CLEARED', { ...headingStyle, color: CSS_COLORS.amber })
      .setOrigin(0.5)
      .setLetterSpacing(7)
      .setShadow(0, 0, CSS_COLORS.amber, 22, false, true),
  );
  scene.tweens.add({ targets: headingGlow, alpha: 0.5, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const heading = add(
    scene.add
      .text(0, top + 60, 'CHAMBER CLEARED', { ...headingStyle, color: CSS_COLORS.gold, stroke: '#2A1606', strokeThickness: 2 })
      .setOrigin(0.5)
      .setLetterSpacing(7),
  );
  const fill = heading.context.createLinearGradient(0, 0, 0, heading.height);
  fill.addColorStop(0.15, '#FFF6DC');
  fill.addColorStop(0.55, CSS_COLORS.gold);
  fill.addColorStop(0.95, CSS_COLORS.amber);
  heading.setFill(fill);

  addStars(scene, card, r.stars, top + 140);
  addStats(scene, card, r, top + 222);

  // Buttons: the primary one glows from the start; hovering moves the glow.
  const buttons: GlassButton[] = [];
  let used = false;
  const once = (fn: () => void) => () => {
    if (used) return;
    used = true;
    audio.sfx('uiConfirm');
    fn();
  };
  const select = (i: number) => buttons.forEach((b, j) => b.setSelected(i === j));
  buttons.push(
    new GlassButton(scene, -78, top + 306, 230, 42, r.continueLabel, '', { hover: () => select(0), press: once(r.onContinue) }),
    new GlassButton(scene, 132, top + 306, 150, 42, 'RETRY', '', { hover: () => select(1), press: once(r.onRetry) }),
  );
  buttons.forEach((b) => add(b.root));
  select(0);
  add(
    scene.add
      .text(0, top + PANEL_H - 18, `ENTER  ${r.continueLabel}      R  RETRY      ESC  CHAMBERS`, { fontFamily: FONT_UI, fontSize: '11px', color: CSS_COLORS.muted })
      .setOrigin(0.5)
      .setLetterSpacing(3),
  );

  scene.tweens.add({ targets: card, alpha: 1, scale: 1, duration: 340, ease: 'Back.easeOut' });
  return card;
}

/** Empty sockets first, then each earned star lands in order with a flash and a spray of sparks. */
function addStars(scene: Phaser.Scene, card: Phaser.GameObjects.Container, stars: StarCount, y: number): void {
  const sparks = scene.add
    .particles(0, 0, TEXTURE_KEYS.sparks, {
      frame: ['gold', 'amber', 'ice'],
      lifespan: { min: 380, max: 760 },
      speed: { min: 70, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    })
    .setDepth(DEPTH.overlay + 1);
  card.once(Phaser.GameObjects.Events.DESTROY, () => sparks.destroy());

  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 76;
    const size = i === 1 ? 1.2 : 1;
    const socket = scene.add.graphics({ x, y });
    socket.fillStyle(PALETTE.night, 0.9);
    socket.fillCircle(0, 0, 30 * size);
    socket.lineStyle(1.5, PALETTE.ice, 0.22);
    socket.strokeCircle(0, 0, 30 * size);
    socket.lineStyle(1.5, PALETTE.muted, 0.5);
    socket.strokePoints(starPoints(0, 0, 18 * size, 7.6 * size), true);
    card.add(socket);
    if (i >= stars) continue;

    const glow = scene.add.image(x, y, glowKey('gold')).setScale(0).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    const star = scene.add.graphics({ x, y });
    star.fillStyle(PALETTE.amber, 1);
    star.fillPoints(starPoints(0, 1.5, 20 * size, 8.6 * size), true);
    star.fillStyle(PALETTE.gold, 1);
    star.fillPoints(starPoints(0, 0, 20 * size, 8.6 * size), true);
    star.fillStyle(0xffffff, 0.45);
    star.fillCircle(-4 * size, -6 * size, 2.6 * size);
    star.setScale(0);
    card.add([glow, star]);

    const delay = FIRST_STAR_MS + i * STAR_GAP_MS;
    scene.tweens.add({
      targets: star,
      scale: { from: 0, to: 1 },
      angle: { from: -70, to: 0 },
      delay,
      duration: 420,
      ease: 'Back.easeOut',
      onStart: () => {
        audio.sfx('checkpoint');
        sparks.explode(18, CX + x, CY + y);
      },
    });
    scene.tweens.add({ targets: glow, scale: { from: 0.2, to: 0.75 * size }, alpha: { from: 1, to: 0.35 }, delay, duration: 520, ease: 'Quad.easeOut' });
    // Earned stars keep breathing once they have landed.
    scene.tweens.add({ targets: glow, alpha: 0.6, delay: delay + 600, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}

/** Three high-contrast stat cards: clear time against par, hits taken, best record. */
function addStats(scene: Phaser.Scene, card: Phaser.GameObjects.Container, r: ClearSummary, y: number): void {
  const isNew = r.newBestTime || r.newBestStars;
  const underPar = r.clearTime <= r.parTime;
  const stats: { label: string; value: string; color: string; sub: string; subColor: string; accent: number; badge?: string }[] = [
    {
      label: 'CLEAR TIME',
      value: formatClearTime(r.clearTime),
      color: CSS_COLORS.ice,
      sub: `PAR ${formatClearTime(r.parTime)}`,
      subColor: underPar ? CSS_COLORS.activated : CSS_COLORS.muted,
      accent: PALETTE.cyan,
    },
    {
      label: 'HITS TAKEN',
      value: String(r.hits),
      color: r.hits === 0 ? CSS_COLORS.activated : CSS_COLORS.fire,
      sub: r.hits === 0 ? 'FLAWLESS' : r.hits === 1 ? '1 HIT' : `${r.hits} HITS`,
      subColor: r.hits === 0 ? CSS_COLORS.activated : CSS_COLORS.muted,
      accent: r.hits === 0 ? PALETTE.activated : PALETTE.fire,
    },
    {
      label: 'BEST RECORD',
      value: formatClearTime(r.bestTime),
      color: CSS_COLORS.gold,
      sub: '★'.repeat(r.bestStars) + '☆'.repeat(3 - r.bestStars),
      subColor: CSS_COLORS.gold,
      accent: PALETTE.gold,
      badge: isNew ? 'NEW BEST' : undefined,
    },
  ];
  const w = 152;
  const h = 76;
  stats.forEach((s, i) => {
    const x = (i - 1) * (w + 14);
    const box = scene.add.container(x, y + 12).setAlpha(0);
    const g = scene.add.graphics();
    drawGlassPanel(g, -w / 2, -h / 2, w, h, 12, { border: s.accent, borderAlpha: 0.45, fillAlpha: 0.85 });
    g.fillStyle(s.accent, 0.9);
    g.fillRoundedRect(-w / 2 + 18, -h / 2, w - 36, 2.5, 1.25);
    const label = scene.add.text(0, -h / 2 + 16, s.label, { fontFamily: FONT_UI, fontSize: '10px', fontStyle: 'bold', color: CSS_COLORS.muted }).setOrigin(0.5).setLetterSpacing(2);
    const value = scene.add
      .text(0, 2, s.value, { fontFamily: FONT_MONO, fontSize: '24px', fontStyle: 'bold', color: s.color })
      .setOrigin(0.5)
      .setShadow(0, 0, s.color, 8, false, true);
    const sub = scene.add.text(0, h / 2 - 14, s.sub, { fontFamily: FONT_MONO, fontSize: '11px', color: s.subColor }).setOrigin(0.5).setLetterSpacing(1);
    box.add([g, label, value, sub]);
    if (s.badge) {
      const chip = scene.add.graphics();
      const tag = scene.add.text(0, -h / 2 - 1, s.badge, { fontFamily: FONT_UI, fontSize: '9px', fontStyle: 'bold', color: CSS_COLORS.activated }).setOrigin(0.5).setLetterSpacing(2);
      const cw = tag.width + 18;
      chip.fillStyle(PALETTE.night, 1);
      chip.fillRoundedRect(-cw / 2, -h / 2 - 9, cw, 17, 8.5);
      chip.lineStyle(1, PALETTE.activated, 0.9);
      chip.strokeRoundedRect(-cw / 2, -h / 2 - 9, cw, 17, 8.5);
      box.add([chip, tag]);
      scene.tweens.add({ targets: [chip, tag], alpha: 0.45, delay: 1600, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    card.add(box);
    scene.tweens.add({ targets: box, alpha: 1, y, delay: 260 + i * 90, duration: 320, ease: 'Cubic.easeOut' });
  });
}
