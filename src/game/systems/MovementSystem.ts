import { clamp, closestPointOnRect, type Circle, type Rect, type Vec2 } from './math';

/** GDD §8.1 */
export const PLAYER_RADIUS = 12;
export const PLAYER_SPEED = 175;

export type MoveInput = { up: boolean; down: boolean; left: boolean; right: boolean };

/** Solid geometry the keeper cannot enter. */
export type CollisionWorld = {
  rects: readonly Rect[];
  circles: readonly Circle[];
  /** The keeper's center stays at least one radius inside this box. */
  bounds: Rect;
};

/**
 * Eight-way digital input to a velocity. Diagonals are normalized so every
 * direction moves at the same speed; there is no acceleration.
 */
export function inputToVelocity(input: MoveInput, speed = PLAYER_SPEED): Vec2 {
  const x = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const y = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const scale = speed / Math.hypot(x, y);
  return { x: x * scale, y: y * scale };
}

/** Returns where a circle at `p` must move to stop overlapping `rect`, or null if it does not overlap. */
export function pushOutOfRect(p: Vec2, radius: number, rect: Rect): Vec2 | null {
  const q = closestPointOnRect(p, rect);
  const dx = p.x - q.x;
  const dy = p.y - q.y;
  const d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius) return null;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    return { x: q.x + (dx / d) * radius, y: q.y + (dy / d) * radius };
  }
  // Center is inside the box: leave through the nearest edge.
  const left = p.x - rect.x;
  const right = rect.x + rect.w - p.x;
  const top = p.y - rect.y;
  const bottom = rect.y + rect.h - p.y;
  const min = Math.min(left, right, top, bottom);
  if (min === left) return { x: rect.x - radius, y: p.y };
  if (min === right) return { x: rect.x + rect.w + radius, y: p.y };
  if (min === top) return { x: p.x, y: rect.y - radius };
  return { x: p.x, y: rect.y + rect.h + radius };
}

export function pushOutOfCircle(p: Vec2, radius: number, c: Circle): Vec2 | null {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const min = radius + c.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= min * min) return null;
  const d = Math.sqrt(d2);
  if (d < 1e-9) return { x: c.x + min, y: c.y };
  return { x: c.x + (dx / d) * min, y: c.y + (dy / d) * min };
}

const RESOLVE_PASSES = 4;

/**
 * Moves a circle by `velocity * dt` and resolves overlaps by pushing it out
 * along the shortest direction, so it slides along walls instead of sticking.
 * Callers keep `dt` small (see clampDelta) so a step never exceeds a radius.
 */
export function moveCircle(
  pos: Vec2,
  velocity: Vec2,
  dt: number,
  radius: number,
  world: CollisionWorld,
): Vec2 {
  let p: Vec2 = { x: pos.x + velocity.x * dt, y: pos.y + velocity.y * dt };
  for (let pass = 0; pass < RESOLVE_PASSES; pass++) {
    let moved = false;
    for (const rect of world.rects) {
      const out = pushOutOfRect(p, radius, rect);
      if (out) {
        p = out;
        moved = true;
      }
    }
    for (const circle of world.circles) {
      const out = pushOutOfCircle(p, radius, circle);
      if (out) {
        p = out;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const b = world.bounds;
  return {
    x: clamp(p.x, b.x + radius, b.x + b.w - radius),
    y: clamp(p.y, b.y + radius, b.y + b.h - radius),
  };
}
