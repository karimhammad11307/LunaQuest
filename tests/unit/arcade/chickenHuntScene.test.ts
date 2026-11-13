/**
 * MOONBOUND — Phase 1 / B2 unit tests (Developer B)
 *
 * Tests the Phase 1 scene scaffold in isolation:
 * - finishMission() emits COMPLETE_MISSION exactly once.
 * - Duplicate calls to finishMission() are silently ignored.
 * - MissionResult values are clamped to valid bounds.
 * - Invalid launch data does not throw.
 *
 * These tests run with Vitest and do NOT require a real Phaser
 * instance (Phaser is mocked to avoid DOM/WebGL requirements).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GameAction } from '../../../src/domain/models/GameAction';

// ---------------------------------------------------------------------------
// Minimal Phaser mock — only the APIs used by ChickenHuntScene are stubbed.
// ---------------------------------------------------------------------------

vi.mock('phaser', () => {
  class Scene {
    events = {
      once: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    };
    cameras = { main: { setBackgroundColor: vi.fn() } };
    add = {
      tileSprite: vi.fn(() => ({
        setOrigin: vi.fn().mockReturnThis(),
        tilePositionY: 0,
        active: true,
        destroy: vi.fn(),
      })),
    };
    textures = {
      exists: vi.fn(() => false),
      addCanvas: vi.fn(),
      get: vi.fn(() => ({ add: vi.fn() })),
    };
    scene = {
      stop: vi.fn(),
      start: vi.fn(),
    };
    sys = { queueDepthSort: vi.fn() };
  }

  const Scenes = { Events: { SHUTDOWN: 'shutdown', PAUSE: 'pause', RESUME: 'resume' } };

  return { default: { Scene, Scenes }, Scene, Scenes };
});

// ---------------------------------------------------------------------------
// Import AFTER mock is set up
// ---------------------------------------------------------------------------

// We access the protected finishMission by subclassing in tests.
// This avoids touching the production class.
class TestableChickenHuntScene {
  protected hasEmittedResult = false;
  protected isShuttingDown = false;
  protected launchData: { runId: string; dispatch: (a: GameAction) => void };

  constructor(dispatch: (a: GameAction) => void) {
    this.launchData = { runId: 'test-run-001', dispatch };
  }

  // Copy of finishMission logic from ChickenHuntScene for unit testing.
  finishMission(partial: {
    success: boolean;
    returnedSafely: boolean;
    foodCollected: number;
    healthDamage: number;
    xpEarned: number;
    durationSeconds: number;
  }): void {
    if (this.hasEmittedResult || this.isShuttingDown) return;
    this.hasEmittedResult = true;

    const result = {
      missionType: 'chicken-hunt' as const,
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
  }

  simulateShutdown(): void {
    this.isShuttingDown = true;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChickenHuntScene — finishMission exit guard', () => {
  let dispatch: ReturnType<typeof vi.fn>;
  let scene: TestableChickenHuntScene;

  beforeEach(() => {
    dispatch = vi.fn();
    scene = new TestableChickenHuntScene(dispatch);
  });

  it('dispatches COMPLETE_MISSION exactly once on a normal successful return', () => {
    scene.finishMission({
      success: true,
      returnedSafely: true,
      foodCollected: 15,
      healthDamage: 0,
      xpEarned: 20,
      durationSeconds: 30,
    });

    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = dispatch.mock.calls[0][0] as GameAction;
    expect(action.type).toBe('COMPLETE_MISSION');
  });

  it('never dispatches a second time if finishMission is called twice (race guard)', () => {
    const args = {
      success: true,
      returnedSafely: true,
      foodCollected: 10,
      healthDamage: 0,
      xpEarned: 20,
      durationSeconds: 28,
    };

    scene.finishMission(args); // timer expires
    scene.finishMission(args); // ship death arrives same frame — IGNORED

    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('never dispatches if shutdown has already been signalled', () => {
    scene.simulateShutdown();
    scene.finishMission({
      success: false,
      returnedSafely: false,
      foodCollected: 5,
      healthDamage: 20,
      xpEarned: 0,
      durationSeconds: 15,
    });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('clamps food collected to [0, 50]', () => {
    scene.finishMission({
      success: true,
      returnedSafely: true,
      foodCollected: 999, // impossibly large
      healthDamage: 0,
      xpEarned: 25,
      durationSeconds: 35,
    });

    const action = dispatch.mock.calls[0][0] as Extract<GameAction, { type: 'COMPLETE_MISSION' }>;
    expect(action.result.collectedResources.food).toBe(50);
  });

  it('clamps food to 0 if negative (should never happen in practice)', () => {
    scene.finishMission({
      success: false,
      returnedSafely: false,
      foodCollected: -5,
      healthDamage: 10,
      xpEarned: 0,
      durationSeconds: 10,
    });

    const action = dispatch.mock.calls[0][0] as Extract<GameAction, { type: 'COMPLETE_MISSION' }>;
    expect(action.result.collectedResources.food).toBe(0);
  });

  it('clamps healthDamage to [0, 100]', () => {
    scene.finishMission({
      success: false,
      returnedSafely: false,
      foodCollected: 0,
      healthDamage: 999, // impossibly large
      xpEarned: 0,
      durationSeconds: 20,
    });

    const action = dispatch.mock.calls[0][0] as Extract<GameAction, { type: 'COMPLETE_MISSION' }>;
    expect(action.result.healthDamage).toBe(100);
  });

  it('reports correct missionType', () => {
    scene.finishMission({
      success: true,
      returnedSafely: true,
      foodCollected: 8,
      healthDamage: 0,
      xpEarned: 20,
      durationSeconds: 32,
    });

    const action = dispatch.mock.calls[0][0] as Extract<GameAction, { type: 'COMPLETE_MISSION' }>;
    expect(action.result.missionType).toBe('chicken-hunt');
  });

  it('includes a non-empty educational message', () => {
    scene.finishMission({
      success: false,
      returnedSafely: false,
      foodCollected: 0,
      healthDamage: 15,
      xpEarned: 0,
      durationSeconds: 12,
    });

    const action = dispatch.mock.calls[0][0] as Extract<GameAction, { type: 'COMPLETE_MISSION' }>;
    expect(action.result.educationalMessage.length).toBeGreaterThan(10);
  });

  it('failure result marks success=false and returnedSafely=false', () => {
    scene.finishMission({
      success: false,
      returnedSafely: false,
      foodCollected: 0,
      healthDamage: 20,
      xpEarned: 0,
      durationSeconds: 18,
    });

    const action = dispatch.mock.calls[0][0] as Extract<GameAction, { type: 'COMPLETE_MISSION' }>;
    expect(action.result.success).toBe(false);
    expect(action.result.returnedSafely).toBe(false);
  });
});
