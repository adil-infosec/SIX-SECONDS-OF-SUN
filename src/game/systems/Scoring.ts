export type StarCount = 1 | 2 | 3;

/** GDD §8.8 star thresholds. */
export function computeStars(clearTime: number, hits: number, parTime: number): StarCount {
  if (clearTime <= parTime && hits === 0) return 3;
  if (clearTime <= parTime * 1.5 && hits <= 1) return 2;
  return 1;
}

/** HUD clock, `mm:ss`. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Results time, `m:ss.t`. */
export function formatClearTime(seconds: number): string {
  const tenths = Math.max(0, Math.floor(seconds * 10));
  const m = Math.floor(tenths / 600);
  const s = Math.floor((tenths % 600) / 10);
  const t = tenths % 10;
  return `${m}:${String(s).padStart(2, '0')}.${t}`;
}
