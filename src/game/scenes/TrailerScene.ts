import Phaser from 'phaser';
import { CSS_COLORS, FONT_MONO, FONT_UI, GAME_WIDTH, PALETTE, SCENE_KEYS } from '../config';
import { glowKey } from '../art/ProceduralTextures';
import { audio } from '../audio/AudioEngine';

const CX = GAME_WIDTH / 2;
const PLAY_URL = 'adil-infosec.github.io/SIX-SECONDS-OF-SUN';

type Card = { key: string; title: string; seconds: number; play: (s: TrailerScene) => void };

/**
 * The trailer's edited segments (docs/TRAILER_SHOTLIST.md), drawn in the
 * game's own style so they can be screen-recorded like the gameplay. These
 * are clearly cards, not gameplay: they show symbols and diagrams only.
 * Open with `?trailer`; press 1–5 to play a card, Esc for the menu.
 */
export class TrailerScene extends Phaser.Scene {
  private layer!: Phaser.GameObjects.Container;
  private menu!: Phaser.GameObjects.Container;

  constructor() {
    super(SCENE_KEYS.trailer);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.night);
    this.layer = this.add.container(0, 0);
    this.buildMenu();
    const kb = this.input.keyboard!;
    CARDS.forEach((card, i) => kb.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][i]}`, () => this.play(card)));
    kb.on('keydown-ESC', () => this.showMenu());
  }

  override update(_t: number, delta: number): void {
    const dt = delta / 1000;
    this.layer.each((o: Phaser.GameObjects.GameObject) => {
      const spin = o.getData('spin') as number | undefined;
      if (spin) (o as Phaser.GameObjects.Graphics).rotation += spin * dt;
    });
  }

  // ---- shared building blocks, used by the card scripts below ----

  clear(): void {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.layer.removeAll(true);
  }

  add2<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.layer.add(o);
    return o;
  }

  text(x: number, y: number, value: string, size: number, color: string, opts: { bold?: boolean; italic?: boolean; spacing?: number } = {}) {
    const style = opts.bold ? 'bold' : opts.italic ? 'italic' : 'normal';
    return this.add2(
      this.add
        .text(x, y, value, { fontFamily: FONT_UI, fontSize: `${size}px`, fontStyle: style, color, align: 'center' })
        .setOrigin(0.5)
        .setLetterSpacing(opts.spacing ?? 0)
        .setAlpha(0),
    );
  }

  glow(x: number, y: number, color: Parameters<typeof glowKey>[0], scale: number, alpha: number) {
    return this.add2(this.add.image(x, y, glowKey(color)).setBlendMode(Phaser.BlendModes.ADD).setScale(scale).setAlpha(alpha));
  }

  fadeIn(targets: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[], at: number, ms = 600, extra: object = {}) {
    this.tweens.add({ targets, alpha: 1, delay: at * 1000, duration: ms, ...extra });
  }

  at(seconds: number, fn: () => void): void {
    this.time.delayedCall(seconds * 1000, fn);
  }

  clockRing(x: number, y: number, radius: number, alpha = 0.8): Phaser.GameObjects.Graphics {
    const g = this.add2(this.add.graphics({ x, y }));
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const major = i % 5 === 0;
      g.lineStyle(major ? 3 : 1.5, major ? PALETTE.cyan : PALETTE.muted, major ? alpha : alpha * 0.5);
      g.lineBetween(Math.cos(a) * (radius - (major ? 12 : 6)), Math.sin(a) * (radius - (major ? 12 : 6)), Math.cos(a) * radius, Math.sin(a) * radius);
    }
    return g;
  }

  // ---- menu ----

  private buildMenu(): void {
    const items: Phaser.GameObjects.GameObject[] = [
      this.add
        .text(CX, 70, 'TRAILER CARDS', { fontFamily: FONT_UI, fontSize: '26px', fontStyle: 'bold', color: CSS_COLORS.gold })
        .setOrigin(0.5)
        .setLetterSpacing(6),
      this.add
        .text(CX, 104, 'Edited segments for the 3:00 trailer. Record each in full screen.', {
          fontFamily: FONT_UI,
          fontSize: '14px',
          color: CSS_COLORS.muted,
        })
        .setOrigin(0.5),
    ];
    CARDS.forEach((card, i) => {
      items.push(
        this.add
          .text(240, 160 + i * 52, `${i + 1}   ${card.title}`, { fontFamily: FONT_UI, fontSize: '20px', color: CSS_COLORS.text })
          .setOrigin(0, 0.5),
        this.add
          .text(720, 160 + i * 52, `${card.key}  ·  ${card.seconds}s`, { fontFamily: FONT_MONO, fontSize: '15px', color: CSS_COLORS.muted })
          .setOrigin(1, 0.5),
      );
    });
    items.push(
      this.add
        .text(CX, 470, 'PRESS 1–5 TO PLAY A CARD   ·   ESC MENU', { fontFamily: FONT_UI, fontSize: '13px', color: CSS_COLORS.text })
        .setOrigin(0.5)
        .setLetterSpacing(2),
    );
    this.menu = this.add.container(0, 0, items);
  }

  private showMenu(): void {
    this.clear();
    this.menu.setVisible(true);
  }

  private play(card: Card): void {
    this.clear();
    this.menu.setVisible(false);
    card.play(this);
  }
}

// ---- the five cards ---------------------------------------------------------

const CARDS: Card[] = [
  {
    key: '00:00–00:08',
    title: 'Opening: eclipse and title',
    seconds: 8,
    play: (s) => {
      const halo = s.glow(CX, 200, 'amber', 1.6, 0);
      const sun = s.add2(s.add.circle(CX, 200, 64, PALETTE.gold).setAlpha(0));
      const moon = s.add2(s.add.circle(CX, 200, 66, PALETTE.night));
      const ring = s.clockRing(CX, 200, 104);
      ring.setAlpha(0).setData('spin', 0.12);
      s.fadeIn([sun, ring], 0.4, 1200);
      s.tweens.add({ targets: halo, alpha: 0.6, delay: 1200, duration: 1500 });
      s.tweens.add({ targets: moon, x: CX + 18, y: 190, delay: 1200, duration: 2200, ease: 'Sine.easeInOut' });
      s.at(1.2, () => audio.sfx('ignite'));
      const title = s.text(CX, 350, 'SIX SECONDS OF SUN', 48, CSS_COLORS.text, { bold: true, spacing: 6 });
      const tag = s.text(CX, 400, 'Light the fire. Shape the shadow. Borrow six seconds.', 19, CSS_COLORS.muted, { italic: true });
      s.fadeIn(title, 3.6, 900);
      s.fadeIn(tag, 5, 900);
    },
  },
  {
    key: '00:28–00:38',
    title: 'Fire / Shadow / Time',
    seconds: 10,
    play: (s) => {
      const xs = [CX - 260, CX, CX + 260];
      const y = 230;
      const labels = ['FIRE', 'SHADOW', 'TIME'];
      const colors = [CSS_COLORS.gold, CSS_COLORS.ice, CSS_COLORS.cyan];
      const lines = s.add2(s.add.graphics().setAlpha(0));
      lines.lineStyle(2, PALETTE.muted, 0.5);
      lines.lineBetween(xs[0]! + 70, y, xs[1]! - 70, y);
      lines.lineBetween(xs[1]! + 70, y, xs[2]! - 70, y);
      xs.forEach((x, i) => {
        const icon = emblem(s, x, y, i);
        const label = s.text(x, y + 100, labels[i]!, 28, colors[i]!, { bold: true, spacing: 8 });
        const at = 0.5 + i * 1.5;
        s.fadeIn(icon, at, 600, { scale: { from: 0.7, to: 1 } });
        s.fadeIn(label, at + 0.2, 600);
        s.at(at, () => audio.sfx(i === 0 ? 'relay' : i === 1 ? 'rune' : 'echo'));
      });
      s.fadeIn(lines, 5, 800);
      s.fadeIn(s.text(CX, 440, 'One mechanism. Three powers.', 26, CSS_COLORS.text, { italic: true }), 5.6, 900);
    },
  },
  {
    key: '01:03–01:13',
    title: 'The six-second memory',
    seconds: 10,
    play: (s) => {
      const R = 120;
      const y = 220;
      s.glow(CX, y, 'ice', 1.2, 0.18);
      const track = s.add2(s.add.graphics());
      track.lineStyle(10, PALETTE.wall, 1);
      track.strokeCircle(CX, y, R);
      const arc = s.add2(s.add.graphics());
      const nums: Phaser.GameObjects.Text[] = [];
      for (let i = 1; i <= 6; i++) {
        const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
        const t = s.text(CX + Math.cos(a) * (R + 32), y + Math.sin(a) * (R + 32), String(i), 18, CSS_COLORS.muted, { bold: true });
        nums.push(t);
      }
      const label = s.text(CX, y, '6.0 s', 34, CSS_COLORS.ice, { bold: true });
      const echo = s.add2(s.add.circle(CX, y - R, 15, PALETTE.cyan, 0.2).setStrokeStyle(2.5, PALETTE.ice).setAlpha(0));
      const state = { fill: 0 };
      const draw = () => {
        arc.clear();
        arc.lineStyle(10, PALETTE.cyan, 1);
        arc.beginPath();
        const end = -Math.PI / 2 + state.fill * Math.PI * 2;
        arc.arc(CX, y, R, -Math.PI / 2, end);
        arc.strokePath();
        label.setText(`${(state.fill * 6).toFixed(1)} s`);
        // The echo rides the tip of the memory: backwards on the rewind, forwards on each loop.
        echo.setPosition(CX + Math.cos(end) * R, y + Math.sin(end) * R);
      };
      s.fadeIn(nums, 0.2, 500);
      s.fadeIn(label, 0.2, 500);
      // Memory fills, rewinds as the echo is called, then loops again with the echo riding it.
      s.tweens.add({ targets: state, fill: 1, delay: 300, duration: 3000, ease: 'Linear', onUpdate: draw });
      s.tweens.add({ targets: state, fill: 0, delay: 4300, duration: 1400, ease: 'Cubic.easeIn', onUpdate: draw });
      s.tweens.add({ targets: state, fill: 1, delay: 6000, duration: 3600, ease: 'Linear', onUpdate: draw });
      s.at(4.3, () => audio.sfx('echo'));
      s.fadeIn(echo, 4.3, 300);
      s.fadeIn(s.text(CX, 440, 'What if the past could stay?', 30, CSS_COLORS.text, { italic: true }), 4.8, 900);
    },
  },
  {
    key: '02:13–02:28',
    title: 'Synergy: how the three combine',
    seconds: 15,
    play: (s) => {
      const y = 210;
      const fire = { x: 150, y };
      const echoAt = { x: 330, y };
      const rune = { x: 620, y };
      const door = { x: 800, y };
      // A lit floor slab, so the shadow reads as a shadow.
      const floor = s.add2(s.add.rectangle(CX, y, 820, 200, PALETTE.slate).setAlpha(0));
      const light = s.glow(fire.x, fire.y, 'amber', 3.2, 0);
      // Flame.
      const flame = s.glow(fire.x, fire.y, 'amber', 0.6, 0);
      const core = s.add2(s.add.circle(fire.x, fire.y, 12, PALETTE.gold).setAlpha(0));
      // Echo and its shadow wedge toward the rune.
      const wedge = s.add2(s.add.graphics().setAlpha(0));
      wedge.fillStyle(PALETTE.night, 1);
      wedge.fillPoints(
        [
          new Phaser.Math.Vector2(echoAt.x, echoAt.y - 11),
          new Phaser.Math.Vector2(rune.x + 30, rune.y - 48),
          new Phaser.Math.Vector2(rune.x + 30, rune.y + 48),
          new Phaser.Math.Vector2(echoAt.x, echoAt.y + 11),
        ],
        true,
      );
      wedge.lineStyle(1.5, PALETTE.cyan, 0.6);
      wedge.lineBetween(echoAt.x, echoAt.y - 11, rune.x + 30, rune.y - 48);
      wedge.lineBetween(echoAt.x, echoAt.y + 11, rune.x + 30, rune.y + 48);
      const echo = s.add2(s.add.circle(echoAt.x, echoAt.y, 14, PALETTE.cyan, 0.18).setStrokeStyle(2.5, PALETTE.cyan).setAlpha(0));
      // Rune: violet until the shadow lands, then activated.
      const runeOff = s.add2(s.add.circle(rune.x, rune.y, 22).setStrokeStyle(3, PALETTE.violet).setAlpha(0));
      const runeOn = s.add2(s.add.circle(rune.x, rune.y, 22, PALETTE.activated, 0.25).setStrokeStyle(3, PALETTE.activated).setAlpha(0));
      // Door: two bars that slide apart.
      const top = s.add2(s.add.rectangle(door.x, door.y - 24, 22, 48, PALETTE.fire).setAlpha(0));
      const bottom = s.add2(s.add.rectangle(door.x, door.y + 24, 22, 48, PALETTE.fire).setAlpha(0));
      const arrow = (x1: number, x2: number) => {
        const g = s.add2(s.add.graphics().setAlpha(0));
        g.lineStyle(2, PALETTE.muted, 0.8);
        g.lineBetween(x1, y + 90, x2 - 10, y + 90);
        g.fillStyle(PALETTE.muted, 0.8);
        g.fillTriangle(x2, y + 90, x2 - 12, y + 84, x2 - 12, y + 96);
        return g;
      };

      const steps: [number, Phaser.GameObjects.GameObject[], string, string, Parameters<typeof audio.sfx>[0]][] = [
        [0.8, [floor, flame, core], 'FIRE: ignite the lens', CSS_COLORS.gold, 'ignite'],
        [3.8, [echo, wedge, runeOff], 'SHADOW: cover the rune', CSS_COLORS.ice, 'rune'],
        [6.8, [], 'TIME: replay six seconds', CSS_COLORS.cyan, 'echo'],
        [9.8, [runeOn, top, bottom], "SYNERGY: your echo's shadow opens the exit", CSS_COLORS.activated, 'gateOpen'],
      ];
      steps.forEach(([at, objs, caption, color, sound], i) => {
        if (objs.length) s.fadeIn(objs, at, 700);
        s.fadeIn(s.text(CX, 360 + i * 36, caption, 22, color, { bold: true, spacing: 1 }), at + 0.2, 600);
        s.at(at, () => audio.sfx(sound));
      });
      s.tweens.add({ targets: light, alpha: 0.3, delay: 800, duration: 900 });
      // TIME beat: the echo is a recording, so show it looping on the spot.
      s.at(6.8, () => s.tweens.add({ targets: echo, scale: 1.35, yoyo: true, repeat: 3, duration: 350 }));
      s.fadeIn([arrow(fire.x + 30, echoAt.x - 30), arrow(echoAt.x + 30, rune.x - 30), arrow(rune.x + 30, door.x - 20)], 9.8, 500);
      s.tweens.add({ targets: top, y: door.y - 70, delay: 10300, duration: 600, ease: 'Cubic.easeInOut' });
      s.tweens.add({ targets: bottom, y: door.y + 70, delay: 10300, duration: 600, ease: 'Cubic.easeInOut' });
    },
  },
  {
    key: '02:53–03:00',
    title: 'Outro: sunrise and title',
    seconds: 7,
    play: (s) => {
      const sky = s.add2(s.add.graphics().setAlpha(0));
      sky.fillStyle(PALETTE.amber, 0.6);
      sky.fillGradientStyle(PALETTE.violet, PALETTE.violet, PALETTE.amber, PALETTE.amber, 1);
      sky.fillRect(0, 0, GAME_WIDTH, 380);
      const halo = s.glow(CX, 460, 'amber', 2.4, 0.7);
      const sun = s.add2(s.add.circle(CX, 460, 64, PALETTE.gold));
      const ground = s.add2(s.add.rectangle(CX, 460, GAME_WIDTH, 160, PALETTE.night));
      s.add2(s.add.rectangle(CX, 380, GAME_WIDTH, 2, PALETTE.gold, 0.6));
      s.tweens.add({ targets: sky, alpha: 1, duration: 3000 });
      s.tweens.add({ targets: [sun, halo], y: 300, duration: 4000, ease: 'Sine.easeOut' });
      ground.setDepth(1);
      s.at(0.1, () => audio.sunrise([1.2, 2.4, 3.6], 4.2));
      s.fadeIn(s.text(CX, 90, 'SIX SECONDS OF SUN', 44, CSS_COLORS.text, { bold: true, spacing: 6 }), 2.2, 800);
      s.fadeIn(s.text(CX, 136, 'Light the fire. Shape the shadow. Borrow six seconds.', 18, CSS_COLORS.text, { italic: true }), 3, 800);
      s.fadeIn(s.text(CX, 470, `PLAY FREE IN THE BROWSER  ·  ${PLAY_URL}`, 15, CSS_COLORS.gold, { spacing: 1 }), 3.8, 800);
    },
  },
];

/** FIRE: flame. SHADOW: a body casting a wedge. TIME: a clock face with the six-second arc. */
function emblem(s: TrailerScene, x: number, y: number, kind: number): Phaser.GameObjects.Container {
  const parts: Phaser.GameObjects.GameObject[] = [];
  const disc = s.add.circle(0, 0, 62, PALETTE.slate).setStrokeStyle(2, PALETTE.wall);
  parts.push(disc);
  if (kind === 0) {
    parts.push(s.add.image(0, 4, glowKey('amber')).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6));
    parts.push(s.add.image(0, 8, glowKey('gold')).setBlendMode(Phaser.BlendModes.ADD).setScale(0.3));
    const g = s.add.graphics();
    g.fillStyle(PALETTE.gold, 1);
    g.fillTriangle(0, -30, -16, 10, 16, 10);
    g.fillCircle(0, 12, 16);
    g.fillStyle(0xfff4d6, 1);
    g.fillCircle(0, 14, 7);
    parts.push(g);
  } else if (kind === 1) {
    const g = s.add.graphics();
    g.fillStyle(PALETTE.night, 1);
    g.fillPoints([new Phaser.Math.Vector2(-14, -6), new Phaser.Math.Vector2(44, -30), new Phaser.Math.Vector2(44, 30), new Phaser.Math.Vector2(-14, 6)], true);
    g.lineStyle(1.5, PALETTE.violet, 0.9);
    g.lineBetween(-14, -6, 44, -30);
    g.lineBetween(-14, 6, 44, 30);
    g.fillStyle(PALETTE.text, 1);
    g.fillCircle(-20, 0, 12);
    g.lineStyle(2, PALETTE.gold, 1);
    g.strokeCircle(-20, 0, 11);
    parts.push(g);
  } else {
    const g = s.add.graphics();
    g.lineStyle(2, PALETTE.muted, 0.6);
    g.strokeCircle(0, 0, 36);
    g.lineStyle(5, PALETTE.cyan, 1);
    g.beginPath();
    g.arc(0, 0, 36, -Math.PI / 2, Math.PI);
    g.strokePath();
    g.lineStyle(3, PALETTE.ice, 1);
    g.lineBetween(0, 0, 0, -24);
    g.lineBetween(0, 0, 18, 8);
    parts.push(g);
  }
  return s.add2(s.add.container(x, y, parts).setAlpha(0));
}
