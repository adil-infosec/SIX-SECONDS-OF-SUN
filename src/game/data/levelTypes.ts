import type { Rect, Vec2 } from '../systems/math';

export type { Rect, Vec2 };

/**
 * `latching` stays powered once charged; `continuous` needs its shadow kept
 * on it; `timed` stays powered for `window` seconds after its shadow leaves.
 */
export type RuneMode = 'latching' | 'continuous' | 'timed';

/** The GDD also calls these "glyphs"; the code uses "rune" throughout. */
export type Rune = {
  id: string;
  position: Vec2;
  mode: RuneMode;
  /** Runes sharing a group charge only while every rune in the group is shadowed at once. */
  group?: string;
  /** Id of a rune that must be powered for this one to charge; powering this one locks that rune on. */
  requires?: string;
  /** Seconds a `timed` rune stays powered after its shadow leaves (default 3). */
  window?: number;
};

/**
 * A stone pillar that slides back and forth along `axis` by up to `range`
 * px from `rect`, once per `period` seconds. It is solid, and it cuts any
 * shadow that runs into it.
 */
export type Mover = { rect: Rect; axis: 'x' | 'y'; range: number; period: number; phase: number };

/**
 * A rotating fire beam: it turns around `center` once per `period` seconds
 * and reaches `length` px, stopping at the first solid block in its way, so
 * the angle behind a block is shelter.
 */
export type Rotor = { center: Vec2; length: number; period: number; phase: number; clockwise: boolean };

/**
 * A prism relay (by index into `relayBeacons`): it takes light from the lit
 * primary and throws a cone toward `angle` (radians, 0 = right, y down) of
 * `spread` radians and `range` px. Anything in the cone casts a second shadow
 * away from the prism.
 */
export type Prism = { relay: number; angle: number; spread: number; range: number };

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
  /** Bonus-chamber mechanics; rooms 1-6 use none of them. */
  movers?: Mover[];
  rotors?: Rotor[];
  prisms?: Prism[];
};
