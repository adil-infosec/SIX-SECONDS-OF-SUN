import { rayReach } from './HazardGeometry';
import type { Rect, Vec2 } from './math';

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
 * Static walls do not alter the wedge; `blockers` (moving pillars) cut it
 * short where its center line runs into them.
 */
export function shadowWedge(light: Vec2, caster: Vec2, blockers: readonly Rect[] = []): Wedge | null {
  const dx = caster.x - light.x;
  const dy = caster.y - light.y;
  const d = Math.hypot(dx, dy);
  if (!Number.isFinite(d) || d < MIN_CASTER_DISTANCE) return null;
  const ux = dx / d;
  const uy = dy / d;
  const nx = -uy;
  const ny = ux;
  const length = blockers.length > 0 ? cutLength(caster, ux, uy, nx, ny, blockers) : SHADOW_LENGTH;
  if (length <= 0) return null;
  const far = SHADOW_NEAR_HALF_WIDTH + (SHADOW_FAR_HALF_WIDTH - SHADOW_NEAR_HALF_WIDTH) * (length / SHADOW_LENGTH);
  const fx = caster.x + ux * length;
  const fy = caster.y + uy * length;
  return [
    { x: caster.x + nx * SHADOW_NEAR_HALF_WIDTH, y: caster.y + ny * SHADOW_NEAR_HALF_WIDTH },
    { x: fx + nx * far, y: fy + ny * far },
    { x: fx - nx * far, y: fy - ny * far },
    { x: caster.x - nx * SHADOW_NEAR_HALF_WIDTH, y: caster.y - ny * SHADOW_NEAR_HALF_WIDTH },
  ];
}

/**
 * How far the wedge runs before a blocker: the nearest hit along its center
 * line or either edge, so a pillar touching any part of the wedge ends it.
 */
function cutLength(caster: Vec2, ux: number, uy: number, nx: number, ny: number, blockers: readonly Rect[]): number {
  let length = rayReach(caster, { x: ux, y: uy }, blockers, SHADOW_LENGTH);
  const spread = SHADOW_FAR_HALF_WIDTH - SHADOW_NEAR_HALF_WIDTH;
  for (const side of [1, -1]) {
    const start = { x: caster.x + side * nx * SHADOW_NEAR_HALF_WIDTH, y: caster.y + side * ny * SHADOW_NEAR_HALF_WIDTH };
    const ex = ux * SHADOW_LENGTH + side * nx * spread;
    const ey = uy * SHADOW_LENGTH + side * ny * spread;
    const edge = Math.hypot(ex, ey);
    const hit = rayReach(start, { x: ex / edge, y: ey / edge }, blockers, edge);
    length = Math.min(length, (hit / edge) * SHADOW_LENGTH);
  }
  return length;
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
