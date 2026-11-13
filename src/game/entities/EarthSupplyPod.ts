import Phaser from 'phaser';
import type { EARTH_SUPPLY_DELIVERIES } from '../config/gameConfig';

type Delivery = (typeof EARTH_SUPPLY_DELIVERIES)[number];

/** A separately rendered supply object; all water awards stay in the domain store. */
export class EarthSupplyPod extends Phaser.GameObjects.Container {
  readonly delivery: Delivery;
  private glow: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, delivery: Delivery) {
    super(scene, delivery.x, delivery.y);
    this.delivery = delivery;
    this.glow = scene.add.rectangle(0, -14, 44, 32, 0xffd75e, 0.24).setVisible(false);
    const image = scene.add.image(0, -14, 'earth-supply-pod');
    image.setInteractive({ useHandCursor: true });
    image.on('pointerdown', () => scene.events.emit('earth-supply-pointer', delivery.id));
    this.add([this.glow, image]);
    this.setDepth(delivery.y + 9);
    scene.add.existing(this);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      scene.tweens.add({ targets: image, y: -17, duration: 580, yoyo: true, repeat: -1 });
    }
  }

  setApproach(active: boolean): void { this.glow.setVisible(active); }
}
