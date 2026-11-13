import Phaser from 'phaser';
import { EDUCATION, type EducationId } from '../config/education';

/** A separate, non-blocking pixel-art signpost; the panel lives in React. */
export class EducationSign extends Phaser.GameObjects.Container {
  readonly id: EducationId;
  private glow: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, id: EducationId) {
    const point = EDUCATION[id];
    super(scene, point.x, point.y);
    this.id = id;
    this.glow = scene.add.rectangle(0, -14, 28, 30, 0x4edce5, 0.25).setVisible(false);
    const image = scene.add.image(0, -14, 'education-sign');
    image.setInteractive({ useHandCursor: true });
    image.on('pointerdown', () => scene.events.emit('education-pointer', id));
    this.add([this.glow, image]);
    this.setDepth(point.y + 8);
    scene.add.existing(this);
  }

  setApproach(active: boolean): void { this.glow.setVisible(active); }
}
