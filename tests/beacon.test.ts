import { describe, expect, it } from 'vitest';
import { canIgnite, findIgnitable, IGNITE_RANGE } from '../src/game/systems/BeaconSystem';

describe('canIgnite', () => {
  const brazier = { x: 100, y: 100 };

  it('accepts the exact range and rejects just past it', () => {
    expect(canIgnite({ x: 100 + IGNITE_RANGE, y: 100 }, brazier)).toBe(true);
    expect(canIgnite({ x: 100 + IGNITE_RANGE + 0.1, y: 100 }, brazier)).toBe(false);
  });
});

describe('findIgnitable', () => {
  it('picks the nearest unlit brazier in range', () => {
    const braziers = [
      { position: { x: 0, y: 0 }, lit: false },
      { position: { x: 40, y: 0 }, lit: false },
      { position: { x: 30, y: 0 }, lit: true },
    ];
    expect(findIgnitable({ x: 35, y: 0 }, braziers)).toBe(1);
  });

  it('returns -1 when everything in range is already lit', () => {
    expect(findIgnitable({ x: 0, y: 0 }, [{ position: { x: 10, y: 0 }, lit: true }])).toBe(-1);
  });
});
