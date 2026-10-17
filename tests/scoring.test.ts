import { describe, expect, it } from 'vitest';
import { computeStars, formatClearTime, formatClock } from '../src/game/systems/Scoring';

describe('computeStars', () => {
  it('gives 3 stars at or under par with no hits', () => {
    expect(computeStars(35, 0, 35)).toBe(3);
  });

  it('gives 2 stars within 1.5x par and at most one hit', () => {
    expect(computeStars(36, 0, 35)).toBe(2);
    expect(computeStars(20, 1, 35)).toBe(2);
    expect(computeStars(52.5, 1, 35)).toBe(2);
  });

  it('gives 1 star for any other clear', () => {
    expect(computeStars(53, 0, 35)).toBe(1);
    expect(computeStars(10, 2, 35)).toBe(1);
  });
});

describe('time formatting', () => {
  it('formats the HUD clock', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(72.9)).toBe('01:12');
  });

  it('formats clear times to tenths without rounding up', () => {
    expect(formatClearTime(21.49)).toBe('0:21.4');
    expect(formatClearTime(65)).toBe('1:05.0');
  });
});
