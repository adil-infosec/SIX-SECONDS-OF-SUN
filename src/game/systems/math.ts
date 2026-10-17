export type Vec2 = { x: number; y: number };
/** Axis-aligned box; `x`,`y` is the top-left corner. */
export type Rect = { x: number; y: number; w: number; h: number };
export type Circle = { x: number; y: number; r: number };

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function centeredRect(cx: number, cy: number, w: number, h: number): Rect {
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export function rectCenter(rect: Rect): Vec2 {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

export function closestPointOnRect(p: Vec2, rect: Rect): Vec2 {
  return {
    x: clamp(p.x, rect.x, rect.x + rect.w),
    y: clamp(p.y, rect.y, rect.y + rect.h),
  };
}

/** True when a circle of radius `r` at `c` overlaps the box (touching does not count). */
export function circleIntersectsRect(c: Vec2, r: number, rect: Rect): boolean {
  const q = closestPointOnRect(c, rect);
  const dx = c.x - q.x;
  const dy = c.y - q.y;
  return dx * dx + dy * dy < r * r;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
