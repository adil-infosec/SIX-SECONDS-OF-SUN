import type { Rect, Vec2 } from '../systems/math';

export type { Rect, Vec2 };

export type RuneMode = 'latching' | 'continuous';

/** The GDD also calls these "glyphs"; the code uses "rune" throughout. */
export type Rune = { id: string; position: Vec2; mode: RuneMode };

/** GDD §8.6 fire scanner lane (used from room 4). */
export type Scanner = {
  axis: 'horizontal' | 'vertical';
  min: number;
  max: number;
  fixed: number;
  period: number;
  width: number;
  phase: number;
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
  hints: string[];
};
