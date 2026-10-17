import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/game/data/levels';
import { HIT_FREEZE_SECONDS, INVULNERABLE_SECONDS, NO_INPUT, RoomSim, type SimEvent } from '../src/game/systems/RoomSim';
import { scannerPosition } from '../src/game/systems/ScannerSystem';
import { computeStars } from '../src/game/systems/Scoring';
import { driveTo, FRAME, pressEcho, pressIgnite, wait } from './helpers/drive';

const level = getLevel(4);
const scanner = level.scanners[0]!;
const CAST = { x: 480, y: 240 };
const SHELTER = { x: 700, y: 240 };
const SAFE_X = scanner.max + 17;
/** A spot inside the lane, away from any shadow. Tests that only check the hit response start here. */
const IN_LANE = { x: 640, y: 440 };

/** Lights the beacon and parks a stationary echo on the casting spot. */
function setUp(events: SimEvent[] = []): RoomSim {
  const sim = new RoomSim(level);
  driveTo(sim, { x: 200, y: 295 }, 10, events);
  events.push(...pressIgnite(sim));
  driveTo(sim, CAST, 10, events);
  wait(sim, 6.2, events);
  events.push(...pressEcho(sim));
  expect(sim.state.echo).not.toBeNull();
  return sim;
}

/** Waits until the band has just passed `x` heading left (or `limit` seconds). */
function waitForBandToPassLeft(sim: RoomSim, x: number, events: SimEvent[] = [], limit = 10): void {
  for (let t = 0; t < limit; t += FRAME) {
    const now = scannerPosition(scanner, sim.state.time);
    const next = scannerPosition(scanner, sim.state.time + FRAME);
    if (now < x - 20 && next < now) return;
    events.push(...sim.step(FRAME, NO_INPUT));
  }
}

describe('Room 4: Furnace Hour', () => {
  it('is cleared with zero hits by sheltering in the echo shadow and timing the dash, under par', () => {
    const events: SimEvent[] = [];
    const sim = setUp(events);
    driveTo(sim, SHELTER, 10, events);
    expect(sim.state.sheltered).toBe(true);
    waitForBandToPassLeft(sim, SHELTER.x, events);
    driveTo(sim, { x: 795, y: 240 }, 5, events);
    driveTo(sim, level.goal, 5, events);

    expect(sim.state.hits).toBe(0);
    expect(sim.state.won).toBe(true);
    expect(events.some((e) => e.type === 'hit')).toBe(false);
    expect(computeStars(sim.state.elapsed, sim.state.hits, level.parTime)).toBe(3);
  });

  it('gives a dash window of well over 2 seconds after the band passes', () => {
    const sim = setUp();
    driveTo(sim, SHELTER, 10);
    waitForBandToPassLeft(sim, SHELTER.x);
    // Linger before dashing: still safe to go after 2 s.
    for (let t = 0; t < 2; t += FRAME) {
      sim.step(FRAME, NO_INPUT);
      expect(sim.state.hits).toBe(0);
    }
    driveTo(sim, { x: 795, y: 240 }, 5);
    expect(sim.state.hits).toBe(0);
  });

  it('never burns the keeper inside the echo shadow, through several sweeps', () => {
    const sim = setUp();
    driveTo(sim, { x: 640, y: 240 }, 10);
    for (let t = 0; t < 12; t += FRAME) {
      sim.step(FRAME, NO_INPUT);
      expect(sim.state.sheltered).toBe(true);
    }
    expect(sim.state.hits).toBe(0);
  });

  it('burns a keeper who crosses outside the echo shadow, whatever the timing', () => {
    for (let k = 0; k < 10; k++) {
      const sim = setUp();
      driveTo(sim, { x: 540, y: 440 }, 10);
      wait(sim, k * 0.48);
      driveTo(sim, { x: SAFE_X + 10, y: 440 }, 4);
      expect(sim.state.hits).toBeGreaterThanOrEqual(1);
    }
  });

  it('does not let the keeper shelter in their own shadow', () => {
    const sim = new RoomSim(level);
    driveTo(sim, { x: 200, y: 295 }, 10);
    pressIgnite(sim);
    driveTo(sim, { x: 640, y: 240 }, 10);
    wait(sim, 5);
    expect(sim.state.keeperShadow).not.toBeNull();
    expect(sim.state.hits).toBeGreaterThanOrEqual(1);
  });

  it('freezes, respawns at the start and grants 1 s of protection on a hit', () => {
    const sim = new RoomSim(level);
    sim.state.keeper = { ...IN_LANE };
    const events: SimEvent[] = [];
    for (let t = 0; t < 6 && !events.some((e) => e.type === 'hit'); t += FRAME) events.push(...sim.step(FRAME, NO_INPUT));
    expect(events.find((e) => e.type === 'hit')).toEqual({ type: 'hit', hearts: 2 });

    // Frozen: the room clock and the keeper do not move during hit-stop.
    const time = sim.state.time;
    const at = { ...sim.state.keeper };
    sim.step(FRAME, { ...NO_INPUT, right: true });
    expect(sim.state.time).toBe(time);
    expect(sim.state.keeper).toEqual(at);

    wait(sim, HIT_FREEZE_SECONDS, events);
    expect(events.some((e) => e.type === 'respawned')).toBe(true);
    expect(sim.state.keeper).toEqual(level.spawn);
    expect(sim.state.invulnerable).toBeGreaterThan(INVULNERABLE_SECONDS - 0.05);
  });

  it('blocks a second hit during the invulnerability window', () => {
    const sim = new RoomSim(level);
    sim.state.keeper = { ...IN_LANE };
    for (let t = 0; t < 6 && sim.state.hits === 0; t += FRAME) sim.step(FRAME, NO_INPUT);
    wait(sim, HIT_FREEZE_SECONDS + FRAME);
    // Put the keeper straight back in the band while still protected.
    sim.state.keeper = { x: sim.state.scanners[0]!, y: 440 };
    sim.state.invulnerable = 0.5;
    for (let t = 0; t < 0.4; t += FRAME) {
      sim.state.keeper = { x: scannerPosition(scanner, sim.state.time + FRAME), y: 440 };
      sim.step(FRAME, NO_INPUT);
    }
    expect(sim.state.hits).toBe(1);
  });

  it('fails the attempt at zero hearts and stops simulating', () => {
    const sim = new RoomSim(level);
    const events: SimEvent[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      sim.state.keeper = { ...IN_LANE };
      for (let t = 0; t < 6 && !sim.state.failed && sim.state.hits === attempt; t += FRAME) {
        events.push(...sim.step(FRAME, NO_INPUT));
      }
      wait(sim, HIT_FREEZE_SECONDS + INVULNERABLE_SECONDS + FRAME, events);
    }
    expect(sim.state.hearts).toBe(0);
    expect(sim.state.failed).toBe(true);
    expect(events.filter((e) => e.type === 'failed')).toHaveLength(1);
    const time = sim.state.time;
    wait(sim, 1);
    expect(sim.state.time).toBe(time);
  });

  it('keeps the spawn, beacon and casting spot out of the scanner lane', () => {
    for (const p of [level.spawn, level.primaryBeacon, CAST]) {
      expect(p.x + 12).toBeLessThan(scanner.min - 16);
    }
  });
});
