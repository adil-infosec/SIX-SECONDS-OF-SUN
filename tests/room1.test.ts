import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/game/data/levels';
import { RoomSim, type SimEvent } from '../src/game/systems/RoomSim';
import { computeStars } from '../src/game/systems/Scoring';
import { driveTo, pressIgnite } from './helpers/drive';

const level = getLevel(1);

describe('Room 1: A Spark in the Dark', () => {
  it('is cleared by lighting the beacon and walking through the gate, under par', () => {
    const sim = new RoomSim(level);
    const events: SimEvent[] = [];

    expect(driveTo(sim, { x: 425, y: 310 }, 10, events)).toBe(true);
    expect(sim.ignitableIndex()).toBe(0);
    events.push(...pressIgnite(sim));
    expect(sim.state.primaryLit).toBe(true);
    expect(sim.state.gateOpen).toBe(true);

    driveTo(sim, { x: 760, y: 260 }, 10, events);
    driveTo(sim, level.goal, 10, events);

    expect(sim.state.won).toBe(true);
    const types = events.map((e) => e.type);
    expect(types).toEqual(['ignited', 'gateOpened', 'won']);
    expect(computeStars(sim.state.elapsed, sim.state.hits, level.parTime)).toBe(3);
  });

  it('cannot be cleared without lighting the beacon, by any route', () => {
    // Through the doorway, along the top wall, along the bottom wall.
    const routes = [
      [{ x: 425, y: 330 }, { x: 700, y: 260 }],
      [{ x: 300, y: 60 }, { x: 700, y: 60 }],
      [{ x: 425, y: 380 }, { x: 700, y: 480 }],
    ];
    for (const route of routes) {
      const sim = new RoomSim(level);
      for (const waypoint of route) driveTo(sim, waypoint, 10);
      const lane = sim.state.keeper.y;
      driveTo(sim, { x: level.goal.x, y: lane }, 5);
      driveTo(sim, level.goal, 5);
      expect(sim.state.won).toBe(false);
      expect(sim.state.keeper.x).toBeLessThan(level.gate.x);
    }
  });

  it('cannot light the beacon from out of range', () => {
    const sim = new RoomSim(level);
    pressIgnite(sim);
    expect(sim.state.primaryLit).toBe(false);
  });

  it('does not start the stopwatch until the keeper moves', () => {
    const sim = new RoomSim(level);
    pressIgnite(sim);
    expect(sim.state.elapsed).toBe(0);
    driveTo(sim, { x: 200, y: 300 }, 2);
    expect(sim.state.elapsed).toBeGreaterThan(0);
  });
});
