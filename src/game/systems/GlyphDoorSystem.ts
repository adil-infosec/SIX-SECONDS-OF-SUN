export type DoorConditions = {
  primaryLit: boolean;
  relaysLit: readonly boolean[];
  runesPowered: readonly boolean[];
};

/** GDD §8.5: the gate opens when the primary is lit and every required relay and rune is satisfied. */
export function doorConditionMet(c: DoorConditions): boolean {
  return c.primaryLit && c.relaysLit.every(Boolean) && c.runesPowered.every(Boolean);
}

/**
 * Next open/closed state of the gate. When the conditions stop holding while
 * the keeper stands in the doorway, closing waits until they step clear so
 * the gate never traps or crushes them.
 */
export function nextGateOpen(wasOpen: boolean, conditionMet: boolean, keeperInDoorway: boolean): boolean {
  if (conditionMet) return true;
  return wasOpen && keeperInDoorway;
}
