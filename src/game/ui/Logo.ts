import Phaser from 'phaser';
import { glowKey } from '../art/ProceduralTextures';
import logoUrl from '../../assets/title-logo.png';

/**
 * The game logo from the title-screen design (src/assets/title-logo.png, cut
 * out of "Six Seconds of Sun UI.pdf" with a transparent background). Loaded
 * at boot; every user falls back to plain text if it failed to load.
 */
export const LOGO_KEY = 'img-title-logo';
/** Where the eclipse emblem sits in the image, as fractions of its size. */
const EMBLEM = { x: 0.248, y: 0.605 } as const;

export function preloadLogo(scene: Phaser.Scene): void {
  scene.load.image(LOGO_KEY, logoUrl);
}

export function hasLogo(scene: Phaser.Scene): boolean {
  return scene.textures.exists(LOGO_KEY);
}

/**
 * Adds the logo centered on `x` with its top at `y`, `width` px wide, with a
 * warm breathing glow behind the emblem and a gentle float. Returns the
 * logo's height, or 0 when the image is not available.
 */
export function addLogo(scene: Phaser.Scene, x: number, y: number, width: number, animate = true): number {
  if (!hasLogo(scene)) return 0;
  const frame = scene.textures.getFrame(LOGO_KEY);
  const scale = width / frame.width;
  const height = frame.height * scale;
  const ex = x - width / 2 + width * EMBLEM.x;
  const ey = y + height * EMBLEM.y;
  const glow = scene.add.image(ex, ey, glowKey('amber')).setScale(width / 520).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD);
  const logo = scene.add.image(x, y, LOGO_KEY).setOrigin(0.5, 0).setScale(scale);
  if (animate) {
    scene.tweens.add({ targets: glow, alpha: 0.85, scale: (width / 520) * 1.15, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: [logo, glow], y: '-=4', duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  return height;
}
