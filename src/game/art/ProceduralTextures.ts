import Phaser from 'phaser';

export const TEXTURE_KEYS = {
  glow: 'tex-glow',
  ember: 'tex-ember',
} as const;

/**
 * Builds every shared texture once at boot. All art is generated in code
 * (no external image files), so there is nothing to license.
 */
export function generateTextures(scene: Phaser.Scene): void {
  makeRadialGlow(scene, TEXTURE_KEYS.glow, 256);
  makeRadialGlow(scene, TEXTURE_KEYS.ember, 16);
}

/** White radial falloff; tint it at use time to get fire, cyan, etc. */
function makeRadialGlow(scene: Phaser.Scene, key: string, size: number): void {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, size, size);
  if (!canvas) return;
  const ctx = canvas.getContext();
  const r = size / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.15)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
}
