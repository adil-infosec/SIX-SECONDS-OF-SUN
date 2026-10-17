import Phaser from 'phaser';
import { CSS_COLORS, DEPTH, FONT_MONO, FONT_UI, GAME_HEIGHT, GAME_WIDTH, PALETTE, TOTAL_CHAMBERS } from '../config';
import { glowKey } from '../art/ProceduralTextures';
import type { RunState } from '../systems/RoomSim';
import { formatClock } from '../systems/Scoring';
import { drawGlassPanel } from './MenuStyle';

const TOP_Y = 20;
const BOTTOM_Y = GAME_HEIGHT - 20;
const RIGHT_X = GAME_WIDTH - 52;
const HEART_GAP = 24;
const PILL_H = 22;

type Objectives = Pick<RunState, 'primaryLit' | 'relaysLit' | 'runesPowered' | 'gateOpen'>;

type Heart = { root: Phaser.GameObjects.Container; shape: Phaser.GameObjects.Graphics; glow: Phaser.GameObjects.Image };

type Pill = {
  root: Phaser.GameObjects.Container;
  frame: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  width: number;
  met: boolean | null;
  draw: (g: Phaser.GameObjects.Graphics, color: number, met: boolean) => void;
};

/**
 * Top band: chamber name, hearts, clock. Bottom band: objective badges on
 * the left, key hints on the right. Drawn on the wall frame; everything
 * redraws only when its value changes, so the HUD costs next to nothing per frame.
 */
export class HUD {
  private readonly scene: Phaser.Scene;
  private readonly clock: Phaser.GameObjects.Text;
  private readonly hearts: Heart[] = [];
  private readonly danger: Phaser.GameObjects.Graphics;
  private readonly muted: Phaser.GameObjects.Text;
  private readonly pills: { flame: Pill; rune: Pill | null; gate: Pill };
  private shownSeconds = -1;
  private shownHearts = -1;
  private shownObjectives = '';
  private heartsRight = 0;

  constructor(scene: Phaser.Scene, chamber: number, title: string, keyHints: string, runes = 0) {
    this.scene = scene;
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
    this.heartsRight = this.clock.x - this.clock.width - 22;
    this.danger = scene.add.graphics().setDepth(DEPTH.hud).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);

    this.muted = scene.add
      .text(RIGHT_X - 170, TOP_Y, 'MUTED', { fontFamily: FONT_UI, fontSize: '11px', color: CSS_COLORS.muted })
      .setOrigin(1, 0.5)
      .setLetterSpacing(2)
      .setDepth(DEPTH.hud)
      .setVisible(false);

    scene.add
      .text(RIGHT_X, BOTTOM_Y, keyHints, {
        fontFamily: FONT_UI,
        fontSize: '12px',
        color: CSS_COLORS.muted,
      })
      .setOrigin(1, 0.5)
      .setLetterSpacing(2)
      .setDepth(DEPTH.hud);

    let x = 52;
    const next = (draw: Pill['draw'], minLabel: string) => {
      const pill = this.makePill(x, draw, minLabel);
      x += pill.width + 8;
      return pill;
    };
    const flame = next(drawFlame, 'FLAME 0/0');
    const rune = runes > 0 ? next(drawRune, 'RUNE 0/0') : null;
    const gate = next(drawGate, 'GATE LOCKED');
    this.pills = { flame, rune, gate };
  }

  setTime(seconds: number): void {
    const whole = Math.floor(seconds);
    if (whole === this.shownSeconds) return;
    this.shownSeconds = whole;
    this.clock.setText(formatClock(seconds));
  }

  setHearts(count: number, max: number): void {
    if (count === this.shownHearts) return;
    const previous = this.shownHearts;
    this.shownHearts = count;
    while (this.hearts.length < max) this.hearts.push(this.makeHeart(this.hearts.length, max));
    const tweens = this.scene.tweens;
    this.hearts.forEach((heart, i) => {
      const full = i < count;
      tweens.killTweensOf([heart.root, heart.glow]);
      heart.root.setScale(1);
      drawHeart(heart.shape, full);
      heart.glow.setAlpha(full ? 0.32 : 0);
      // The heart just lost pops and fades into its outline.
      if (!full && previous > i) {
        heart.root.setScale(1.6);
        tweens.add({ targets: heart.root, scale: 1, duration: 320, ease: 'Back.easeOut' });
      }
    });

    // Last heart: it beats, with a red glow and a violet warning ring.
    tweens.killTweensOf(this.danger);
    this.danger.setAlpha(0);
    if (count === 1 && max > 1) {
      const last = this.hearts[0]!;
      this.danger.clear();
      this.danger.setPosition(last.root.x, last.root.y);
      this.danger.lineStyle(2, PALETTE.violet, 1);
      this.danger.strokeCircle(0, 0, 12);
      this.danger.lineStyle(1, PALETTE.fire, 0.8);
      this.danger.strokeCircle(0, 0, 16);
      tweens.add({ targets: last.root, scale: 1.22, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      tweens.add({ targets: last.glow, alpha: { from: 0.35, to: 0.95 }, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      tweens.add({ targets: this.danger, alpha: { from: 0.9, to: 0 }, scale: { from: 0.8, to: 1.7 }, duration: 760, repeat: -1, ease: 'Quad.easeOut' });
    }
  }

  setMuted(muted: boolean): void {
    this.muted.setVisible(muted);
  }

  /** Objective badges: flames lit, runes powered, gate open. Cheap when nothing changed. */
  setObjectives(s: Objectives): void {
    const flames = 1 + s.relaysLit.length;
    const lit = (s.primaryLit ? 1 : 0) + s.relaysLit.filter(Boolean).length;
    const runes = s.runesPowered.length;
    const powered = s.runesPowered.filter(Boolean).length;
    const signature = `${lit}/${flames}|${powered}/${runes}|${s.gateOpen}`;
    if (signature === this.shownObjectives) return;
    this.shownObjectives = signature;
    this.setPill(this.pills.flame, `FLAME ${lit}/${flames}`, lit === flames, PALETTE.amber, CSS_COLORS.amber);
    if (this.pills.rune) this.setPill(this.pills.rune, `RUNE ${powered}/${runes}`, powered === runes, PALETTE.activated, CSS_COLORS.activated);
    this.setPill(this.pills.gate, s.gateOpen ? 'GATE OPEN' : 'GATE LOCKED', s.gateOpen, PALETTE.cyan, CSS_COLORS.cyan);
  }

  private makeHeart(i: number, max: number): Heart {
    const x = this.heartsRight - (max - 1 - i) * HEART_GAP;
    const glow = this.scene.add.image(0, 0, glowKey('fire')).setScale(0.16).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    const shape = this.scene.add.graphics();
    const root = this.scene.add.container(x, TOP_Y, [glow, shape]).setDepth(DEPTH.hud);
    return { root, shape, glow };
  }

  private makePill(x: number, draw: Pill['draw'], minLabel: string): Pill {
    const label = this.scene.add
      .text(30, 0, minLabel, { fontFamily: FONT_UI, fontSize: '10px', fontStyle: 'bold', color: CSS_COLORS.muted })
      .setOrigin(0, 0.5)
      .setLetterSpacing(2);
    const width = Math.ceil(label.width) + 42;
    const frame = this.scene.add.graphics();
    const icon = this.scene.add.graphics({ x: 17, y: 0 });
    const root = this.scene.add.container(x, BOTTOM_Y, [frame, icon, label]).setDepth(DEPTH.hud);
    return { root, frame, icon, label, width, met: null, draw };
  }

  private setPill(pill: Pill, text: string, met: boolean, color: number, css: string): void {
    pill.label.setText(text).setColor(met ? css : CSS_COLORS.muted);
    pill.label.setShadow(0, 0, css, met ? 8 : 0, false, true);
    pill.frame.clear();
    drawGlassPanel(pill.frame, 0, -PILL_H / 2, pill.width, PILL_H, PILL_H / 2, {
      border: met ? color : PALETTE.ice,
      borderAlpha: met ? 0.85 : 0.2,
      fillAlpha: 0.75,
    });
    if (met) {
      pill.frame.fillStyle(color, 0.12);
      pill.frame.fillRoundedRect(0, -PILL_H / 2, pill.width, PILL_H, PILL_H / 2);
    }
    pill.icon.clear();
    pill.draw(pill.icon, met ? color : PALETTE.muted, met);
    // A badge that just turned on pops once.
    if (met && pill.met === false) {
      this.scene.tweens.killTweensOf(pill.root);
      pill.root.setScale(1.18);
      this.scene.tweens.add({ targets: pill.root, scale: 1, duration: 260, ease: 'Back.easeOut' });
    }
    pill.met = met;
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** A rounded heart from two lobes and a point, with a highlight when full. */
function drawHeart(g: Phaser.GameObjects.Graphics, full: boolean): void {
  const V = Phaser.Math.Vector2;
  const r = 4.4;
  const lobeY = -2.4;
  const outline = [new V(-2 * r + 0.3, lobeY + 1.6), new V(0, 8.6), new V(2 * r - 0.3, lobeY + 1.6)];
  g.clear();
  if (full) {
    g.fillStyle(0x7a1420, 1);
    g.fillCircle(-r, lobeY + 0.8, r);
    g.fillCircle(r, lobeY + 0.8, r);
    g.fillPoints(outline.map((p) => new V(p.x, p.y + 0.8)), true);
    g.fillStyle(PALETTE.fire, 1);
    g.fillCircle(-r, lobeY, r);
    g.fillCircle(r, lobeY, r);
    g.fillPoints(outline, true);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(-r - 0.6, lobeY - 1.6, 1.6);
  } else {
    g.lineStyle(1.5, PALETTE.muted, 0.55);
    g.beginPath();
    g.arc(-r, lobeY, r, Math.PI * 0.8, Math.PI * 1.98);
    g.arc(r, lobeY, r, Math.PI * 1.02, Math.PI * 0.2);
    g.lineTo(0, 8.6);
    g.closePath();
    g.strokePath();
  }
}

function drawFlame(g: Phaser.GameObjects.Graphics, color: number, met: boolean): void {
  g.fillStyle(color, met ? 1 : 0.7);
  g.fillCircle(0, 2, 4.5);
  g.fillTriangle(-4.5, 1.5, 4.5, 1.5, 0.8, -7);
  if (met) {
    g.fillStyle(PALETTE.gold, 1);
    g.fillCircle(0, 3, 2.2);
  }
}

function drawRune(g: Phaser.GameObjects.Graphics, color: number, met: boolean): void {
  g.lineStyle(1.5, color, met ? 1 : 0.7);
  g.strokeRect(-5, -5, 10, 10);
  g.lineBetween(-2.5, 0, 2.5, 0);
  g.lineBetween(0, -2.5, 0, 2.5);
  if (met) {
    g.fillStyle(color, 0.35);
    g.fillRect(-5, -5, 10, 10);
  }
}

function drawGate(g: Phaser.GameObjects.Graphics, color: number, met: boolean): void {
  g.lineStyle(1.5, color, met ? 1 : 0.7);
  g.beginPath();
  g.moveTo(-5, 6);
  g.lineTo(-5, -2);
  g.arc(0, -2, 5, Math.PI, 0);
  g.lineTo(5, 6);
  g.strokePath();
  if (met) {
    g.fillStyle(color, 0.35);
    g.fillRect(-3.5, -1, 7, 7);
  } else {
    g.fillStyle(color, 0.8);
    g.fillCircle(0, 1.5, 1.6);
    g.fillRect(-0.7, 1.5, 1.4, 3);
  }
}
