/**
 * LUNAQUEST — Collectible entity (Developer B)
 *
 * Phase 3 / B6: Collectible food drops with Arcade Physics and magnet attraction.
 *
 * Responsibilities:
 *  - Wrap a Phaser Arcade physics sprite for food collectibles.
 *  - Support pooling: activate() at drop position, deactivate() on pickup/cull.
 *  - Smooth magnet attraction toward player spaceship within configurable radius.
 *  - Prevent duplicate collection via atomic `isCollected` flag.
 *  - Automatic off-screen and lifetime culling.
 *
 * Ownership: Developer B only.
 */

import Phaser from 'phaser';
import { ARCADE_TEXTURE_KEYS } from '../assets/arcadeSprites';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const COLLECTIBLE_CONFIG = {
  /** Maximum number of collectibles in the object pool. */
  poolSize: 25,
  /** Distance in pixels at which the collectible starts attracting to the ship. */
  magnetRadius: 75,
  /** Maximum speed when pulled by magnet (px/s). */
  magnetSpeed: 230,
  /** Subtle downward drift before attraction (px/s). */
  naturalDriftY: 20,
  /** Lifetime before auto-deactivating if ignored (milliseconds). */
  lifetimeMs: 12000,
  /** Collision body radius (pixels) for fair pickup detection. */
  bodyRadius: 7,
} as const;

// ---------------------------------------------------------------------------
// Collectible class
// ---------------------------------------------------------------------------

export class Collectible {
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  private scene: Phaser.Scene;
  private value = 1;
  private _isCollected = false;
  private _isActive = false;
  private timeAlive = 0; // seconds

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group) {
    this.scene = scene;

    // Create as member of the physics group
    this.sprite = group.create(-100, -100, ARCADE_TEXTURE_KEYS.foodGrain) as Phaser.Physics.Arcade.Sprite;
    this.sprite.setActive(false).setVisible(false);
    this.sprite.setDepth(7);

    // Circular physics body for smooth omnidirectional collection
    if (this.sprite.body) {
      this.sprite.body.setCircle(COLLECTIBLE_CONFIG.bodyRadius);
    }
  }

  // =========================================================================
  // Getters
  // =========================================================================

  get isActive(): boolean {
    return this._isActive;
  }

  get isCollected(): boolean {
    return this._isCollected;
  }

  get foodValue(): number {
    return this.value;
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Spawn/recycle collectible at the specified position with a food yield.
   *
   * @param x - Screen X (pixels)
   * @param y - Screen Y (pixels)
   * @param value - Amount of food units this item grants (e.g. 1 for A, 2 for B)
   */
  activate(x: number, y: number, value = 1): void {
    this.value = Math.max(1, value);
    this._isCollected = false;
    this._isActive = true;
    this.timeAlive = 0;

    this.sprite.setPosition(x, y);
    this.sprite.setActive(true).setVisible(true);
    this.sprite.setAlpha(1);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = true;
      body.setVelocity(0, COLLECTIBLE_CONFIG.naturalDriftY);
    }
  }

  /**
   * Atomically collect this item. Guarantees value is only collected once.
   * Returns the item's food value if successfully collected, or 0 if already collected.
   */
  collect(): number {
    if (!this._isActive || this._isCollected) return 0;

    this._isCollected = true;
    this._isActive = false;

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
      body.setVelocity(0, 0);
    }

    // Quick collection fade feedback
    this.sprite.setActive(false).setVisible(false);

    return this.value;
  }

  /**
   * Remove without collecting (e.g. timed out or flew off screen).
   */
  deactivate(): void {
    this._isActive = false;
    this._isCollected = false;
    this.sprite.setActive(false).setVisible(false);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
      body.setVelocity(0, 0);
    }
  }

  /**
   * Per-frame update: handles magnet pull toward player ship and lifetime culling.
   *
   * @param delta - Milliseconds elapsed since last frame
   * @param shipX - Current player ship X position
   * @param shipY - Current player ship Y position
   * @param viewH - Viewport height for boundary culling
   */
  update(delta: number, shipX: number, shipY: number, viewH: number): void {
    if (!this._isActive || this._isCollected) return;

    const dt = delta / 1000;
    this.timeAlive += dt;

    // Timeout culling
    if (this.timeAlive >= COLLECTIBLE_CONFIG.lifetimeMs / 1000) {
      this.deactivate();
      return;
    }

    // Off-screen bottom culling
    if (this.sprite.y > viewH + 20) {
      this.deactivate();
      return;
    }

    const dx = shipX - this.sprite.x;
    const dy = shipY - this.sprite.y;
    const distSq = dx * dx + dy * dy;
    const magnetSq = COLLECTIBLE_CONFIG.magnetRadius * COLLECTIBLE_CONFIG.magnetRadius;

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    if (distSq <= magnetSq && distSq > 4) {
      // Magnet pull: smoothly accelerate toward ship
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;

      body.setVelocity(
        nx * COLLECTIBLE_CONFIG.magnetSpeed,
        ny * COLLECTIBLE_CONFIG.magnetSpeed,
      );
    } else {
      // Natural downward drift
      body.setVelocity(0, COLLECTIBLE_CONFIG.naturalDriftY);
    }
  }
}
