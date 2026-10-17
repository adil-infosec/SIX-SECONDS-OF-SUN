import { browserStore, loadProgress, saveProgress, type Progress } from './systems/Progress';

/** The player's saved progress for this page session, loaded once and saved on every change. */
let current: Progress = loadProgress(browserStore());

export function getProgress(): Progress {
  return current;
}

export function setProgress(next: Progress): void {
  current = next;
  saveProgress(browserStore(), next);
}

export function setPreference(patch: Partial<Pick<Progress, 'muted' | 'reducedShake'>>): void {
  setProgress({ ...current, ...patch });
}
