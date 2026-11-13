import Phaser from 'phaser';
import type { BuildingLayoutEntry } from '../config/gameConfig';
import { TEXTURES } from '../config/gameConfig';
import { PALETTE } from '../config/palette';
import type { BuildingState } from '../../domain/models/types';

/** A separately rendered building with its own footprint and approach state. */
export class Building extends Phaser.GameObjects.Container {
  readonly entry: BuildingLayoutEntry;
  readonly collision: Phaser.GameObjects.Zone;
  private glow: Phaser.GameObjects.Rectangle;
  private image: Phaser.GameObjects.Image;
  private statusLamp: Phaser.GameObjects.Rectangle;
  private cropSprite: Phaser.GameObjects.Image | null = null;
  private cropStage: 'none' | 'seed' | 'sprout' | 'ready' = 'none';
  private solarFlow: Phaser.GameObjects.Rectangle | null = null;
  private shieldRing: Phaser.GameObjects.Graphics | null = null;
  private lamps: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene, entry: BuildingLayoutEntry) {
    super(scene, entry.x, entry.y);
    this.entry = entry;
    const image = scene.add.image(0, 8, TEXTURES.building(entry.type)).setOrigin(0.5, 1);
    this.image = image;
    this.glow = scene.add.rectangle(0, 5, 62, 9, 0x4edce5, 0.2).setStrokeStyle(2, 0x4edce5, 0.8);
    this.glow.setVisible(false);
    this.add([this.glow, image]);
    if (entry.type === 'greenhouse') {
      this.cropSprite = scene.add.image(0, -38, 'crop-seed').setVisible(false);
      this.add(this.cropSprite);
    }
    if (entry.type === 'solar') {
      this.solarFlow = scene.add.rectangle(0, -38, 14, 4, 0x4edce5).setVisible(false);
      this.add(this.solarFlow);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        scene.tweens.add({ targets: this.solarFlow, alpha: 0.3, duration: 540, yoyo: true, repeat: -1 });
      }
    }
    if (entry.type === 'shield') {
      this.shieldRing = scene.add.graphics();
      this.shieldRing.lineStyle(3, 0x8067da, 1).strokeRect(-49, -60, 98, 67);
      this.shieldRing.lineStyle(2, 0x4edce5, 1).strokeRect(-53, -64, 106, 75);
      this.shieldRing.setVisible(false);
      this.add(this.shieldRing);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        scene.tweens.add({ targets: this.shieldRing, alpha: 0.35, duration: 680, yoyo: true, repeat: -1 });
      }
    }
    this.statusLamp = scene.add.rectangle(42, -60, 7, 7, 0x80e5a0).setStrokeStyle(2, 0x292740);
    this.add(this.statusLamp);
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
      this.lamps.push(lamp);
      if (entry.type !== 'shield' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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

  /** Render from the authoritative building state; no gameplay values change here. */
  syncState(state: BuildingState, availableEnergy: number): void {
    if (state.condition === 'good') this.image.clearTint();
    else this.image.setTint(state.condition === 'damaged' ? 0xbba9b0 : 0x746c83);
    this.statusLamp.setFillStyle(state.condition === 'good' ? 0x80e5a0 : state.condition === 'damaged' ? 0xffd75e : 0xff6b81);
    this.lamps.forEach((lamp) => lamp.setVisible(state.condition !== 'broken' && (state.type !== 'shield' || (state.active && availableEnergy > 0))));
    this.solarFlow?.setVisible(state.active && state.condition !== 'broken');
    this.shieldRing?.setVisible(state.active && state.condition === 'good' && availableEnergy > 0);

    if (!this.cropSprite) return;
    if (!state.cropPlanted) {
      this.cropStage = 'none';
      this.cropSprite.setVisible(false);
      return;
    }
    this.cropSprite.setVisible(true);
    if (state.cropGrowth >= 1) {
      if (this.cropStage === 'seed') {
        this.cropStage = 'sprout';
        this.cropSprite.setTexture('crop-sprout');
        this.scene.time.delayedCall(650, () => {
          if (this.cropStage === 'sprout' && this.cropSprite?.active) {
            this.cropStage = 'ready';
            this.cropSprite.setTexture('crop-ready');
          }
        });
      } else if (this.cropStage !== 'sprout') {
        this.cropStage = 'ready';
        this.cropSprite.setTexture('crop-ready');
      }
    } else {
      this.cropStage = 'seed';
      this.cropSprite.setTexture('crop-seed');
    }
  }

  get interactionPoint(): { x: number; y: number } {
    return { x: this.x, y: this.y + (this.entry.type === 'landingPad' ? -24 : 25) };
  }
}
