/**
 * URL switches for recording the trailer (docs/TRAILER_RECORDING_GUIDE.md):
 *
 * - `?capture`: hides the mouse cursor, opens every chamber in the list
 *   without touching saved progress, and shows the shotlist caption at the
 *   start of each chamber.
 * - `?trailer`: opens the trailer cards (the edited, non-gameplay segments).
 *
 * Normal players never see either; both are opt-in through the URL.
 */
function flag(name: string): boolean {
  try {
    return new URLSearchParams(window.location.search).has(name);
  } catch {
    return false;
  }
}

export const CAPTURE = typeof window !== 'undefined' && flag('capture');
export const TRAILER = typeof window !== 'undefined' && flag('trailer');

/** Shotlist captions shown over the start of each chamber in capture mode. */
export const CAPTURE_CAPTIONS: Record<number, string> = {
  1: 'FIRE gives the world light.',
  2: 'SHADOW is the key.',
  3: 'TIME repeats your last six seconds.',
  4: 'Your past protects your future.',
  5: 'Two flames. One angle. Six seconds.',
  6: 'Fire, shadow and time, together.',
};
