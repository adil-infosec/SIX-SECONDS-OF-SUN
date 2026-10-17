import Phaser from 'phaser';

/**
 * The keeper and echo as chibi sprite sheets, painted in code like the rest
 * of the art: a big round head under a visored cap, a small jacket with the
 * clockwork brace, and short legs. Four facings (down, left, right, up), each
 * with an idle frame and a four-frame walk. The echo gets its own pre-colored
 * cyan sheet instead of a tint, because the Canvas renderer ignores tints.
 */

export type Facing = 'down' | 'left' | 'right' | 'up';
export type CharacterSheet = 'keeper' | 'echo';

export const FACINGS: readonly Facing[] = ['down', 'left', 'right', 'up'];
/** One idle frame plus four walk frames per facing. */
const WALK_FRAMES = 4;
/** Frame size in world pixels; sheets are painted at 2x and shown at half scale. */
const W = 30;
const H = 38;
const RES = 2;
export const SPRITE_SCALE = 1 / RES;
/** Where the body's center sits in the frame (the sim position), as an origin. */
export const SPRITE_ORIGIN = { x: 0.5, y: 0.66 } as const;

type Palette = {
  outline: string;
  skin: string;
  cap: string;
  capLight: string;
  visor: string;
  jacket: string;
  jacketShade: string;
  legs: string;
  eye: string;
  emblem: string;
  blush: string;
};

const PALETTES: Record<CharacterSheet, Palette> = {
  keeper: {
    outline: '#2A2140',
    skin: '#F5F2E9',
    cap: '#FF9736',
    capLight: '#FFC857',
    visor: '#D9682A',
    jacket: '#FFC857',
    jacketShade: '#E3A53C',
    legs: '#3B4A7A',
    eye: '#2A2140',
    emblem: '#51D8ED',
    blush: 'rgba(246,91,62,0.35)',
  },
  echo: {
    outline: '#1A7486',
    skin: '#D2FCFF',
    cap: '#51D8ED',
    capLight: '#B1FAFF',
    visor: '#33AFC6',
    jacket: '#86E8F5',
    jacketShade: '#51D8ED',
    legs: '#2B97AD',
    eye: '#0E5363',
    emblem: '#FFFFFF',
    blush: 'rgba(177,250,255,0.5)',
  },
};

export function sheetKey(sheet: CharacterSheet): string {
  return `tex-${sheet}-sheet`;
}

export function frameName(facing: Facing, step: number): string {
  return `${facing}-${step}`;
}

export function walkAnimKey(sheet: CharacterSheet, facing: Facing): string {
  return `${sheet}-walk-${facing}`;
}

/** Paints both sheets and registers the walk animations, once per game. */
export function generateCharacterSheets(scene: Phaser.Scene): void {
  for (const sheet of Object.keys(PALETTES) as CharacterSheet[]) {
    const key = sheetKey(sheet);
    if (!scene.textures.exists(key)) {
      const tex = scene.textures.createCanvas(key, W * RES * (WALK_FRAMES + 1), H * RES * FACINGS.length);
      if (!tex) continue;
      const ctx = tex.getContext();
      FACINGS.forEach((facing, row) => {
        for (let step = 0; step <= WALK_FRAMES; step++) {
          const x = step * W * RES;
          const y = row * H * RES;
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(RES, RES);
          paintFrame(ctx, PALETTES[sheet], facing, step);
          ctx.restore();
          tex.add(frameName(facing, step), 0, x, y, W * RES, H * RES);
        }
      });
      tex.refresh();
    }
    for (const facing of FACINGS) {
      const anim = walkAnimKey(sheet, facing);
      if (scene.anims.exists(anim)) continue;
      scene.anims.create({
        key: anim,
        frames: [1, 2, 3, 4].map((step) => ({ key, frame: frameName(facing, step) })),
        frameRate: 10,
        repeat: -1,
      });
    }
  }
}

/** Dominant axis of a direction; horizontal wins ties so diagonals do not flicker. */
export function facingOf(dx: number, dy: number, fallback: Facing): Facing {
  if (dx === 0 && dy === 0) return fallback;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

// ---- painting ----

const CX = W / 2;
const OUTLINE = 2.2;

/** Strokes then fills the current path, which leaves a thick outline outside the shape. */
function ink(ctx: CanvasRenderingContext2D, p: Palette, fill: string): void {
  ctx.lineWidth = OUTLINE;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = p.outline;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function paintFrame(ctx: CanvasRenderingContext2D, p: Palette, facing: Facing, step: number): void {
  // Walk: legs swing, the body bobs on the passing frames.
  const swing = step === 0 ? 0 : [1, 0, -1, 0][step - 1]!;
  const bob = step === 0 ? 0 : [0, -1, 0, -1][step - 1]!;
  // Headroom above the cap.
  ctx.translate(0, 2);
  if (facing === 'left') {
    // Paint the right-facing frame mirrored.
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    paintSide(ctx, p, swing, bob);
    ctx.restore();
  } else if (facing === 'right') {
    paintSide(ctx, p, swing, bob);
  } else {
    paintFrontBack(ctx, p, facing === 'up', swing, bob);
  }
}

function paintFrontBack(ctx: CanvasRenderingContext2D, p: Palette, back: boolean, swing: number, bob: number): void {
  const headY = 12 + bob;
  const bodyY = 21 + bob;

  // Legs: the stepping leg lifts a little.
  for (const side of [-1, 1]) {
    const lift = side === -1 ? Math.max(0, swing) * 1.6 : Math.max(0, -swing) * 1.6;
    roundRect(ctx, CX + side * 3.6 - 2.4, bodyY + 6, 4.8, 6.4 - lift, 2.2);
    ink(ctx, p, p.legs);
  }
  // Arms swing opposite to the legs.
  for (const side of [-1, 1]) {
    circle(ctx, CX + side * 8, bodyY + 3.5 - side * swing * 1.2, 2.6);
    ink(ctx, p, p.skin);
  }
  // Jacket.
  roundRect(ctx, CX - 7, bodyY, 14, 9, 4);
  ink(ctx, p, p.jacket);
  ctx.fillStyle = p.jacketShade;
  roundRect(ctx, CX - 6, bodyY + 5.5, 12, 2.6, 1.3);
  ctx.fill();
  if (!back) {
    // The clockwork brace on the chest.
    circle(ctx, CX, bodyY + 3.6, 2);
    ink(ctx, p, p.emblem);
  }

  // Head.
  circle(ctx, CX, headY, 10);
  ink(ctx, p, p.skin);
  ctx.fillStyle = 'rgba(42,33,64,0.08)';
  ctx.beginPath();
  ctx.arc(CX, headY, 9, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.fill();

  // Cap: a dome over the top of the head; from behind it covers more.
  ctx.beginPath();
  const capLow = back ? headY + 1.5 : headY - 2.2;
  ctx.moveTo(CX - 10.2, capLow);
  ctx.bezierCurveTo(CX - 10.5, headY - 14, CX + 10.5, headY - 14, CX + 10.2, capLow);
  ctx.quadraticCurveTo(CX, capLow + (back ? 2 : 1.2), CX - 10.2, capLow);
  ctx.closePath();
  ink(ctx, p, p.cap);
  ctx.fillStyle = p.capLight;
  ellipse(ctx, CX - 3.5, headY - 7.2, 3.2, 1.6);
  ctx.fill();
  if (back) {
    ctx.fillStyle = p.visor;
    roundRect(ctx, CX - 2.5, capLow - 1.6, 5, 2.4, 1);
    ctx.fill();
    return;
  }
  // Visor: only the front half of the brim shows over the forehead.
  ctx.beginPath();
  ctx.ellipse(CX, capLow - 0.2, 9.4, 3, 0, 0, Math.PI);
  ctx.closePath();
  ink(ctx, p, p.visor);

  // Face.
  ctx.fillStyle = p.eye;
  ellipse(ctx, CX - 3.6, headY + 3.4, 1.25, 1.9);
  ctx.fill();
  ellipse(ctx, CX + 3.6, headY + 3.4, 1.25, 1.9);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  circle(ctx, CX - 3.2, headY + 2.6, 0.45);
  ctx.fill();
  circle(ctx, CX + 4, headY + 2.6, 0.45);
  ctx.fill();
  ctx.fillStyle = p.blush;
  ellipse(ctx, CX - 6.4, headY + 5.6, 1.8, 1);
  ctx.fill();
  ellipse(ctx, CX + 6.4, headY + 5.6, 1.8, 1);
  ctx.fill();
}

function paintSide(ctx: CanvasRenderingContext2D, p: Palette, swing: number, bob: number): void {
  const headY = 12 + bob;
  const bodyY = 21 + bob;

  // Back leg first, then front leg; they stride forward and back.
  roundRect(ctx, CX - 2.6 - swing * 2.6, bodyY + 6, 4.6, 6.4, 2.2);
  ink(ctx, p, p.legs);
  roundRect(ctx, CX - 1.4 + swing * 2.6, bodyY + 6, 4.6, 6.4, 2.2);
  ink(ctx, p, p.legs);

  roundRect(ctx, CX - 5.5, bodyY, 11, 9, 4);
  ink(ctx, p, p.jacket);
  ctx.fillStyle = p.jacketShade;
  roundRect(ctx, CX - 4.5, bodyY + 5.5, 9, 2.6, 1.3);
  ctx.fill();
  // One arm, swinging against the front leg.
  circle(ctx, CX - swing * 2.4, bodyY + 4, 2.6);
  ink(ctx, p, p.skin);

  circle(ctx, CX, headY, 10);
  ink(ctx, p, p.skin);
  ctx.fillStyle = 'rgba(42,33,64,0.08)';
  ctx.beginPath();
  ctx.arc(CX, headY, 9, 0.2 * Math.PI, 0.95 * Math.PI);
  ctx.fill();

  // Cap dome with the visor sticking out in front.
  ctx.beginPath();
  ctx.moveTo(CX - 10.2, headY - 0.5);
  ctx.bezierCurveTo(CX - 10.5, headY - 14, CX + 10.5, headY - 14, CX + 10.2, headY - 2.4);
  ctx.quadraticCurveTo(CX, headY - 1.2, CX - 10.2, headY - 0.5);
  ctx.closePath();
  ink(ctx, p, p.cap);
  ctx.fillStyle = p.capLight;
  ellipse(ctx, CX - 1.5, headY - 7.4, 3.2, 1.5);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(CX + 10, headY - 2, 4.6, 1.9, -0.12, 0, Math.PI * 2);
  ink(ctx, p, p.visor);

  ctx.fillStyle = p.eye;
  ellipse(ctx, CX + 5.4, headY + 3.4, 1.25, 1.9);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  circle(ctx, CX + 5.8, headY + 2.6, 0.45);
  ctx.fill();
  ctx.fillStyle = p.blush;
  ellipse(ctx, CX + 6.6, headY + 6, 1.8, 1);
  ctx.fill();
}
