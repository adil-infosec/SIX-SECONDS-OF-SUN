import { describe, expect, it } from 'vitest';
import { clampDelta, MAX_STEP_SECONDS } from '../src/game/systems/time';

describe('clampDelta', () => {
  it('converts milliseconds to seconds', () => {
    expect(clampDelta(16)).toBeCloseTo(0.016);
  });

  it('caps long frames at the maximum step', () => {
    expect(clampDelta(1000)).toBe(MAX_STEP_SECONDS);
  });

  it('returns 0 for zero, negative and non-finite deltas', () => {
    expect(clampDelta(0)).toBe(0);
    expect(clampDelta(-5)).toBe(0);
    expect(clampDelta(Number.NaN)).toBe(0);
    expect(clampDelta(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
