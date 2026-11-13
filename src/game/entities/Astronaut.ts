import Phaser from 'phaser';
import { PLAYER_SPEED, TEXTURES } from '../config/gameConfig';

type Keys = Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;

/** Phaser-owned character movement and frame animation; the store owns progression. */
export class Astronaut extends Phaser.Physics.Arcade.Sprite {
  private keys: Keys;
  private virtualDirection: string | null = null;
  private lastDirection = 'down';
  private wasMoving = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEXTURES.astronaut('down', 0));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.body?.setSize(14, 9).setOffset(6, 21);
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Keys;
    for (const direction of ['down', 'up', 'left', 'right']) {
      if (!scene.anims.exists(`walk-${direction}`)) {
        scene.anims.create({ key: `walk-${direction}`, frames: [0, 1].map((n) => ({ key: TEXTURES.astronaut(direction, n) })), frameRate: 7, repeat: -1 });
        scene.anims.create({ key: `idle-${direction}`, frames: [0, 1].map((n) => ({ key: TEXTURES.astronaut(direction, n) })), frameRate: 2, repeat: -1 });
      }
    }
    this.play('idle-down');
  }

  setVirtualDirection(direction: string | null): void {
    this.virtualDirection = direction;
  }

  stopMovement(): void {
    this.setVelocity(0, 0);
    if (this.wasMoving) {
      this.play(`idle-${this.lastDirection}`, true);
      this.wasMoving = false;
    }
  }

  updateMovement(): void {
    const left = this.keys.A.isDown || this.keys.LEFT.isDown || this.virtualDirection === 'left';
    const right = this.keys.D.isDown || this.keys.RIGHT.isDown || this.virtualDirection === 'right';
    const up = this.keys.W.isDown || this.keys.UP.isDown || this.virtualDirection === 'up';
    const down = this.keys.S.isDown || this.keys.DOWN.isDown || this.virtualDirection === 'down';
    let vx = Number(right) - Number(left);
    let vy = Number(down) - Number(up);
    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      const length = Math.hypot(vx, vy);
      vx = vx / length * PLAYER_SPEED;
      vy = vy / length * PLAYER_SPEED;
      this.lastDirection = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
    }
    this.setVelocity(vx, vy);
    if (moving !== this.wasMoving || (moving && this.anims.currentAnim?.key !== `walk-${this.lastDirection}`)) {
      this.play(`${moving ? 'walk' : 'idle'}-${this.lastDirection}`, true);
      this.wasMoving = moving;
    }
    this.setDepth(this.y + 12);
  }
}
