import { describe, expect, it } from 'vitest';
import { CHAMBER_BOUNDS } from '../src/game/config';
import { LEVELS } from '../src/game/data/levels';
import { circleIntersectsRect, distance, type Vec2 } from '../src/game/systems/math';
import { PLAYER_RADIUS } from '../src/game/systems/MovementSystem';
import { IGNITE_RANGE } from '../src/game/systems/BeaconSystem';

function insideBounds(p: Vec2, margin: number): boolean {
  const b = CHAMBER_BOUNDS;
  return p.x - margin >= b.x && p.x + margin <= b.x + b.w && p.y - margin >= b.y && p.y + margin <= b.y + b.h;
}

describe.each(LEVELS.map((l) => [l.id, l] as const))('level %i data', (_id, level) => {
  it('spawns the keeper inside the chamber and clear of obstacles', () => {
    expect(insideBounds(level.spawn, PLAYER_RADIUS)).toBe(true);
    for (const rect of [...level.obstacles, level.gate]) {
      expect(circleIntersectsRect(level.spawn, PLAYER_RADIUS, rect)).toBe(false);
    }
  });

  it('keeps every brazier and rune inside the chamber', () => {
    for (const p of [level.primaryBeacon, ...level.relayBeacons, ...level.runes.map((r) => r.position)]) {
      expect(insideBounds(p, 20)).toBe(true);
    }
  });

  it('places the goal behind the gate', () => {
    expect(level.goal.x).toBeGreaterThan(level.gate.x + level.gate.w);
  });

  it('seals the exit wall above and below the gate', () => {
    const g = level.gate;
    const above = level.obstacles.find((o) => o.x === g.x && o.w === g.w && o.y + o.h === g.y);
    const below = level.obstacles.find((o) => o.x === g.x && o.w === g.w && o.y === g.y + g.h);
    expect(above?.y).toBe(CHAMBER_BOUNDS.y);
    expect(below && below.y + below.h).toBe(CHAMBER_BOUNDS.y + CHAMBER_BOUNDS.h);
  });

  it('does not spawn the keeper already in ignite range', () => {
    expect(distance(level.spawn, level.primaryBeacon)).toBeGreaterThan(IGNITE_RANGE);
  });

  it('gives the first chambers at most two on-screen hints', () => {
    expect(level.hints.length).toBeLessThanOrEqual(2);
  });
});
