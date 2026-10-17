import Phaser from 'phaser';
import { CSS_COLORS, DEPTH, FONT_UI, GAME_HEIGHT, PALETTE } from '../config';
import { ECHO_SECONDS } from '../systems/EchoSystem';

const X = 66;
const Y = GAME_HEIGHT - 20;
const RADIUS = 12;
const STRIP_X = 88;
const STRIP_W = 120;

/**
 * Bottom-left HUD for the echo (GDD §8.3): a circular MEMORY meter that fills
 * with recorded seconds and shows `Q` when an echo can be made, plus a
 * 6-second timeline strip whose marker tracks the current echo's playback.
 */
export class MemoryMeter {
  private readonly scene: Phaser.Scene;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly strip: Phaser.GameObjects.Graphics;
  private readonly key: Phaser.GameObjects.Text;
  private shown = '';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.ring = scene.add.graphics().setDepth(DEPTH.hud);
    this.strip = scene.add.graphics().setDepth(DEPTH.hud);
    this.key = scene.add
      .text(X, Y, 'Q', { fontFamily: FONT_UI, fontSize: '12px', fontStyle: 'bold', color: CSS_COLORS.muted })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    scene.add
      .text(STRIP_X, Y - 7, 'MEMORY', { fontFamily: FONT_UI, fontSize: '9px', color: CSS_COLORS.muted })
      .setOrigin(0, 0.5)
      .setLetterSpacing(2)
      .setDepth(DEPTH.hud);
  }

  /** `echoT` is the current echo's playback time, or null with no echo. */
  update(memorySeconds: number, ready: boolean, echoT: number | null): void {
    const fill = Math.min(1, memorySeconds / ECHO_SECONDS);
    const marker = echoT === null ? -1 : echoT / ECHO_SECONDS;
    const signature = `${fill.toFixed(2)}|${ready}|${marker.toFixed(3)}`;
    if (signature === this.shown) return;
    this.shown = signature;

    const g = this.ring;
    g.clear();
    g.fillStyle(PALETTE.night, 0.9);
    g.fillCircle(X, Y, RADIUS + 2);
    g.lineStyle(2, PALETTE.muted, 0.25);
    g.strokeCircle(X, Y, RADIUS);
    if (fill > 0) {
      g.lineStyle(2.5, ready ? PALETTE.cyan : PALETTE.muted, ready ? 1 : 0.7);
      g.beginPath();
      g.arc(X, Y, RADIUS, -Math.PI / 2, -Math.PI / 2 + fill * Math.PI * 2);
      g.strokePath();
    }
    this.key.setColor(ready ? CSS_COLORS.ice : CSS_COLORS.muted);

    const s = this.strip;
    s.clear();
    const y = Y + 4;
    s.fillStyle(PALETTE.wall, 1);
    s.fillRect(STRIP_X, y - 2, STRIP_W, 4);
    s.lineStyle(1, PALETTE.muted, 0.5);
    for (let i = 0; i <= ECHO_SECONDS; i++) {
      const x = STRIP_X + (i / ECHO_SECONDS) * STRIP_W;
      s.lineBetween(x, y - 4, x, y + 4);
    }
    if (marker >= 0) {
      const x = STRIP_X + marker * STRIP_W;
      s.fillStyle(PALETTE.cyan, 0.5);
      s.fillRect(STRIP_X, y - 2, x - STRIP_X, 4);
      s.fillStyle(PALETTE.ice, 1);
      s.fillCircle(x, y, 3.5);
    }
  }

  /** Brief shake and red flash when `Q` is pressed too early. */
  deny(): void {
    this.key.setColor(CSS_COLORS.fire);
    this.scene.tweens.add({ targets: this.key, x: X + 3, duration: 40, yoyo: true, repeat: 2 });
    this.shown = '';
  }
}
