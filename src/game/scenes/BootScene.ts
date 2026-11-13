import Phaser from 'phaser';
import { createPixelArt } from '../art/pixelArt';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create(): void {
    createPixelArt(this);
    this.scene.start('MoonBaseScene');
  }
}
