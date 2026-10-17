import { TOTAL_CHAMBERS } from '../config';
import type { StarCount } from './Scoring';

/** GDD §8.8 save slot. */
export const PROGRESS_KEY = 'ssos-progress-v1';

export type ChamberRecord = { bestTime: number; bestStars: StarCount };

export type Progress = {
  /** Highest chamber the player may start, 1..6. */
  unlocked: number;
  best: Record<number, ChamberRecord>;
  muted: boolean;
  reducedShake: boolean;
};

/** The subset of Web Storage this module needs; tests pass a fake. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export function defaultProgress(): Progress {
  return { unlocked: 1, best: {}, muted: false, reducedShake: false };
}

function isStars(v: unknown): v is StarCount {
  return v === 1 || v === 2 || v === 3;
}

/**
 * Reads saved progress. Anything missing, malformed or out of range falls
 * back to defaults field by field, and storage that throws (private mode,
 * blocked site data) yields defaults: the game always starts.
 */
export function loadProgress(store: KeyValueStore | null): Progress {
  const fallback = defaultProgress();
  let raw: string | null = null;
  try {
    raw = store?.getItem(PROGRESS_KEY) ?? null;
  } catch {
    return fallback;
  }
  if (!raw) return fallback;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (typeof data !== 'object' || data === null) return fallback;
  const d = data as Record<string, unknown>;

  const unlocked =
    typeof d.unlocked === 'number' && Number.isInteger(d.unlocked)
      ? Math.min(TOTAL_CHAMBERS, Math.max(1, d.unlocked))
      : fallback.unlocked;

  const best: Record<number, ChamberRecord> = {};
  if (typeof d.best === 'object' && d.best !== null) {
    for (const [key, value] of Object.entries(d.best as Record<string, unknown>)) {
      const id = Number(key);
      if (!Number.isInteger(id) || id < 1 || id > TOTAL_CHAMBERS) continue;
      if (typeof value !== 'object' || value === null) continue;
      const r = value as Record<string, unknown>;
      if (typeof r.bestTime !== 'number' || !Number.isFinite(r.bestTime) || r.bestTime <= 0) continue;
      if (!isStars(r.bestStars)) continue;
      best[id] = { bestTime: r.bestTime, bestStars: r.bestStars };
    }
  }

  return {
    unlocked,
    best,
    muted: typeof d.muted === 'boolean' ? d.muted : fallback.muted,
    reducedShake: typeof d.reducedShake === 'boolean' ? d.reducedShake : fallback.reducedShake,
  };
}

/** Writes progress; returns false when storage is unavailable (the game carries on). */
export function saveProgress(store: KeyValueStore | null, progress: Progress): boolean {
  try {
    if (!store) return false;
    store.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export type ClearResult = { progress: Progress; newBestTime: boolean; newBestStars: boolean };

/**
 * Folds one clear into progress: unlocks the next chamber, keeps the fastest
 * time and the most stars separately, so neither ever gets worse.
 */
export function recordClear(progress: Progress, chamber: number, time: number, stars: StarCount): ClearResult {
  const previous = progress.best[chamber];
  const newBestTime = !previous || time < previous.bestTime;
  const newBestStars = !previous || stars > previous.bestStars;
  const record: ChamberRecord = {
    bestTime: previous && !newBestTime ? previous.bestTime : time,
    bestStars: previous && !newBestStars ? previous.bestStars : stars,
  };
  return {
    progress: {
      ...progress,
      unlocked: Math.min(TOTAL_CHAMBERS, Math.max(progress.unlocked, chamber + 1)),
      best: { ...progress.best, [chamber]: record },
    },
    newBestTime,
    newBestStars,
  };
}

/** Browser storage if it can be reached at all; null in sandboxes that forbid it. */
export function browserStore(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}
