import Phaser from 'phaser';

/**
 * Glows and sparks are generated already colored instead of tinted at use
 * time: Phaser's Canvas renderer ignores tints, and the game must still look
 * right when a browser falls back from WebGL to Canvas.
 */
const COLORS = {
  gold: [255, 200, 87],
  amber: [255, 151, 54],
  fire: [246, 91, 62],
  ice: [177, 250, 255],
  activated: [42, 233, 198],
} as const;

export type GlowColor = keyof typeof COLORS;

const GLOW_SIZE = 256;
const SPARK_SIZE = 16;

export const TEXTURE_KEYS = {
  /** One 16 px spark frame per color, named after the color. */
  sparks: 'tex-sparks',
} as const;

export function glowKey(color: GlowColor): string {
  return `tex-glow-${color}`;
}

/** Builds every shared texture once at boot. All art is generated in code. */
export function generateTextures(scene: Phaser.Scene): void {
  const colors = Object.keys(COLORS) as GlowColor[];
  for (const color of colors) {
    const key = glowKey(color);
    if (scene.textures.exists(key)) continue;
    const canvas = scene.textures.createCanvas(key, GLOW_SIZE, GLOW_SIZE);
    if (!canvas) continue;
    paintGlow(canvas.getContext(), 0, GLOW_SIZE, COLORS[color]);
    canvas.refresh();
  }

  if (!scene.textures.exists(TEXTURE_KEYS.sparks)) {
    const sheet = scene.textures.createCanvas(TEXTURE_KEYS.sparks, SPARK_SIZE * colors.length, SPARK_SIZE);
    if (!sheet) return;
    const ctx = sheet.getContext();
    colors.forEach((color, i) => {
      paintGlow(ctx, i * SPARK_SIZE, SPARK_SIZE, COLORS[color]);
      sheet.add(color, 0, i * SPARK_SIZE, 0, SPARK_SIZE, SPARK_SIZE);
    });
    sheet.refresh();
  }
}

/** Radial falloff of one color in a `size` square starting at `x`. */
function paintGlow(ctx: CanvasRenderingContext2D, x: number, size: number, rgb: readonly number[]): void {
  const r = size / 2;
  const c = rgb.join(',');
  const gradient = ctx.createRadialGradient(x + r, r, 0, x + r, r, r);
  gradient.addColorStop(0, `rgba(${c},1)`);
  gradient.addColorStop(0.25, `rgba(${c},0.55)`);
  gradient.addColorStop(0.6, `rgba(${c},0.15)`);
  gradient.addColorStop(1, `rgba(${c},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, 0, size, size);
}
