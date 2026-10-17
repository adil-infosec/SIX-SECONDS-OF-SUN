import Phaser from 'phaser';
import { CAMPAIGN_CHAMBERS, CSS_COLORS, FONT_MONO, FONT_UI, GAME_WIDTH, PALETTE, SCENE_KEYS, TOTAL_CHAMBERS } from '../config';
import { glowKey } from '../art/ProceduralTextures';
import { audio } from '../audio/AudioEngine';
import { CAPTURE } from '../captureMode';
import { LEVELS } from '../data/levels';
import { getProgress, setPreference } from '../progressState';
import type { ChamberRecord } from '../systems/Progress';
import { formatClearTime } from '../systems/Scoring';
import { addMenuBackdrop, drawCornerBrackets, drawGlassPanel } from '../ui/MenuStyle';
import { starPoints } from '../ui/Overlays';

type LevelSelectData = { focus?: number };

const COLS = 3;
const CARD_W = 250;
const CARD_H = 150;
const GAP = 24;
const GRID_X = (GAME_WIDTH - (COLS * CARD_W + (COLS - 1) * GAP)) / 2;
const GRID_Y = 128;
/** One page per six chambers: the campaign, then the bonus chambers. */
const PER_PAGE = 6;
const PAGES = Math.ceil(TOTAL_CHAMBERS / PER_PAGE);
const PAGE_NAMES = ['CAMPAIGN', 'BONUS'];

/** Highest playable chamber; capture mode opens all of them without saving. */
function unlockedUpTo(): number {
  return CAPTURE ? TOTAL_CHAMBERS : getProgress().unlocked;
}

type CardView = {
  page: number;
  /** Carries the rise-in and the page's visibility; `root` inside it scales when selected. */
  rise: Phaser.GameObjects.Container;
  hit: Phaser.GameObjects.Zone;
  restY: number;
  root: Phaser.GameObjects.Container;
  frame: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Image;
  number: Phaser.GameObjects.Text;
  unlocked: boolean;
  cleared: boolean;
};

/**
 * Chamber list: glass cards with best stars and time, six to a page (the
 * campaign, then the bonus chambers); locked chambers are dimmed.
 */
export class LevelSelectScene extends Phaser.Scene {
  private selected = 0;
  private focus?: number;
  private page = 0;
  private cards: CardView[] = [];
  private tabs: { frame: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; x: number; w: number }[] = [];
  private settings!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.levelSelect);
  }

  init(data: LevelSelectData): void {
    this.focus = data.focus;
    this.cards = [];
    this.tabs = [];
  }

  create(): void {
    addMenuBackdrop(this);
    const progress = getProgress();
    // Capture mode starts from chamber 1 so recording takes go in order.
    this.selected = Math.min(TOTAL_CHAMBERS, Math.max(1, this.focus ?? (CAPTURE ? 1 : unlockedUpTo()))) - 1;
    this.page = Math.floor(this.selected / PER_PAGE);

    this.drawHeader();
    LEVELS.forEach((level, i) => this.drawCard(i, level.id, level.title, level.id <= unlockedUpTo(), progress.best[level.id]));
    this.showPage(this.page);

    this.add
      .text(GAME_WIDTH / 2, 482, 'ARROWS / WASD  SELECT     Q / E  PAGE     ENTER  PLAY     ESC  TITLE', {
        fontFamily: FONT_UI,
        fontSize: '13px',
        color: CSS_COLORS.text,
      })
      .setOrigin(0.5)
      .setLetterSpacing(2);
    this.settings = this.add
      .text(GAME_WIDTH / 2, 510, '', { fontFamily: FONT_UI, fontSize: '12px', color: CSS_COLORS.muted })
      .setOrigin(0.5)
      .setLetterSpacing(2);
    this.refreshSettings();
    this.highlight(true);

    const kb = this.input.keyboard!;
    // Left and right run on across the page edge into the next page.
    const move = (dx: number, dy: number) => {
      const local = this.selected % PER_PAGE;
      let page = Math.floor(this.selected / PER_PAGE);
      let col = (local % COLS) + dx;
      const row = Phaser.Math.Clamp(Math.floor(local / COLS) + dy, 0, PER_PAGE / COLS - 1);
      if (col >= COLS) [page, col] = page < PAGES - 1 ? [page + 1, 0] : [page, COLS - 1];
      if (col < 0) [page, col] = page > 0 ? [page - 1, COLS - 1] : [page, 0];
      this.select(Math.min(LEVELS.length - 1, page * PER_PAGE + row * COLS + col));
    };
    const flip = (d: number) => {
      const page = Phaser.Math.Clamp(this.page + d, 0, PAGES - 1);
      this.select(Math.min(LEVELS.length - 1, page * PER_PAGE + (this.selected % PER_PAGE)));
    };
    kb.on('keydown-LEFT', () => move(-1, 0));
    kb.on('keydown-A', () => move(-1, 0));
    kb.on('keydown-RIGHT', () => move(1, 0));
    kb.on('keydown-D', () => move(1, 0));
    kb.on('keydown-UP', () => move(0, -1));
    kb.on('keydown-W', () => move(0, -1));
    kb.on('keydown-DOWN', () => move(0, 1));
    kb.on('keydown-S', () => move(0, 1));
    kb.on('keydown-Q', () => flip(-1));
    kb.on('keydown-E', () => flip(1));
    kb.on('keydown-PAGE_UP', () => flip(-1));
    kb.on('keydown-PAGE_DOWN', () => flip(1));
    // Ignore key repeat so a held Enter from the previous screen cannot start a chamber.
    kb.on('keydown-ENTER', (e: KeyboardEvent) => !e.repeat && this.play(this.selected));
    kb.on('keydown-ESC', (e: KeyboardEvent) => !e.repeat && this.scene.start(SCENE_KEYS.title));
    kb.on('keydown-M', () => {
      const muted = !getProgress().muted;
      audio.setMuted(muted);
      setPreference({ muted });
      this.refreshSettings();
    });
    kb.on('keydown-V', () => {
      setPreference({ reducedShake: !getProgress().reducedShake });
      this.refreshSettings();
    });
    this.cameras.main.fadeIn(200, 5, 8, 15);
  }

  /** Moves the selection, flipping the page when it crosses one. */
  private select(index: number): void {
    if (index === this.selected) return;
    audio.sfx('uiMove');
    this.selected = index;
    const page = Math.floor(index / PER_PAGE);
    if (page !== this.page) this.showPage(page);
    this.highlight();
  }

  /** Shows one page of cards (they rise in again) and lights its tab. */
  private showPage(page: number): void {
    this.page = page;
    let order = 0;
    for (const card of this.cards) {
      const on = card.page === page;
      card.rise.setVisible(on);
      if (on) card.hit.setInteractive({ useHandCursor: card.unlocked });
      else card.hit.disableInteractive();
      if (!on) continue;
      this.tweens.killTweensOf(card.rise);
      card.rise.setY(card.restY + 14).setAlpha(0);
      this.tweens.add({
        targets: card.rise,
        y: card.restY,
        alpha: card.unlocked ? 1 : 0.5,
        delay: 40 + order++ * 55,
        duration: 320,
        ease: 'Cubic.easeOut',
      });
    }
    this.tabs.forEach((tab, i) => {
      const active = i === page;
      tab.frame.clear();
      drawGlassPanel(tab.frame, tab.x - tab.w / 2, 84, tab.w, 24, 12, {
        border: active ? PALETTE.amber : PALETTE.ice,
        borderAlpha: active ? 0.9 : 0.25,
        fillAlpha: active ? 0.8 : 0.6,
      });
      tab.label.setColor(active ? CSS_COLORS.gold : CSS_COLORS.muted);
    });
  }

  private play(index: number): void {
    const level = LEVELS[index];
    if (!level || level.id > unlockedUpTo()) {
      audio.sfx('uiLocked');
      this.cameras.main.shake(90, 0.004);
      return;
    }
    audio.sfx('uiConfirm');
    this.scene.start(SCENE_KEYS.game, { levelId: level.id });
  }

  private refreshSettings(): void {
    const p = getProgress();
    this.settings.setText(`M  SOUND: ${p.muted ? 'OFF' : 'ON'}      V  SCREEN SHAKE: ${p.reducedShake ? 'OFF' : 'ON'}`);
  }

  private drawHeader(): void {
    const cx = GAME_WIDTH / 2;
    this.add
      .text(cx, 30, 'SOLAR OBSERVATORY  ·  LIGHT ENGINE', { fontFamily: FONT_MONO, fontSize: '11px', color: CSS_COLORS.cyan })
      .setOrigin(0.5)
      .setLetterSpacing(5)
      .setAlpha(0.8);
    this.add
      .text(cx, 60, 'CHAMBERS', { fontFamily: FONT_UI, fontSize: '30px', fontStyle: 'bold', color: CSS_COLORS.gold })
      .setOrigin(0.5)
      .setLetterSpacing(10)
      .setShadow(0, 0, CSS_COLORS.amber, 18, false, true);

    // One tab per page, with that page's progress; click a tab to open it.
    const best = getProgress().best;
    const w = 236;
    for (let page = 0; page < PAGES; page++) {
      const ids = LEVELS.filter((_l, i) => Math.floor(i / PER_PAGE) === page).map((l) => l.id);
      const cleared = ids.filter((id) => best[id]).length;
      const stars = ids.reduce((sum, id) => sum + (best[id]?.bestStars ?? 0), 0);
      const locked = page > 0 && unlockedUpTo() <= CAMPAIGN_CHAMBERS;
      const x = cx + (page - (PAGES - 1) / 2) * (w + 14);
      const frame = this.add.graphics();
      const progress = locked ? 'LOCKED' : `${cleared}/${ids.length}   ★ ${stars}/${ids.length * 3}`;
      const label = this.add
        .text(x, 96, `${PAGE_NAMES[page] ?? 'PAGE'}   ${progress}`, {
          fontFamily: FONT_MONO,
          fontSize: '12px',
          fontStyle: 'bold',
          color: CSS_COLORS.muted,
        })
        .setOrigin(0.5)
        .setLetterSpacing(1)
        .setDepth(1);
      const hit = this.add.zone(x, 96, w, 24).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.select(Math.min(LEVELS.length - 1, page * PER_PAGE + (this.selected % PER_PAGE))));
      this.tabs.push({ frame, label, x, w });
    }
  }

  /** Selected card: amber rim and halo, a soft glow behind, a small lift. */
  private highlight(instant = false): void {
    this.cards.forEach((card, i) => {
      const on = i === this.selected;
      this.drawFrame(card, on);
      this.tweens.killTweensOf([card.root, card.glow]);
      const scale = on ? 1.04 : 1;
      const glow = on ? 0.32 : 0;
      if (instant) {
        card.root.setScale(scale);
        card.glow.setAlpha(glow);
      } else {
        this.tweens.add({ targets: card.root, scale, duration: 160, ease: 'Quad.easeOut' });
        this.tweens.add({ targets: card.glow, alpha: glow, duration: 200 });
      }
      if (on) this.tweens.add({ targets: card.glow, alpha: { from: 0.22, to: 0.42 }, delay: 200, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      card.number.setShadow(0, 0, card.cleared ? CSS_COLORS.activated : CSS_COLORS.amber, on && card.unlocked ? 18 : card.unlocked ? 8 : 0, false, true);
    });
  }

  private drawFrame(card: CardView, on: boolean): void {
    const w = CARD_W;
    const h = CARD_H;
    const accent = !card.unlocked ? PALETTE.muted : card.cleared ? PALETTE.activated : PALETTE.gold;
    card.frame.clear();
    drawGlassPanel(card.frame, -w / 2, -h / 2, w, h, 14, {
      border: on ? PALETTE.amber : PALETTE.ice,
      borderAlpha: on ? 0.95 : 0.22,
      fillAlpha: on ? 0.8 : 0.66,
      halo: on,
    });
    // Accent strip down the left edge: teal when cleared, gold when open, grey when locked.
    card.frame.fillStyle(accent, card.unlocked ? 0.9 : 0.4);
    card.frame.fillRoundedRect(-w / 2 + 8, -h / 2 + 18, 3, h - 36, 1.5);
    drawCornerBrackets(card.frame, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 12, on ? PALETTE.gold : PALETTE.ice, on ? 0.7 : 0.3);
  }

  private drawCard(index: number, id: number, title: string, unlocked: boolean, record: ChamberRecord | undefined): void {
    const local = index % PER_PAGE;
    const x = GRID_X + (local % COLS) * (CARD_W + GAP);
    const y = GRID_Y + Math.floor(local / COLS) * (CARD_H + GAP);
    const left = -CARD_W / 2;
    const top = -CARD_H / 2;
    const cleared = !!record;

    const glow = this.add
      .image(0, 0, glowKey('amber'))
      .setDisplaySize(CARD_W * 1.5, CARD_H * 1.9)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    const frame = this.add.graphics();
    const label = String(id).padStart(2, '0');
    const numberStyle = { fontFamily: FONT_MONO, fontSize: '38px', fontStyle: 'bold' } as const;
    const ghost = this.add
      .text(left + 26, top + 14, label, { ...numberStyle, color: CSS_COLORS.cyan })
      .setAlpha(unlocked ? 0.22 : 0);
    const number = this.add.text(left + 22, top + 12, label, {
      ...numberStyle,
      color: !unlocked ? CSS_COLORS.muted : cleared ? CSS_COLORS.activated : CSS_COLORS.gold,
    });
    const name = this.add.text(left + 22, top + 64, unlocked ? title : 'LOCKED', {
      fontFamily: FONT_UI,
      fontSize: '16px',
      fontStyle: unlocked ? 'bold' : 'normal',
      color: unlocked ? CSS_COLORS.text : CSS_COLORS.muted,
      wordWrap: { width: CARD_W - 44 },
    });

    const parts: Phaser.GameObjects.GameObject[] = [glow, frame, ghost, number, name];
    parts.push(...this.statusChip(left + CARD_W - 16, top + 22, unlocked, cleared));

    const rule = this.add.graphics();
    rule.lineStyle(1, PALETTE.ice, 0.14);
    rule.lineBetween(left + 22, top + CARD_H - 50, left + CARD_W - 16, top + CARD_H - 50);
    parts.push(rule);

    parts.push(...this.starBadges(left + 34, top + CARD_H - 26, record, local));

    const clock = this.add.graphics();
    const time = this.add
      .text(left + CARD_W - 16, top + CARD_H - 19, record ? formatClearTime(record.bestTime) : '--:--', {
        fontFamily: FONT_MONO,
        fontSize: '15px',
        fontStyle: 'bold',
        color: record ? CSS_COLORS.ice : CSS_COLORS.muted,
      })
      .setOrigin(1, 0.5);
    const caption = this.add
      .text(left + CARD_W - 16, top + CARD_H - 36, 'BEST TIME', { fontFamily: FONT_UI, fontSize: '9px', color: CSS_COLORS.muted })
      .setOrigin(1, 0.5)
      .setLetterSpacing(2);
    const cx = left + CARD_W - 30 - time.width;
    clock.lineStyle(1.5, record ? PALETTE.cyan : PALETTE.muted, record ? 0.9 : 0.5);
    clock.strokeCircle(cx, top + CARD_H - 19, 6);
    clock.lineBetween(cx, top + CARD_H - 19, cx, top + CARD_H - 23);
    clock.lineBetween(cx, top + CARD_H - 19, cx + 3, top + CARD_H - 18);
    parts.push(clock, time, caption);

    // `root` scales when selected; the outer container only carries the rise-in, so the two tweens never clash.
    const root = this.add.container(0, 0, parts);
    const cy = y + CARD_H / 2;
    const rise = this.add.container(x + CARD_W / 2, cy + 14, [root]).setAlpha(0);
    const hit = this.add.zone(x, y, CARD_W, CARD_H).setOrigin(0);
    hit.on('pointerover', () => this.select(index));
    hit.on('pointerdown', () => this.play(index));
    const page = Math.floor(index / PER_PAGE);
    const card: CardView = { page, rise, hit, restY: cy, root, frame, glow, number, unlocked, cleared };
    this.cards.push(card);
    this.drawFrame(card, false);
  }

  /** Top-right chip: CLEARED, NEW or a padlock with LOCKED. */
  private statusChip(right: number, y: number, unlocked: boolean, cleared: boolean): Phaser.GameObjects.GameObject[] {
    const [text, color, css] = !unlocked
      ? ['LOCKED', PALETTE.muted, CSS_COLORS.muted]
      : cleared
        ? ['CLEARED', PALETTE.activated, CSS_COLORS.activated]
        : ['NEW', PALETTE.gold, CSS_COLORS.gold];
    const label = this.add.text(0, y, text, { fontFamily: FONT_UI, fontSize: '10px', fontStyle: 'bold', color: css }).setOrigin(0.5).setLetterSpacing(2);
    const pad = unlocked ? 10 : 24;
    const w = label.width + pad + 10;
    const chip = this.add.graphics();
    chip.fillStyle(color, 0.12);
    chip.fillRoundedRect(right - w, y - 10, w, 20, 10);
    chip.lineStyle(1, color, 0.6);
    chip.strokeRoundedRect(right - w, y - 10, w, 20, 10);
    label.setX(right - w / 2 + (unlocked ? 0 : 7));
    if (!unlocked) {
      const lx = right - w + 13;
      chip.lineStyle(1.5, color, 0.9);
      chip.strokeRoundedRect(lx - 5, y - 2, 10, 8, 2);
      chip.beginPath();
      chip.arc(lx, y - 2, 3.5, Math.PI, 0);
      chip.strokePath();
    }
    if (unlocked && !cleared) this.tweens.add({ targets: label, alpha: 0.45, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return [chip, label];
  }

  /** Three round badges; earned stars pop in, then shimmer one after another. */
  private starBadges(x: number, y: number, record: ChamberRecord | undefined, card: number): Phaser.GameObjects.GameObject[] {
    const parts: Phaser.GameObjects.GameObject[] = [];
    for (let s = 0; s < 3; s++) {
      const bx = x + s * 30;
      const earned = !!record && s < record.bestStars;
      const disc = this.add.graphics();
      disc.fillStyle(PALETTE.night, 0.85);
      disc.fillCircle(bx, y, 12);
      disc.lineStyle(1.2, earned ? PALETTE.gold : PALETTE.muted, earned ? 0.9 : 0.35);
      disc.strokeCircle(bx, y, 12);
      parts.push(disc);
      if (!earned) {
        const empty = this.add.graphics();
        empty.lineStyle(1.2, PALETTE.muted, 0.45);
        empty.strokePoints(starPoints(bx, y, 7, 3.2), true);
        parts.push(empty);
        continue;
      }
      const glow = this.add.image(bx, y, glowKey('gold')).setScale(0.16).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
      const star = this.add.graphics({ x: bx, y });
      star.fillStyle(PALETTE.gold, 1);
      star.fillPoints(starPoints(0, 0, 8, 3.6), true);
      star.setScale(0);
      const delay = 260 + card * 70 + s * 120;
      this.tweens.add({ targets: star, scale: 1, angle: { from: -40, to: 0 }, delay, duration: 380, ease: 'Back.easeOut' });
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.15, to: 0.6 },
        delay: delay + 400 + s * 260,
        duration: 1300,
        yoyo: true,
        repeat: -1,
        repeatDelay: 900,
        ease: 'Sine.easeInOut',
      });
      parts.push(glow, star);
    }
    return parts;
  }
}
