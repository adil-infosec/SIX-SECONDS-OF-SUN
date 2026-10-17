import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/game/data/levels';
import { NO_INPUT, RoomSim, type SimEvent } from '../src/game/systems/RoomSim';
import { computeStars } from '../src/game/systems/Scoring';
import { driveTo, FRAME, pressIgnite } from './helpers/drive';

const level = getLevel(2);

function wait(sim: RoomSim, seconds: number, events: SimEvent[] = []): void {
  for (let t = 0; t < seconds; t += FRAME) events.push(...sim.step(FRAME, NO_INPUT));
}

function lightBeacon(sim: RoomSim, events: SimEvent[] = []): void {
  driveTo(sim, { x: 260, y: 315 }, 10, events);
  events.push(...pressIgnite(sim));
  expect(sim.state.primaryLit).toBe(true);
}

describe('Room 2: Shape of Nothing', () => {
  it('is cleared by casting the keeper shadow over the rune, under par', () => {
    const sim = new RoomSim(level);
    const events: SimEvent[] = [];
    lightBeacon(sim, events);

    // Stand between the flame and the rune and hold still.
    driveTo(sim, { x: 470, y: 260 }, 10, events);
    expect(sim.state.runes[0]!.phase).not.toBe('powered');
    wait(sim, 0.5, events);
    expect(sim.state.runesPowered[0]).toBe(true);
    expect(sim.state.gateOpen).toBe(true);

    // Latching: stepping off the line keeps the gate open.
    driveTo(sim, { x: 470, y: 340 }, 10, events);
    wait(sim, 1, events);
    expect(sim.state.runesPowered[0]).toBe(true);
    expect(sim.state.gateOpen).toBe(true);

    driveTo(sim, { x: 760, y: 260 }, 10, events);
    driveTo(sim, level.goal, 10, events);
    expect(sim.state.won).toBe(true);
    expect(events.map((e) => e.type)).toEqual(['ignited', 'runePowered', 'gateOpened', 'won']);
    expect(computeStars(sim.state.elapsed, sim.state.hits, level.parTime)).toBe(3);
  });

  it('does not power the rune without the beacon, even standing on the line', () => {
    const sim = new RoomSim(level);
    driveTo(sim, { x: 470, y: 260 }, 10);
    wait(sim, 2);
    expect(sim.state.keeperShadow).toBeNull();
    expect(sim.state.runesPowered[0]).toBe(false);
    expect(sim.state.gateOpen).toBe(false);
  });

  it('keeps the gate shut when the shadow never reaches the rune', () => {
    const sim = new RoomSim(level);
    lightBeacon(sim);
    // Low route: the wedge points down-right, away from the rune.
    driveTo(sim, { x: 300, y: 470 }, 10);
    driveTo(sim, { x: 760, y: 470 }, 10);
    driveTo(sim, { x: 760, y: 260 }, 10);
    driveTo(sim, level.goal, 4);
    expect(sim.state.runesPowered[0]).toBe(false);
    expect(sim.state.won).toBe(false);
    expect(sim.state.keeper.x).toBeLessThan(level.gate.x);
  });

  it('does not power the rune from beyond the shadow length', () => {
    const sim = new RoomSim(level);
    lightBeacon(sim);
    // 310 px from the rune: the 240 px wedge falls short.
    driveTo(sim, { x: 350, y: 260 }, 10);
    wait(sim, 2);
    expect(sim.state.keeperShadow).not.toBeNull();
    expect(sim.state.runesPowered[0]).toBe(false);
  });
});
