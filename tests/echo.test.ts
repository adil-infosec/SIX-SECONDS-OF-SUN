import { describe, expect, it } from 'vitest';
import {
  advanceEcho,
  createEcho,
  ECHO_SECONDS,
  echoAlpha,
  echoPosition,
  MovementHistory,
  SAMPLE_COUNT,
} from '../src/game/systems/EchoSystem';

const FRAME = 1 / 60;

/** Moves right at 100 px/s for `seconds`, recording each frame. */
function record(seconds: number, startX = 0): MovementHistory {
  const h = new MovementHistory({ x: startX, y: 0 });
  let x = startX;
  for (let i = 0; i < Math.round(seconds / FRAME); i++) {
    x += 100 * FRAME;
    h.advance(FRAME, { x, y: 0 });
  }
  return h;
}

describe('MovementHistory', () => {
  it('samples on a 0.1 s clock regardless of frame size', () => {
    const fine = new MovementHistory({ x: 0, y: 0 });
    const coarse = new MovementHistory({ x: 0, y: 0 });
    for (let i = 0; i < 120; i++) fine.advance(FRAME, { x: 0, y: 0 });
    for (let i = 0; i < 40; i++) coarse.advance(0.05, { x: 0, y: 0 });
    expect(fine.seconds).toBeCloseTo(2, 5);
    expect(coarse.seconds).toBeCloseTo(2, 5);
  });

  it('keeps at most 6 seconds', () => {
    const h = record(20);
    expect(h.seconds).toBeCloseTo(ECHO_SECONDS, 5);
    expect(h.snapshot()).toHaveLength(SAMPLE_COUNT);
    // Oldest kept sample is about 6 s before the end of a 20 s, 100 px/s run.
    expect(h.snapshot()[0]!.x).toBeCloseTo(1400, -1);
  });

  it('is ready only after 1 second of history', () => {
    expect(record(0.9).ready).toBe(false);
    expect(record(1.0).ready).toBe(true);
  });

  it('pads a short history at the front with its earliest point', () => {
    const path = record(2, 50).snapshot();
    expect(path).toHaveLength(SAMPLE_COUNT);
    expect(path[0]).toEqual({ x: 50, y: 0 });
    expect(path[SAMPLE_COUNT - 21]).toEqual({ x: 50, y: 0 });
    expect(path[SAMPLE_COUNT - 1]!.x).toBeCloseTo(250, 0);
  });

  it('returns copies, so later recording does not change a captured path', () => {
    const h = record(2);
    const path = h.snapshot();
    const last = { ...path[SAMPLE_COUNT - 1]! };
    h.advance(1, { x: 9999, y: 9999 });
    expect(path[SAMPLE_COUNT - 1]).toEqual(last);
  });
});

describe('echo playback', () => {
  const path = Array.from({ length: SAMPLE_COUNT }, (_, i) => ({ x: i * 10, y: 0 }));

  it('starts at the oldest point', () => {
    expect(echoPosition(createEcho(path))).toEqual({ x: 0, y: 0 });
  });

  it('interpolates between samples', () => {
    const e = advanceEcho(createEcho(path), 0.25);
    expect(echoPosition(e).x).toBeCloseTo(25, 5);
  });

  it('reaches the newest point just before the loop ends', () => {
    const e = advanceEcho(createEcho(path), ECHO_SECONDS - 1e-6);
    expect(echoPosition(e).x).toBeCloseTo(600, 3);
  });

  it('loops every 6 seconds and counts loops', () => {
    let e = createEcho(path);
    for (let i = 0; i < Math.round(13 / FRAME); i++) e = advanceEcho(e, FRAME);
    expect(e.loops).toBe(2);
    expect(e.t).toBeCloseTo(1, 3);
    expect(echoPosition(e).x).toBeCloseTo(100, 0);
  });

  it('fades at both ends of a loop and is fully visible in between', () => {
    expect(echoAlpha(0)).toBe(0);
    expect(echoAlpha(0.075)).toBeCloseTo(0.5);
    expect(echoAlpha(3)).toBe(1);
    expect(echoAlpha(ECHO_SECONDS - 0.075)).toBeCloseTo(0.5);
  });
});
