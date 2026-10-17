import type { RuneMode } from '../data/levelTypes';

/** GDD §8.4: uninterrupted coverage needed to power a rune. */
export const RUNE_CHARGE_SECONDS = 0.45;
/** Continuous runes stay powered through gaps this short, so the door does not flicker. */
export const RUNE_RELEASE_GRACE = 0.2;

const EPSILON = 1e-9;

export type RunePhase = 'inactive' | 'charging' | 'powered';

export type RuneState = {
  phase: RunePhase;
  /** Seconds of uninterrupted coverage so far, capped at RUNE_CHARGE_SECONDS. */
  charge: number;
  /** Seconds a powered continuous rune has been uncovered. */
  uncovered: number;
};

export function initialRuneState(): RuneState {
  return { phase: 'inactive', charge: 0, uncovered: 0 };
}

export function chargeFraction(state: RuneState): number {
  return state.phase === 'powered' ? 1 : Math.min(1, state.charge / RUNE_CHARGE_SECONDS);
}

/** Default seconds a `timed` rune stays powered after its shadow leaves. */
export const TIMED_RUNE_WINDOW = 3;

/**
 * Advances one rune by `dt` seconds. Pure: returns a new state. `window` is
 * how long a `timed` rune holds once uncovered.
 */
export function stepRune(state: RuneState, mode: RuneMode, covered: boolean, dt: number, window = TIMED_RUNE_WINDOW): RuneState {
  if (state.phase === 'powered') {
    if (mode === 'latching' || covered) return { phase: 'powered', charge: RUNE_CHARGE_SECONDS, uncovered: 0 };
    const uncovered = state.uncovered + dt;
    const grace = mode === 'timed' ? window : RUNE_RELEASE_GRACE;
    if (uncovered > grace + EPSILON) return initialRuneState();
    return { phase: 'powered', charge: RUNE_CHARGE_SECONDS, uncovered };
  }
  if (!covered) return initialRuneState();
  const charge = state.charge + dt;
  if (charge >= RUNE_CHARGE_SECONDS - EPSILON) return { phase: 'powered', charge: RUNE_CHARGE_SECONDS, uncovered: 0 };
  return { phase: 'charging', charge, uncovered: 0 };
}
