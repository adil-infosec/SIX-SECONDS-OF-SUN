import type { Mover, Prism, Rotor } from '../data/levelTypes';
import type { Rect, Vec2 } from './math';
import { SCANNER_HIT_DISTANCE, SCANNER_WARNING_SECONDS } from './ScannerSystem';

/**
 * Geometry for the bonus-chamber mechanics: moving pillars, rotating fire
 * beams and prism light cones. Pure functions of the room clock, so the sim
 * stays deterministic and tests can drive it frame by frame.
 */

const WARNING_SAMPLES = 8;

/** Distance along the ray `origin + t * dir` (unit `dir`) to where it enters `rect`; 0 if it starts inside, Infinity if it misses. */
export function rayToRect(origin: Vec2, dir: Vec2, rect: Rect): number {
  let tMin = 0;
  let tMax = Infinity;
  for (const [o, d, lo, hi] of [
    [origin.x, dir.x, rect.x, rect.x + rect.w],
    [origin.y, dir.y, rect.y, rect.y + rect.h],
  ] as const) {
    if (Math.abs(d) < 1e-12) {
      if (o < lo || o > hi) return Infinity;
      continue;
    }
    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return Infinity;
  }
  return tMin;
}

/** Nearest hit of a ray against any of `rects`, capped at `max`. */
export function rayReach(origin: Vec2, dir: Vec2, rects: readonly Rect[], max: number): number {
  let reach = max;
  for (const r of rects) reach = Math.min(reach, rayToRect(origin, dir, r));
  return reach;
}

/** A moving pillar's box at room time `time`: it starts at `rect` and eases out to `range` and back. */
export function moverRect(m: Mover, time: number): Rect {
  const offset = m.range * (0.5 - 0.5 * Math.cos((2 * Math.PI * (time + m.phase)) / m.period));
  return m.axis === 'x' ? { ...m.rect, x: m.rect.x + offset } : { ...m.rect, y: m.rect.y + offset };
}

/** Beam angle at room time `time` (radians, 0 = right, y down). */
export function rotorAngle(r: Rotor, time: number): number {
  const turn = (2 * Math.PI * (time + r.phase)) / r.period;
  return r.clockwise ? turn : -turn;
}

/** How far the beam reaches at `angle` before a block stops it. */
export function rotorReach(r: Rotor, angle: number, blockers: readonly Rect[]): number {
  return rayReach(r.center, { x: Math.cos(angle), y: Math.sin(angle) }, blockers, r.length);
}

/** True when `p` is within the hit distance of the beam's burning segment at `time`. */
export function rotorTouches(r: Rotor, time: number, p: Vec2, blockers: readonly Rect[]): boolean {
  const angle = rotorAngle(r, time);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const along = (p.x - r.center.x) * ux + (p.y - r.center.y) * uy;
  if (along < 0) return false;
  const reach = rotorReach(r, angle, blockers);
  if (along > reach + SCANNER_HIT_DISTANCE * 0.5) return false;
  const across = Math.abs((p.x - r.center.x) * -uy + (p.y - r.center.y) * ux);
  return across <= SCANNER_HIT_DISTANCE;
}

/** True when the beam will touch `p` within the warning time. */
export function rotorWarns(r: Rotor, time: number, p: Vec2, blockers: readonly Rect[]): boolean {
  for (let i = 1; i <= WARNING_SAMPLES; i++) {
    if (rotorTouches(r, time + (i / WARNING_SAMPLES) * SCANNER_WARNING_SECONDS, p, blockers)) return true;
  }
  return false;
}

/** True when `p` is inside a prism's light cone. */
export function inPrismCone(prism: Prism, origin: Vec2, p: Vec2): boolean {
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  const d = Math.hypot(dx, dy);
  if (d > prism.range) return false;
  let diff = Math.atan2(dy, dx) - prism.angle;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  return Math.abs(diff) <= prism.spread / 2;
}
