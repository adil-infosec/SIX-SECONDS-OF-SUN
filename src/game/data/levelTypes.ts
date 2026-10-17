import type { Rect, Vec2 } from '../systems/math';

export type { Rect, Vec2 };

export type RuneMode = 'latching' | 'continuous';

/** The GDD also calls these "glyphs"; the code uses "rune" throughout. */
export type Rune = { id: string; position: Vec2; mode: RuneMode };

/**
 * GDD §8.6 fire scanner. A `vertical` band (parallel to y) sweeps along x
 * between `min` and `max`; a `horizontal` band sweeps along y. The band
 * runs from `from` to `to` along its length. `phase` shifts the sine in
 * seconds; `width` is the drawn core thickness.
 */
export type Scanner = {
  axis: 'horizontal' | 'vertical';
  min: number;
  max: number;
  from: number;
  to: number;
  period: number;
  width: number;
  phase: number;
};

/**
 * On-screen instruction. `show`: visible from the start, from when the
 * primary beacon is lit, or from the first echo. `hide`: removed when the
 * beacon is lit, when every relay is lit, when every rune is powered, at the
 * first echo, or never.
 */
export type Hint = {
  text: string;
  position: Vec2;
  show: 'start' | 'ignite' | 'echo';
  hide: 'ignite' | 'relays' | 'runes' | 'echo' | 'never';
};

/** One authored chamber (GDD §9). All coordinates are in the 960×540 world. */
export type Level = {
  id: number;
  title: string;
  parTime: number;
  spawn: Vec2;
  primaryBeacon: Vec2;
  relayBeacons: Vec2[];
  runes: Rune[];
  /** Doorway in the exit wall; solid while closed. */
  gate: Rect;
  goal: Vec2;
  /** Solid boxes, including the exit wall segments above and below the gate. */
  obstacles: Rect[];
  scanners: Scanner[];
  /** GDD §8.7: reached by the keeper, a checkpoint becomes the respawn point after a hit. */
  checkpoints: Vec2[];
  /** Whether `Q` (the six-second echo) is available in this chamber. */
  echo: boolean;
  /** The last chamber: its beacon is the eclipse engine and clearing it plays the sunrise. */
  finale: boolean;
  hints: Hint[];
};
