import type Phaser from 'phaser';
import { getProgress } from '../progressState';

/** Camera shake that respects the reduced-shake preference (GDD §8.8). */
export function shake(scene: Phaser.Scene, durationMs: number, intensity: number): void {
  if (getProgress().reducedShake) return;
  scene.cameras.main.shake(durationMs, intensity);
}

/** Full-screen color flash; softened to a quick fade when reduced shake is on. */
export function flash(scene: Phaser.Scene, durationMs: number, r: number, g: number, b: number): void {
  if (getProgress().reducedShake) {
    scene.cameras.main.flash(durationMs, Math.round(r / 3), Math.round(g / 3), Math.round(b / 3), false);
    return;
  }
  scene.cameras.main.flash(durationMs, r, g, b, false);
}
