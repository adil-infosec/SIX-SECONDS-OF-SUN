import { describe, expect, it } from 'vitest';
import { CHAMBER_BOUNDS } from '../src/game/config';
import { getLevel } from '../src/game/data/levels';
import { rotorAngle } from '../src/game/systems/HazardGeometry';
import { circleIntersectsRect, type Rect, type Vec2 } from '../src/game/systems/math';
import { PLAYER_RADIUS } from '../src/game/systems/MovementSystem';
import { RoomSim, type SimEvent } from '../src/game/systems/RoomSim';
import { pointInConvexPolygon, shadowWedge, SHADOW_LENGTH } from '../src/game/systems/ShadowSystem';
import { driveTo, FRAME, pressEcho, pressIgnite, wait } from './helpers/drive';

/** Drives through waypoints in order; fails the test if one is not reached. */
function route(sim: RoomSim, points: Vec2[], events: SimEvent[] = []): void {
  for (const p of points) expect(driveTo(sim, p, 10, events)).toBe(true);
}

/** Every 6 px grid spot the keeper can walk to from `start` (flood fill around solid blocks). */
function reachableSpots(start: Vec2, solids: readonly Rect[]): Vec2[] {
  const STEP = 6;
  const b = CHAMBER_BOUNDS;
  const x0 = b.x + PLAYER_RADIUS;
  const y0 = b.y + PLAYER_RADIUS;
  const cols = Math.floor((b.w - 2 * PLAYER_RADIUS) / STEP) + 1;
  const rows = Math.floor((b.h - 2 * PLAYER_RADIUS) / STEP) + 1;
  const free = (c: number, r: number) =>
    c >= 0 && r >= 0 && c < cols && r < rows && !solids.some((o) => circleIntersectsRect({ x: x0 + c * STEP, y: y0 + r * STEP }, PLAYER_RADIUS, o));
  const seen = new Set<number>();
  const queue = [[Math.round((start.x - x0) / STEP), Math.round((start.y - y0) / STEP)] as const];
  const out: Vec2[] = [];
  while (queue.length > 0) {
    const [c, r] = queue.pop()!;
    if (seen.has(r * cols + c) || !free(c, r)) continue;
    seen.add(r * cols + c);
    out.push({ x: x0 + c * STEP, y: y0 + r * STEP });
    queue.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
  }
  return out;
}

/** Steps until `done` holds, up to `limit` seconds. */
function waitUntil(sim: RoomSim, done: () => boolean, limit = 12): boolean {
  for (let t = 0; t < limit; t += FRAME) {
    if (done()) return true;
    wait(sim, FRAME);
  }
  return done();
}

describe('Bonus 7: Twin Seals (dual activation)', () => {
  const level = getLevel(7);
  function lit(): RoomSim {
    const sim = new RoomSim(level);
    route(sim, [{ x: 200, y: 322 }]);
    pressIgnite(sim);
    expect(sim.state.primaryLit).toBe(true);
    return sim;
  }

  it('opens only when one shadow covers both seals, then clears with no hits', () => {
    const sim = lit();
    route(sim, [{ x: 400, y: 270 }]);
    wait(sim, 0.6);
    expect(sim.state.runesPowered).toEqual([true, true]);
    expect(sim.state.gateOpen).toBe(true);
    route(sim, [level.goal]);
    expect(sim.state.won).toBe(true);
    expect(sim.state.hits).toBe(0);
  });

  it('does not charge a seal that is shadowed alone', () => {
    const sim = lit();
    route(sim, [{ x: 400, y: 236 }]);
    // The top seal is in the shadow here, the bottom one is not.
    expect(pointInConvexPolygon(level.runes[0]!.position, sim.state.keeperShadow!)).toBe(true);
    expect(pointInConvexPolygon(level.runes[1]!.position, sim.state.keeperShadow!)).toBe(false);
    wait(sim, 2);
    expect(sim.state.runesPowered).toEqual([false, false]);
    expect(sim.state.gateOpen).toBe(false);
  });
});

describe('Bonus 8: Shifting Stones (moving pillars)', () => {
  const level = getLevel(8);
  function casting(): RoomSim {
    const sim = new RoomSim(level);
    route(sim, [{ x: 180, y: 215 }]);
    pressIgnite(sim);
    route(sim, [{ x: 440, y: 270 }]);
    return sim;
  }

  it('pillars cut the shadow short as they pass through it', () => {
    const sim = casting();
    let cut = false;
    let full = false;
    for (let t = 0; t < 4.2; t += FRAME) {
      wait(sim, FRAME);
      const w = sim.state.keeperShadow!;
      const k = sim.state.keeper;
      const reach = Math.hypot((w[1].x + w[2].x) / 2 - k.x, (w[1].y + w[2].y) / 2 - k.y);
      if (reach < SHADOW_LENGTH - 1) cut = true;
      else full = true;
    }
    expect(cut).toBe(true);
    expect(full).toBe(true);
  });

  it('is cleared by holding the cast through a gap between the pillars', () => {
    const sim = casting();
    expect(waitUntil(sim, () => sim.state.gateOpen, 9)).toBe(true);
    expect(sim.state.runesPowered).toEqual([true, true]);
    route(sim, [{ x: 440, y: 470 }, { x: 760, y: 470 }, { x: 760, y: 270 }, level.goal]);
    expect(sim.state.won).toBe(true);
  });
});

describe('Bonus 9: Lighthouse (rotating beam)', () => {
  const level = getLevel(9);
  const rotor = level.rotors![0]!;
  /** True just after the beam turns up into the top wall: the room is safe for the next half turn. */
  const overhead = (sim: RoomSim) => {
    const a = ((rotorAngle(rotor, sim.state.time) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return a > Math.PI && a < Math.PI + 0.1;
  };
  const SHELTER_A = { x: 150, y: 440 };
  const SHELTER_B = { x: 470, y: 400 };
  const SHELTER_C = { x: 740, y: 410 };

  it('is cleared with no hits by dashing between shelters while the beam is overhead', () => {
    const sim = new RoomSim(level);
    const events: SimEvent[] = [];
    // Light the flame and get back behind the first block in one safe window.
    expect(waitUntil(sim, () => overhead(sim))).toBe(true);
    route(sim, [{ x: 160, y: 285 }], events);
    events.push(...pressIgnite(sim));
    route(sim, [SHELTER_A], events);
    expect(sim.state.primaryLit).toBe(true);
    for (const next of [SHELTER_B, SHELTER_C]) {
      expect(waitUntil(sim, () => overhead(sim))).toBe(true);
      route(sim, [next], events);
    }
    // The rune was cast from shelter B while waiting there.
    expect(sim.state.runesPowered).toEqual([true]);
    expect(waitUntil(sim, () => overhead(sim))).toBe(true);
    route(sim, [level.goal], events);
    expect(sim.state.won).toBe(true);
    expect(sim.state.hits).toBe(0);
  });

  it('shelters stay safe while the beam sweeps past, and the open floor does not', () => {
    for (const shelter of [SHELTER_A, SHELTER_B, SHELTER_C]) {
      const sim = new RoomSim(level);
      sim.state.keeper = { ...shelter };
      wait(sim, 6);
      expect(sim.state.hits).toBe(0);
    }
    const open = new RoomSim(level);
    open.state.keeper = { x: 330, y: 440 };
    wait(open, 6);
    expect(open.state.hits).toBeGreaterThan(0);
  });
});

describe('Bonus 10: Clockwork Order (sequence runes)', () => {
  const level = getLevel(10);
  const CAST_A = { x: 480, y: 200 };
  const AROUND = [
    { x: 324, y: 238 },
    { x: 324, y: 302 },
  ];
  const CAST_B = { x: 480, y: 340 };
  function lit(): RoomSim {
    const sim = new RoomSim(level);
    route(sim, [{ x: 480, y: 215 }]);
    pressIgnite(sim);
    return sim;
  }

  it("powers B inside A's three-second window, which locks A on, and clears", () => {
    const sim = lit();
    route(sim, [CAST_A]);
    wait(sim, 0.5);
    expect(sim.state.runesPowered).toEqual([true, false]);
    route(sim, [...AROUND, CAST_B]);
    wait(sim, 0.5);
    expect(sim.state.runesPowered).toEqual([true, true]);
    expect(sim.state.gateOpen).toBe(true);
    // Locked: A stays on long after its window would have run out.
    route(sim, [
      { x: 795, y: 340 },
      { x: 795, y: 300 },
    ]);
    wait(sim, 4);
    expect(sim.state.runesPowered).toEqual([true, true]);
    route(sim, [level.goal]);
    expect(sim.state.won).toBe(true);
  });

  it('will not charge B before A, and lets A lapse after three seconds', () => {
    const early = lit();
    route(early, [{ x: 600, y: 215 }, { x: 795, y: 215 }, { x: 795, y: 330 }, CAST_B]);
    wait(early, 1);
    expect(early.state.runesPowered).toEqual([false, false]);

    const late = lit();
    route(late, [CAST_A]);
    wait(late, 0.5);
    route(late, [{ x: 600, y: 200 }]);
    wait(late, 3.2);
    expect(late.state.runesPowered).toEqual([false, false]);
  });
});

describe('Bonus 11: Prism Hall (prism relay)', () => {
  const level = getLevel(11);

  it('the primary flame alone can never shadow the sealed rune from anywhere reachable', () => {
    const rune = level.runes[0]!.position;
    const reachable = reachableSpots(level.spawn, level.obstacles);
    expect(reachable.length).toBeGreaterThan(1000);
    for (const p of reachable) {
      const w = shadowWedge(level.primaryBeacon, p);
      if (w) expect(pointInConvexPolygon(rune, w)).toBe(false);
    }
  });

  it('takes light only from a lit primary, then its shadow powers the rune', () => {
    const sim = new RoomSim(level);
    route(sim, [{ x: 175, y: 470 }]);
    pressIgnite(sim);
    expect(sim.state.relaysLit).toEqual([false]);
    route(sim, [{ x: 300, y: 325 }]);
    pressIgnite(sim);
    route(sim, [{ x: 175, y: 470 }]);
    pressIgnite(sim);
    expect(sim.state.relaysLit).toEqual([true]);
    route(sim, [{ x: 95, y: 282 }]);
    expect(sim.state.prismShadows.length).toBe(1);
    wait(sim, 0.5);
    expect(sim.state.gateOpen).toBe(true);
    route(sim, [{ x: 300, y: 330 }, level.goal]);
    expect(sim.state.won).toBe(true);
  });
});

describe('Bonus 12: Echo Gauntlet (echo-guarded lanes)', () => {
  const level = getLevel(12);

  it('is cleared with no hits by parking an echo before each lane', () => {
    const sim = new RoomSim(level);
    const events: SimEvent[] = [];
    route(sim, [{ x: 130, y: 215 }], events);
    events.push(...pressIgnite(sim));
    route(sim, [{ x: 300, y: 270 }, { x: 352, y: 270 }], events);
    wait(sim, 6.2, events);
    events.push(...pressEcho(sim));
    route(sim, [level.checkpoints[0]!], events);
    expect(sim.state.checkpointsReached).toEqual([true]);
    route(sim, [{ x: 556, y: 270 }], events);
    wait(sim, 6.2, events);
    events.push(...pressEcho(sim));
    wait(sim, 0.5, events);
    expect(sim.state.gateOpen).toBe(true);
    route(sim, [level.goal], events);
    expect(sim.state.won).toBe(true);
    expect(sim.state.hits).toBe(0);
  });

  it('burns a keeper who stands in a lane without shade', () => {
    const sim = new RoomSim(level);
    sim.state.keeper = { x: 440, y: 270 };
    wait(sim, 2.5);
    expect(sim.state.hits).toBeGreaterThan(0);
  });
});
