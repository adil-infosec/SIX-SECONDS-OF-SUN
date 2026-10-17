import Phaser from 'phaser';
import { DEPTH, PALETTE } from '../config';
import type { Wedge } from '../systems/ShadowSystem';

export type ShadowStyle = { depth: number; nearAlpha: number; farAlpha: number };

const DEFAULT_STYLE: ShadowStyle = { depth: DEPTH.shadow, nearAlpha: 0.74, farAlpha: 0.1 };

/**
 * Draws a caster's shadow wedge: dense at the body, fading toward the far
 * end, clipped to the chamber. It shows exactly the polygon the runes test.
 */
export class ShadowView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly color: number;
  private readonly edge: number;
  private readonly style: ShadowStyle;

  constructor(
    scene: Phaser.Scene,
    mask: Phaser.Display.Masks.GeometryMask,
    color: number = PALETTE.night,
    edge: number = PALETTE.violet,
    style: ShadowStyle = DEFAULT_STYLE,
  ) {
    this.color = color;
    this.edge = edge;
    this.style = style;
    this.g = scene.add.graphics().setDepth(style.depth);
    this.g.setMask(mask);
  }

  update(wedge: Wedge | null): void {
    const g = this.g;
    g.clear();
    if (!wedge) return;
    const [nl, fl, fr, nr] = wedge;
    const c = this.color;
    const near = this.style.nearAlpha;
    const far = this.style.farAlpha;
    // Canvas ignores gradients and keeps this solid fill; WebGL replaces it below.
    g.fillStyle(c, (near + far) / 2);
    // WebGL maps the gradient's TL/TR/BL colors to a triangle's three vertices.
    g.fillGradientStyle(c, c, c, c, near, near, far, far);
    g.fillTriangle(nl.x, nl.y, nr.x, nr.y, fl.x, fl.y);
    g.fillGradientStyle(c, c, c, c, near, far, far, far);
    g.fillTriangle(nr.x, nr.y, fr.x, fr.y, fl.x, fl.y);
    g.lineStyle(1, this.edge, 0.3);
    g.lineBetween(nl.x, nl.y, fl.x, fl.y);
    g.lineBetween(nr.x, nr.y, fr.x, fr.y);
  }
}
