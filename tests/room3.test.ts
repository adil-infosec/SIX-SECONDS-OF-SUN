import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/game/data/levels';
import { RoomSim, type SimEvent } from '../src/game/systems/RoomSim';
import { computeStars } from '../src/game/systems/Scoring';
import { driveTo, FRAME, pressEcho, pressIgnite, wait } from './helpers/drive';

const level = getLevel(3);
const LINE = { x: 450, y: 270 };

function lightBeacon(sim: RoomSim, events: SimEvent[] = []): void {
  driveTo(sim, { x: 230, y: 325 }, 10, events);
  events.push(...pressIgnite(sim));
  expect(sim.state.primaryLit).toBe(true);
}

describe('Room 3: The Other You', () => {
  it('is cleared by leaving a stationary echo on the shadow line, under par', () => {
    const sim = new RoomSim(level);
    const events: SimEvent[] = [];
    lightBeacon(sim, events);
    driveTo(sim, LINE, 10, events);
    wait(sim, 6.2, events); // fill the whole 6 s memory with standing still
    expect(sim.state.runesPowered[0]).toBe(true);

    events.push(...pressEcho(sim));
    expect(sim.state.echo).not.toBeNull();
    expect(sim.state.echoShadow).not.toBeNull();

    driveTo(sim, { x: 790, y: 270 }, 10, events);
    expect(sim.state.runesPowered[0]).toBe(true);
    expect(sim.state.gateOpen).toBe(true);
    driveTo(sim, level.goal, 10, events);

    expect(sim.state.won).toBe(true);
    expect(events.filter((e) => e.type === 'runeReleased')).toHaveLength(0);
    expect(computeStars(sim.state.elapsed, sim.state.hits, level.parTime)).toBe(3);
  });

  it('keeps the rune powered through many echo loops', () => {
    const sim = new RoomSim(level);
    lightBeacon(sim);
    driveTo(sim, LINE, 10);
    wait(sim, 6.2);
    pressEcho(sim);
    driveTo(sim, { x: 300, y: 450 }, 10);
    for (let t = 0; t < 20; t += FRAME) {
      wait(sim, FRAME);
      expect(sim.state.runesPowered[0]).toBe(true);
    }
    expect(sim.state.echo!.loops).toBeGreaterThanOrEqual(3);
  });

  it('cannot be cleared by the keeper holding the rune alone', () => {
    // From several holding spots, wait for power, then sprint for the exit.
    for (const hold of [LINE, { x: 600, y: 270 }, { x: 668, y: 270 }]) {
      const sim = new RoomSim(level);
      lightBeacon(sim);
      driveTo(sim, hold, 10);
      wait(sim, 0.6);
      expect(sim.state.runesPowered[0]).toBe(true);
      driveTo(sim, { x: 790, y: 270 }, 10);
      driveTo(sim, level.goal, 3);
      expect(sim.state.won).toBe(false);
      expect(sim.state.gateOpen).toBe(false);
      expect(sim.state.keeper.x).toBeLessThan(level.gate.x);
    }
  });

  it('refuses an echo before 1 second of memory, and during the cooldown', () => {
    const sim = new RoomSim(level);
    wait(sim, 0.5);
    expect(pressEcho(sim).map((e) => e.type)).toEqual(['echoDenied']);
    expect(sim.state.echo).toBeNull();

    wait(sim, 0.6);
    expect(pressEcho(sim).map((e) => e.type)).toEqual(['echoCreated']);
    wait(sim, 0.3);
    expect(pressEcho(sim).map((e) => e.type)).toEqual(['echoDenied']);
    wait(sim, 0.4);
    expect(pressEcho(sim).map((e) => e.type)).toEqual(['echoCreated']);
  });

  it('drops the old echo shadow at once when an echo is replaced', () => {
    const sim = new RoomSim(level);
    lightBeacon(sim);
    driveTo(sim, LINE, 10);
    wait(sim, 6.2);
    pressEcho(sim);
    // Spend a full 6 s off the line, then replace the echo with that recording.
    driveTo(sim, { x: 300, y: 450 }, 10);
    wait(sim, 6.2);
    expect(sim.state.runesPowered[0]).toBe(true);
    const events = pressEcho(sim);
    expect(events.map((e) => e.type)).toContain('echoCreated');
    wait(sim, 0.3, events);
    expect(sim.state.runesPowered[0]).toBe(false);
    expect(events.map((e) => e.type)).toContain('runeReleased');
  });

  it('gives the echo no body: it never ignites, blocks or exits', () => {
    const sim = new RoomSim(level);
    // Record a walk past the beacon, then let the echo replay it alone.
    driveTo(sim, { x: 230, y: 325 }, 10);
    wait(sim, 1);
    pressEcho(sim);
    driveTo(sim, { x: 160, y: 470 }, 10);
    wait(sim, 7);
    expect(sim.state.primaryLit).toBe(false);
    expect(sim.state.won).toBe(false);
  });

  it('is unavailable in rooms without the echo', () => {
    const sim = new RoomSim(getLevel(2));
    wait(sim, 2);
    expect(pressEcho(sim)).toEqual([]);
    expect(sim.state.echo).toBeNull();
    expect(sim.state.echoReady).toBe(false);
  });
});
