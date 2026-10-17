import { describe, expect, it } from 'vitest';
import { AudioEngine, type SfxName } from '../src/game/audio/AudioEngine';
import type { Scanner } from '../src/game/data/levelTypes';
import { scannerProximity } from '../src/game/systems/ScannerSystem';

describe('AudioEngine without WebAudio', () => {
  it('accepts every call as a silent no-op (no window, no AudioContext)', () => {
    const engine = new AudioEngine();
    const names: SfxName[] = [
      'ignite',
      'relay',
      'rune',
      'runeOff',
      'echo',
      'deny',
      'gateOpen',
      'gateClose',
      'hit',
      'danger',
      'respawn',
      'checkpoint',
      'win',
      'fail',
      'uiMove',
      'uiConfirm',
      'uiLocked',
    ];
    expect(() => {
      engine.setMuted(true);
      engine.setPaused(true);
      engine.startAmbience('chamber');
      engine.setWarmth(1);
      engine.setCrackle(3);
      engine.setScannerProximity(0.5);
      for (const n of names) engine.sfx(n);
      engine.sunrise([1, 2, 3], 4);
    }).not.toThrow();
    expect(engine.state).toBe('none');
    expect(engine.debugLevel()).toBe(0);
  });
});

describe('scannerProximity', () => {
  const sc: Scanner = { axis: 'vertical', min: 100, max: 300, from: 0, to: 400, period: 4, width: 10, phase: 0 };

  it('is 0 in rooms without scanners', () => {
    expect(scannerProximity([], [], { x: 0, y: 0 })).toBe(0);
  });

  it('is loudest with the band on the keeper and fades with distance', () => {
    const on = scannerProximity([sc], [200], { x: 200, y: 200 });
    const near = scannerProximity([sc], [200], { x: 300, y: 200 });
    const far = scannerProximity([sc], [200], { x: 600, y: 200 });
    expect(on).toBe(1);
    expect(near).toBeLessThan(on);
    expect(near).toBeGreaterThan(far);
  });

  it('keeps a faint floor so scanners are always audible', () => {
    expect(scannerProximity([sc], [100], { x: 900, y: 200 })).toBeCloseTo(0.12);
  });

  it('is quieter outside the lane than inside it at the same distance', () => {
    const inside = scannerProximity([sc], [200], { x: 220, y: 200 });
    const outside = scannerProximity([sc], [200], { x: 220, y: 500 });
    expect(outside).toBeLessThan(inside);
  });
});
