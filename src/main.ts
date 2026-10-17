import Phaser from 'phaser';
import { audio } from './game/audio/AudioEngine';
import { CAPTURE } from './game/captureMode';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from './game/config';
import { BootScene } from './game/scenes/BootScene';
import { EndingScene } from './game/scenes/EndingScene';
import { GameScene } from './game/scenes/GameScene';
import { LevelSelectScene } from './game/scenes/LevelSelectScene';
import { TitleScene } from './game/scenes/TitleScene';
import { TrailerScene } from './game/scenes/TrailerScene';

function showBootError(error: unknown): void {
  console.error('Six Seconds of Sun failed to start', error);
  const panel = document.getElementById('boot-error');
  if (panel) panel.style.display = 'flex';
}

function createGame(type: number): Phaser.Game {
  const game = new Phaser.Game({
    type,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: PALETTE.night,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      pixelArt: false,
      // Trailer capture records the canvas; keep each frame until it is read.
      preserveDrawingBuffer: CAPTURE,
    },
    // All sound comes from the game's own WebAudio synth (audio/AudioEngine.ts).
    audio: { noAudio: true },
    scene: [BootScene, TitleScene, LevelSelectScene, GameScene, EndingScene, TrailerScene],
  });
  // Dev-only handles for browser QA scripts; stripped from production builds.
  if (import.meta.env.DEV) {
    (window as unknown as { __ssos: Phaser.Game }).__ssos = game;
    void import('./dev/qaHarness').then((m) => m.installQaHarness(game));
  }
  return game;
}

/**
 * Phaser.AUTO only falls back to Canvas when no WebGL context can be made.
 * A context that is created but then fails while booting (lost GPU, a shader
 * or framebuffer error under memory pressure) would leave a dead page, so
 * catch that and restart once on the Canvas renderer. `?renderer=canvas`
 * forces Canvas for testing.
 */
function start(): void {
  audio.installUnlock(window);
  if (CAPTURE) document.body.classList.add('capture');
  const forceCanvas = new URLSearchParams(window.location.search).get('renderer') === 'canvas';
  let game = createGame(forceCanvas ? Phaser.CANVAS : Phaser.AUTO);
  if (forceCanvas) return;

  const onBootError = (event: ErrorEvent): void => {
    if (game.isRunning || game.config.renderType !== Phaser.WEBGL) return;
    window.removeEventListener('error', onBootError);
    event.preventDefault();
    console.warn('WebGL failed while starting; restarting on the Canvas renderer.', event.error);
    try {
      game.destroy(true);
    } catch {
      // A half-booted WebGL game may not tear down cleanly; the new canvas replaces it.
    }
    document.querySelectorAll('#game canvas').forEach((canvas) => canvas.remove());
    try {
      game = createGame(Phaser.CANVAS);
    } catch (error) {
      showBootError(error);
    }
  };
  window.addEventListener('error', onBootError);
  game.events.once(Phaser.Core.Events.READY, () => window.removeEventListener('error', onBootError));
}

try {
  start();
} catch (error) {
  showBootError(error);
}
