import { describe, expect, it } from 'vitest';
import {
  inputToVelocity,
  moveCircle,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  pushOutOfRect,
  type CollisionWorld,
} from '../src/game/systems/MovementSystem';

const none = { up: false, down: false, left: false, right: false };
const open: CollisionWorld = { rects: [], circles: [], bounds: { x: 0, y: 0, w: 1000, h: 1000 } };

function run(world: CollisionWorld, start: { x: number; y: number }, input: typeof none, seconds: number) {
  let p = start;
  const v = inputToVelocity(input);
  for (let t = 0; t < seconds; t += 1 / 60) p = moveCircle(p, v, 1 / 60, PLAYER_RADIUS, world);
  return p;
}

describe('inputToVelocity', () => {
  it('is zero with no keys or opposing keys', () => {
    expect(inputToVelocity(none)).toEqual({ x: 0, y: 0 });
    expect(inputToVelocity({ ...none, left: true, right: true })).toEqual({ x: 0, y: 0 });
  });

  it('moves diagonals at the same speed as cardinals', () => {
    const cardinal = inputToVelocity({ ...none, right: true });
    const diagonal = inputToVelocity({ ...none, right: true, down: true });
    expect(Math.hypot(cardinal.x, cardinal.y)).toBeCloseTo(PLAYER_SPEED);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(PLAYER_SPEED);
    expect(diagonal.x).toBeCloseTo(diagonal.y);
  });
});

describe('moveCircle', () => {
  it('travels the same distance in one second diagonally and cardinally', () => {
    const start = { x: 500, y: 500 };
    const a = run(open, start, { ...none, right: true }, 1);
    const b = run(open, start, { ...none, up: true, left: true }, 1);
    expect(Math.hypot(a.x - start.x, a.y - start.y)).toBeCloseTo(Math.hypot(b.x - start.x, b.y - start.y), 0);
  });

  it('stops flush against a wall', () => {
    const world: CollisionWorld = { ...open, rects: [{ x: 200, y: 0, w: 20, h: 1000 }] };
    const p = run(world, { x: 150, y: 500 }, { ...none, right: true }, 2);
    expect(p.x).toBeCloseTo(200 - PLAYER_RADIUS, 5);
  });

  it('slides along a wall when pushing into it diagonally', () => {
    const world: CollisionWorld = { ...open, rects: [{ x: 200, y: 0, w: 20, h: 1000 }] };
    const p = run(world, { x: 150, y: 500 }, { ...none, right: true, down: true }, 1);
    expect(p.x).toBeCloseTo(200 - PLAYER_RADIUS, 5);
    expect(p.y).toBeGreaterThan(560);
  });

  it('stays inside the bounds', () => {
    const world: CollisionWorld = { ...open, bounds: { x: 40, y: 40, w: 100, h: 100 } };
    const p = run(world, { x: 90, y: 90 }, { ...none, left: true, up: true }, 2);
    expect(p).toEqual({ x: 40 + PLAYER_RADIUS, y: 40 + PLAYER_RADIUS });
  });

  it('does not pass through a solid circle', () => {
    const world: CollisionWorld = { ...open, circles: [{ x: 300, y: 500, r: 16 }] };
    const p = run(world, { x: 200, y: 500 }, { ...none, right: true }, 2);
    expect(p.x).toBeLessThanOrEqual(300 - 16 - PLAYER_RADIUS + 1e-6);
  });
});

describe('pushOutOfRect', () => {
  it('returns null when not overlapping or only touching', () => {
    expect(pushOutOfRect({ x: 0, y: 0 }, 12, { x: 12, y: -5, w: 10, h: 10 })).toBeNull();
  });

  it('ejects a center that is inside the box through the nearest edge', () => {
    const out = pushOutOfRect({ x: 102, y: 150 }, 12, { x: 100, y: 100, w: 100, h: 100 });
    expect(out).toEqual({ x: 100 - 12, y: 150 });
  });
});
