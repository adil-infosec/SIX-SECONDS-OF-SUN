import type { Vec2 } from './math';

/** GDD §8.4 stylized projected shadow wedge. */
export const SHADOW_NEAR_HALF_WIDTH = 11;
export const SHADOW_FAR_HALF_WIDTH = 48;
export const SHADOW_LENGTH = 240;
/** Closer than this to the flame, a caster is "inside the fire" and casts nothing. */
export const MIN_CASTER_DISTANCE = 25;

/** Convex quad, wound nearLeft → farLeft → farRight → nearRight. */
export type Wedge = readonly [Vec2, Vec2, Vec2, Vec2];

/**
 * Shadow cast away from `light` by a caster at `caster`, or null when the
 * caster is too close to the flame (this also guards zero-length input).
 * Walls do not alter the wedge in this build.
 */
export function shadowWedge(light: Vec2, caster: Vec2): Wedge | null {
  const dx = caster.x - light.x;
  const dy = caster.y - light.y;
  const d = Math.hypot(dx, dy);
  if (!Number.isFinite(d) || d < MIN_CASTER_DISTANCE) return null;
  const ux = dx / d;
  const uy = dy / d;
  const nx = -uy;
  const ny = ux;
  const fx = caster.x + ux * SHADOW_LENGTH;
  const fy = caster.y + uy * SHADOW_LENGTH;
  return [
    { x: caster.x + nx * SHADOW_NEAR_HALF_WIDTH, y: caster.y + ny * SHADOW_NEAR_HALF_WIDTH },
    { x: fx + nx * SHADOW_FAR_HALF_WIDTH, y: fy + ny * SHADOW_FAR_HALF_WIDTH },
    { x: fx - nx * SHADOW_FAR_HALF_WIDTH, y: fy - ny * SHADOW_FAR_HALF_WIDTH },
    { x: caster.x - nx * SHADOW_NEAR_HALF_WIDTH, y: caster.y - ny * SHADOW_NEAR_HALF_WIDTH },
  ];
}

const EPSILON = 1e-9;

/** Inclusive point-in-convex-polygon test: points on an edge count as inside. */
export function pointInConvexPolygon(p: Vec2, polygon: readonly Vec2[]): boolean {
  let sign = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(cross) <= EPSILON) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

export function inAnyShadow(p: Vec2, wedges: readonly (Wedge | null)[]): boolean {
  return wedges.some((w) => w !== null && pointInConvexPolygon(p, w));
}
