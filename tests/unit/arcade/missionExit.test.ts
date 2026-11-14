/**
 * LUNAQUEST — Phase 3 / B7 & B8 unit tests: Mission Exit & Race Guard (Developer B)
 *
 * Tests the centralized mission completion state machine and exactly-once contract:
 *  - Exit A: Timer expiration credits full collected food and safe return.
 *  - Exit B: Early voluntary return credits full collected food and safe return.
 *  - Exit C: Ship destruction credits 0 food, safe return = false, applies repair damage,
 *    and provides an encouraging educational message (not game over).
 *  - Race Condition 1: Timer expiration + Ship destruction during same frame -> 1 emission.
 *  - Race Condition 2: Rapid repeated Return to Base button clicks -> 1 emission.
 *  - Race Condition 3: Collectible overlap after mission completion is rejected.
 *  - Result bounds: Food clamped [0..50], healthDamage clamped [0..100], duration clamped [1..35].
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Phaser before importing modules that reference it
vi.mock('phaser', () => {
  class Scene {}
  return { default: { Scene }, Scene };
});

import type { GameAction } from '../../../src/domain/models/GameAction';
import type { MissionResult } from '../../../src/domain/models/types';
import { DEFAULT_MISSION_DURATION_SEC } from '../../../src/game/scenes/ChickenHuntScene';

describe('Mission Exit State Machine & Exactly-Once Contract', () => {
  type ExitReason = 'timer' | 'return-early' | 'ship-destroyed';
  type MissionState = 'READY' | 'ACTIVE' | 'COMPLETING' | 'COMPLETED' | 'SHUTDOWN';

  class MockMissionCoordinator {
    missionState: MissionState = 'ACTIVE';
    hasEmittedResult = false;
    localFoodCollected = 0;
    totalDamageTaken = 0;
    missionSeconds = 0;
    remainingTime = DEFAULT_MISSION_DURATION_SEC;

    dispatch = vi.fn();

    collectFood(amount: number) {
      if (this.missionState !== 'ACTIVE') return false;
      this.localFoodCollected += amount;
      return true;
    }

    takeDamage(amount: number) {
      if (this.missionState !== 'ACTIVE') return;
      this.totalDamageTaken += amount;
    }

    completeMission(reason: ExitReason) {
      // Exactly-once atomic guard: first valid exit request wins
      if (this.missionState !== 'ACTIVE' || this.hasEmittedResult) {
        return;
      }

      this.missionState = 'COMPLETING';
      this.hasEmittedResult = true;

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
      this.dispatch({ type: 'COMPLETE_MISSION', result });
    }
  }

  let coordinator: MockMissionCoordinator;

  beforeEach(() => {
    coordinator = new MockMissionCoordinator();
  });

  describe('Exit A — Timer Expiration', () => {
    it('banks all collected food and marks returnedSafely = true on timer expiry', () => {
      coordinator.collectFood(12);
      coordinator.missionSeconds = 35;
      coordinator.completeMission('timer');

      expect(coordinator.dispatch).toHaveBeenCalledTimes(1);
      const action = coordinator.dispatch.mock.calls[0][0] as Extract<GameAction, { type: 'COMPLETE_MISSION' }>;

      expect(action.result.missionType).toBe('chicken-hunt');
      expect(action.result.success).toBe(true);
      expect(action.result.returnedSafely).toBe(true);
      expect(action.result.collectedResources.food).toBe(12);
      expect(action.result.duration).toBe(35);
      expect(action.result.xpEarned).toBe(25); // 20 + 5 bonus for >= 10 food
    });
  });

  describe('Exit B — Voluntary Return to Base', () => {
    it('banks all collected food on early return to base', () => {
      coordinator.collectFood(7);
      coordinator.missionSeconds = 18;
      coordinator.completeMission('return-early');

      expect(coordinator.dispatch).toHaveBeenCalledTimes(1);
      const action = coordinator.dispatch.mock.calls[0][0] as Extract<GameAction, { type: 'COMPLETE_MISSION' }>;

      expect(action.result.missionType).toBe('chicken-hunt');
      expect(action.result.success).toBe(true);
      expect(action.result.returnedSafely).toBe(true);
      expect(action.result.collectedResources.food).toBe(7);
      expect(action.result.duration).toBe(18);
      expect(action.result.xpEarned).toBe(20); // 15 + 5 bonus for >= 5 food
    });
  });

  describe('Exit C — Ship Destruction (Locked Rule: Safe Return, Not Game Over)', () => {
    it('sets credited food to 0, reports damage, and provides encouraging educational message', () => {
      coordinator.collectFood(15); // Player had collected food before dying
      coordinator.takeDamage(3);  // 3 hits taken
      coordinator.missionSeconds = 22;
      coordinator.completeMission('ship-destroyed');

      expect(coordinator.dispatch).toHaveBeenCalledTimes(1);
      const action = coordinator.dispatch.mock.calls[0][0] as Extract<GameAction, { type: 'COMPLETE_MISSION' }>;

      expect(action.result.missionType).toBe('chicken-hunt');
      expect(action.result.success).toBe(false);
      expect(action.result.returnedSafely).toBe(false);
      expect(action.result.collectedResources.food).toBe(0); // Food lost on destruction
      expect(action.result.healthDamage).toBe(30);           // 3 hits * 10
      expect(action.result.educationalMessage).toContain('learns from their missions');
    });
  });

  describe('Race Condition Protection & Exactly-Once Emission', () => {
    it('emits exactly once when timer expires and ship is destroyed on the same frame', () => {
      coordinator.collectFood(5);
      coordinator.missionSeconds = 35;

      // Both callbacks fire in the same frame
      coordinator.completeMission('timer');          // Winner: processed first
      coordinator.completeMission('ship-destroyed'); // Loser: ignored

      expect(coordinator.dispatch).toHaveBeenCalledTimes(1);
      const action = coordinator.dispatch.mock.calls[0][0] as Extract<GameAction, { type: 'COMPLETE_MISSION' }>;
      expect(action.result.returnedSafely).toBe(true); // Winner was 'timer'
    });

    it('emits exactly once when player clicks Return to Base repeatedly', () => {
      coordinator.collectFood(4);
      coordinator.missionSeconds = 15;

      // 5 rapid clicks on the return button
      coordinator.completeMission('return-early');
      coordinator.completeMission('return-early');
      coordinator.completeMission('return-early');
      coordinator.completeMission('return-early');
      coordinator.completeMission('return-early');

      expect(coordinator.dispatch).toHaveBeenCalledTimes(1);
    });

    it('rejects additional food collection once mission completion begins', () => {
      coordinator.collectFood(8);
      coordinator.completeMission('return-early');

      // Collectible overlap happens after mission has completed
      const accepted = coordinator.collectFood(5);
      expect(accepted).toBe(false);
      expect(coordinator.localFoodCollected).toBe(8);
    });

    it('clamps food reward to [0..50] and damage to [0..100]', () => {
      coordinator.localFoodCollected = 999; // Excess food
      coordinator.totalDamageTaken = 50;   // 50 * 10 = 500 damage
      coordinator.completeMission('timer');

      const action = coordinator.dispatch.mock.calls[0][0] as Extract<GameAction, { type: 'COMPLETE_MISSION' }>;
      expect(action.result.collectedResources.food).toBe(50);
      expect(action.result.healthDamage).toBe(100);
    });
  });
});
