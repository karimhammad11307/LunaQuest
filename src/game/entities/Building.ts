import Phaser from 'phaser';
import type { BuildingLayoutEntry } from '../config/gameConfig';
import { TEXTURES } from '../config/gameConfig';
import { PALETTE } from '../config/palette';

/** A separately rendered building with its own footprint and approach state. */
export class Building extends Phaser.GameObjects.Container {
  readonly entry: BuildingLayoutEntry;
  readonly collision: Phaser.GameObjects.Zone;
  private glow: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, entry: BuildingLayoutEntry) {
    super(scene, entry.x, entry.y);
    this.entry = entry;
    const image = scene.add.image(0, 8, TEXTURES.building(entry.type)).setOrigin(0.5, 1);
    this.glow = scene.add.rectangle(0, 5, 62, 9, 0x4edce5, 0.2).setStrokeStyle(2, 0x4edce5, 0.8);
    this.glow.setVisible(false);
    this.add([this.glow, image]);
    const lampPositions: Record<string, [number, number, number, number, number][]> = {
      habitat: [[0, -25, 12, 3, 0x4edce5]],
      greenhouse: [[-18, -38, 6, 3, 0x80e5a0], [23, -38, 6, 3, 0x80e5a0]],
      solar: [[0, -40, 9, 3, 0xffd75e]],
      shield: [[0, -23, 15, 3, 0x8067da]],
      landingPad: [[-37, -11, 8, 3, 0xffd75e], [37, -11, 8, 3, 0xffd75e]],
    };
    lampPositions[entry.id].forEach(([x, y, w, h, color], index) => {
      const lamp = scene.add.rectangle(x, y, w, h, color).setAlpha(0.9);
      this.add(lamp);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        scene.tweens.add({ targets: lamp, alpha: 0.3, duration: 800 + index * 260, yoyo: true, repeat: -1 });
      }
    });
    this.setSize(image.width, image.height);
    this.setDepth(entry.y + 6);
    scene.add.existing(this);

    const widths: Record<string, number> = { habitat: 72, greenhouse: 67, solar: 76, shield: 62, landingPad: 86 };
    this.collision = scene.add.zone(entry.x, entry.y + 9, widths[entry.type], 17);
    scene.physics.add.existing(this.collision, true);
    this.collision.setData('buildingId', entry.id);

    image.setInteractive({ useHandCursor: true });
    image.on('pointerdown', () => scene.events.emit('building-pointer', entry.id));
    image.on('pointerover', () => this.setApproach(true));
    image.on('pointerout', () => this.setApproach(false));

    const sign = scene.add.text(entry.x, entry.y + 19, entry.label, {
      fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold',
      color: PALETTE.suitWhite, backgroundColor: PALETTE.outline,
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 0).setDepth(entry.y + 30);
    sign.setResolution(2);
  }

  setApproach(active: boolean): void {
    this.glow.setVisible(active);
  }

  get interactionPoint(): { x: number; y: number } {
    return { x: this.x, y: this.y + (this.entry.type === 'landingPad' ? -24 : 25) };
  }
}
