import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/game/data/levels';
import { NO_INPUT, RoomSim, type SimEvent } from '../src/game/systems/RoomSim';
import { scannerPosition } from '../src/game/systems/ScannerSystem';
import { computeStars } from '../src/game/systems/Scoring';
import { driveTo, FRAME, pressEcho, pressIgnite, wait, waitForClearWindow } from './helpers/drive';

const level = getLevel(6);
const CAST = { x: 545, y: 207 };
const SHELTER = { x: 740, y: 302 };
const FENCE_DOWN_X = 320;
const FENCE_UP_X = 560;

function cross(sim: RoomSim, x: number, fromY: number, toY: number, events: SimEvent[] = []): void {
  driveTo(sim, { x, y: fromY }, 10, events);
  expect(waitForClearWindow(sim, 0, x, 1.2)).toBe(true);
  driveTo(sim, { x, y: toY }, 5, events);
}

/** Primary, both relays, and back up into the sun's hall. */
function lightEverything(sim: RoomSim, events: SimEvent[] = []): void {
  driveTo(sim, { x: 470, y: 225 }, 10, events);
  events.push(...pressIgnite(sim));
  cross(sim, FENCE_DOWN_X, 300, 420, events);
  driveTo(sim, { x: 240, y: 485 }, 10, events);
  events.push(...pressIgnite(sim));
  driveTo(sim, { x: 620, y: 485 }, 10, events);
  events.push(...pressIgnite(sim));
  cross(sim, FENCE_UP_X, 420, 300, events);
  expect(sim.state.primaryLit).toBe(true);
  expect(sim.state.relaysLit).toEqual([true, true]);
}

function parkEcho(sim: RoomSim, events: SimEvent[] = []): void {
  driveTo(sim, CAST, 10, events);
  wait(sim, 6.2, events);
  events.push(...pressEcho(sim));
  expect(sim.state.echo).not.toBeNull();
}

/** From shelter, wait for the gate sweep to head away, then dash for the doorway. */
function dashForGate(sim: RoomSim, events: SimEvent[] = []): void {
  const sc = level.scanners[1]!;
  for (let t = 0; t < 10; t += FRAME) {
    const now = scannerPosition(sc, sim.state.time);
    const next = scannerPosition(sc, sim.state.time + FRAME);
    if (now < SHELTER.x - 30 && next < now) break;
    events.push(...sim.step(FRAME, NO_INPUT));
  }
  driveTo(sim, { x: 797, y: 260 }, 5, events);
  driveTo(sim, level.goal, 5, events);
}

describe('Room 6: Six Seconds of Sun', () => {
  it('is cleared with zero hits in under four minutes, under par', () => {
    const sim = new RoomSim(level);
    const events: SimEvent[] = [];
    lightEverything(sim, events);
    parkEcho(sim, events);
    driveTo(sim, SHELTER, 10, events);
    expect(sim.state.sheltered).toBe(true);
    expect(sim.state.gateOpen).toBe(true);
    dashForGate(sim, events);

    expect(sim.state.hits).toBe(0);
    expect(sim.state.won).toBe(true);
    expect(sim.state.elapsed).toBeLessThan(240);
    expect(computeStars(sim.state.elapsed, sim.state.hits, level.parTime)).toBe(3);
  });

  it('keeps the gate shut with one relay dark', () => {
    const sim = new RoomSim(level);
    driveTo(sim, { x: 470, y: 225 }, 10);
    pressIgnite(sim);
    cross(sim, FENCE_DOWN_X, 300, 420);
    driveTo(sim, { x: 240, y: 485 }, 10);
    pressIgnite(sim);
    cross(sim, FENCE_DOWN_X, 420, 300);
    parkEcho(sim);
    wait(sim, 1);
    expect(sim.state.runesPowered[0]).toBe(true);
    expect(sim.state.gateOpen).toBe(false);
  });

  it('burns a keeper who crosses the gate sweep outside the echo shade', () => {
    const sim = new RoomSim(level);
    lightEverything(sim);
    parkEcho(sim);
    driveTo(sim, { x: 640, y: 120 }, 10);
    driveTo(sim, { x: 797, y: 120 }, 4);
    expect(sim.state.hits).toBeGreaterThanOrEqual(1);
  });

  it('respawns at the checkpoint once it has been reached', () => {
    const sim = new RoomSim(level);
    const events: SimEvent[] = [];
    driveTo(sim, level.checkpoints[0]!, 10, events);
    expect(events.map((e) => e.type)).toContain('checkpoint');
    // Walk straight into the gate sweep.
    driveTo(sim, { x: 640, y: 150 }, 10, events);
    driveTo(sim, { x: 760, y: 150 }, 6, events);
    wait(sim, 0.3, events);
    expect(sim.state.hits).toBeGreaterThanOrEqual(1);
    expect(sim.state.safePoint).toEqual(level.checkpoints[0]);
    expect(events.map((e) => e.type)).toContain('respawned');
  });

  it('staggers the two scanners', () => {
    const [a, b] = level.scanners;
    expect(a!.period).not.toBe(b!.period);
  });
});
