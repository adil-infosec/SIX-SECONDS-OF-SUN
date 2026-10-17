import { scannerPosition } from '../../src/game/systems/ScannerSystem';
import { NO_INPUT, type FrameInput, type RoomSim, type SimEvent } from '../../src/game/systems/RoomSim';
import type { Vec2 } from '../../src/game/systems/math';

export const FRAME = 1 / 60;
/** Per-axis arrival tolerance; larger than half a frame's travel so steering never oscillates. */
const TOLERANCE = 3;

/**
 * Steers the keeper toward `target` with digital keys, like a player would,
 * for at most `maxSeconds`. Returns true when it arrived.
 */
export function driveTo(sim: RoomSim, target: Vec2, maxSeconds = 10, events: SimEvent[] = []): boolean {
  for (let t = 0; t < maxSeconds; t += FRAME) {
    const dx = target.x - sim.state.keeper.x;
    const dy = target.y - sim.state.keeper.y;
    if (Math.abs(dx) <= TOLERANCE && Math.abs(dy) <= TOLERANCE) return true;
    const input: FrameInput = {
      ...NO_INPUT,
      left: dx < -TOLERANCE,
      right: dx > TOLERANCE,
      up: dy < -TOLERANCE,
      down: dy > TOLERANCE,
    };
    events.push(...sim.step(FRAME, input));
    if (sim.state.won) return true;
  }
  return false;
}

export function pressIgnite(sim: RoomSim): SimEvent[] {
  return sim.step(FRAME, { ...NO_INPUT, ignite: true });
}

export function pressEcho(sim: RoomSim): SimEvent[] {
  return sim.step(FRAME, { ...NO_INPUT, echo: true });
}

/**
 * Waits (up to `limit` s) until scanner `index` will stay farther than
 * `clearance` px from sweep coordinate `at` for the next `seconds`, like a
 * player watching the band before crossing.
 */
export function waitForClearWindow(
  sim: RoomSim,
  index: number,
  at: number,
  seconds: number,
  clearance = 30,
  limit = 12,
): boolean {
  const sc = sim.level.scanners[index]!;
  const clear = () => {
    for (let t = 0; t <= seconds; t += FRAME) {
      if (Math.abs(scannerPosition(sc, sim.state.time + t) - at) <= clearance) return false;
    }
    return true;
  };
  for (let t = 0; t < limit; t += FRAME) {
    if (clear()) return true;
    sim.step(FRAME, NO_INPUT);
  }
  return false;
}

/** Steps with no input for `seconds`. */
export function wait(sim: RoomSim, seconds: number, events: SimEvent[] = []): void {
  for (let t = 0; t < seconds; t += FRAME) events.push(...sim.step(FRAME, NO_INPUT));
}
