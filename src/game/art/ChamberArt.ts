import Phaser from 'phaser';
import { CHAMBER_BOUNDS, DEPTH, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';
import type { Level, Rect } from '../data/levelTypes';
import { SCANNER_HIT_DISTANCE } from '../systems/ScannerSystem';
import { glowKey, type GlowColor } from './ProceduralTextures';

/**
 * Static room art in a chunky tile style: stone floor tiles, brick walls
 * with a lit cap, and stone blocks for obstacles, painted once per chamber
 * into two cached textures (floor below shadows, solids above them). Each
 * room wears its theme from the GDD: FIRE (warm ember stone), SHADOW
 * (violet stone with sensor glyphs), TIME (cyan stone with clock inlays)
 * and SUN for the finale. Art "pixels" are 2x2 so the tiles read as crisp
 * blocks at any scale.
 */

const TILE = 20;
const P = 2;
const BRICK_H = 10;

type Theme = {
  floor: string[];
  mortar: string;
  floorLight: string;
  speck: string;
  wallTop: string[];
  wallTopLight: string;
  wallFace: string[];
  wallDark: string;
  accent: string;
  glow: GlowColor;
  inlay: 'ember' | 'glyph' | 'clock' | 'sun';
};

const THEMES: Record<'fire' | 'shadow' | 'time' | 'sun', Theme> = {
  fire: {
    floor: ['#2A1E2A', '#2E2130', '#261B27'],
    mortar: '#150D16',
    floorLight: '#3A2A37',
    speck: '#3F2D37',
    wallTop: ['#3C2B3A', '#41303F', '#382835'],
    wallTopLight: '#56394B',
    wallFace: ['#2B1E2C', '#2F2131', '#271B28'],
    wallDark: '#170F18',
    accent: '#FF9736',
    glow: 'amber',
    inlay: 'ember',
  },
  shadow: {
    floor: ['#1D1C36', '#211F3D', '#1A1931'],
    mortar: '#0F0E21',
    floorLight: '#2B2850',
    speck: '#2A2748',
    wallTop: ['#2D2A52', '#312E59', '#29274B'],
    wallTopLight: '#433E74',
    wallFace: ['#211F3D', '#252342', '#1D1B37'],
    wallDark: '#121128',
    accent: '#8A6FE0',
    glow: 'activated',
    inlay: 'glyph',
  },
  time: {
    floor: ['#14233A', '#172840', '#122035'],
    mortar: '#091323',
    floorLight: '#1F3452',
    speck: '#1E3350',
    wallTop: ['#22385A', '#263D61', '#1F3453'],
    wallTopLight: '#33527D',
    wallFace: ['#192B47', '#1C2F4C', '#162741'],
    wallDark: '#0C182B',
    accent: '#51D8ED',
    glow: 'ice',
    inlay: 'clock',
  },
  sun: {
    floor: ['#24203A', '#28243F', '#211D35'],
    mortar: '#12101F',
    floorLight: '#35304F',
    speck: '#383150',
    wallTop: ['#3A3354', '#3F385B', '#36304F'],
    wallTopLight: '#554A75',
    wallFace: ['#2A2540', '#2E2945', '#26213A'],
    wallDark: '#1A162D',
    accent: '#FFC857',
    glow: 'gold',
    inlay: 'sun',
  },
};

/**
 * GDD lessons: 1 fire, 2 shadow, 3 time (echo), 4 Furnace Hour, 5 Ashes and
 * Angles, 6 all three. Bonus chambers 7-12 follow the same rhythm.
 */
const ROOM_THEME: Record<number, keyof typeof THEMES> = {
  1: 'fire',
  2: 'shadow',
  3: 'time',
  4: 'fire',
  5: 'shadow',
  6: 'sun',
  7: 'fire',
  8: 'shadow',
  9: 'time',
  10: 'fire',
  11: 'shadow',
  12: 'sun',
};

export function themeFor(levelId: number): Theme {
  return THEMES[ROOM_THEME[levelId] ?? 'time'];
}

/** Static room: tiled floor, carved clock face, brick walls, stone blocks and the exit alcove. */
export function drawChamber(scene: Phaser.Scene, level: Level): void {
  const theme = themeFor(level.id);
  const floorKey = `tex-chamber-floor-${level.id}`;
  const solidKey = `tex-chamber-solid-${level.id}`;
  if (!scene.textures.exists(floorKey)) paint(scene, floorKey, (ctx) => paintFloor(ctx, level, theme));
  if (!scene.textures.exists(solidKey)) paint(scene, solidKey, (ctx) => paintSolids(ctx, level, theme));

  scene.add.image(0, 0, floorKey).setOrigin(0).setDepth(DEPTH.floor);
  const alcoveX = level.gate.x + level.gate.w;
  drawClockFace(scene, (CHAMBER_BOUNDS.x + alcoveX) / 2, CHAMBER_BOUNDS.y + CHAMBER_BOUNDS.h / 2);
  scene.add.image(0, 0, solidKey).setOrigin(0).setDepth(DEPTH.solid);

  // Slit windows in the north wall glow in the room's color (hidden by the darkness until lit).
  for (const x of slitPositions()) {
    scene.add
      .image(x, 30, glowKey(theme.glow))
      .setScale(0.22)
      .setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.solid);
  }
}

function paint(scene: Phaser.Scene, key: string, draw: (ctx: CanvasRenderingContext2D) => void): void {
  const tex = scene.textures.createCanvas(key, GAME_WIDTH, GAME_HEIGHT);
  if (!tex) return;
  draw(tex.getContext());
  tex.refresh();
}

// ---- floor ----

function paintFloor(ctx: CanvasRenderingContext2D, level: Level, t: Theme): void {
  const rand = seeded(level.id * 7919);
  const b = CHAMBER_BOUNDS;
  const alcoveX = level.gate.x + level.gate.w;

  for (let y = b.y; y < b.y + b.h; y += TILE) {
    for (let x = b.x; x < b.x + b.w; x += TILE) {
      const h = Math.min(TILE, b.y + b.h - y);
      const r = rand();
      ctx.fillStyle = t.floor[r < 0.55 ? 0 : r < 0.85 ? 1 : 2]!;
      ctx.fillRect(x, y, TILE, h);
      // Bevel: light top-left edge, mortar on the bottom-right.
      ctx.fillStyle = t.floorLight;
      ctx.fillRect(x, y, TILE - P, P);
      ctx.fillRect(x, y, P, h - P);
      ctx.fillStyle = t.mortar;
      ctx.fillRect(x + TILE - P, y, P, h);
      ctx.fillRect(x, y + h - P, TILE, P);
      // A few specks of grit.
      for (let s = 0, n = Math.floor(rand() * 3); s < n; s++) {
        ctx.fillStyle = rand() < 0.5 ? t.speck : t.mortar;
        ctx.fillRect(x + snap(2 + rand() * 14), y + snap(2 + rand() * (h - 6)), P, P);
      }
      const k = rand();
      if (k < 0.06) crack(ctx, x, y, rand, t.mortar);
      else if (k < 0.1 && x < alcoveX) inlay(ctx, x, y, t, rand);
    }
  }

  // The alcove beyond the gate: lighter stone, lit by the room's accent.
  ctx.fillStyle = withAlpha(t.accent, 0.06);
  ctx.fillRect(alcoveX, b.y, b.x + b.w - alcoveX, b.h);

  // Scorched tiles and hazard stripes along every scanner lane.
  for (const sc of level.scanners) {
    const lo = sc.min - SCANNER_HIT_DISTANCE;
    const hi = sc.max + SCANNER_HIT_DISTANCE;
    const lane: Rect = sc.axis === 'vertical' ? { x: lo, y: sc.from, w: hi - lo, h: sc.to - sc.from } : { x: sc.from, y: lo, w: sc.to - sc.from, h: hi - lo };
    ctx.fillStyle = 'rgba(246,91,62,0.05)';
    ctx.fillRect(lane.x, lane.y, lane.w, lane.h);
    for (let i = 0; i < (lane.w * lane.h) / 900; i++) {
      ctx.fillStyle = rand() < 0.6 ? 'rgba(10,6,10,0.35)' : 'rgba(255,151,54,0.12)';
      ctx.fillRect(lane.x + snap(rand() * lane.w), lane.y + snap(rand() * lane.h), P * 2, P);
    }
    stripes(ctx, sc.axis, lane, lo, hi);
  }

  // Walls and blocks cast soft shadows onto the floor.
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = `rgba(4,6,14,${0.42 - i * 0.1})`;
    ctx.fillRect(b.x, b.y + i * P, b.w, P);
    ctx.fillRect(b.x + i * P, b.y, P, b.h);
  }
  for (const o of level.obstacles) {
    ctx.fillStyle = 'rgba(4,6,14,0.45)';
    ctx.fillRect(o.x + P * 2, o.y + o.h, o.w, P * 3);
    ctx.fillRect(o.x + o.w, o.y + P * 3, P * 2, o.h);
  }
}

/** Yellow-and-dark hazard stripes along the two long edges of a scanner lane. */
function stripes(ctx: CanvasRenderingContext2D, axis: 'vertical' | 'horizontal', lane: Rect, lo: number, hi: number): void {
  for (const edge of [lo, hi - P * 2]) {
    const length = axis === 'vertical' ? lane.h : lane.w;
    for (let s = 0; s < length; s += P * 4) {
      ctx.fillStyle = (s / (P * 4)) % 2 === 0 ? 'rgba(255,151,54,0.45)' : 'rgba(10,6,10,0.5)';
      if (axis === 'vertical') ctx.fillRect(edge, lane.y + s, P * 2, P * 4);
      else ctx.fillRect(lane.x + s, edge, P * 4, P * 2);
    }
  }
}

function crack(ctx: CanvasRenderingContext2D, x: number, y: number, rand: () => number, color: string): void {
  let cx = x + snap(4 + rand() * 6);
  let cy = y + snap(4 + rand() * 4);
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(cx, cy, P, P);
    cx += rand() < 0.5 ? P : 0;
    cy += P;
  }
}

/** A dim themed inlay in one floor tile. */
function inlay(ctx: CanvasRenderingContext2D, x: number, y: number, t: Theme, rand: () => number): void {
  const c = withAlpha(t.accent, 0.32);
  const dot = (dx: number, dy: number) => ctx.fillRect(x + dx * P, y + dy * P, P, P);
  ctx.fillStyle = c;
  if (t.inlay === 'ember') {
    // A glowing seam of embers across the tile.
    let dx = 1;
    let dy = 2 + Math.floor(rand() * 4);
    for (let i = 0; i < 8; i++) {
      dot(dx, dy);
      dx += 1;
      dy += rand() < 0.4 ? (rand() < 0.5 ? -1 : 1) : 0;
      dy = Math.max(1, Math.min(8, dy));
    }
  } else if (t.inlay === 'glyph') {
    // A small sensor diamond.
    for (const [dx, dy] of [[5, 2], [4, 3], [6, 3], [3, 4], [7, 4], [4, 5], [6, 5], [5, 6], [5, 4]] as const) dot(dx, dy);
  } else if (t.inlay === 'clock') {
    // A tiny clock: ring, twelve o'clock and one hand.
    for (const [dx, dy] of [[4, 1], [5, 1], [6, 1], [3, 2], [7, 2], [2, 3], [8, 3], [2, 4], [8, 4], [2, 5], [8, 5], [3, 6], [7, 6], [4, 7], [5, 7], [6, 7]] as const) dot(dx, dy);
    ctx.fillStyle = withAlpha(t.accent, 0.5);
    dot(5, 3);
    dot(5, 4);
    dot(6, 4);
  } else {
    // A small sun: center and four rays.
    for (const [dx, dy] of [[5, 4], [4, 4], [6, 4], [5, 3], [5, 5], [5, 1], [5, 7], [2, 4], [8, 4], [3, 2], [7, 2], [3, 6], [7, 6]] as const) dot(dx, dy);
  }
}

// ---- walls and blocks ----

function paintSolids(ctx: CanvasRenderingContext2D, level: Level, t: Theme): void {
  const rand = seeded(level.id * 104729);
  const b = CHAMBER_BOUNDS;

  // Wall tops: big stone blocks around the whole frame.
  stoneTop(ctx, { x: 0, y: 0, w: GAME_WIDTH, h: b.y }, t, rand, 20);
  stoneTop(ctx, { x: 0, y: b.y + b.h, w: GAME_WIDTH, h: GAME_HEIGHT - b.y - b.h }, t, rand, 20);
  stoneTop(ctx, { x: 0, y: b.y, w: b.x, h: b.h }, t, rand, 20);
  stoneTop(ctx, { x: b.x + b.w, y: b.y, w: GAME_WIDTH - b.x - b.w, h: b.h }, t, rand, 20);

  // The north wall shows its brick face toward the room, with slit windows.
  const faceY = b.y - 14;

  // The HUD sits on the top and bottom walls: calm the stone there so text stays readable.
  ctx.fillStyle = 'rgba(10,16,35,0.62)';
  ctx.fillRect(0, 0, GAME_WIDTH, faceY);
  ctx.fillRect(0, b.y + b.h + P * 3, GAME_WIDTH, GAME_HEIGHT - b.y - b.h - P * 3);
  bricks(ctx, { x: b.x, y: faceY, w: b.w, h: 14 }, t, rand);
  for (const x of slitPositions()) {
    ctx.fillStyle = t.wallDark;
    ctx.fillRect(x - 4, faceY + 2, 8, 10);
    ctx.fillStyle = t.accent;
    ctx.fillRect(x - 2, faceY + 4, 4, 6);
    ctx.fillStyle = '#FFF4D6';
    ctx.fillRect(x - 2, faceY + 4, 4, 2);
  }

  // Lit cap along the inner rim, and a dark line where wall meets floor.
  ctx.fillStyle = t.wallTopLight;
  ctx.fillRect(b.x - P * 2, faceY - P, b.w + P * 4, P);
  ctx.fillRect(b.x - P * 2, b.y + b.h + P, b.w + P * 4, P);
  ctx.fillRect(b.x - P * 2, faceY, P, b.h + 14 + P * 2);
  ctx.fillRect(b.x + b.w + P, faceY, P, b.h + 14 + P * 2);
  ctx.fillStyle = t.wallDark;
  ctx.fillRect(b.x, b.y + b.h, b.w, P);
  ctx.fillRect(b.x - P, faceY, P, b.h + 14);
  ctx.fillRect(b.x + b.w, faceY, P, b.h + 14);

  for (const o of level.obstacles) block(ctx, o, t, rand);
}

/** Top surface of stone: irregular big blocks with bevels. */
function stoneTop(ctx: CanvasRenderingContext2D, r: Rect, t: Theme, rand: () => number, size: number): void {
  ctx.fillStyle = t.wallDark;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += size) {
    const offset = ((y - r.y) / size) % 2 === 0 ? 0 : size / 2;
    for (let x = r.x - offset; x < r.x + r.w; x += size) {
      const x0 = Math.max(r.x, x);
      const x1 = Math.min(r.x + r.w, x + size);
      const h = Math.min(size, r.y + r.h - y);
      if (x1 - x0 <= P) continue;
      ctx.fillStyle = t.wallTop[Math.floor(rand() * t.wallTop.length)]!;
      ctx.fillRect(x0, y, x1 - x0 - P, h - P);
      ctx.fillStyle = t.wallTopLight;
      ctx.fillRect(x0, y, x1 - x0 - P, P);
      if (rand() < 0.15) {
        ctx.fillStyle = t.wallDark;
        ctx.fillRect(x0 + snap(4 + rand() * 8), y + snap(4 + rand() * 8), P * 2, P);
      }
    }
  }
}

/** A vertical brick face: offset courses of bricks with mortar. */
function bricks(ctx: CanvasRenderingContext2D, r: Rect, t: Theme, rand: () => number): void {
  ctx.fillStyle = t.wallDark;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  for (let y = r.y, row = 0; y < r.y + r.h; y += BRICK_H / 2 + P, row++) {
    const h = Math.min(BRICK_H / 2, r.y + r.h - y);
    for (let x = r.x - (row % 2) * 10; x < r.x + r.w; x += 20) {
      const x0 = Math.max(r.x, x);
      const x1 = Math.min(r.x + r.w, x + 20 - P);
      if (x1 <= x0) continue;
      ctx.fillStyle = t.wallFace[Math.floor(rand() * t.wallFace.length)]!;
      ctx.fillRect(x0, y, x1 - x0, h);
    }
  }
}

/** An obstacle as a stone block: top surface, brick front face, outline and a carved mark. */
function block(ctx: CanvasRenderingContext2D, o: Rect, t: Theme, rand: () => number): void {
  const face = o.h >= 30 ? 10 : Math.max(4, Math.floor(o.h / 4 / P) * P);
  const top: Rect = { x: o.x, y: o.y, w: o.w, h: o.h - face };
  stoneTop(ctx, top, t, rand, 20);
  bricks(ctx, { x: o.x, y: o.y + o.h - face, w: o.w, h: face }, t, rand);
  ctx.fillStyle = t.wallTopLight;
  ctx.fillRect(o.x, o.y, o.w, P);
  ctx.fillStyle = PALETTE_CSS.night;
  ctx.fillRect(o.x - P, o.y - P, o.w + P * 2, P);
  ctx.fillRect(o.x - P, o.y + o.h, o.w + P * 2, P);
  ctx.fillRect(o.x - P, o.y, P, o.h);
  ctx.fillRect(o.x + o.w, o.y, P, o.h);
  // Larger blocks carry a carved accent mark in the middle of the top.
  if (top.w >= 40 && top.h >= 30) {
    const cx = snap(top.x + top.w / 2);
    const cy = snap(top.y + top.h / 2);
    ctx.fillStyle = t.wallDark;
    ctx.fillRect(cx - P * 3, cy - P, P * 6, P * 2);
    ctx.fillRect(cx - P, cy - P * 3, P * 2, P * 6);
    ctx.fillStyle = withAlpha(t.accent, 0.55);
    ctx.fillRect(cx - P, cy - P, P * 2, P * 2);
  }
}

/**
 * A stone block of `w` x `h` in the room's theme as its own texture, with a
 * drop shadow, for blocks that move. The block sits 2 px in from the top-left.
 */
export function blockTexture(scene: Phaser.Scene, levelId: number, w: number, h: number): string {
  const key = `tex-block-${levelId}-${w}x${h}`;
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, w + 10, h + 12);
    if (tex) {
      const ctx = tex.getContext();
      ctx.fillStyle = 'rgba(4,6,14,0.45)';
      ctx.fillRect(2 + P * 2, 2 + P * 3, w, h);
      block(ctx, { x: 2, y: 2, w, h }, themeFor(levelId), seeded(levelId * 31 + w * 7 + h));
      tex.refresh();
    }
  }
  return key;
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

// ---- helpers ----

const PALETTE_CSS = { night: '#0A1023' } as const;

function slitPositions(): number[] {
  const out: number[] = [];
  for (let x = CHAMBER_BOUNDS.x + 100; x < CHAMBER_BOUNDS.x + CHAMBER_BOUNDS.w - 60; x += 180) out.push(x);
  return out;
}

function snap(v: number): number {
  return Math.round(v / P) * P;
}

function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Small deterministic RNG, so a room looks the same every visit. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
