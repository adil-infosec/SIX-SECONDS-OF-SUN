import Phaser from 'phaser';
import { SCENE_KEYS } from '../config';
import { generateTextures } from '../art/ProceduralTextures';
import { audio } from '../audio/AudioEngine';
import { TRAILER } from '../captureMode';
import { getProgress } from '../progressState';
import { preloadLogo } from '../ui/Logo';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  /** The title logo is the only image file; everything else is drawn in code. */
  preload(): void {
    preloadLogo(this);
  }

  create(): void {
    generateTextures(this);
    audio.setMuted(getProgress().muted);
    this.scene.start(TRAILER ? SCENE_KEYS.trailer : SCENE_KEYS.title);
  }
}
