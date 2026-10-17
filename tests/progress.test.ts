import { describe, expect, it } from 'vitest';
import {
  defaultProgress,
  loadProgress,
  PROGRESS_KEY,
  recordClear,
  saveProgress,
  type KeyValueStore,
} from '../src/game/systems/Progress';

function memoryStore(initial?: string): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(PROGRESS_KEY, initial);
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

const throwing: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('loadProgress', () => {
  it('returns defaults for empty, missing or blocked storage', () => {
    expect(loadProgress(memoryStore())).toEqual(defaultProgress());
    expect(loadProgress(null)).toEqual(defaultProgress());
    expect(loadProgress(throwing)).toEqual(defaultProgress());
  });

  it('returns defaults for corrupted JSON and non-objects', () => {
    for (const raw of ['{not json', 'null', '42', '"text"', '[]']) {
      expect(loadProgress(memoryStore(raw))).toEqual(defaultProgress());
    }
  });

  it('keeps valid fields and drops invalid ones individually', () => {
    const raw = JSON.stringify({
      unlocked: 99,
      muted: true,
      reducedShake: 'yes',
      best: {
        1: { bestTime: 20.5, bestStars: 3 },
        2: { bestTime: -1, bestStars: 3 },
        3: { bestTime: 40, bestStars: 7 },
        9: { bestTime: 10, bestStars: 1 },
        x: { bestTime: 10, bestStars: 1 },
      },
    });
    expect(loadProgress(memoryStore(raw))).toEqual({
      unlocked: 6,
      muted: true,
      reducedShake: false,
      best: { 1: { bestTime: 20.5, bestStars: 3 } },
    });
  });

  it('round-trips through saveProgress', () => {
    const store = memoryStore();
    const progress = recordClear(defaultProgress(), 1, 18.2, 3).progress;
    expect(saveProgress(store, progress)).toBe(true);
    expect(loadProgress(store)).toEqual(progress);
  });

  it('reports a failed save instead of throwing', () => {
    expect(saveProgress(throwing, defaultProgress())).toBe(false);
    expect(saveProgress(null, defaultProgress())).toBe(false);
  });
});

describe('recordClear', () => {
  it('unlocks the next chamber, capped at the last one', () => {
    expect(recordClear(defaultProgress(), 1, 30, 2).progress.unlocked).toBe(2);
    expect(recordClear({ ...defaultProgress(), unlocked: 6 }, 6, 100, 1).progress.unlocked).toBe(6);
  });

  it('never lowers unlocked when replaying an early chamber', () => {
    expect(recordClear({ ...defaultProgress(), unlocked: 5 }, 1, 30, 1).progress.unlocked).toBe(5);
  });

  it('never lets best stars regress, while still taking a faster time', () => {
    const first = recordClear(defaultProgress(), 2, 50, 3).progress;
    const second = recordClear(first, 2, 40, 1);
    expect(second.progress.best[2]).toEqual({ bestTime: 40, bestStars: 3 });
    expect(second.newBestTime).toBe(true);
    expect(second.newBestStars).toBe(false);
  });

  it('never lets best time regress, while still taking more stars', () => {
    const first = recordClear(defaultProgress(), 2, 30, 1).progress;
    const second = recordClear(first, 2, 45, 3);
    expect(second.progress.best[2]).toEqual({ bestTime: 30, bestStars: 3 });
    expect(second.newBestTime).toBe(false);
    expect(second.newBestStars).toBe(true);
  });

  it('marks the first clear as new best on both counts', () => {
    const r = recordClear(defaultProgress(), 3, 60, 2);
    expect(r.newBestTime && r.newBestStars).toBe(true);
  });
});
