import { distance, type Vec2 } from './math';

/** GDD §8.2: `E` lights a brazier when the keeper's center is this close. */
export const IGNITE_RANGE = 58;
/** Solid footprint of a brazier bowl. */
export const PRIMARY_BRAZIER_RADIUS = 16;
export const RELAY_BRAZIER_RADIUS = 12;

export type BrazierState = { position: Vec2; lit: boolean };

export function canIgnite(player: Vec2, brazier: Vec2): boolean {
  return distance(player, brazier) <= IGNITE_RANGE;
}

/** Index of the nearest unlit brazier in range, or -1. */
export function findIgnitable(player: Vec2, braziers: readonly BrazierState[]): number {
  let best = -1;
  let bestDistance = Infinity;
  braziers.forEach((brazier, index) => {
    if (brazier.lit) return;
    const d = distance(player, brazier.position);
    if (d <= IGNITE_RANGE && d < bestDistance) {
      best = index;
      bestDistance = d;
    }
  });
  return best;
}
