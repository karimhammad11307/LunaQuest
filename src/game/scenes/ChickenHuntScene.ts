/**
 * MOONBOUND — ChickenHuntScene (Developer B)
 *
 * Phase 3 update: Collectibles & Rewards (B6), Mission Timer & Failure States (B7),
 * and MissionResult Emission & Scene Exit Contract (B8).
 *
 * All Phase 1 and Phase 2 contributions are preserved:
 *  - Parallax starfield (buildStarfield / scrollStarfield)
 *  - Spaceship entity and input controls (B3)
 *  - AlienBird pool and deterministic wave spawning (B4)
 *  - Arcade physics projectile pool and laser/bird collisions (B5)
 *
 * Phase 3 additions:
 *  - Collectible entity pool (B6) with magnet attraction toward player ship.
 *  - Local food counter tracking and floating pickup visual feedback.
 *  - 35-second countdown timer (B7) with visual urgency indicator when low.
 *  - In-scene HUD displaying time, food counter, ship hull status, and interactive
 *    [RETURN TO BASE] button for voluntary early exit (B7).
 *  - Single centralized mission completion state machine (B8) with exactly-once
 *    emission guard protecting against all race conditions.
 *  - Clean pause / resume / shutdown lifecycle across all arcade systems.
 *
 * Dev A integration:
 *  - The coordinator passes typed `ChickenHuntLaunchData` with `dispatch`.
 *  - Scene emits `{ type: 'COMPLETE_MISSION', result: MissionResult }` exactly once.
 *  - Dev A's state store alone applies the final banked resources, damage, and XP.
 *
 * Ownership: Developer B only. Do NOT import React or modify Dev A's files.
 */

import Phaser from 'phaser';
import { ARCADE_TEXTURE_KEYS, generateAllArcadeTextures } from '../assets/arcadeSprites';
import { Spaceship } from '../entities/Spaceship';
import { AlienBird, type BirdVariant } from '../entities/AlienBird';
import { ChickenHuntCombat, type CombatCallbacks } from '../systems/ChickenHuntCombat';
import { Collectible, COLLECTIBLE_CONFIG } from '../entities/Collectible';
import { PALETTE } from '../config/palette';
import type { MissionResult } from '../../domain/models/types';
import type { GameAction } from '../../domain/models/GameAction';

// ---------------------------------------------------------------------------
// Scene launch data passed by Dev A's coordinator (read-only)
// ---------------------------------------------------------------------------

export interface ChickenHuntLaunchData {
  runId: string;
  difficulty?: number;
  dispatch: (action: GameAction) => void;
}

// ---------------------------------------------------------------------------
// Parallax layer descriptor
// ---------------------------------------------------------------------------

interface StarLayer {
  tileSprite: Phaser.GameObjects.TileSprite;
  scrollSpeed: number;
}

// ---------------------------------------------------------------------------
// Scene constants
// ---------------------------------------------------------------------------

const VIEW_W = 640;
const VIEW_H = 360;

const SHIP_SPAWN_X = VIEW_W / 2;
const SHIP_SPAWN_Y = VIEW_H - 60;

/** Default mission duration in seconds. */
export const DEFAULT_MISSION_DURATION_SEC = 35;

/** Mission lifecycle states. */
export type MissionState = 'READY' | 'ACTIVE' | 'COMPLETING' | 'COMPLETED' | 'SHUTDOWN';

// ---------------------------------------------------------------------------
// ChickenHuntScene
// ---------------------------------------------------------------------------

export class ChickenHuntScene extends Phaser.Scene {
  static readonly SCENE_KEY = 'ChickenHuntScene';

  // ---- Injected launch data ----
  private launchData!: ChickenHuntLaunchData;

  // ---- Starfield layers ----
  private starLayers: StarLayer[] = [];

  // ---- Entities and combat systems ----
  private ship: Spaceship | null = null;
  private combat: ChickenHuntCombat | null = null;

  // ---- Phase 3: Collectible pool ----
  private collectibleGroup!: Phaser.Physics.Arcade.Group;
  private collectibles: Collectible[] = [];

  // ---- Phase 3: Mission state & accounting ----
  private missionState: MissionState = 'READY';
  private remainingTime = DEFAULT_MISSION_DURATION_SEC;
  private missionSeconds = 0;
  private localFoodCollected = 0;
  private totalDamageTaken = 0;

  // ---- Phase 3: In-scene HUD GameObjects ----
  private timerText!: Phaser.GameObjects.Text;
  private foodText!: Phaser.GameObjects.Text;
  private hullText!: Phaser.GameObjects.Text;
  private returnButtonContainer!: Phaser.GameObjects.Container;

  // ---- Race condition guard ----
  private hasEmittedResult = false;
  private isShuttingDown = false;

  constructor() {
    super({ key: ChickenHuntScene.SCENE_KEY });
  }

  // =========================================================================
  // Phaser Lifecycle: init
  // =========================================================================

  init(data: unknown): void {
    this.isShuttingDown = false;
    this.hasEmittedResult = false;
    this.missionState = 'READY';
    this.starLayers = [];
    this.ship = null;
    this.combat = null;
    this.collectibles = [];
    this.remainingTime = DEFAULT_MISSION_DURATION_SEC;
    this.missionSeconds = 0;
    this.localFoodCollected = 0;
    this.totalDamageTaken = 0;

    if (!data || typeof data !== 'object') {
      this.launchData = {
        runId: 'DEFAULT_RUN',
        difficulty: 1.0,
        dispatch: (action) => console.warn('[ChickenHuntScene] No-op dispatch:', action),
      };
      return;
    }

    const d = data as Partial<ChickenHuntLaunchData>;
    this.launchData = {
      runId: d.runId ?? 'DEFAULT_RUN',
      difficulty: d.difficulty ?? 1.0,
      dispatch: typeof d.dispatch === 'function'
        ? d.dispatch
        : (action) => console.warn('[ChickenHuntScene] No-op dispatch:', action),
    };
  }

  // =========================================================================
  // Phaser Lifecycle: preload
  // =========================================================================

  preload(): void {
    generateAllArcadeTextures(this);
  }

  // =========================================================================
  // Phaser Lifecycle: create
  // =========================================================================

  create(): void {
    if (this.isShuttingDown) return;

    // Background
    this.cameras.main.setBackgroundColor(0x12172f);
    this.buildStarfield();

    // World bounds
    this.physics.world.setBounds(0, 0, VIEW_W, VIEW_H);

    // Player ship
    this.ship = new Spaceship(this, SHIP_SPAWN_X, SHIP_SPAWN_Y, VIEW_W, VIEW_H);

    // Combat system
    const combatCallbacks: CombatCallbacks = {
      onEnemyDestroyed: (x, y, variant) => this.handleEnemyDestroyed(x, y, variant),
      onShipDestroyed:  (dmg) => this.handleShipDestroyed(dmg),
    };
    this.combat = new ChickenHuntCombat(this, this.ship, VIEW_W, VIEW_H, combatCallbacks);
    this.combat.init();

    // Phase 3: Build collectible pool and register pickup overlap
    this.buildCollectiblePool();
    this.registerCollectibleOverlap();

    // Phase 3: Build in-scene HUD (Timer, Food count, Hull status, Return button)
    this.buildHUD();

    // Set mission active
    this.missionState = 'ACTIVE';

    // Lifecycle handlers
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.on(Phaser.Scenes.Events.PAUSE,    this.onPause,    this);
    this.events.on(Phaser.Scenes.Events.RESUME,   this.onResume,   this);
  }

  // =========================================================================
  // Phaser Lifecycle: update
  // =========================================================================

  override update(time: number, delta: number): void {
    if (this.isShuttingDown || this.missionState !== 'ACTIVE') return;

    const dt = delta / 1000;
    this.missionSeconds += dt;

    // 1. Mission countdown timer (B7)
    this.remainingTime = Math.max(0, this.remainingTime - dt);
    this.updateHUDTimer();

    // Timer expiration triggers Exit A
    if (this.remainingTime <= 0) {
      this.completeMission('timer');
      return;
    }

    // 2. Parallax starfield scroll
    this.scrollStarfield(delta);

    // 3. Player spaceship update
    this.ship?.update(time, delta);

    // 4. Combat system update (enemies, lasers, off-screen culling)
    this.combat?.updateFull(time, delta);

    // 5. Collectibles magnet pull toward player ship (B6)
    if (this.ship) {
      const shipX = this.ship.sprite.x;
      const shipY = this.ship.sprite.y;
      for (const collectible of this.collectibles) {
        collectible.update(delta, shipX, shipY, VIEW_H);
      }
    }
  }

  // =========================================================================
  // Phase 3: Collectibles & Rewards (B6)
  // =========================================================================

  private buildCollectiblePool(): void {
    this.collectibleGroup = this.physics.add.group({
      runChildUpdate: false,
    });

    for (let i = 0; i < COLLECTIBLE_CONFIG.poolSize; i++) {
      this.collectibles.push(new Collectible(this, this.collectibleGroup));
    }
  }

  private registerCollectibleOverlap(): void {
    if (!this.ship) return;

    this.physics.add.overlap(
      this.ship.sprite,
      this.collectibleGroup,
      (_shipObj, colObj) => {
        if (this.missionState !== 'ACTIVE') return;

        const sprite = colObj as Phaser.Physics.Arcade.Sprite;
        const collectible = this.collectibles.find((c) => c.sprite === sprite);
        if (!collectible || !collectible.isActive || collectible.isCollected) return;

        const value = collectible.collect();
        if (value > 0) {
          this.localFoodCollected += value;
          this.updateHUDFood();
          this.showFloatingPickupText(sprite.x, sprite.y, `+${value} FOOD`);
        }
      },
    );
  }

  private spawnFoodDrop(x: number, y: number, value: number): void {
    const available = this.collectibles.find((c) => !c.isActive);
    if (!available) return; // Pool full, avoid unbounded growth

    available.activate(x, y, value);
  }

  private showFloatingPickupText(x: number, y: number, text: string): void {
    const floating = this.add.text(x, y - 10, text, {
      fontFamily: 'monospace, monospace',
      fontSize: '11px',
      color: PALETTE.yellow,
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: floating,
      y: y - 28,
      alpha: 0,
      duration: 650,
      ease: 'Power1',
      onComplete: () => floating.destroy(),
    });
  }

  // =========================================================================
  // Phase 3: In-Scene HUD (B7)
  // =========================================================================

  private buildHUD(): void {
    // 1. Timer display (Top Left)
    this.timerText = this.add.text(16, 12, `TIME: ${Math.ceil(this.remainingTime)}s`, {
      fontFamily: 'monospace, monospace',
      fontSize: '13px',
      color: PALETTE.cyan,
    }).setDepth(30);

    // 2. Food counter display (Top Left, below timer)
    this.foodText = this.add.text(16, 30, `FOOD: ${this.localFoodCollected}`, {
      fontFamily: 'monospace, monospace',
      fontSize: '13px',
      color: PALETTE.yellow,
    }).setDepth(30);

    // 3. Hull status display (Top Center)
    const currentHealth = this.ship?.getHealth() ?? 3;
    this.hullText = this.add.text(VIEW_W / 2, 14, `HULL: ${'♥'.repeat(currentHealth)}`, {
      fontFamily: 'monospace, monospace',
      fontSize: '13px',
      color: PALETTE.green,
    }).setOrigin(0.5, 0).setDepth(30);

    // 4. [RETURN TO BASE] Button (Top Right)
    this.buildReturnButton();
  }

  private buildReturnButton(): void {
    const btnX = VIEW_W - 90;
    const btnY = 20;
    const btnW = 140;
    const btnH = 26;

    // Background button rectangle
    const bg = this.add.rectangle(0, 0, btnW, btnH, 0x1b2145) // PALETTE.spaceMid
      .setStrokeStyle(1, 0x4edce5); // PALETTE.cyan

    // Button label
    const label = this.add.text(0, 0, 'RETURN TO BASE', {
      fontFamily: 'monospace, monospace',
      fontSize: '11px',
      color: PALETTE.suitWhite,
    }).setOrigin(0.5);

    this.returnButtonContainer = this.add.container(btnX, btnY, [bg, label])
      .setDepth(30)
      .setSize(btnW, btnH);

    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      bg.setFillStyle(0x2a9aa6); // PALETTE.cyanDim
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x1b2145);
    });

    bg.on('pointerup', () => {
      if (this.missionState === 'ACTIVE') {
        this.completeMission('return-early');
      }
    });
  }

  private updateHUDTimer(): void {
    if (!this.timerText?.active) return;
    const seconds = Math.ceil(this.remainingTime);
    this.timerText.setText(`TIME: ${seconds}s`);

    // Urgent visual cue when time is under 10 seconds
    if (seconds <= 10) {
      this.timerText.setColor(PALETTE.coral);
    } else {
      this.timerText.setColor(PALETTE.cyan);
    }
  }

  private updateHUDFood(): void {
    if (!this.foodText?.active) return;
    this.foodText.setText(`FOOD: ${this.localFoodCollected}`);
  }

  private updateHUDHull(): void {
    if (!this.hullText?.active) return;
    const hp = this.ship?.getHealth() ?? 0;
    this.hullText.setText(`HULL: ${'♥'.repeat(Math.max(0, hp))}`);
    if (hp <= 1) {
      this.hullText.setColor(PALETTE.coral);
    }
  }

  // =========================================================================
  // Combat event callbacks
  // =========================================================================

  private handleEnemyDestroyed(x: number, y: number, variant: BirdVariant): void {
    const foodYield = variant === 'B' ? 2 : 1;
    this.spawnFoodDrop(x, y, foodYield);
    this.showImpactBurst(x, y);
  }

  private handleShipDestroyed(dmg: number): void {
    this.totalDamageTaken = dmg;
    this.updateHUDHull();
    this.completeMission('ship-destroyed');
  }

  private showImpactBurst(x: number, y: number): void {
    const burst = this.add.image(x, y, ARCADE_TEXTURE_KEYS.impactBurst, 0).setDepth(15);
    this.time.delayedCall(80, () => {
      if (burst.active) burst.setFrame(1);
    });
    this.time.delayedCall(160, () => {
      if (burst.active) burst.destroy();
    });
  }

  // =========================================================================
  // Phase 3: Centralized Mission Exit & Exactly-Once Contract (B7, B8)
  // =========================================================================

  /**
   * Centralized mission exit coordinator.
   * Protects against race conditions by synchronously locking `missionState = 'COMPLETING'`.
   *
   * Exactly three exit conditions are supported:
   *  1. 'timer'          - 35s timer expired -> full collected food banked, safe return.
   *  2. 'return-early'   - Player clicked RETURN TO BASE -> full collected food banked, safe return.
   *  3. 'ship-destroyed' - Hull reached 0 -> 0 food banked, repair damage applied, encouraging message.
   */
  public completeMission(reason: 'timer' | 'return-early' | 'ship-destroyed'): void {
    // Exactly-once atomic guard: first valid exit request wins
    if (this.missionState !== 'ACTIVE' || this.isShuttingDown || this.hasEmittedResult) {
      return;
    }

    this.missionState = 'COMPLETING';
    this.hasEmittedResult = true;

    // Immediately stop player input and firing
    this.ship?.pause();

    // Immediately stop enemy movement and wave scheduling
    this.combat?.pause();

    // Deactivate active collectibles so no further pickups occur
    for (const c of this.collectibles) {
      if (c.isActive && !c.isCollected) {
        c.deactivate();
      }
    }

    // Determine final mission results based on exit reason
    let success = false;
    let returnedSafely = false;
    let creditedFood = 0;
    let healthDamage = 0;
    let xpEarned = 0;
    let educationalMessage = '';

    const elapsedSeconds = Math.max(1, Math.round(this.missionSeconds));

    switch (reason) {
      case 'timer':
        success = this.localFoodCollected > 0;
        returnedSafely = true;
        creditedFood = this.localFoodCollected;
        healthDamage = this.totalDamageTaken * 10;
        xpEarned = 20 + (this.localFoodCollected >= 10 ? 5 : 0);
        educationalMessage = 'Time complete! Safe return with harvested food supplies.';
        break;

      case 'return-early':
        success = this.localFoodCollected > 0;
        returnedSafely = true;
        creditedFood = this.localFoodCollected;
        healthDamage = this.totalDamageTaken * 10;
        xpEarned = 15 + (this.localFoodCollected >= 5 ? 5 : 0);
        educationalMessage = 'Smart retreat! Good astronauts know when to return safely with their haul.';
        break;

      case 'ship-destroyed':
        success = false;
        returnedSafely = false;
        creditedFood = 0; // Lost all cargo on ship destruction per locked decision
        healthDamage = Math.max(15, this.totalDamageTaken * 10);
        xpEarned = 5; // Modest effort XP
        educationalMessage =
          'Your ship needs a little repair! Every astronaut learns from their missions. Head back to base and try again!';
        break;
    }

    const result: MissionResult = {
      runId: this.launchData.runId,
      missionType: 'chicken-hunt',
      success,
      returnedSafely,
      collectedResources: {
        food: Math.max(0, Math.min(creditedFood, 50)),
      },
      healthDamage: Math.max(0, Math.min(healthDamage, 100)),
      xpEarned,
      duration: Math.min(DEFAULT_MISSION_DURATION_SEC, elapsedSeconds),
      educationalMessage,
    };

    this.missionState = 'COMPLETED';

    // Dispatch the frozen COMPLETE_MISSION action to Dev A's store exactly once
    this.launchData.dispatch({ type: 'COMPLETE_MISSION', result });

    // Transition out safely
    this.time.delayedCall(250, () => {
      this.scene.stop();
    });
  }

  // =========================================================================
  // Starfield & Parallax
  // =========================================================================

  private buildStarfield(): void {
    const farLayer: StarLayer = {
      tileSprite: this.add.tileSprite(0, 0, VIEW_W, VIEW_H, ARCADE_TEXTURE_KEYS.starfieldFar)
        .setOrigin(0, 0),
      scrollSpeed: 10,
    };
    const nearLayer: StarLayer = {
      tileSprite: this.add.tileSprite(0, 0, VIEW_W, VIEW_H, ARCADE_TEXTURE_KEYS.starfieldNear)
        .setOrigin(0, 0),
      scrollSpeed: 25,
    };
    this.starLayers = [farLayer, nearLayer];
  }

  private scrollStarfield(delta: number): void {
    const ds = delta / 1000;
    for (const layer of this.starLayers) {
      layer.tileSprite.tilePositionY -= layer.scrollSpeed * ds;
    }
  }

  // =========================================================================
  // Pause / Resume
  // =========================================================================

  private onPause(): void {
    this.ship?.pause();
    this.combat?.pause();
  }

  private onResume(): void {
    if (this.missionState === 'ACTIVE') {
      this.ship?.resume();
      this.combat?.resume();
    }
  }

  // =========================================================================
  // Shutdown & Teardown
  // =========================================================================

  private onShutdown(): void {
    this.isShuttingDown = true;
    this.missionState = 'SHUTDOWN';

    this.events.off(Phaser.Scenes.Events.PAUSE,  this.onPause,  this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);

    // Destroy starfield
    for (const layer of this.starLayers) {
      if (layer?.tileSprite?.active) layer.tileSprite.destroy();
    }
    this.starLayers = [];

    // Destroy combat and ship
    this.combat?.destroy();
    this.combat = null;

    this.ship?.destroy();
    this.ship = null;

    // Deactivate collectibles
    for (const c of this.collectibles) {
      if (c) c.deactivate();
    }
    this.collectibles = [];
    if (this.collectibleGroup?.active) {
      this.collectibleGroup.destroy(true);
    }
  }
}
