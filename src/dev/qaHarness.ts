import type Phaser from 'phaser';
import { audio } from '../game/audio/AudioEngine';
import type { Vec2 } from '../game/systems/math';

/**
 * Dev-only helpers for browser QA scripts (`window.__qa`). They press real
 * keyboard events, so the game's own input path is exercised. Never shipped:
 * main.ts imports this only when `import.meta.env.DEV` is true.
 */

type KeyName = 'w' | 'a' | 's' | 'd' | 'e' | 'q' | 'r' | 'm' | 'esc' | 'enter';

const CODES: Record<KeyName, [string, string, number]> = {
  w: ['w', 'KeyW', 87],
  a: ['a', 'KeyA', 65],
  s: ['s', 'KeyS', 83],
  d: ['d', 'KeyD', 68],
  e: ['e', 'KeyE', 69],
  q: ['q', 'KeyQ', 81],
  r: ['r', 'KeyR', 82],
  m: ['m', 'KeyM', 77],
  esc: ['Escape', 'Escape', 27],
  enter: ['Enter', 'Enter', 13],
};

// The harness reaches into scene internals on purpose; it is test tooling.
type AnyScene = any;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function installQaHarness(game: Phaser.Game): void {
  const key = (name: KeyName, type: 'keydown' | 'keyup') => {
    const [k, code, keyCode] = CODES[name];
    const ev = new KeyboardEvent(type, { key: k, code, bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'keyCode', { get: () => keyCode });
    Object.defineProperty(ev, 'which', { get: () => keyCode });
    window.dispatchEvent(ev);
  };
  const tap = async (name: KeyName) => {
    key(name, 'keydown');
    await sleep(40);
    key(name, 'keyup');
    await sleep(40);
  };
  const scene = (): AnyScene => game.scene.getScene('GameScene');
  const sim = (): AnyScene => scene()?.sim;
  const active = () => game.scene.getScenes(true).map((s) => s.scene.key);

  /** Steers with WASD until the keeper is within 4 px of `target`. Resumes if auto-paused. */
  const drive = (target: Vec2, maxMs = 8000) =>
    new Promise<{ x: number; y: number; won: boolean }>((resolve) => {
      const held: Record<'w' | 'a' | 's' | 'd', boolean> = { w: false, a: false, s: false, d: false };
      const set = (k: 'w' | 'a' | 's' | 'd', v: boolean) => {
        if (held[k] !== v) {
          held[k] = v;
          key(k, v ? 'keydown' : 'keyup');
        }
      };
      const start = performance.now();
      const tick = () => {
        const sc = scene();
        if (sc?.paused) {
          (Object.keys(held) as (keyof typeof held)[]).forEach((k) => (held[k] = false));
          sc.setPaused(false);
        }
        const p = sim().state.keeper as Vec2;
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const tol = 4;
        const done =
          (Math.abs(dx) <= tol && Math.abs(dy) <= tol) || sim().state.won || performance.now() - start > maxMs;
        if (done) {
          (Object.keys(held) as (keyof typeof held)[]).forEach((k) => set(k, false));
          resolve({ x: Math.round(p.x), y: Math.round(p.y), won: sim().state.won });
          return;
        }
        set('d', dx > tol);
        set('a', dx < -tol);
        set('s', dy > tol);
        set('w', dy < -tol);
        requestAnimationFrame(tick);
      };
      tick();
    });

  /** Starts a chamber directly, skipping the title. */
  const goto = async (levelId: number) => {
    const from = active()[0];
    if (from) game.scene.getScene(from)!.scene.start('GameScene', { levelId });
    await sleep(500);
  };

  (window as unknown as { __qa: unknown }).__qa = { key, tap, drive, goto, sleep, scene, sim, active, game, audio };
}
