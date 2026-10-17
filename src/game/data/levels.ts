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
    hints: ['Press E to light the beacon'],
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
