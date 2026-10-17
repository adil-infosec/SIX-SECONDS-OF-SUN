import { CHAMBER_BOUNDS } from '../config';
import type { Level, Rect } from './levelTypes';

const EXIT_WALL_THICKNESS = 20;
const GATE_HEIGHT = 96;

/**
 * A full-height wall at `x` with a single doorway centered on `gateY`.
 * The goal sits in the alcove behind it, so the gate is the only way through.
 */
function exitWall(x: number, gateY: number): { walls: Rect[]; gate: Rect } {
  const top = CHAMBER_BOUNDS.y;
  const bottom = CHAMBER_BOUNDS.y + CHAMBER_BOUNDS.h;
  const left = x - EXIT_WALL_THICKNESS / 2;
  const gateTop = gateY - GATE_HEIGHT / 2;
  const gateBottom = gateY + GATE_HEIGHT / 2;
  return {
    walls: [
      { x: left, y: top, w: EXIT_WALL_THICKNESS, h: gateTop - top },
      { x: left, y: gateBottom, w: EXIT_WALL_THICKNESS, h: bottom - gateBottom },
    ],
    gate: { x: left, y: gateTop, w: EXIT_WALL_THICKNESS, h: GATE_HEIGHT },
  };
}

const room1Exit = exitWall(805, 260);
const room2Exit = exitWall(815, 260);
const room3Exit = exitWall(830, 270);
const room4Exit = exitWall(830, 240);
const room5Exit = exitWall(840, 170);
const room6Exit = exitWall(815, 260);

/**
 * Authored campaign. Positions follow the GDD §9 design anchors and are
 * tuned by the playthrough tests, never generated at runtime.
 */
export const LEVELS: readonly Level[] = [
  {
    id: 1,
    title: 'A Spark in the Dark',
    parTime: 35,
    spawn: { x: 145, y: 300 },
    primaryBeacon: { x: 425, y: 260 },
    relayBeacons: [],
    runes: [],
    gate: room1Exit.gate,
    goal: { x: 868, y: 260 },
    obstacles: [
      ...room1Exit.walls,
      // Low consoles along the top and bottom walls: shape, not a maze.
      { x: 540, y: 96, w: 120, h: 34 },
      { x: 230, y: 420, w: 130, h: 34 },
    ],
    scanners: [],
    checkpoints: [],
    echo: false,
    finale: false,
    hints: [{ text: 'Press E to light the beacon', position: { x: 425, y: 200 }, show: 'start', hide: 'ignite' }],
  },
  {
    id: 2,
    title: 'Shape of Nothing',
    parTime: 60,
    spawn: { x: 160, y: 350 },
    primaryBeacon: { x: 260, y: 260 },
    relayBeacons: [],
    // Latching: once the keeper's shadow powers it, the gate stays open.
    runes: [{ id: 'r2-a', position: { x: 660, y: 260 }, mode: 'latching' }],
    gate: room2Exit.gate,
    goal: { x: 873, y: 260 },
    obstacles: [
      ...room2Exit.walls,
      // Kept off the beacon-to-rune line so the shadow lesson reads cleanly.
      { x: 470, y: 96, w: 50, h: 70 },
      { x: 560, y: 384, w: 140, h: 34 },
    ],
    scanners: [],
    checkpoints: [],
    echo: false,
    finale: false,
    hints: [{ text: 'KEEP THE RUNE IN SHADOW', position: { x: 620, y: 196 }, show: 'ignite', hide: 'runes' }],
  },
  {
    id: 3,
    title: 'The Other You',
    parTime: 80,
    spawn: { x: 160, y: 400 },
    primaryBeacon: { x: 230, y: 270 },
    relayBeacons: [],
    // Continuous: the gate is open only while a shadow covers the rune, and the
    // rune is too far from the gate for the keeper to hold it and still get through.
    runes: [{ id: 'r3-a', position: { x: 675, y: 270 }, mode: 'continuous' }],
    gate: room3Exit.gate,
    goal: { x: 880, y: 270 },
    obstacles: [
      ...room3Exit.walls,
      { x: 540, y: 80, w: 120, h: 40 },
      { x: 500, y: 380, w: 40, h: 100 },
    ],
    scanners: [],
    checkpoints: [],
    echo: true,
    finale: false,
    hints: [{ text: 'HOLD THE SHADOW, THEN PRESS Q', position: { x: 450, y: 196 }, show: 'ignite', hide: 'echo' }],
  },
  {
    id: 4,
    title: 'Furnace Hour',
    parTime: 95,
    spawn: { x: 130, y: 380 },
    primaryBeacon: { x: 200, y: 240 },
    relayBeacons: [],
    runes: [{ id: 'r4-a', position: { x: 700, y: 240 }, mode: 'continuous' }],
    gate: room4Exit.gate,
    goal: { x: 880, y: 240 },
    obstacles: [
      ...room4Exit.walls,
      { x: 300, y: 80, w: 100, h: 40 },
      { x: 330, y: 400, w: 120, h: 40 },
    ],
    // A full-height band sweeping the stretch in front of the gate. It can only
    // be crossed inside the echo's shadow: an echo parked near (480, 240) both
    // holds the rune and shades x 554-720 along the line.
    scanners: [{ axis: 'vertical', min: 570, max: 760, from: 40, to: 500, period: 4.8, width: 10, phase: 0 }],
    checkpoints: [],
    echo: true,
    finale: false,
    hints: [
      { text: 'LEAVE AN ECHO ON THE LINE', position: { x: 400, y: 180 }, show: 'ignite', hide: 'echo' },
      { text: "SHELTER IN YOUR ECHO'S SHADOW", position: { x: 400, y: 160 }, show: 'echo', hide: 'never' },
    ],
  },
  {
    id: 5,
    title: 'Ashes and Angles',
    parTime: 110,
    spawn: { x: 120, y: 440 },
    primaryBeacon: { x: 220, y: 170 },
    // The relay sits on the far side of the fire fence from the beacon and gate.
    relayBeacons: [{ x: 640, y: 420 }],
    // Off-axis: the shadow line runs up and to the right (about -7 degrees), so
    // standing level with the flame misses it. Cast from about (492, 136).
    runes: [{ id: 'r5-a', position: { x: 700, y: 110 }, mode: 'continuous' }],
    gate: room5Exit.gate,
    goal: { x: 885, y: 170 },
    obstacles: [
      ...room5Exit.walls,
      // The fence wall: top half (beacon, rune, gate) and bottom half (spawn,
      // relay) meet only through the opening at x 380-780.
      { x: 40, y: 290, w: 340, h: 40 },
      { x: 780, y: 290, w: 50, h: 40 },
      { x: 560, y: 200, w: 40, h: 60 },
    ],
    // Sweeps along the opening, so it is crossed by timing, not by shelter.
    scanners: [{ axis: 'vertical', min: 400, max: 760, from: 270, to: 350, period: 4.4, width: 10, phase: 0 }],
    checkpoints: [],
    echo: true,
    finale: false,
    hints: [
      { text: 'RELAYS MUST BURN TOO', position: { x: 640, y: 470 }, show: 'start', hide: 'relays' },
      { text: 'MATCH THE ANGLE', position: { x: 420, y: 80 }, show: 'ignite', hide: 'runes' },
    ],
  },
  {
    id: 6,
    title: 'Six Seconds of Sun',
    parTime: 145,
    spawn: { x: 120, y: 200 },
    // The sun core: its shadow line runs down and right to the final rune.
    primaryBeacon: { x: 470, y: 170 },
    relayBeacons: [
      { x: 240, y: 430 },
      { x: 620, y: 440 },
    ],
    runes: [{ id: 'r6-a', position: { x: 725, y: 295 }, mode: 'continuous' }],
    gate: room6Exit.gate,
    goal: { x: 870, y: 260 },
    obstacles: [
      ...room6Exit.walls,
      // Fence wall between the sun's hall and the relay vault below it.
      { x: 40, y: 350, w: 240, h: 30 },
      { x: 600, y: 350, w: 205, h: 30 },
    ],
    scanners: [
      // Fence across the vault opening: cross on timing.
      { axis: 'vertical', min: 300, max: 580, from: 330, to: 400, period: 3.2, width: 10, phase: 0.8 },
      // Full-height sweep before the gate: cross only inside the echo's shade.
      // An echo parked near (545, 207) holds the rune and shades x 664-760 along its line.
      { axis: 'vertical', min: 680, max: 772, from: 40, to: 350, period: 4, width: 10, phase: 0 },
    ],
    checkpoints: [{ x: 440, y: 300 }],
    echo: true,
    finale: true,
    hints: [
      { text: 'LIGHT THE SUN AND BOTH RELAYS', position: { x: 470, y: 95 }, show: 'start', hide: 'relays' },
      { text: "SHELTER IN YOUR ECHO'S SHADOW", position: { x: 520, y: 70 }, show: 'echo', hide: 'never' },
    ],
  },
];

export function getLevel(id: number): Level {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown chamber ${id}`);
  return level;
}

export function hasLevel(id: number): boolean {
  return LEVELS.some((l) => l.id === id);
}
