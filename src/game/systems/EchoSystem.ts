import type { Vec2 } from './math';

/** GDD §8.3 */
export const ECHO_SECONDS = 6;
export const SAMPLE_SECONDS = 0.1;
/** 6 s at 0.1 s steps: 60 intervals, 61 points. */
export const SAMPLE_COUNT = Math.round(ECHO_SECONDS / SAMPLE_SECONDS) + 1;
export const MIN_HISTORY_SECONDS = 1;
export const ECHO_COOLDOWN_SECONDS = 0.65;
/** Visual fade at each loop boundary so the jump back to the start does not snap. */
export const LOOP_FADE_SECONDS = 0.15;

const EPSILON = 1e-9;

/**
 * Rolling record of the keeper's position, sampled on a fixed 0.1 s clock
 * that does not depend on frame rate. Holds at most the last 6 seconds.
 */
export class MovementHistory {
  private readonly samples: Vec2[];
  private accumulator = 0;

  constructor(start: Vec2) {
    this.samples = [{ ...start }];
  }

  /** Advances the sampling clock by `dt` and records `position` on each 0.1 s tick. */
  advance(dt: number, position: Vec2): void {
    this.accumulator += dt;
    while (this.accumulator >= SAMPLE_SECONDS - EPSILON) {
      this.accumulator -= SAMPLE_SECONDS;
      this.samples.push({ ...position });
      if (this.samples.length > SAMPLE_COUNT) this.samples.shift();
    }
  }

  /** Seconds of recorded movement, 0..6. */
  get seconds(): number {
    return (this.samples.length - 1) * SAMPLE_SECONDS;
  }

  get ready(): boolean {
    return this.seconds >= MIN_HISTORY_SECONDS - EPSILON;
  }

  /**
   * The last 6 seconds as exactly SAMPLE_COUNT points, oldest first. A
   * shorter history is padded at the front with its earliest point, so
   * playback always lasts 6 seconds.
   */
  snapshot(): Vec2[] {
    const pad = SAMPLE_COUNT - this.samples.length;
    const first = this.samples[0]!;
    return [...Array.from({ length: pad }, () => ({ ...first })), ...this.samples.map((p) => ({ ...p }))];
  }
}

/** A looping afterimage of a captured path. `t` runs 0..6 s and wraps. */
export type EchoState = {
  readonly path: readonly Vec2[];
  t: number;
  /** Completed loops; lets views drop their trail when playback wraps. */
  loops: number;
};

export function createEcho(path: readonly Vec2[]): EchoState {
  return { path, t: 0, loops: 0 };
}

export function advanceEcho(echo: EchoState, dt: number): EchoState {
  let t = echo.t + dt;
  let loops = echo.loops;
  while (t >= ECHO_SECONDS) {
    t -= ECHO_SECONDS;
    loops += 1;
  }
  return { path: echo.path, t, loops };
}

/** Linear interpolation between the two samples around `t`. */
export function echoPosition(echo: EchoState): Vec2 {
  const path = echo.path;
  const f = Math.min(echo.t / SAMPLE_SECONDS, path.length - 1);
  const i = Math.min(Math.floor(f), path.length - 2);
  const k = f - i;
  const a = path[i]!;
  const b = path[i + 1]!;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

/** 0..1 opacity: fades in over the first 0.15 s of a loop and out over the last. */
export function echoAlpha(t: number): number {
  return Math.max(0, Math.min(1, t / LOOP_FADE_SECONDS, (ECHO_SECONDS - t) / LOOP_FADE_SECONDS));
}
