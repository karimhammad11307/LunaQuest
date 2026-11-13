/**
 * MOONBOUND — Spaceship entity (Developer B)
 *
 * Phase 2 / B3: Player-controlled arcade ship.
 *
 * Responsibilities:
 *  - Movement: WASD + Arrow keys, normalized diagonal, velocity-based.
 *  - Boundary clamping: ship stays inside 640×360 viewport.
 *  - Shooting: Space bar, configurable cooldown, dispatches laser from pool.
 *  - Damage: invulnerability window with visual flicker feedback.
 *  - Lifecycle: clean init / update / destroy; no dangling timers.
 *
 * NOT responsible for:
 *  - HUD / health display (Phase 3 + Dev A).
 *  - Score, XP, or resource management.
 *  - MissionResult emission (ChickenHuntScene.finishMission).
 *  - Sound (Phase 5 / B11).
 *
 * Ownership: Dev B only. Do NOT import React, domain store, or Dev A services.
 */

import Phaser from 'phaser';
import { ARCADE_TEXTURE_KEYS } from '../assets/arcadeSprites';

const clamp = (val: number, min: number, max: number): number => Math.max(min, Math.min(max, val));

// ---------------------------------------------------------------------------
// Config (scene-local, not from balance.ts — arcade tuning is B's responsibility)
// ---------------------------------------------------------------------------

export const SHIP_CONFIG = {
  /** Pixels per second — balanced for 640×360 viewport. */
  speed: 200,
  /** Half-width/height inset so the physics body sits inside the sprite. */
  bodyInsetX: 4,
  bodyInsetY: 6,
  /** Milliseconds between allowed shots. */
  fireCooldownMs: 280,
  /** Health points for the ship in the arcade scene. */
  maxHealth: 3,
  /** Milliseconds of invulnerability after taking damage. */
  invulnerabilityMs: 1200,
  /** Flicker interval during invulnerability (ms). */
  flickerIntervalMs: 100,
  /** Thrust animation frame index. */
  thrustFrame: 1,
  /** Idle animation frame index. */
  idleFrame: 0,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Callback fired when the ship's health reaches 0. */
export type ShipDestroyedCallback = (totalDamageTaken: number) => void;

// ---------------------------------------------------------------------------
// Spaceship class
// ---------------------------------------------------------------------------

export class Spaceship {
  /** The underlying Phaser physics sprite. Public so CombatSystem can reference it. */
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  private scene: Phaser.Scene;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private spaceKey!: Phaser.Input.Keyboard.Key;

  private health: number;
  private totalDamageTaken = 0;
  private isInvulnerable = false;
  private invulnerabilityTimer: Phaser.Time.TimerEvent | null = null;
  private flickerTimer: Phaser.Time.TimerEvent | null = null;

  private lastFiredAt = -SHIP_CONFIG.fireCooldownMs; // Allows firing immediately on game start
  private isActive = false;

  /** Called once by the CombatSystem to shoot a laser from the pool. */
  private fireFn: (() => void) | null = null;

  /** Called when health reaches 0. */
  private onDestroyed: ShipDestroyedCallback | null = null;

  /** View boundaries — set in constructor from scene scale. */
  private readonly viewW: number;
  private readonly viewH: number;

  constructor(scene: Phaser.Scene, x: number, y: number, viewW: number, viewH: number) {
    this.scene = scene;
    this.viewW = viewW;
    this.viewH = viewH;
    this.health = SHIP_CONFIG.maxHealth;

    // ---- Create physics sprite ----
    this.sprite = scene.physics.add.sprite(x, y, ARCADE_TEXTURE_KEYS.spaceship, SHIP_CONFIG.idleFrame);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);

    // ---- Trim physics body to actual visible ship hull ----
    // The 32×32 sprite has empty corner pixels; shrink body to avoid unfair hits.
    if (this.sprite.body) {
      this.sprite.body.setSize(
        this.sprite.width - SHIP_CONFIG.bodyInsetX * 2,
        this.sprite.height - SHIP_CONFIG.bodyInsetY * 2,
      );
      this.sprite.body.setOffset(SHIP_CONFIG.bodyInsetX, SHIP_CONFIG.bodyInsetY);
    }

    // ---- Animations (defined once; re-used every restart) ----
    this.ensureAnimations(scene);

    // ---- Input ----
    this.setupInput(scene);

    this.isActive = true;
  }

  // =========================================================================
  // Public API
  // =========================================================================

  /**
   * Register the function that fires a laser from the shared projectile pool.
   * Called by ChickenHuntCombat after the pool is ready.
   */
  setFireFunction(fn: () => void): void {
    this.fireFn = fn;
  }

  /**
   * Register the callback invoked when health hits 0.
   * Called by ChickenHuntCombat to wire the defeat path.
   */
  setDestroyedCallback(cb: ShipDestroyedCallback): void {
    this.onDestroyed = cb;
  }

  /** Current health (0 = destroyed). */
  getHealth(): number {
    return this.health;
  }

  /** Cumulative damage taken this mission (for MissionResult). */
  getTotalDamageTaken(): number {
    return this.totalDamageTaken;
  }

  /**
   * Apply one point of damage to the ship.
   * Silently ignored during invulnerability window.
   * Triggers invulnerability + flicker feedback.
   * Calls onDestroyed() if health reaches 0.
   */
  takeDamage(amount = 1): void {
    if (!this.isActive || this.isInvulnerable) return;

    this.health = Math.max(0, this.health - amount);
    this.totalDamageTaken += amount;

    if (this.health <= 0) {
      this.isActive = false;
      this.sprite.setAlpha(0.3);
      this.sprite.setTint(0xff4444);
      this.onDestroyed?.(this.totalDamageTaken);
      return;
    }

    this.startInvulnerability();
  }

  /**
   * Called every frame by ChickenHuntScene.update().
   * Handles movement, diagonal normalisation, firing.
   *
   * @param time  - Phaser time.now (ms)
   * @param _delta - Frame delta (ms) — velocity handles movement, unused directly
   */
  update(time: number, _delta: number): void {
    if (!this.isActive) return;

    this.handleMovement();
    this.handleFiring(time);
    this.clampToBounds();
  }

  /**
   * Disable ship updates and input processing.
   * Called when the scene pauses (e.g. Esc, modal overlay).
   */
  pause(): void {
    this.isActive = false;
    const body = this.sprite?.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setVelocity(0, 0);
    }
    if (this.sprite?.active) {
      this.sprite.setFrame(SHIP_CONFIG.idleFrame);
    }
  }

  /**
   * Re-enable ship after a pause. Must NOT re-register input.
   */
  resume(): void {
    if (this.health > 0) this.isActive = true;
  }

  /**
   * Full teardown: cancel all timers, remove input keys.
   * Called from ChickenHuntScene.onShutdown().
   */
  destroy(): void {
    this.isActive = false;
    this.cancelInvulnerabilityTimers();
    this.fireFn = null;
    this.onDestroyed = null;

    // Remove keyboard keys from the scene's plugin (prevents duplicates on restart).
    if (this.scene.input?.keyboard) {
      if (this.wasd?.up) this.scene.input.keyboard.removeKey(this.wasd.up);
      if (this.wasd?.down) this.scene.input.keyboard.removeKey(this.wasd.down);
      if (this.wasd?.left) this.scene.input.keyboard.removeKey(this.wasd.left);
      if (this.wasd?.right) this.scene.input.keyboard.removeKey(this.wasd.right);
      if (this.spaceKey) this.scene.input.keyboard.removeKey(this.spaceKey);
    }

    if (this.sprite?.active) this.sprite.destroy();
  }

  // =========================================================================
  // Private — Input
  // =========================================================================

  private setupInput(scene: Phaser.Scene): void {
    if (!scene.input?.keyboard) return;

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = {
      up:    scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  // =========================================================================
  // Private — Movement
  // =========================================================================

  private handleMovement(): void {
    if (!this.cursors || !this.wasd) return;

    const body = this.sprite?.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;

    let vx = 0;
    let vy = 0;

    const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up    = this.cursors.up.isDown    || this.wasd.up.isDown;
    const down  = this.cursors.down.isDown  || this.wasd.down.isDown;

    if (left)  vx -= 1;
    if (right) vx += 1;
    if (up)    vy -= 1;
    if (down)  vy += 1;

    // Normalize diagonal so diagonal speed === straight speed
    if (vx !== 0 && vy !== 0) {
      const INV_SQRT2 = 0.7071;
      vx *= INV_SQRT2;
      vy *= INV_SQRT2;
    }

    body.setVelocity(vx * SHIP_CONFIG.speed, vy * SHIP_CONFIG.speed);

    // Visual: show thrust frame while moving, idle when stopped
    const moving = vx !== 0 || vy !== 0;
    this.sprite.setFrame(moving ? SHIP_CONFIG.thrustFrame : SHIP_CONFIG.idleFrame);
  }

  /**
   * Hard-clamp position so the ship never clips outside the viewport,
   * even if Arcade Physics world bounds don't perfectly cover the body inset.
   */
  private clampToBounds(): void {
    const hw = this.sprite.width / 2;
    const hh = this.sprite.height / 2;
    const x = clamp(this.sprite.x, hw, this.viewW - hw);
    const y = clamp(this.sprite.y, hh, this.viewH - hh);
    if (x !== this.sprite.x || y !== this.sprite.y) {
      this.sprite.setPosition(x, y);
    }
  }

  // =========================================================================
  // Private — Firing
  // =========================================================================

  private handleFiring(time: number): void {
    if (!this.spaceKey || !this.spaceKey.isDown) return;
    if (time - this.lastFiredAt < SHIP_CONFIG.fireCooldownMs) return;
    this.lastFiredAt = time;
    this.fireFn?.();
  }

  // =========================================================================
  // Private — Invulnerability
  // =========================================================================

  private startInvulnerability(): void {
    this.isInvulnerable = true;
    this.cancelInvulnerabilityTimers();

    // Flicker: alternate alpha using Phaser timer (cleaned up on shutdown)
    let flickerState = false;
    this.flickerTimer = this.scene.time.addEvent({
      delay: SHIP_CONFIG.flickerIntervalMs,
      loop: true,
      callback: () => {
        flickerState = !flickerState;
        this.sprite.setAlpha(flickerState ? 0.3 : 1.0);
      },
    });

    // End invulnerability after configured window
    this.invulnerabilityTimer = this.scene.time.addEvent({
      delay: SHIP_CONFIG.invulnerabilityMs,
      callback: () => {
        this.isInvulnerable = false;
        this.sprite.setAlpha(1.0);
        this.sprite.clearTint();
        this.flickerTimer?.remove();
        this.flickerTimer = null;
      },
    });
  }

  private cancelInvulnerabilityTimers(): void {
    this.invulnerabilityTimer?.remove();
    this.invulnerabilityTimer = null;
    this.flickerTimer?.remove();
    this.flickerTimer = null;
    this.sprite.setAlpha(1.0);
    this.sprite.clearTint();
  }

  // =========================================================================
  // Private — Animations
  // =========================================================================

  /**
   * Defines Phaser animations from the Phase 1 sprite sheet.
   * Guards against double-registration (idempotent — safe to call each create()).
   */
  private ensureAnimations(scene: Phaser.Scene): void {
    const thrustKey = 'ship-thrust';
    if (!scene.anims.exists(thrustKey)) {
      scene.anims.create({
        key: thrustKey,
        frames: [
          { key: ARCADE_TEXTURE_KEYS.spaceship, frame: 0 },
          { key: ARCADE_TEXTURE_KEYS.spaceship, frame: 1 },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }
  }
}
