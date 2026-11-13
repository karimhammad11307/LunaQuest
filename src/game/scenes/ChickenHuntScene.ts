/**
 * MOONBOUND — ChickenHuntScene (Developer B)
 *
 * Phase 1 / B2: Scene scaffold only.
 * Responsibility: lifecycle, parallax starfield, cleanup.
 * NOT implemented here: input controls, enemy spawning, shooting,
 * collision, HUD, or MissionResult emission (Phases 2–3).
 *
 * Ownership rules:
 *  - This file is exclusively owned by Developer B.
 *  - Import from domain/models only via types (never mutate directly).
 *  - Dispatch COMPLETE_MISSION action once via the bridge supplied at start.
 *  - Never import React, the React shell, or SaveService.
 *
 * Dev A integration note (see bottom of file):
 *  Dev A must register this scene in BootScene / gameConfig when available.
 */

import Phaser from 'phaser';
import { ARCADE_TEXTURE_KEYS, generateAllArcadeTextures } from '../assets/arcadeSprites';
import type { MissionResult } from '../../domain/models/types';
import type { GameAction } from '../../domain/models/GameAction';

// ---------------------------------------------------------------------------
// Scene launch data passed by Dev A's coordinator (read-only)
// ---------------------------------------------------------------------------

export interface ChickenHuntLaunchData {
  /**
   * Opaque run identifier provided by the store.
   * Dev B passes it back unchanged in MissionResult so the store can
   * verify idempotency.  B never reads or interprets this value.
   */
  runId: string;
  /** Difficulty multiplier 1.0 (default). Reserved for future tuning. */
  difficulty?: number;
  /**
   * Dispatch function injected by Dev A's coordinator.
   * B calls this with COMPLETE_MISSION exactly once.
   */
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
// Scene constants (scene-local only — do NOT read from balance.ts)
// ---------------------------------------------------------------------------

/** Logical scene dimensions must match the game's configured VIEW. */
const VIEW_W = 640;
const VIEW_H = 360;

// ---------------------------------------------------------------------------
// ChickenHuntScene
// ---------------------------------------------------------------------------

export class ChickenHuntScene extends Phaser.Scene {
  static readonly SCENE_KEY = 'ChickenHuntScene';

  // ---- Injected launch data (set in init) ----
  private launchData!: ChickenHuntLaunchData;

  // ---- Parallax starfield layers ----
  private starLayers: StarLayer[] = [];

  // ---- Lifecycle guard ----
  /**
   * Prevents the scene from processing updates after shutdown has been
   * requested.  Set to true in the shutdown handler; checked in update().
   */
  private isShuttingDown = false;

  /**
   * Prevents emitting more than one COMPLETE_MISSION action regardless
   * of how many simultaneous end-conditions fire (timer + ship death on
   * the same frame, rapid double-press of Return, etc.).
   * Phases 2–3 will call finishMission() through this guard.
   */
  private hasEmittedResult = false;

  constructor() {
    super({ key: ChickenHuntScene.SCENE_KEY });
  }

  // =========================================================================
  // Phaser Lifecycle: init
  // =========================================================================

  /**
   * Called once when the scene is started via `scene.start(key, data)`.
   * Receives and validates the launch data from Dev A's coordinator.
   */
  init(data: unknown): void {
    this.isShuttingDown = false;
    this.hasEmittedResult = false;
    this.starLayers = [];

    if (!data || typeof data !== 'object') {
      console.error('[ChickenHuntScene] init() received no launch data. Scene will not emit results.');
      // Provide a no-op dispatch so later code never crashes on undefined
      this.launchData = {
        runId: 'MISSING_RUN_ID',
        difficulty: 1.0,
        dispatch: (action) => {
          console.warn('[ChickenHuntScene] No-op dispatch called with:', action);
        },
      };
      return;
    }

    const d = data as Partial<ChickenHuntLaunchData>;

    if (!d.runId || typeof d.dispatch !== 'function') {
      console.error('[ChickenHuntScene] init() received invalid launch data:', data);
    }

    this.launchData = {
      runId: d.runId ?? 'MISSING_RUN_ID',
      difficulty: d.difficulty ?? 1.0,
      dispatch: typeof d.dispatch === 'function'
        ? d.dispatch
        : (action) => console.warn('[ChickenHuntScene] No-op dispatch:', action),
    };
  }

  // =========================================================================
  // Phaser Lifecycle: preload
  // =========================================================================

  /**
   * Generate all arcade textures via arcadeSprites.ts.
   * generateAllArcadeTextures() is idempotent — it checks
   * scene.textures.exists() before creating anything.
   */
  preload(): void {
    generateAllArcadeTextures(this);
  }

  // =========================================================================
  // Phaser Lifecycle: create
  // =========================================================================

  /**
   * Build the initial scene: space background colour + parallax starfield.
   * Gameplay entities (ship, enemies, HUD, timer) are added in Phase 2.
   */
  create(): void {
    if (this.isShuttingDown) return;

    // PALETTE.spaceDeep = '#12172F'. Phaser requires an integer here, not a string.
    this.cameras.main.setBackgroundColor(0x12172f);

    this.buildStarfield();

    // Register the scene-level shutdown listener so cleanup always fires.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);

    // Register the scene-level pause/resume pair.
    this.events.on(Phaser.Scenes.Events.PAUSE, this.onPause, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
  }

  // =========================================================================
  // Phaser Lifecycle: update
  // =========================================================================

  /**
   * Called every frame by Phaser's game loop.
   * Phase 1 responsibility: scroll starfield layers.
   * Phases 2+ will add: timer countdown, ship movement, enemy AI, etc.
   */
  override update(_time: number, _delta: number): void {
    if (this.isShuttingDown) return;

    this.scrollStarfield(_delta);
  }

  // =========================================================================
  // Starfield
  // =========================================================================

  /**
   * Creates two TileSprite star layers from the procedurally generated
   * tileable textures.  Far layer scrolls slower for depth (parallax).
   */
  private buildStarfield(): void {
    const farLayer: StarLayer = {
      tileSprite: this.add.tileSprite(
        0, 0,          // position (top-left anchor)
        VIEW_W,        // width
        VIEW_H,        // height
        ARCADE_TEXTURE_KEYS.starfieldFar,
      ).setOrigin(0, 0),
      scrollSpeed: 10, // px/sec
    };

    const nearLayer: StarLayer = {
      tileSprite: this.add.tileSprite(
        0, 0,
        VIEW_W,
        VIEW_H,
        ARCADE_TEXTURE_KEYS.starfieldNear,
      ).setOrigin(0, 0),
      scrollSpeed: 25, // px/sec — faster = appears closer
    };

    this.starLayers = [farLayer, nearLayer];
  }

  /**
   * Scroll each star layer downward at its configured speed.
   * Using tilePositionY rather than moving the sprite keeps memory flat.
   *
   * @param delta - Frame delta from Phaser's update() in milliseconds.
   */
  private scrollStarfield(delta: number): void {
    const deltaSeconds = delta / 1000;
    for (const layer of this.starLayers) {
      layer.tileSprite.tilePositionY -= layer.scrollSpeed * deltaSeconds;
    }
  }

  // =========================================================================
  // Pause / Resume
  // =========================================================================

  /**
   * Called when this scene is paused (e.g. Esc or modal overlay from Dev A).
   * Phaser automatically suspends update() while paused; we pause physics
   * and timers here when they are added in Phase 2.
   */
  private onPause(): void {
    // Phase 2+: pause physics world, pause countdown timer.
    // No-op in Phase 1 — starfield naturally stops because update() halts.
  }

  /**
   * Called when the scene is resumed after a pause.
   * Must NOT re-register listeners already registered in create() or init().
   */
  private onResume(): void {
    // Phase 2+: resume physics world, resume countdown timer.
  }

  // =========================================================================
  // Shutdown & Cleanup
  // =========================================================================

  /**
   * Fires via the SHUTDOWN Phaser event (registered with `.once()` so it
   * never fires twice).  Cleans up everything owned by this scene so the
   * next scene.start() begins with a blank slate.
   */
  private onShutdown(): void {
    this.isShuttingDown = true;

    // Remove the pause/resume listeners to avoid stale callbacks.
    this.events.off(Phaser.Scenes.Events.PAUSE, this.onPause, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);

    // Destroy TileSprites explicitly (Phaser auto-destroys children, but
    // being explicit makes the lifecycle easier to audit in Phase 5).
    for (const layer of this.starLayers) {
      if (layer.tileSprite.active) layer.tileSprite.destroy();
    }
    this.starLayers = [];

    // Phase 2+: destroy physics groups, cancel Phaser.Time.TimerEvents,
    // remove keyboard listeners, destroy pool objects.
  }

  // =========================================================================
  // Mission result exit (guard — wired in Phase 3)
  // =========================================================================

  /**
   * Single exit point for every possible end-state.
   * Called from the timer, the Return-Early button, and the ship-death handler.
   * The `hasEmittedResult` flag guarantees exactly-once dispatch even if
   * multiple end-conditions race on the same frame.
   *
   * Phase 1 exposes this method signature so Phase 2/3 can call it.
   * It is NOT called anywhere in Phase 1.
   *
   * @param partial - Partial result fields; this method fills the invariants.
   */
  protected finishMission(partial: {
    success: boolean;
    returnedSafely: boolean;
    foodCollected: number;
    healthDamage: number;
    xpEarned: number;
    durationSeconds: number;
  }): void {
    if (this.hasEmittedResult || this.isShuttingDown) return;
    this.hasEmittedResult = true;

    const result: MissionResult = {
      runId: this.launchData.runId,
      missionType: 'chicken-hunt',
      success: partial.success,
      returnedSafely: partial.returnedSafely,
      collectedResources: { food: Math.max(0, Math.min(partial.foodCollected, 50)) },
      healthDamage: Math.max(0, Math.min(partial.healthDamage, 100)),
      xpEarned: Math.max(0, partial.xpEarned),
      duration: Math.max(0, partial.durationSeconds),
      educationalMessage:
        'Space chickens are fantasy! Real astronauts grow food using controlled-environment agriculture.',
    };

    this.launchData.dispatch({ type: 'COMPLETE_MISSION', result });

    // Hand control back to Dev A's coordinator (MoonBaseScene).
    // The coordinator must register its own listener for the transition.
    // Phase 3 will also trigger a visual transition here.
    this.scene.stop();
  }
}
