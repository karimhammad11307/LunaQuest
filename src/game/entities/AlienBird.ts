/**
 * LUNAQUEST — AlienBird entity (Developer B)
 *
 * Phase 2 / B4: Alien chicken enemy.
 *
 * Responsibilities:
 *  - Wrap a Phaser Arcade sprite with health, variant, and movement state.
 *  - Expose two movement patterns: SINE_WAVE and SWOOP.
 *  - takeDamage() / isAlive() / deactivate() for combat lifecycle.
 *  - Clean up its own time-based parameters on deactivate.
 *
 * NOT responsible for:
 *  - Spawning logic or wave scheduling (ChickenHuntCombat).
 *  - Collision registration (ChickenHuntCombat).
 *  - Food drop creation (Phase 3 / B6).
 *  - Sound (Phase 5 / B11).
 *
 * Ownership: Dev B only.
 */

import Phaser from 'phaser';
import { ARCADE_TEXTURE_KEYS } from '../assets/arcadeSprites';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const BIRD_CONFIG = {
  /** Health per variant (index matches BirdVariant ordinal). */
  health: [1, 2] as const,
  /** Downward base speed (px/s). */
  baseSpeedY: 90,
  /** Horizontal drift speed for sine-wave pattern (px/s). */
  sineSpeedX: 70,
  /** Amplitude of vertical sine oscillation (px). */
  sineAmplitude: 28,
  /** Angular frequency of the sine oscillation (radians/s). */
  sineFrequency: 2.4,
  /** Swoop: horizontal travel speed (px/s). */
  swoopSpeedX: 130,
  /** Swoop: dive depth (px). */
  swoopDiveDepth: 120,
  /** Swoop: speed of the vertical dive component (px/s). */
  swoopSpeedY: 60,
  /** Body inset to trim collision area (px each side). */
  bodyInset: 4,
  /** Points out of screen top at which to deactivate (px above 0). */
  cullAbove: -60,
  /** Points out of screen bottom at which to deactivate. */
  cullBelow: 400,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BirdVariant = 'A' | 'B';
export type BirdPattern = 'sine-wave' | 'swoop';

// ---------------------------------------------------------------------------
// AlienBird class
// ---------------------------------------------------------------------------

export class AlienBird {
  /** Public so CombatSystem can add it to a Phaser Physics Group. */
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  private scene: Phaser.Scene;
  private health: number;
  private maxHealth: number;
  private variant: BirdVariant;
  private pattern: BirdPattern;

  /** Elapsed time since this bird was activated, in seconds. */
  private timeAlive = 0;
  /** Horizontal direction: +1 = right, -1 = left. */
  private directionX: 1 | -1;
  /** Captured Y when the swoop dive starts. */
  private swoopBaseY = 0;
  /** Phase offset for sine so staggered birds don't all align. */
  private phaseOffset: number;

  private _isAlive = false;

  constructor(
    scene: Phaser.Scene,
    group: Phaser.Physics.Arcade.Group,
    variant: BirdVariant,
  ) {
    this.scene = scene;
    this.variant = variant;
    this.pattern = 'sine-wave'; // default; set by activate()

    const textureKey = variant === 'A'
      ? ARCADE_TEXTURE_KEYS.alienBirdA
      : ARCADE_TEXTURE_KEYS.alienBirdB;

    // Create sprite as member of the shared group (Arcade Physics auto-enabled).
    this.sprite = group.create(-100, -100, textureKey, 0) as Phaser.Physics.Arcade.Sprite;
    this.sprite.setActive(false).setVisible(false);
    this.sprite.setDepth(8);

    // Trim body for fair hitboxes
    if (this.sprite.body) {
      this.sprite.body.setSize(
        this.sprite.width  - BIRD_CONFIG.bodyInset * 2,
        this.sprite.height - BIRD_CONFIG.bodyInset * 2,
      );
      this.sprite.body.setOffset(BIRD_CONFIG.bodyInset, BIRD_CONFIG.bodyInset);
    }

    const hpIndex = variant === 'A' ? 0 : 1;
    this.maxHealth = BIRD_CONFIG.health[hpIndex];
    this.health = this.maxHealth;

    this.directionX = 1;
    this.phaseOffset = 0;
  }

  // =========================================================================
  // Public API
  // =========================================================================

  get isAlive(): boolean {
    return this._isAlive;
  }

  get currentVariant(): BirdVariant {
    return this.variant;
  }

  /**
   * Reactivate this bird at a given screen position with the specified pattern.
   * Resets all state so the same instance can be pooled and reused.
   *
   * @param x           - Spawn X (logical pixels).
   * @param y           - Spawn Y (logical pixels, usually off-screen top).
   * @param pattern     - Which movement pattern to use.
   * @param directionX  - Horizontal travel direction (+1 or -1).
   * @param phaseOffset - Sine phase offset (radians) for stagger.
   */
  activate(
    x: number,
    y: number,
    pattern: BirdPattern,
    directionX: 1 | -1 = 1,
    phaseOffset = 0,
  ): void {
    this.health = this.maxHealth;
    this._isAlive = true;
    this.pattern = pattern;
    this.directionX = directionX;
    this.phaseOffset = phaseOffset;
    this.timeAlive = 0;
    this.swoopBaseY = y;

    this.sprite.setPosition(x, y);
    this.sprite.setActive(true).setVisible(true);
    this.sprite.setAlpha(1);
    this.sprite.clearTint();
    const body = this.sprite.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.enable = true;
    }
    this.sprite.setFrame(0); // idle frame
  }

  /**
   * Apply damage to the bird. Returns true if the bird was destroyed.
   */
  takeDamage(amount = 1): boolean {
    if (!this._isAlive) return false;

    this.health = Math.max(0, this.health - amount);

    // Brief red flash
    this.sprite.setTint(0xff4444);
    this.scene.time.delayedCall(80, () => {
      if (this._isAlive && this.sprite?.active) this.sprite.clearTint();
    });

    if (this.health <= 0) {
      this.deactivate();
      return true;
    }
    return false;
  }

  /**
   * Immediately remove this bird from the game world.
   * Called on death or when it flies off-screen.
   */
  deactivate(): void {
    this._isAlive = false;
    if (this.sprite?.active) {
      this.sprite.setActive(false).setVisible(false);
    }
    const body = this.sprite?.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.enable = false;
      body.setVelocity(0, 0);
    }
  }

  /**
   * Per-frame movement update. Called by ChickenHuntCombat.update().
   *
   * @param delta - Frame delta in milliseconds.
   * @param viewH - Scene height for culling check.
   */
  update(delta: number, viewH: number): void {
    if (!this._isAlive) return;

    const dt = delta / 1000; // seconds
    this.timeAlive += dt;

    const body = this.sprite.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) return;

    switch (this.pattern) {
      case 'sine-wave':
        this.moveSineWave(body, dt);
        break;
      case 'swoop':
        this.moveSwoop(body, dt);
        break;
    }

    // Animate — alternate between frame 0 and 1 based on timeAlive
    const frame = Math.floor(this.timeAlive * 6) % 2;
    if (this.sprite.active) {
      this.sprite.setFrame(frame);
    }

    // Cull off-screen enemies
    if (this.sprite.y > viewH + Math.abs(BIRD_CONFIG.cullBelow)
      || this.sprite.y < BIRD_CONFIG.cullAbove) {
      this.deactivate();
    }
  }

  // =========================================================================
  // Private — Movement Patterns
  // =========================================================================

  /**
   * Pattern A — Sine Wave
   * Bird drifts horizontally while its vertical position oscillates sinusoidally.
   * Gives a weaving, dancing appearance — readable and child-friendly.
   */
  private moveSineWave(body: Phaser.Physics.Arcade.Body, dt: number): void {
    // Horizontal drift with edge bounce to stay in playable area while weaving down
    if (this.sprite.x <= 25 && this.directionX < 0) {
      this.directionX = 1;
    } else if (this.sprite.x >= 615 && this.directionX > 0) {
      this.directionX = -1;
    }
    const vx = this.directionX * BIRD_CONFIG.sineSpeedX;

    // Vertical: constant downward component + sine oscillation
    const angle = this.timeAlive * BIRD_CONFIG.sineFrequency + this.phaseOffset;
    const vy = BIRD_CONFIG.baseSpeedY + Math.sin(angle) * BIRD_CONFIG.sineAmplitude;

    body.setVelocity(vx, vy);
    void dt; // consumed via timeAlive accumulation
  }

  /**
   * Pattern B — Swoop
   * Bird enters from top, dives a fixed depth, then retreats upward.
   * Deterministic trajectory based on timeAlive — same input = same path.
   *
   * Phase breakdown:
   *   0.0–1.5 s  : fast horizontal entry
   *   1.5–2.5 s  : steep vertical dive
   *   2.5+ s     : retreat upward and exit
   */
  private moveSwoop(body: Phaser.Physics.Arcade.Body, dt: number): void {
    void dt;
    const t = this.timeAlive;

    let vx = 0;
    let vy = 0;

    if (t < 1.5) {
      // Entry phase: fly in horizontally
      vx = this.directionX * BIRD_CONFIG.swoopSpeedX;
      vy = 20; // gentle drift downward
    } else if (t < 2.5) {
      // Dive phase: plunge down
      vx = this.directionX * (BIRD_CONFIG.swoopSpeedX * 0.3);
      vy = BIRD_CONFIG.swoopSpeedY * 3;
    } else {
      // Retreat: rise and exit top of screen
      vx = -this.directionX * BIRD_CONFIG.swoopSpeedX * 0.5;
      vy = -BIRD_CONFIG.baseSpeedY * 1.5;
    }

    body.setVelocity(vx, vy);
    void this.swoopBaseY; // reserved for future depth-relative logic
  }
}
