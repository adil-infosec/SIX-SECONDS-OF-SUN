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

/** Steps with no input for `seconds`. */
export function wait(sim: RoomSim, seconds: number, events: SimEvent[] = []): void {
  for (let t = 0; t < seconds; t += FRAME) events.push(...sim.step(FRAME, NO_INPUT));
}
