import { describe, expect, it } from 'vitest';
import {
  inAnyShadow,
  MIN_CASTER_DISTANCE,
  pointInConvexPolygon,
  SHADOW_FAR_HALF_WIDTH,
  SHADOW_LENGTH,
  SHADOW_NEAR_HALF_WIDTH,
  shadowWedge,
} from '../src/game/systems/ShadowSystem';

const caster = { x: 500, y: 300 };

/** Beacon 200 px from the caster in each quadrant direction. */
const quadrants = [
  { name: 'up-left', light: { x: 500 - 141.42, y: 300 - 141.42 } },
  { name: 'up-right', light: { x: 500 + 141.42, y: 300 - 141.42 } },
  { name: 'down-left', light: { x: 500 - 141.42, y: 300 + 141.42 } },
  { name: 'down-right', light: { x: 500 + 141.42, y: 300 + 141.42 } },
];

describe.each(quadrants)('shadowWedge with the beacon $name of the caster', ({ light }) => {
  const wedge = shadowWedge(light, caster)!;
  const len = Math.hypot(caster.x - light.x, caster.y - light.y);
  const u = { x: (caster.x - light.x) / len, y: (caster.y - light.y) / len };
  const n = { x: -u.y, y: u.x };
  const along = (t: number, side = 0) => ({ x: caster.x + u.x * t + n.x * side, y: caster.y + u.y * t + n.y * side });

  it('covers points straight behind the caster, away from the light', () => {
    expect(pointInConvexPolygon(along(100), wedge)).toBe(true);
    expect(pointInConvexPolygon(along(SHADOW_LENGTH - 1), wedge)).toBe(true);
  });

  it('does not cover points on the light side of the caster', () => {
    expect(pointInConvexPolygon(along(-5), wedge)).toBe(false);
    expect(pointInConvexPolygon(light, wedge)).toBe(false);
  });

  it('does not cover points past the far end or outside the sides', () => {
    expect(pointInConvexPolygon(along(SHADOW_LENGTH + 1), wedge)).toBe(false);
    expect(pointInConvexPolygon(along(120, 40), wedge)).toBe(false);
  });

  it('widens from the near end to the far end', () => {
    expect(pointInConvexPolygon(along(1, SHADOW_NEAR_HALF_WIDTH + 2), wedge)).toBe(false);
    expect(pointInConvexPolygon(along(SHADOW_LENGTH - 1, SHADOW_FAR_HALF_WIDTH - 2), wedge)).toBe(true);
  });

  it('counts points exactly on the boundary as inside', () => {
    expect(pointInConvexPolygon(along(SHADOW_LENGTH), wedge)).toBe(true);
    expect(pointInConvexPolygon(along(SHADOW_LENGTH, SHADOW_FAR_HALF_WIDTH), wedge)).toBe(true);
    expect(pointInConvexPolygon(along(0, SHADOW_NEAR_HALF_WIDTH), wedge)).toBe(true);
  });
});

describe('shadowWedge edge cases', () => {
  it('casts nothing when the caster stands on the flame (zero length)', () => {
    expect(shadowWedge(caster, caster)).toBeNull();
  });

  it('casts nothing closer than the minimum distance, and casts at it', () => {
    expect(shadowWedge({ x: caster.x - (MIN_CASTER_DISTANCE - 0.1), y: caster.y }, caster)).toBeNull();
    expect(shadowWedge({ x: caster.x - MIN_CASTER_DISTANCE, y: caster.y }, caster)).not.toBeNull();
  });

  it('casts nothing for non-finite input', () => {
    expect(shadowWedge({ x: Number.NaN, y: 0 }, caster)).toBeNull();
  });
});

describe('inAnyShadow', () => {
  const light = { x: 300, y: 300 };
  it('is true when any wedge covers the point and ignores missing wedges', () => {
    const a = shadowWedge(light, { x: 300, y: 200 });
    const b = shadowWedge(light, caster);
    expect(inAnyShadow({ x: 650, y: 300 }, [null, a, b])).toBe(true);
    expect(inAnyShadow({ x: 650, y: 300 }, [null, a])).toBe(false);
    expect(inAnyShadow({ x: 650, y: 300 }, [])).toBe(false);
  });
});
