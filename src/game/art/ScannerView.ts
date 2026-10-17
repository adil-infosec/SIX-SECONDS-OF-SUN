import Phaser from 'phaser';
import { DEPTH, PALETTE } from '../config';
import type { Scanner } from '../data/levelTypes';
import { SCANNER_HIT_DISTANCE, SCANNER_WARNING_SECONDS, scannerPosition } from '../systems/ScannerSystem';
import { TEXTURE_KEYS } from './ProceduralTextures';

/**
 * Fire scanner: a faint hazard lane marking everywhere the band can reach,
 * the burning band itself (its glow is exactly the 16 px hit zone), a dashed
 * telegraph where the band will be in 0.35 s, and embers shed along it.
 */
export class ScannerView {
  private readonly sc: Scanner;
  private readonly band: Phaser.GameObjects.Graphics;
  private readonly embers: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, sc: Scanner, mask: Phaser.Display.Masks.GeometryMask) {
    this.sc = sc;
    const lane = scene.add.graphics().setDepth(DEPTH.decor);
    const lo = sc.min - SCANNER_HIT_DISTANCE;
    const hi = sc.max + SCANNER_HIT_DISTANCE;
    lane.fillStyle(PALETTE.fire, 0.06);
    this.addLaneTo(lane);
    lane.lineStyle(1.5, PALETTE.fire, 0.35);
    for (const edge of [lo, hi]) dashed(lane, sc, edge, 10, 8);
    lane.setMask(mask);

    this.band = scene.add.graphics().setDepth(DEPTH.scanner).setBlendMode(Phaser.BlendModes.ADD);
    this.band.setMask(mask);

    const length = sc.to - sc.from;
    this.embers = scene.add.particles(0, 0, TEXTURE_KEYS.sparks, {
      frame: ['gold', 'amber', 'fire'],
      lifespan: { min: 300, max: 700 },
      speed: { min: 10, max: 50 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.9, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      frequency: 45,
      quantity: 1,
      emitZone: {
        type: 'random',
        source:
          sc.axis === 'vertical'
            ? new Phaser.Geom.Rectangle(-2, sc.from, 4, length)
            : new Phaser.Geom.Rectangle(sc.from, -2, length, 4),
      } as Phaser.Types.GameObjects.Particles.EmitZoneData,
    });
    this.embers.setDepth(DEPTH.scanner);
  }

  /** Adds this scanner's reachable area to a mask shape (used to dim the band inside the echo's shade). */
  addLaneTo(shape: Phaser.GameObjects.Graphics): void {
    const sc = this.sc;
    const lo = sc.min - SCANNER_HIT_DISTANCE;
    const hi = sc.max + SCANNER_HIT_DISTANCE;
    if (sc.axis === 'vertical') shape.fillRect(lo, sc.from, hi - lo, sc.to - sc.from);
    else shape.fillRect(sc.from, lo, sc.to - sc.from, hi - lo);
  }

  /** `pos` is the band position now; `time` is the room clock, for the telegraph. */
  update(pos: number, time: number, timeMs: number): void {
    const g = this.band;
    g.clear();
    const flicker = 0.85 + 0.15 * Math.sin(timeMs / 45);
    // Glow layers out to the hit distance, so what burns is what glows.
    this.strip(g, pos, SCANNER_HIT_DISTANCE, PALETTE.fire, 0.22 * flicker);
    this.strip(g, pos, SCANNER_HIT_DISTANCE * 0.55, PALETTE.amber, 0.45 * flicker);
    this.strip(g, pos, this.sc.width / 2, PALETTE.gold, 0.95);
    this.strip(g, pos, 1.5, 0xfff4d6, 1);

    const ahead = scannerPosition(this.sc, time + SCANNER_WARNING_SECONDS);
    g.lineStyle(2, PALETTE.fire, 0.35 + 0.25 * Math.sin(timeMs / 90));
    dashed(g, this.sc, ahead, 6, 10);

    if (this.sc.axis === 'vertical') this.embers.setPosition(pos, 0);
    else this.embers.setPosition(0, pos);
  }

  private strip(g: Phaser.GameObjects.Graphics, pos: number, half: number, color: number, alpha: number): void {
    const sc = this.sc;
    g.fillStyle(color, alpha);
    if (sc.axis === 'vertical') g.fillRect(pos - half, sc.from, half * 2, sc.to - sc.from);
    else g.fillRect(sc.from, pos - half, sc.to - sc.from, half * 2);
  }
}

/** Dashed line across the lane at sweep coordinate `at`. */
function dashed(g: Phaser.GameObjects.Graphics, sc: Scanner, at: number, dash: number, gap: number): void {
  for (let s = sc.from; s < sc.to; s += dash + gap) {
    const e = Math.min(s + dash, sc.to);
    if (sc.axis === 'vertical') g.lineBetween(at, s, at, e);
    else g.lineBetween(s, at, e, at);
  }
}
