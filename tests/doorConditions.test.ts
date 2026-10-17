import { describe, expect, it } from 'vitest';
import { doorConditionMet, nextGateOpen } from '../src/game/systems/GlyphDoorSystem';

describe('doorConditionMet', () => {
  it('needs only the primary flame when there are no relays or runes', () => {
    expect(doorConditionMet({ primaryLit: false, relaysLit: [], runesPowered: [] })).toBe(false);
    expect(doorConditionMet({ primaryLit: true, relaysLit: [], runesPowered: [] })).toBe(true);
  });

  it('needs every relay and every rune', () => {
    expect(doorConditionMet({ primaryLit: true, relaysLit: [true, false], runesPowered: [true] })).toBe(false);
    expect(doorConditionMet({ primaryLit: true, relaysLit: [true, true], runesPowered: [false] })).toBe(false);
    expect(doorConditionMet({ primaryLit: true, relaysLit: [true, true], runesPowered: [true] })).toBe(true);
  });
});

describe('nextGateOpen', () => {
  it('opens as soon as the condition holds', () => {
    expect(nextGateOpen(false, true, false)).toBe(true);
  });

  it('closes when the condition drops and the doorway is clear', () => {
    expect(nextGateOpen(true, false, false)).toBe(false);
  });

  it('waits for the keeper to leave the doorway before closing', () => {
    expect(nextGateOpen(true, false, true)).toBe(true);
  });

  it('does not open just because the keeper stands at a closed gate', () => {
    expect(nextGateOpen(false, false, true)).toBe(false);
  });
});
