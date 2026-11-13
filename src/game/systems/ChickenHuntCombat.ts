/**
 * MOONBOUND — ChickenHuntCombat system (Developer B)
 *
 * Phase 2 / B5: Projectile pooling, wave spawner, Arcade Physics collision.
 *
 * This module is a pure gameplay orchestrator that:
 *  1. Owns the projectile pool (Phaser Physics Group, 24 max lasers).
 *  2. Owns the enemy group (Phaser Physics Group, pooled AlienBird instances).
 *  3. Runs deterministic wave scheduling via Phaser.Time.TimerEvent.
 *  4. Registers Arcade Physics overlap callbacks for:
 *       PlayerLasers ↔ EnemyGroup  (laser hits enemy)
 *       EnemyGroup   ↔ ShipSprite  (enemy contacts ship)
 *  5. Tracks local food count for the mission result.
 *  6. Calls ChickenHuntScene.onCombatEvent() callbacks to signal:
 *       - Enemy destroyed (for food drop in Phase 3)
 *       - Player destroyed (for finishMission in Phase 3)
 *
 * Explicit non-responsibilities:
 *  - Food collectible GameObjects (Phase 3 / B6).
 *  - HUD or UI rendering (Dev A).
 *  - MissionResult dispatch (ChickenHuntScene.finishMission).
 *  - Sound (Phase 5 / B11).
 *
 * Ownership: Dev B only.
 */

import Phaser from 'phaser';
import { ARCADE_TEXTURE_KEYS } from '../assets/arcadeSprites';
import { AlienBird, BIRD_CONFIG, type BirdVariant, type BirdPattern } from '../entities/AlienBird';
import { Spaceship } from '../entities/Spaceship';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const COMBAT_CONFIG = {
  /** Maximum laser sprites in the pool. */
  laserPoolSize: 24,
  /** Upward speed of player lasers (px/s). */
  laserSpeedY: -520,
  /** Laser physics body width override (compact for fair hits). */
  laserBodyW: 3,
  /** Laser physics body height override. */
  laserBodyH: 12,
  /** Maximum AlienBird instances (across both variants). */
  birdPoolSize: 20,
  /** Milliseconds between wave spawns. */
  waveIntervalMs: 4500,
  /** First wave delay after scene create (ms). */
  firstWaveDelayMs: 1200,
  /** Birds spawned per wave. */
  birdsPerWave: 4,
  /** Horizontal margin from screen edge where birds spawn (px). */
  spawnMarginX: 40,
  /** Vertical spawn Y offset (above top of screen). */
  spawnAboveScreenPx: -40,
  /** Damage dealt to ship on enemy contact. */
  contactDamage: 1,
} as const;

// ---------------------------------------------------------------------------
// Wave definitions — deterministic, no Math.random()
// Each entry is one full wave definition.
// ---------------------------------------------------------------------------

interface WaveEntry {
  variant: BirdVariant;
  pattern: BirdPattern;
  /** Normalised X positions [0..1] within the viewport. */
  spawnXNorm: number[];
  /** +1 or -1 per bird. */
  directions: (1 | -1)[];
  /** Sine phase offsets (radians) per bird for stagger. */
  phaseOffsets: number[];
}

/** Pre-authored wave table — deterministic, same run = same waves. */
const WAVE_TABLE: WaveEntry[] = [
  // Wave 0: 4 × Variant-A, sine-wave, left-to-right drift
  {
    variant: 'A', pattern: 'sine-wave',
    spawnXNorm:   [0.15, 0.35, 0.60, 0.80],
    directions:   [1, 1, -1, -1],
    phaseOffsets: [0, 1.0, 2.1, 3.2],
  },
  // Wave 1: 4 × Variant-A, sine-wave, opposite drift
  {
    variant: 'A', pattern: 'sine-wave',
    spawnXNorm:   [0.20, 0.45, 0.65, 0.85],
    directions:   [-1, -1, 1, 1],
    phaseOffsets: [0.5, 1.5, 2.5, 0.0],
  },
  // Wave 2: 4 × Variant-B (armoured), swoop from edges
  {
    variant: 'B', pattern: 'swoop',
    spawnXNorm:   [0.10, 0.30, 0.65, 0.88],
    directions:   [1, 1, -1, -1],
    phaseOffsets: [0, 0, 0, 0],
  },
  // Wave 3: mixed — 2 A sine + 2 B sine
  {
    variant: 'A', pattern: 'sine-wave',
    spawnXNorm:   [0.20, 0.75],
    directions:   [1, -1],
    phaseOffsets: [0, Math.PI],
  },
  // Wave 4: 4 × Variant-B swooping
  {
    variant: 'B', pattern: 'swoop',
    spawnXNorm:   [0.15, 0.40, 0.60, 0.85],
    directions:   [1, -1, 1, -1],
    phaseOffsets: [0, 0, 0, 0],
  },
  // Wave 5: dense 4 × A sine-wave, tighter spacing
  {
    variant: 'A', pattern: 'sine-wave',
    spawnXNorm:   [0.10, 0.30, 0.55, 0.78],
    directions:   [-1, 1, -1, 1],
    phaseOffsets: [0.8, 1.6, 2.4, 3.2],
  },
];

// ---------------------------------------------------------------------------
// Callback signatures (exposed so ChickenHuntScene can wire them)
// ---------------------------------------------------------------------------

export interface CombatCallbacks {
  /** Fired when an enemy is destroyed; position provided for food drop in Phase 3. */
  onEnemyDestroyed: (x: number, y: number, variant: BirdVariant) => void;
  /** Fired when the ship's health reaches 0. */
  onShipDestroyed: (totalDamage: number) => void;
}

// ---------------------------------------------------------------------------
// ChickenHuntCombat
// ---------------------------------------------------------------------------

export class ChickenHuntCombat {
  private scene: Phaser.Scene;
  private ship: Spaceship;
  private callbacks: CombatCallbacks;

  private laserGroup!: Phaser.Physics.Arcade.Group;
  private birdGroup!: Phaser.Physics.Arcade.Group;
  private birds: AlienBird[] = [];

  private waveTimer: Phaser.Time.TimerEvent | null = null;
  private waveIndex = 0;

  private viewW: number;
  private viewH: number;

  private isRunning = false;

  constructor(
    scene: Phaser.Scene,
    ship: Spaceship,
    viewW: number,
    viewH: number,
    callbacks: CombatCallbacks,
  ) {
    this.scene = scene;
    this.ship = ship;
    this.viewW = viewW;
    this.viewH = viewH;
    this.callbacks = callbacks;
  }

  // =========================================================================
  // Public lifecycle
  // =========================================================================

  /**
   * Build physics groups, pre-fill pools, wire collisions, start wave timer.
   * Must be called once from ChickenHuntScene.create() AFTER ship is ready.
   */
  init(): void {
    this.buildLaserPool();
    this.buildBirdPool();
    this.registerCollisions();

    // Wire ship's fire function to our pool
    this.ship.setFireFunction(() => this.fireLaser());

    // Wire ship's destroy callback
    this.ship.setDestroyedCallback((dmg) => {
      this.callbacks.onShipDestroyed(dmg);
    });

    this.scheduleFirstWave();
    this.isRunning = true;
  }

  /**
   * Per-frame update — drive enemy movement and off-screen culling.
   * Called from ChickenHuntScene.update().
   */
  update(_time: number, delta: number): void {
    if (!this.isRunning) return;
    for (const bird of this.birds) {
      bird.update(delta, this.viewH);
    }
  }

  /**
   * Suspend wave spawning and stop enemies. Called on scene pause.
   */
  pause(): void {
    this.isRunning = false;
    if (this.waveTimer) {
      this.waveTimer.paused = true;
    }
    // Freeze all active bird bodies
    for (const bird of this.birds) {
      if (bird.isAlive) {
        (bird.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
    }
    // Also freeze active lasers
    this.laserGroup.getChildren().forEach((child) => {
      const laser = child as Phaser.Physics.Arcade.Image;
      if (laser.active) {
        (laser.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
    });
  }

  /**
   * Resume wave spawning and enemy movement. Called on scene resume.
   */
  resume(): void {
    this.isRunning = true;
    if (this.waveTimer) {
      this.waveTimer.paused = false;
    }
    // Restore velocities for active lasers
    this.laserGroup.getChildren().forEach((child) => {
      const laser = child as Phaser.Physics.Arcade.Image;
      if (laser.active) {
        (laser.body as Phaser.Physics.Arcade.Body).setVelocityY(COMBAT_CONFIG.laserSpeedY);
      }
    });
  }

  /**
   * Full teardown: cancel timers, destroy groups.
   * Called from ChickenHuntScene.onShutdown().
   */
  destroy(): void {
    this.isRunning = false;
    this.waveTimer?.remove();
    this.waveTimer = null;

    // Deactivate all birds
    for (const bird of this.birds) {
      bird.deactivate();
    }
    this.birds = [];

    // Destroy the Phaser groups (cleans up all child sprites)
    if (this.laserGroup?.active) this.laserGroup.destroy(true);
    if (this.birdGroup?.active)  this.birdGroup.destroy(true);
  }

  // =========================================================================
  // Private — Laser pool
  // =========================================================================

  private buildLaserPool(): void {
    this.laserGroup = this.scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: COMBAT_CONFIG.laserPoolSize,
      runChildUpdate: false,
    });

    // Pre-fill the pool with inactive lasers
    for (let i = 0; i < COMBAT_CONFIG.laserPoolSize; i++) {
      const laser = this.laserGroup.create(
        -100, -100, ARCADE_TEXTURE_KEYS.laserPlayer,
      ) as Phaser.Physics.Arcade.Image;
      laser.setActive(false).setVisible(false);
      laser.setDepth(9);
      // Compact physics body for precise but fair collisions
      laser.body!.setSize(COMBAT_CONFIG.laserBodyW, COMBAT_CONFIG.laserBodyH);
    }
  }

  /**
   * Pull an inactive laser from the pool and fire it from the ship's position.
   * If the pool is exhausted (all 24 lasers on-screen), no-op — prevents unbounded creation.
   */
  private fireLaser(): void {
    const laser = this.laserGroup.getFirstDead(false) as Phaser.Physics.Arcade.Image | null;
    if (!laser) return; // pool exhausted — rate limit naturally

    const sx = this.ship.sprite.x;
    const sy = this.ship.sprite.y - this.ship.sprite.height / 2;

    laser.setPosition(sx, sy);
    laser.setActive(true).setVisible(true);
    (laser.body as Phaser.Physics.Arcade.Body).enable = true;
    (laser.body as Phaser.Physics.Arcade.Body).setVelocityY(COMBAT_CONFIG.laserSpeedY);
  }

  /**
   * Recycle lasers that have flown off-screen.
   * Phaser's runChildUpdate is off; we do it manually in update() via
   * the overlap callback's post-processing. Additionally, check bounds here.
   */
  private recycleLasers(): void {
    this.laserGroup.getChildren().forEach((child) => {
      const laser = child as Phaser.Physics.Arcade.Image;
      if (laser.active && (laser.y < -20 || laser.y > this.viewH + 20)) {
        laser.setActive(false).setVisible(false);
        (laser.body as Phaser.Physics.Arcade.Body).enable = false;
        (laser.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
    });
  }

  // =========================================================================
  // Private — Bird pool
  // =========================================================================

  private buildBirdPool(): void {
    this.birdGroup = this.scene.physics.add.group({
      runChildUpdate: false,
    });

    // Pre-create a mix of variant A and B birds (12 A, 8 B)
    for (let i = 0; i < 12; i++) {
      this.birds.push(new AlienBird(this.scene, this.birdGroup, 'A'));
    }
    for (let i = 0; i < 8; i++) {
      this.birds.push(new AlienBird(this.scene, this.birdGroup, 'B'));
    }
  }

  /**
   * Find an inactive bird of the specified variant from the pool.
   * Returns null if none available (wave is skipped for this slot).
   */
  private getInactiveBird(variant: BirdVariant): AlienBird | null {
    return this.birds.find(b => !b.isAlive && b.currentVariant === variant) ?? null;
  }

  // =========================================================================
  // Private — Wave spawning
  // =========================================================================

  private scheduleFirstWave(): void {
    this.waveTimer = this.scene.time.addEvent({
      delay: COMBAT_CONFIG.firstWaveDelayMs,
      callback: this.spawnWave,
      callbackScope: this,
    });
  }

  private scheduleNextWave(): void {
    this.waveTimer = this.scene.time.addEvent({
      delay: COMBAT_CONFIG.waveIntervalMs,
      callback: this.spawnWave,
      callbackScope: this,
    });
  }

  /**
   * Spawn one full wave from the WAVE_TABLE (wraps around deterministically).
   */
  private spawnWave(): void {
    if (!this.isRunning) return;

    const entry = WAVE_TABLE[this.waveIndex % WAVE_TABLE.length];
    this.waveIndex++;

    for (let i = 0; i < entry.spawnXNorm.length; i++) {
      const bird = this.getInactiveBird(entry.variant);
      if (!bird) continue; // pool exhausted for this variant

      const x = COMBAT_CONFIG.spawnMarginX
        + entry.spawnXNorm[i] * (this.viewW - COMBAT_CONFIG.spawnMarginX * 2);
      const y = COMBAT_CONFIG.spawnAboveScreenPx;
      const dir = entry.directions[i] ?? 1;
      const phase = entry.phaseOffsets[i] ?? 0;

      bird.activate(x, y, entry.pattern, dir, phase);
    }

    this.scheduleNextWave();
  }

  // =========================================================================
  // Private — Arcade Physics collisions
  // =========================================================================

  private registerCollisions(): void {
    // ---- Player lasers ↔ Alien birds ----
    this.scene.physics.add.overlap(
      this.laserGroup,
      this.birdGroup,
      (laserObj, birdObj) => {
        const laser = laserObj as Phaser.Physics.Arcade.Image;
        const birdSprite = birdObj as Phaser.Physics.Arcade.Sprite;

        if (!laser.active || !birdSprite.active) return;

        // Recycle laser immediately
        laser.setActive(false).setVisible(false);
        (laser.body as Phaser.Physics.Arcade.Body).enable = false;
        (laser.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

        // Find the AlienBird wrapper for this sprite
        const bird = this.birds.find(b => b.sprite === birdSprite);
        if (!bird || !bird.isAlive) return;

        const destroyed = bird.takeDamage(1);
        if (destroyed) {
          this.callbacks.onEnemyDestroyed(birdSprite.x, birdSprite.y, bird.currentVariant);
        }
      },
    );

    // ---- Alien birds ↔ Player ship ----
    this.scene.physics.add.overlap(
      this.birdGroup,
      this.ship.sprite,
      (birdObj, _shipObj) => {
        const birdSprite = birdObj as Phaser.Physics.Arcade.Sprite;
        if (!birdSprite.active) return;

        // Find wrapper
        const bird = this.birds.find(b => b.sprite === birdSprite);
        if (!bird || !bird.isAlive) return;

        // Apply damage to ship (ship handles invulnerability internally)
        this.ship.takeDamage(COMBAT_CONFIG.contactDamage);

        // Deactivate the bird on contact (it "flies through" the ship)
        bird.deactivate();
      },
    );
  }

  // =========================================================================
  // Extended update — called each frame, handles off-screen cleanup
  // =========================================================================

  // Override update to also recycle off-screen lasers
  updateFull(time: number, delta: number): void {
    this.update(time, delta);
    this.recycleLasers();
  }
}
