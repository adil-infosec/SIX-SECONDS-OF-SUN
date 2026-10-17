import type { Scanner } from '../data/levelTypes';
import type { Vec2 } from './math';

/** GDD §8.6: the keeper is burned when their center is this close to the band's center line. */
export const SCANNER_HIT_DISTANCE = 16;
/** The band telegraphs where it will be this far ahead. */
export const SCANNER_WARNING_SECONDS = 0.35;
const WARNING_SAMPLES = 8;

/** Band position along its sweep axis at room time `time` (seconds). */
export function scannerPosition(sc: Scanner, time: number): number {
  const wave = Math.sin((2 * Math.PI * (time + sc.phase)) / sc.period);
  return sc.min + (sc.max - sc.min) * (0.5 + 0.5 * wave);
}

/** The keeper coordinate the band sweeps over: x for a vertical band, y for a horizontal one. */
function sweepCoord(sc: Scanner, p: Vec2): number {
  return sc.axis === 'vertical' ? p.x : p.y;
}

/** True when `p` lies within the band's length, i.e. where the band can reach it. */
export function inScannerLane(sc: Scanner, p: Vec2): boolean {
  const along = sc.axis === 'vertical' ? p.y : p.x;
  return along >= sc.from && along <= sc.to;
}

export function scannerTouches(sc: Scanner, time: number, p: Vec2): boolean {
  return inScannerLane(sc, p) && Math.abs(sweepCoord(sc, p) - scannerPosition(sc, time)) <= SCANNER_HIT_DISTANCE;
}

/** True when the band will touch `p` within the next 0.35 s if it stays put. */
export function scannerWarns(sc: Scanner, time: number, p: Vec2): boolean {
  if (!inScannerLane(sc, p)) return false;
  for (let i = 1; i <= WARNING_SAMPLES; i++) {
    if (scannerTouches(sc, time + (i / WARNING_SAMPLES) * SCANNER_WARNING_SECONDS, p)) return true;
  }
  return false;
}
