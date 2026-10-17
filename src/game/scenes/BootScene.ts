import Phaser from 'phaser';
import { SCENE_KEYS } from '../config';
import { generateTextures } from '../art/ProceduralTextures';
import { audio } from '../audio/AudioEngine';
import { TRAILER } from '../captureMode';
import { getProgress } from '../progressState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    generateTextures(this);
    audio.setMuted(getProgress().muted);
    this.scene.start(TRAILER ? SCENE_KEYS.trailer : SCENE_KEYS.title);
  }
}
