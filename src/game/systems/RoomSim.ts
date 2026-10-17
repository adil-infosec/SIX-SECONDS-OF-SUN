import { CHAMBER_BOUNDS } from '../config';
import type { Level } from '../data/levelTypes';
import { findIgnitable, PRIMARY_BRAZIER_RADIUS, RELAY_BRAZIER_RADIUS, type BrazierState } from './BeaconSystem';
import {
  advanceEcho,
  createEcho,
  ECHO_COOLDOWN_SECONDS,
  echoPosition,
  MovementHistory,
  type EchoState,
} from './EchoSystem';
import { doorConditionMet, nextGateOpen } from './GlyphDoorSystem';
import { inPrismCone, moverRect, rotorAngle, rotorReach, rotorTouches, rotorWarns } from './HazardGeometry';
import { circleIntersectsRect, distance, type Circle, type Rect, type Vec2 } from './math';
import { inputToVelocity, moveCircle, PLAYER_RADIUS, type CollisionWorld, type MoveInput } from './MovementSystem';
import { initialRuneState, RUNE_CHARGE_SECONDS, stepRune, TIMED_RUNE_WINDOW, type RuneState } from './RuneSystem';
import { scannerPosition, scannerTouches, scannerWarns } from './ScannerSystem';
import { inAnyShadow, pointInConvexPolygon, shadowWedge, type Wedge } from './ShadowSystem';

/** GDD §8.1: the keeper exits when their center is inside the portal radius. */
export const GOAL_RADIUS = 25;
export const STARTING_HEARTS = 3;
/** GDD §8.6 hit response. */
export const HIT_FREEZE_SECONDS = 0.12;
export const INVULNERABLE_SECONDS = 1;
export const CHECKPOINT_RADIUS = 28;

export type FrameInput = MoveInput & {
  /** Edge-triggered: true only on the frame `E` went down. */
  ignite: boolean;
  /** Edge-triggered: true only on the frame `Q` went down. */
  echo: boolean;
};

export const NO_INPUT: FrameInput = { up: false, down: false, left: false, right: false, ignite: false, echo: false };

export type SimEvent =
  | { type: 'ignited'; primary: boolean; relayIndex: number }
  | { type: 'echoCreated' }
  | { type: 'echoDenied' }
  | { type: 'runePowered'; index: number }
  | { type: 'runeReleased'; index: number }
  | { type: 'gateOpened' }
  | { type: 'gateClosed' }
  | { type: 'hit'; hearts: number }
  | { type: 'respawned' }
  | { type: 'checkpoint'; index: number }
  | { type: 'failed' }
  | { type: 'won'; clearTime: number; hits: number };

export type RunState = {
  keeper: Vec2;
  /** Unit vector of the last movement direction. */
  facing: Vec2;
  moving: boolean;
  /** Stopwatch: starts on the first movement (GDD §8.8). */
  elapsed: number;
  timerRunning: boolean;
  primaryLit: boolean;
  relaysLit: boolean[];
  runes: RuneState[];
  runesPowered: boolean[];
  /** Shadow cast by the keeper this frame; null while the primary is unlit. */
  keeperShadow: Wedge | null;
  /** Seconds of recorded movement available to an echo, 0..6. */
  memory: number;
  /** True when `Q` would create an echo right now. */
  echoReady: boolean;
  echoCooldown: number;
  echo: EchoState | null;
  echoPos: Vec2 | null;
  /** Shadow cast by the echo; it counts for runes exactly like the keeper's. */
  echoShadow: Wedge | null;
  /** Extra shadows thrown by lit prisms, for the keeper and for the echo. */
  prismShadows: { wedge: Wedge; echo: boolean }[];
  /** Each moving pillar's box this frame. */
  movers: Rect[];
  /** Each rotating beam's angle and how far it reaches before a block stops it. */
  rotors: { angle: number; reach: number }[];
  gateOpen: boolean;
  gateEverOpened: boolean;
  /** Room clock in seconds; drives scanners. Unlike the stopwatch it runs from the first frame. */
  time: number;
  /** Each scanner's band position this frame, along its sweep axis. */
  scanners: number[];
  /** The keeper's center is inside the echo's shadow, so scanners cannot burn them. */
  sheltered: boolean;
  /** A scanner will touch the keeper within 0.35 s (and they are not protected). */
  danger: boolean;
  hearts: number;
  hits: number;
  /** Seconds of hit-stop left; the whole room is frozen meanwhile. */
  freeze: number;
  /** Seconds of post-respawn protection left. */
  invulnerable: number;
  /** Where a hit sends the keeper: the spawn, or the last checkpoint reached. */
  safePoint: Vec2;
  checkpointsReached: boolean[];
  /** Out of hearts: the attempt is over and the scene restarts it. */
  failed: boolean;
  won: boolean;
};

/**
 * Deterministic simulation of one chamber attempt. Scenes feed it input and
 * render its state; tests drive it directly to prove rooms are solvable.
 */
export class RoomSim {
  readonly level: Level;
  readonly state: RunState;
  private readonly staticRects: Rect[];
  private readonly brazierCircles: Circle[];
  private readonly history: MovementHistory;
  /** Runes held on for good because the rune that requires them has powered. */
  private readonly locked: boolean[];

  constructor(level: Level) {
    this.level = level;
    this.state = {
      keeper: { ...level.spawn },
      facing: { x: 1, y: 0 },
      moving: false,
      elapsed: 0,
      timerRunning: false,
      primaryLit: false,
      relaysLit: level.relayBeacons.map(() => false),
      runes: level.runes.map(() => initialRuneState()),
      runesPowered: level.runes.map(() => false),
      keeperShadow: null,
      memory: 0,
      echoReady: false,
      echoCooldown: 0,
      echo: null,
      echoPos: null,
      echoShadow: null,
      prismShadows: [],
      movers: (level.movers ?? []).map((m) => moverRect(m, 0)),
      rotors: (level.rotors ?? []).map((r) => ({ angle: rotorAngle(r, 0), reach: r.length })),
      gateOpen: false,
      gateEverOpened: false,
      time: 0,
      scanners: level.scanners.map((sc) => scannerPosition(sc, 0)),
      sheltered: false,
      danger: false,
      hearts: STARTING_HEARTS,
      hits: 0,
      freeze: 0,
      invulnerable: 0,
      safePoint: { ...level.spawn },
      checkpointsReached: level.checkpoints.map(() => false),
      failed: false,
      won: false,
    };
    this.staticRects = [...level.obstacles];
    this.history = new MovementHistory(level.spawn);
    this.locked = level.runes.map(() => false);
    this.brazierCircles = [
      { ...level.primaryBeacon, r: PRIMARY_BRAZIER_RADIUS },
      ...level.relayBeacons.map((p) => ({ ...p, r: RELAY_BRAZIER_RADIUS })),
    ];
  }

  /** Primary first, then relays, in level order. */
  braziers(): BrazierState[] {
    return [
      { position: this.level.primaryBeacon, lit: this.state.primaryLit },
      ...this.level.relayBeacons.map((position, i) => ({ position, lit: this.state.relaysLit[i] ?? false })),
    ];
  }

  /** Index into braziers() that `E` would light right now, or -1. A prism takes light only from a lit primary. */
  ignitableIndex(): number {
    const prisms = new Set((this.level.prisms ?? []).map((p) => p.relay + 1));
    const available = this.braziers().map((b, i) => (prisms.has(i) && !this.state.primaryLit ? { ...b, lit: true } : b));
    return findIgnitable(this.state.keeper, available);
  }

  keeperInDoorway(): boolean {
    return circleIntersectsRect(this.state.keeper, PLAYER_RADIUS, this.level.gate);
  }

  step(dt: number, input: FrameInput): SimEvent[] {
    const s = this.state;
    const events: SimEvent[] = [];
    if (s.won || s.failed || dt <= 0) return events;

    // Hit-stop: hold everything still, then put the keeper back at the safe point.
    if (s.freeze > 0) {
      s.freeze = Math.max(0, s.freeze - dt);
      if (s.freeze === 0) {
        s.keeper = { ...s.safePoint };
        s.invulnerable = INVULNERABLE_SECONDS;
        events.push({ type: 'respawned' });
      }
      return events;
    }
    s.time += dt;
    s.invulnerable = Math.max(0, s.invulnerable - dt);
    if (this.level.movers) s.movers = this.level.movers.map((m) => moverRect(m, s.time));

    const velocity = inputToVelocity(input);
    s.moving = velocity.x !== 0 || velocity.y !== 0;
    if (s.moving) {
      s.timerRunning = true;
      const speed = Math.hypot(velocity.x, velocity.y);
      s.facing = { x: velocity.x / speed, y: velocity.y / speed };
    }
    if (s.timerRunning) s.elapsed += dt;

    s.keeper = moveCircle(s.keeper, velocity, dt, PLAYER_RADIUS, this.collisionWorld());
    this.history.advance(dt, s.keeper);
    s.memory = this.history.seconds;

    this.level.checkpoints.forEach((cp, i) => {
      if (!s.checkpointsReached[i] && distance(s.keeper, cp) <= CHECKPOINT_RADIUS) {
        s.checkpointsReached[i] = true;
        s.safePoint = { ...cp };
        events.push({ type: 'checkpoint', index: i });
      }
    });

    if (input.ignite) {
      const index = this.ignitableIndex();
      if (index === 0) {
        s.primaryLit = true;
        events.push({ type: 'ignited', primary: true, relayIndex: -1 });
      } else if (index > 0) {
        s.relaysLit[index - 1] = true;
        events.push({ type: 'ignited', primary: false, relayIndex: index - 1 });
      }
    }

    // The echo replays a recorded path: it never collides, ignites or exits.
    s.echoCooldown = Math.max(0, s.echoCooldown - dt);
    if (s.echo) s.echo = advanceEcho(s.echo, dt);
    if (input.echo && this.level.echo) {
      if (this.history.ready && s.echoCooldown === 0) {
        // Replacing an echo drops the old one's shadow at once.
        s.echo = createEcho(this.history.snapshot());
        s.echoCooldown = ECHO_COOLDOWN_SECONDS;
        events.push({ type: 'echoCreated' });
      } else {
        events.push({ type: 'echoDenied' });
      }
    }
    s.echoPos = s.echo ? echoPosition(s.echo) : null;
    s.echoReady = this.level.echo && this.history.ready && s.echoCooldown === 0;

    // Shadows exist only while the primary flame burns (GDD §8.4).
    const light = this.level.primaryBeacon;
    s.keeperShadow = s.primaryLit ? shadowWedge(light, s.keeper, s.movers) : null;
    s.echoShadow = s.primaryLit && s.echoPos ? shadowWedge(light, s.echoPos, s.movers) : null;
    s.prismShadows = [];
    for (const prism of this.level.prisms ?? []) {
      if (!s.relaysLit[prism.relay]) continue;
      const origin = this.level.relayBeacons[prism.relay]!;
      for (const [caster, echo] of [[s.keeper, false], [s.echoPos, true]] as const) {
        if (!caster || !inPrismCone(prism, origin, caster)) continue;
        const wedge = shadowWedge(origin, caster, s.movers);
        if (wedge) s.prismShadows.push({ wedge, echo });
      }
    }
    const wedges = [s.keeperShadow, s.echoShadow, ...s.prismShadows.map((p) => p.wedge)];
    const covered = this.level.runes.map((rune) => inAnyShadow(rune.position, wedges));
    const runeIndex = new Map(this.level.runes.map((r, i) => [r.id, i]));
    this.level.runes.forEach((rune, i) => {
      const before = s.runes[i]!;
      let shaded = covered[i]!;
      // Grouped runes charge only while the whole group is in shadow at once.
      if (rune.group) shaded &&= this.level.runes.every((r, j) => r.group !== rune.group || covered[j]);
      // A rune that requires another charges only while that one is powered.
      const required = rune.requires !== undefined ? runeIndex.get(rune.requires) : undefined;
      if (required !== undefined && !s.runesPowered[required]) shaded = false;
      const after = this.locked[i]
        ? { phase: 'powered' as const, charge: RUNE_CHARGE_SECONDS, uncovered: 0 }
        : stepRune(before, rune.mode, shaded, dt, rune.window ?? TIMED_RUNE_WINDOW);
      s.runes[i] = after;
      const powered = after.phase === 'powered';
      if (powered && required !== undefined) this.locked[required] = true;
      if (powered !== s.runesPowered[i]) {
        s.runesPowered[i] = powered;
        events.push({ type: powered ? 'runePowered' : 'runeReleased', index: i });
      }
    });

    const conditionMet = doorConditionMet({
      primaryLit: s.primaryLit,
      relaysLit: s.relaysLit,
      runesPowered: s.runesPowered,
    });
    const open = nextGateOpen(s.gateOpen, conditionMet, this.keeperInDoorway());
    if (open !== s.gateOpen) {
      s.gateOpen = open;
      events.push({ type: open ? 'gateOpened' : 'gateClosed' });
    }
    if (open) s.gateEverOpened = true;

    // Fire scanners burn the keeper unless their center is in the echo's shadow
    // (never their own) or they were just hit (GDD §8.6).
    s.scanners = this.level.scanners.map((sc) => scannerPosition(sc, s.time));
    s.sheltered =
      (s.echoShadow !== null && pointInConvexPolygon(s.keeper, s.echoShadow)) ||
      s.prismShadows.some((p) => p.echo && pointInConvexPolygon(s.keeper, p.wedge));
    const protectedNow = s.sheltered || s.invulnerable > 0;
    // Rotating beams stop at the first solid block, so the angle behind one is shelter.
    const rotors = this.level.rotors ?? [];
    const blockers = rotors.length > 0 ? this.collisionWorld().rects : [];
    s.rotors = rotors.map((r) => {
      const angle = rotorAngle(r, s.time);
      return { angle, reach: rotorReach(r, angle, blockers) };
    });
    s.danger =
      !protectedNow &&
      (this.level.scanners.some((sc) => scannerWarns(sc, s.time, s.keeper)) ||
        rotors.some((r) => rotorWarns(r, s.time, s.keeper, blockers)));
    const burned =
      this.level.scanners.some((sc) => scannerTouches(sc, s.time, s.keeper)) ||
      rotors.some((r) => rotorTouches(r, s.time, s.keeper, blockers));
    if (!protectedNow && burned) {
      s.hearts -= 1;
      s.hits += 1;
      s.danger = false;
      events.push({ type: 'hit', hearts: s.hearts });
      if (s.hearts <= 0) {
        s.failed = true;
        s.timerRunning = false;
        events.push({ type: 'failed' });
      } else {
        s.freeze = HIT_FREEZE_SECONDS;
      }
      return events;
    }

    // The goal sits behind the gate, so it can only be reached through an open
    // gate; a gate that closes after the keeper is through does not undo the exit.
    if (s.gateEverOpened && distance(s.keeper, this.level.goal) <= GOAL_RADIUS) {
      s.won = true;
      s.timerRunning = false;
      events.push({ type: 'won', clearTime: s.elapsed, hits: s.hits });
    }
    return events;
  }

  private collisionWorld(): CollisionWorld {
    return {
      rects: [...this.staticRects, ...this.state.movers, ...(this.state.gateOpen ? [] : [this.level.gate])],
      circles: this.brazierCircles,
      bounds: CHAMBER_BOUNDS,
    };
  }
}
