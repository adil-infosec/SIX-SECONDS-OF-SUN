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
const room7Exit = exitWall(800, 270);
const room8Exit = exitWall(810, 270);
const room9Exit = exitWall(820, 420);
const room10Exit = exitWall(820, 270);
const room11Exit = exitWall(820, 270);
const room12Exit = exitWall(830, 270);

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

  // ---- Bonus chambers: new mechanics, unlocked by clearing the campaign ----
  {
    id: 7,
    title: 'Twin Seals',
    parTime: 40,
    spawn: { x: 120, y: 430 },
    primaryBeacon: { x: 200, y: 270 },
    relayBeacons: [],
    // Dual activation: both seals charge only while one shadow covers them together.
    // Standing level with the flame at about (400, 270) spreads the wedge over both.
    runes: [
      { id: 'r7-a', position: { x: 620, y: 242 }, mode: 'latching', group: 'twin' },
      { id: 'r7-b', position: { x: 620, y: 298 }, mode: 'latching', group: 'twin' },
    ],
    gate: room7Exit.gate,
    goal: { x: 868, y: 270 },
    obstacles: [...room7Exit.walls, { x: 300, y: 90, w: 120, h: 34 }, { x: 300, y: 446, w: 120, h: 34 }],
    scanners: [],
    checkpoints: [],
    echo: false,
    finale: false,
    hints: [{ text: 'BOTH SEALS IN ONE SHADOW', position: { x: 620, y: 190 }, show: 'ignite', hide: 'runes' }],
  },
  {
    id: 8,
    title: 'Shifting Stones',
    parTime: 55,
    spawn: { x: 110, y: 120 },
    primaryBeacon: { x: 180, y: 270 },
    relayBeacons: [],
    runes: [
      { id: 'r8-a', position: { x: 660, y: 242 }, mode: 'latching', group: 'pair' },
      { id: 'r8-b', position: { x: 660, y: 298 }, mode: 'latching', group: 'pair' },
    ],
    gate: room8Exit.gate,
    goal: { x: 875, y: 270 },
    obstacles: [...room8Exit.walls],
    // Two pillars slide up and down through the shadow line, out of step: the
    // seals charge only in the gaps when neither cuts the shadow short.
    movers: [
      { rect: { x: 520, y: 70, w: 40, h: 70 }, axis: 'y', range: 300, period: 4.2, phase: 0 },
      { rect: { x: 590, y: 70, w: 40, h: 70 }, axis: 'y', range: 300, period: 4.2, phase: 2.1 },
    ],
    scanners: [],
    checkpoints: [],
    echo: false,
    finale: false,
    hints: [{ text: 'PILLARS CUT YOUR SHADOW', position: { x: 380, y: 160 }, show: 'ignite', hide: 'runes' }],
  },
  {
    id: 9,
    title: 'Lighthouse',
    parTime: 70,
    spawn: { x: 90, y: 470 },
    primaryBeacon: { x: 160, y: 230 },
    relayBeacons: [],
    // Cast from the shelter below the middle block, about (470, 400).
    runes: [{ id: 'r9-a', position: { x: 620, y: 478 }, mode: 'latching' }],
    gate: room9Exit.gate,
    goal: { x: 880, y: 420 },
    obstacles: [
      ...room9Exit.walls,
      // Shelters: each block throws a beam-shadow away from the lamp.
      { x: 187, y: 326, w: 90, h: 40 },
      { x: 428, y: 280, w: 90, h: 40 },
      { x: 617, y: 286, w: 90, h: 40 },
    ],
    // The lamp turns once every 5 s from the top wall: the room is swept for
    // half of each turn, so cross between shelters while the beam is overhead.
    rotors: [{ center: { x: 480, y: 64 }, length: 620, period: 5, phase: 0, clockwise: true }],
    scanners: [],
    checkpoints: [],
    echo: false,
    finale: false,
    hints: [{ text: 'HIDE BEHIND STONE FROM THE BEAM', position: { x: 480, y: 160 }, show: 'start', hide: 'never' }],
  },
  {
    id: 10,
    title: 'Clockwork Order',
    parTime: 60,
    spawn: { x: 120, y: 120 },
    primaryBeacon: { x: 480, y: 270 },
    relayBeacons: [],
    // Rune A holds for three seconds once its shadow leaves; rune B charges
    // only inside that window, and powering B locks A on. Cast A from about
    // (480, 200), then go round the bar and cast B from about (480, 340).
    runes: [
      { id: 'r10-a', position: { x: 480, y: 90 }, mode: 'timed', window: 3 },
      { id: 'r10-b', position: { x: 480, y: 460 }, mode: 'latching', requires: 'r10-a' },
    ],
    gate: room10Exit.gate,
    goal: { x: 880, y: 270 },
    obstacles: [
      ...room10Exit.walls,
      // A bar through the flame splits the room; the way round is at its left end.
      { x: 340, y: 255, w: 110, h: 30 },
      { x: 510, y: 255, w: 270, h: 30 },
    ],
    scanners: [],
    checkpoints: [],
    echo: false,
    finale: false,
    hints: [
      { text: 'A, THEN B WITHIN THREE SECONDS', position: { x: 300, y: 70 }, show: 'ignite', hide: 'runes' },
    ],
  },
  {
    id: 11,
    title: 'Prism Hall',
    parTime: 70,
    spawn: { x: 600, y: 440 },
    primaryBeacon: { x: 300, y: 270 },
    // The prism: lit only after the primary, it throws light straight up.
    relayBeacons: [{ x: 120, y: 470 }],
    prisms: [{ relay: 0, angle: -Math.PI / 2, spread: 0.6, range: 380 }],
    // Sealed in the corner: the flame's own shadow line to it runs through solid
    // stone, so only the prism's light can put it in shadow. Cast from about (95, 282).
    runes: [{ id: 'r11-a', position: { x: 65, y: 65 }, mode: 'latching' }],
    gate: room11Exit.gate,
    goal: { x: 880, y: 270 },
    obstacles: [
      ...room11Exit.walls,
      { x: 90, y: 40, w: 200, h: 210 },
      { x: 40, y: 90, w: 50, h: 160 },
    ],
    scanners: [],
    checkpoints: [],
    echo: false,
    finale: false,
    hints: [
      { text: 'LIGHT THE FLAME, THEN THE PRISM', position: { x: 540, y: 120 }, show: 'start', hide: 'relays' },
      { text: 'THE PRISM THROWS A NEW SHADOW', position: { x: 300, y: 420 }, show: 'ignite', hide: 'runes' },
    ],
  },
  {
    id: 12,
    title: 'Echo Gauntlet',
    parTime: 90,
    spawn: { x: 90, y: 120 },
    primaryBeacon: { x: 130, y: 270 },
    relayBeacons: [],
    // Held by an echo parked at about (556, 270), which also shades lane 2.
    runes: [{ id: 'r12-a', position: { x: 770, y: 270 }, mode: 'continuous' }],
    gate: room12Exit.gate,
    goal: { x: 885, y: 270 },
    obstacles: [...room12Exit.walls],
    // Two fast lanes, too quick to time: cross each inside an echo's shade.
    // Park an echo at about (352, 270) for lane 1, then a second at (556, 270).
    scanners: [
      { axis: 'vertical', min: 380, max: 500, from: 40, to: 500, period: 2.2, width: 10, phase: 0 },
      { axis: 'vertical', min: 584, max: 700, from: 40, to: 500, period: 2, width: 10, phase: 0.5 },
    ],
    checkpoints: [{ x: 542, y: 270 }],
    echo: true,
    finale: false,
    hints: [
      { text: 'PARK AN ECHO BEFORE EACH LANE', position: { x: 260, y: 120 }, show: 'ignite', hide: 'never' },
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
