import Phaser from 'phaser';
import { CSS_COLORS, FONT_MONO, FONT_UI, GAME_WIDTH, PALETTE, SCENE_KEYS, TOTAL_CHAMBERS } from '../config';
import { LEVELS } from '../data/levels';
import { getProgress, setPreference } from '../progressState';
import { formatClearTime } from '../systems/Scoring';
import { starPoints } from '../ui/Overlays';

type LevelSelectData = { focus?: number };

const COLS = 3;
const CARD_W = 250;
const CARD_H = 150;
const GAP = 24;
const GRID_X = (GAME_WIDTH - (COLS * CARD_W + (COLS - 1) * GAP)) / 2;
const GRID_Y = 128;

/** Chamber list: six cards with best stars and time; locked chambers are dimmed. */
export class LevelSelectScene extends Phaser.Scene {
  private selected = 0;
  private focus?: number;
  private frames: Phaser.GameObjects.Graphics[] = [];
  private settings!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.levelSelect);
  }

  init(data: LevelSelectData): void {
    this.focus = data.focus;
    this.frames = [];
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.night);
    const progress = getProgress();
    const cleared = Object.keys(progress.best).length;
    const stars = Object.values(progress.best).reduce((sum, r) => sum + r.bestStars, 0);
    this.selected = Math.min(TOTAL_CHAMBERS, Math.max(1, this.focus ?? progress.unlocked)) - 1;

    this.add
      .text(GAME_WIDTH / 2, 58, 'CHAMBERS', { fontFamily: FONT_UI, fontSize: '28px', fontStyle: 'bold', color: CSS_COLORS.gold })
      .setOrigin(0.5)
      .setLetterSpacing(8);
    this.add
      .text(GAME_WIDTH / 2, 92, `${cleared} / ${TOTAL_CHAMBERS} CLEARED   ·   ★ ${stars} / ${TOTAL_CHAMBERS * 3}`, {
        fontFamily: FONT_MONO,
        fontSize: '14px',
        color: CSS_COLORS.muted,
      })
      .setOrigin(0.5);

    LEVELS.forEach((level, i) => this.drawCard(i, level.id, level.title, level.id <= progress.unlocked));

    this.add
      .text(GAME_WIDTH / 2, 482, 'ARROWS / WASD  SELECT     ENTER  PLAY     ESC  TITLE', {
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
    this.highlight();

    const kb = this.input.keyboard!;
    const move = (d: number) => {
      this.selected = Phaser.Math.Clamp(this.selected + d, 0, LEVELS.length - 1);
      this.highlight();
    };
    kb.on('keydown-LEFT', () => move(-1));
    kb.on('keydown-A', () => move(-1));
    kb.on('keydown-RIGHT', () => move(1));
    kb.on('keydown-D', () => move(1));
    kb.on('keydown-UP', () => move(-COLS));
    kb.on('keydown-W', () => move(-COLS));
    kb.on('keydown-DOWN', () => move(COLS));
    kb.on('keydown-S', () => move(COLS));
    // Ignore key repeat so a held Enter from the previous screen cannot start a chamber.
    kb.on('keydown-ENTER', (e: KeyboardEvent) => !e.repeat && this.play(this.selected));
    kb.on('keydown-ESC', (e: KeyboardEvent) => !e.repeat && this.scene.start(SCENE_KEYS.title));
    kb.on('keydown-M', () => {
      this.sound.mute = !this.sound.mute;
      setPreference({ muted: this.sound.mute });
      this.refreshSettings();
    });
    kb.on('keydown-V', () => {
      setPreference({ reducedShake: !getProgress().reducedShake });
      this.refreshSettings();
    });
    this.cameras.main.fadeIn(200, 5, 8, 15);
  }

  private play(index: number): void {
    const level = LEVELS[index];
    if (!level || level.id > getProgress().unlocked) {
      this.cameras.main.shake(90, 0.004);
      return;
    }
    this.scene.start(SCENE_KEYS.game, { levelId: level.id });
  }

  private refreshSettings(): void {
    const p = getProgress();
    this.settings.setText(`M  SOUND: ${this.sound.mute ? 'OFF' : 'ON'}      V  SCREEN SHAKE: ${p.reducedShake ? 'OFF' : 'ON'}`);
  }

  private highlight(): void {
    this.frames.forEach((g, i) => g.setVisible(i === this.selected));
  }

  private drawCard(index: number, id: number, title: string, unlocked: boolean): void {
    const x = GRID_X + (index % COLS) * (CARD_W + GAP);
    const y = GRID_Y + Math.floor(index / COLS) * (CARD_H + GAP);
    const record = getProgress().best[id];
    const alpha = unlocked ? 1 : 0.45;

    const card = this.add.graphics().setAlpha(alpha);
    card.fillStyle(PALETTE.slate, 1);
    card.fillRoundedRect(x, y, CARD_W, CARD_H, 12);
    card.lineStyle(1.5, PALETTE.wall, 1);
    card.strokeRoundedRect(x, y, CARD_W, CARD_H, 12);

    const frame = this.add.graphics();
    frame.lineStyle(2.5, PALETTE.gold, 1);
    frame.strokeRoundedRect(x - 3, y - 3, CARD_W + 6, CARD_H + 6, 14);
    frame.setVisible(false);
    this.frames.push(frame);

    this.add
      .text(x + 18, y + 14, String(id).padStart(2, '0'), {
        fontFamily: FONT_MONO,
        fontSize: '30px',
        fontStyle: 'bold',
        color: unlocked ? CSS_COLORS.gold : CSS_COLORS.muted,
      })
      .setAlpha(alpha);
    this.add
      .text(x + 18, y + 60, unlocked ? title : 'LOCKED', {
        fontFamily: FONT_UI,
        fontSize: '16px',
        color: unlocked ? CSS_COLORS.text : CSS_COLORS.muted,
        wordWrap: { width: CARD_W - 36 },
      })
      .setAlpha(alpha);

    const stars = this.add.graphics().setAlpha(alpha);
    for (let s = 0; s < 3; s++) {
      const points = starPoints(x + 28 + s * 26, y + CARD_H - 30, 10, 4.5);
      if (record && s < record.bestStars) {
        stars.fillStyle(PALETTE.gold, 1);
        stars.fillPoints(points, true);
      } else {
        stars.lineStyle(1.5, PALETTE.muted, 0.6);
        stars.strokePoints(points, true);
      }
    }
    this.add
      .text(x + CARD_W - 18, y + CARD_H - 30, record ? formatClearTime(record.bestTime) : '—', {
        fontFamily: FONT_MONO,
        fontSize: '14px',
        color: CSS_COLORS.muted,
      })
      .setOrigin(1, 0.5)
      .setAlpha(alpha);

    if (!unlocked) {
      const lock = this.add.graphics();
      const lx = x + CARD_W - 34;
      const ly = y + 30;
      lock.lineStyle(2, PALETTE.muted, 0.8);
      lock.strokeRoundedRect(lx - 9, ly - 2, 18, 14, 3);
      lock.beginPath();
      lock.arc(lx, ly - 2, 6, Math.PI, 0);
      lock.strokePath();
    }

    const hit = this.add.zone(x, y, CARD_W, CARD_H).setOrigin(0).setInteractive({ useHandCursor: unlocked });
    hit.on('pointerover', () => {
      this.selected = index;
      this.highlight();
    });
    hit.on('pointerdown', () => this.play(index));
  }
}
