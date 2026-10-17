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
    hints: [{ text: 'Press E to light the beacon', position: { x: 425, y: 200 }, show: 'beforeIgnite' }],
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
    hints: [{ text: 'KEEP THE RUNE IN SHADOW', position: { x: 620, y: 196 }, show: 'afterIgnite' }],
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
