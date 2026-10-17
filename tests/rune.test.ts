import { describe, expect, it } from 'vitest';
import type { RuneMode } from '../src/game/data/levelTypes';
import {
  chargeFraction,
  initialRuneState,
  RUNE_CHARGE_SECONDS,
  stepRune,
  type RuneState,
} from '../src/game/systems/RuneSystem';

const FRAME = 1 / 60;

function run(state: RuneState, mode: RuneMode, covered: boolean, seconds: number): RuneState {
  let s = state;
  for (let i = 0; i < Math.round(seconds / FRAME); i++) s = stepRune(s, mode, covered, FRAME);
  return s;
}

function powered(mode: RuneMode): RuneState {
  return run(initialRuneState(), mode, true, RUNE_CHARGE_SECONDS);
}

describe('rune charging', () => {
  it('stays inactive while uncovered', () => {
    expect(run(initialRuneState(), 'latching', false, 2).phase).toBe('inactive');
  });

  it('powers after 0.45 s of uninterrupted coverage, not one frame sooner', () => {
    const almost = run(initialRuneState(), 'latching', true, RUNE_CHARGE_SECONDS - FRAME);
    expect(almost.phase).toBe('charging');
    expect(chargeFraction(almost)).toBeGreaterThan(0.9);
    expect(stepRune(almost, 'latching', true, FRAME).phase).toBe('powered');
  });

  it('resets the charge when coverage is interrupted', () => {
    const half = run(initialRuneState(), 'continuous', true, 0.3);
    const broken = stepRune(half, 'continuous', false, FRAME);
    expect(broken).toEqual(initialRuneState());
    expect(run(broken, 'continuous', true, 0.3).phase).toBe('charging');
  });
});

describe('latching runes', () => {
  it('stay powered after the shadow leaves', () => {
    expect(run(powered('latching'), 'latching', false, 10).phase).toBe('powered');
  });
});

describe('continuous runes', () => {
  it('ride out a one-frame flicker', () => {
    const s = stepRune(powered('continuous'), 'continuous', false, FRAME);
    expect(s.phase).toBe('powered');
    expect(stepRune(s, 'continuous', true, FRAME).uncovered).toBe(0);
  });

  it('stay powered through a gap of up to 0.2 s', () => {
    expect(run(powered('continuous'), 'continuous', false, 0.2).phase).toBe('powered');
  });

  it('release once uncovered for longer than 0.2 s', () => {
    const s = run(powered('continuous'), 'continuous', false, 0.2 + 2 * FRAME);
    expect(s).toEqual(initialRuneState());
  });
});
