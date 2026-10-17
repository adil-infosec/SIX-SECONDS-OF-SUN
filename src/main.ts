import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from './game/config';
import { BootScene } from './game/scenes/BootScene';
import { GameScene } from './game/scenes/GameScene';
import { TitleScene } from './game/scenes/TitleScene';

function showBootError(error: unknown): void {
  console.error('Six Seconds of Sun failed to start', error);
  const panel = document.getElementById('boot-error');
  if (panel) panel.style.display = 'flex';
}

try {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
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
    },
    scene: [BootScene, TitleScene, GameScene],
  });

  // Dev-only handle for browser QA scripts; stripped from production builds.
  if (import.meta.env.DEV) {
    (window as unknown as { __ssos: Phaser.Game }).__ssos = game;
  }
} catch (error) {
  showBootError(error);
}
