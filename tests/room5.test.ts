import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/game/data/levels';
import { RoomSim, type SimEvent } from '../src/game/systems/RoomSim';
import { computeStars } from '../src/game/systems/Scoring';
import { driveTo, pressEcho, pressIgnite, wait, waitForClearWindow } from './helpers/drive';

const level = getLevel(5);
const CAST = { x: 492, y: 136 };
const CROSS_X = 420;

function lightRelay(sim: RoomSim, events: SimEvent[] = []): void {
  driveTo(sim, { x: 640, y: 475 }, 10, events);
  events.push(...pressIgnite(sim));
  expect(sim.state.relaysLit[0]).toBe(true);
}

/** Crosses the fence opening at x = 420 once the band leaves room to do so. */
function crossUp(sim: RoomSim, events: SimEvent[] = []): void {
  driveTo(sim, { x: CROSS_X, y: 380 }, 10, events);
  expect(waitForClearWindow(sim, 0, CROSS_X, 1.2)).toBe(true);
  driveTo(sim, { x: CROSS_X, y: 240 }, 5, events);
}

function lightPrimaryAndCast(sim: RoomSim, events: SimEvent[] = []): void {
  driveTo(sim, { x: 220, y: 225 }, 10, events);
  events.push(...pressIgnite(sim));
  expect(sim.state.primaryLit).toBe(true);
  driveTo(sim, CAST, 10, events);
}

describe('Room 5: Ashes and Angles', () => {
  it('is cleared with zero hits: relay, timed crossing, angled shadow, echo, under par', () => {
    const sim = new RoomSim(level);
    const events: SimEvent[] = [];
    lightRelay(sim, events);
    crossUp(sim, events);
    lightPrimaryAndCast(sim, events);
    wait(sim, 6.2, events);
    expect(sim.state.runesPowered[0]).toBe(true);
    events.push(...pressEcho(sim));
    driveTo(sim, { x: 800, y: 170 }, 10, events);
    expect(sim.state.gateOpen).toBe(true);
    driveTo(sim, level.goal, 5, events);

    expect(sim.state.hits).toBe(0);
    expect(sim.state.won).toBe(true);
    expect(computeStars(sim.state.elapsed, sim.state.hits, level.parTime)).toBe(3);
  });

  it('keeps the gate shut until the relay burns, even with the rune held', () => {
    const sim = new RoomSim(level);
    driveTo(sim, { x: CROSS_X, y: 380 }, 10);
    waitForClearWindow(sim, 0, CROSS_X, 1.2);
    driveTo(sim, { x: CROSS_X, y: 240 }, 5);
    lightPrimaryAndCast(sim);
    wait(sim, 6.2);
    pressEcho(sim);
    wait(sim, 2);
    expect(sim.state.runesPowered[0]).toBe(true);
    expect(sim.state.relaysLit[0]).toBe(false);
    expect(sim.state.gateOpen).toBe(false);
  });

  it('needs the angle: standing level with the flame misses the rune', () => {
    const sim = new RoomSim(level);
    lightRelay(sim);
    crossUp(sim);
    driveTo(sim, { x: 220, y: 225 }, 10);
    pressIgnite(sim);
    driveTo(sim, { x: 500, y: 170 }, 10);
    wait(sim, 2);
    expect(sim.state.keeperShadow).not.toBeNull();
    expect(sim.state.runesPowered[0]).toBe(false);
  });

  it('burns a keeper who crosses the fence as the band arrives', () => {
    const sim = new RoomSim(level);
    driveTo(sim, { x: CROSS_X, y: 380 }, 10);
    // Wait for the band to be right on the crossing line, then walk into it.
    for (let t = 0; t < 6; t += 1 / 60) {
      const sc = level.scanners[0]!;
      const pos = sc.min + (sc.max - sc.min) * (0.5 + 0.5 * Math.sin((2 * Math.PI * (sim.state.time + 0.3)) / sc.period));
      if (Math.abs(pos - CROSS_X) < 8) break;
      wait(sim, 1 / 60);
    }
    driveTo(sim, { x: CROSS_X, y: 240 }, 2);
    expect(sim.state.hits).toBeGreaterThanOrEqual(1);
  });

  it('cannot be cleared by the keeper holding the rune alone', () => {
    const sim = new RoomSim(level);
    lightRelay(sim);
    crossUp(sim);
    lightPrimaryAndCast(sim);
    wait(sim, 0.6);
    expect(sim.state.runesPowered[0]).toBe(true);
    driveTo(sim, { x: 800, y: 170 }, 10);
    driveTo(sim, level.goal, 3);
    expect(sim.state.won).toBe(false);
    expect(sim.state.keeper.x).toBeLessThan(level.gate.x);
  });
});
