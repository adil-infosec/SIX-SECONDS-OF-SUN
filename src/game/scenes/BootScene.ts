import Phaser from 'phaser';
import { SCENE_KEYS } from '../config';
import { generateTextures } from '../art/ProceduralTextures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    generateTextures(this);
    this.scene.start(SCENE_KEYS.title);
  }
}
