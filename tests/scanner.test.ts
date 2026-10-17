import { describe, expect, it } from 'vitest';
import type { Scanner } from '../src/game/data/levelTypes';
import {
  inScannerLane,
  SCANNER_HIT_DISTANCE,
  scannerPosition,
  scannerTouches,
  scannerWarns,
} from '../src/game/systems/ScannerSystem';

const vertical: Scanner = { axis: 'vertical', min: 100, max: 300, from: 50, to: 450, period: 4, width: 10, phase: 0 };
const horizontal: Scanner = { ...vertical, axis: 'horizontal' };

describe('scannerPosition', () => {
  it('follows min + (max - min) * (0.5 + 0.5 sin(2πt / period))', () => {
    expect(scannerPosition(vertical, 0)).toBeCloseTo(200);
    expect(scannerPosition(vertical, 1)).toBeCloseTo(300);
    expect(scannerPosition(vertical, 2)).toBeCloseTo(200);
    expect(scannerPosition(vertical, 3)).toBeCloseTo(100);
    expect(scannerPosition(vertical, 4)).toBeCloseTo(200);
  });

  it('shifts by phase seconds', () => {
    expect(scannerPosition({ ...vertical, phase: 1 }, 0)).toBeCloseTo(300);
  });

  it('never leaves min..max', () => {
    for (let t = 0; t < 10; t += 0.01) {
      const x = scannerPosition(vertical, t);
      expect(x).toBeGreaterThanOrEqual(100 - 1e-9);
      expect(x).toBeLessThanOrEqual(300 + 1e-9);
    }
  });
});

describe('scannerTouches', () => {
  it('burns within 16 px of a vertical band and not beyond', () => {
    expect(scannerTouches(vertical, 0, { x: 200 + SCANNER_HIT_DISTANCE, y: 200 })).toBe(true);
    expect(scannerTouches(vertical, 0, { x: 200 + SCANNER_HIT_DISTANCE + 0.5, y: 200 })).toBe(false);
  });

  it('only burns inside the lane along the band', () => {
    expect(inScannerLane(vertical, { x: 200, y: 40 })).toBe(false);
    expect(scannerTouches(vertical, 0, { x: 200, y: 40 })).toBe(false);
    expect(scannerTouches(vertical, 0, { x: 200, y: 450 })).toBe(true);
  });

  it('uses y for a horizontal band', () => {
    expect(scannerTouches(horizontal, 0, { x: 200, y: 210 })).toBe(true);
    expect(scannerTouches(horizontal, 0, { x: 200, y: 240 })).toBe(false);
  });
});

describe('scannerWarns', () => {
  it('warns when the band will arrive within 0.35 s, before it touches', () => {
    // At t = 0 the band is at 200 heading right at about 157 px/s.
    const p = { x: 250, y: 200 };
    expect(scannerTouches(vertical, 0, p)).toBe(false);
    expect(scannerWarns(vertical, 0, p)).toBe(true);
  });

  it('does not warn when the band is far away or the point is outside the lane', () => {
    expect(scannerWarns(vertical, 1, { x: 100, y: 200 })).toBe(false);
    expect(scannerWarns(vertical, 0, { x: 250, y: 20 })).toBe(false);
  });
});
