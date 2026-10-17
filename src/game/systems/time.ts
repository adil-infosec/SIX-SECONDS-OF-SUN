/**
 * Largest simulation step in seconds (GDD §11). A long frame, such as the
 * first frame after a tab switch, must not teleport scanners or echoes.
 */
export const MAX_STEP_SECONDS = 0.05;

/** Converts a Phaser frame delta in milliseconds to a clamped step in seconds. */
export function clampDelta(deltaMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;
  return Math.min(deltaMs / 1000, MAX_STEP_SECONDS);
}
