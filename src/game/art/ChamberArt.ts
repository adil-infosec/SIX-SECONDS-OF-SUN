import Phaser from 'phaser';
import { CHAMBER_BOUNDS, DEPTH, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';
import type { Level } from '../data/levelTypes';

const TILE = 40;

/** Static room: floor, carved clock face, outer walls, obstacles and the exit alcove. */
export function drawChamber(scene: Phaser.Scene, level: Level): void {
  const b = CHAMBER_BOUNDS;

  const floor = scene.add.graphics().setDepth(DEPTH.floor);
  floor.fillStyle(PALETTE.slate, 1);
  floor.fillRect(b.x, b.y, b.w, b.h);

  // Exit alcove floor, slightly warmer so the goal area reads as "beyond".
  const alcoveX = level.gate.x + level.gate.w;
  floor.fillStyle(PALETTE.wall, 0.35);
  floor.fillRect(alcoveX, b.y, b.x + b.w - alcoveX, b.h);

  floor.lineStyle(1, PALETTE.wall, 0.55);
  for (let x = b.x + TILE; x < b.x + b.w; x += TILE) floor.lineBetween(x, b.y, x, b.y + b.h);
  for (let y = b.y + TILE; y < b.y + b.h; y += TILE) floor.lineBetween(b.x, y, b.x + b.w, y);

  drawClockFace(scene, (b.x + alcoveX) / 2, b.y + b.h / 2);

  const walls = scene.add.graphics().setDepth(DEPTH.solid);
  walls.fillStyle(PALETTE.wall, 1);
  walls.fillRect(0, 0, GAME_WIDTH, b.y);
  walls.fillRect(0, b.y + b.h, GAME_WIDTH, GAME_HEIGHT - b.y - b.h);
  walls.fillRect(0, b.y, b.x, b.h);
  walls.fillRect(b.x + b.w, b.y, GAME_WIDTH - b.x - b.w, b.h);
  walls.lineStyle(2, PALETTE.muted, 0.25);
  walls.strokeRect(b.x, b.y, b.w, b.h);
  walls.lineStyle(1, PALETTE.night, 0.8);
  walls.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);

  for (const o of level.obstacles) {
    // Drop shadow, body, then a lit top edge for a slight bevel.
    walls.fillStyle(PALETTE.night, 0.55);
    walls.fillRect(o.x + 3, o.y + 5, o.w, o.h);
    walls.fillStyle(PALETTE.wall, 1);
    walls.fillRect(o.x, o.y, o.w, o.h);
    walls.lineStyle(1, PALETTE.muted, 0.35);
    walls.lineBetween(o.x, o.y + 0.5, o.x + o.w, o.y + 0.5);
    walls.lineStyle(1, PALETTE.night, 0.6);
    walls.strokeRect(o.x, o.y, o.w, o.h);
  }
}

/** Faint carved observatory clock on the floor (decor only). */
function drawClockFace(scene: Phaser.Scene, cx: number, cy: number): void {
  const g = scene.add.graphics().setDepth(DEPTH.decor);
  g.lineStyle(2, PALETTE.muted, 0.08);
  g.strokeCircle(cx, cy, 170);
  g.strokeCircle(cx, cy, 120);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.lineBetween(cx + Math.cos(a) * 128, cy + Math.sin(a) * 128, cx + Math.cos(a) * 162, cy + Math.sin(a) * 162);
  }
  g.lineStyle(1, PALETTE.muted, 0.06);
  g.lineBetween(cx, cy, cx + 90, cy - 40);
  g.lineBetween(cx, cy, cx - 30, cy + 70);
}

/** Geometry mask matching the walkable interior, for effects that must not spill onto walls. */
export function createInteriorMask(scene: Phaser.Scene): Phaser.Display.Masks.GeometryMask {
  const shape = scene.make.graphics({}, false);
  shape.fillStyle(0xffffff, 1);
  shape.fillRect(CHAMBER_BOUNDS.x, CHAMBER_BOUNDS.y, CHAMBER_BOUNDS.w, CHAMBER_BOUNDS.h);
  return shape.createGeometryMask();
}
