import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from './survivalRules';
import { reduceGameState } from './gameRules';
import { GameSessionStore } from '../store/GameSessionStore';
import { MISSION_CONFIG } from '../../game/config/gameConfig';
import type { GameAction } from '../models/GameAction';
import type { MissionResult } from '../models/types';

const availableMissions = {
  ...MISSION_CONFIG,
  'chicken-hunt': { ...MISSION_CONFIG['chicken-hunt'], available: true },
};
const start: GameAction = { type: 'START_MISSION', mission: 'chicken-hunt', runId: 'run-1' };
const result: MissionResult = {
  runId: 'run-1', missionType: 'chicken-hunt', success: true, returnedSafely: true,
  collectedResources: { food: 18 }, healthDamage: 4, xpEarned: 20,
  duration: 35, educationalMessage: 'Food in space needs controlled production.',
};

describe('Feature 2 shared state rules', () => {
  it('starts with configured supplies, astronaut status, XP and empty mission ledger', () => {
    const state = createInitialState();
    expect(state.resources).toEqual({ food: 55, water: 65, oxygen: 80, energy: 75 });
    expect(state.astronaut.health).toBe(100);
    expect(state.xp).toBe(0);
    expect(state.awardedRewardIds).toEqual([]);
    expect(createInitialState()).toEqual(state);
    expect(state.activeMission).toBeNull();
    expect(state.missionProgress).toBeNull();
    expect(state.completedMissionRunIds).toEqual([]);
  });

  it('collects supplies immutably and clamps at 100', () => {
    const state = createInitialState();
    const next = reduceGameState(state, { type: 'COLLECT_RESOURCE', resource: 'food', amount: 12 });
    expect(next).not.toBe(state);
    expect(next.resources).not.toBe(state.resources);
    expect(next.resources.food).toBe(67);
    expect(state.resources.food).toBe(55);
    expect(reduceGameState(next, { type: 'COLLECT_RESOURCE', resource: 'food', amount: 50 }).resources.food).toBe(100);
  });

  it('spends multiple resources atomically and rejects shortages', () => {
    const state = createInitialState();
    const rejected = reduceGameState(state, { type: 'SPEND_RESOURCES', costs: { food: 8, water: 80 } });
    expect(rejected).toBe(state);
    expect(state.resources.food).toBe(55);
    const next = reduceGameState(state, { type: 'SPEND_RESOURCES', costs: { food: 8, water: 10 } });
    expect(next.resources).toEqual({ food: 47, water: 55, oxygen: 80, energy: 75 });
  });

  it('rejects negative, zero, excessive, unknown and nonfinite resource changes', () => {
    const state = createInitialState();
    const actions = [
      { type: 'COLLECT_RESOURCE', resource: 'water', amount: -1 },
      { type: 'COLLECT_RESOURCE', resource: 'water', amount: 0 },
      { type: 'COLLECT_RESOURCE', resource: 'water', amount: Number.NaN },
      { type: 'COLLECT_RESOURCE', resource: 'water', amount: 101 },
      { type: 'COLLECT_RESOURCE', resource: 'cookies', amount: 1 },
      { type: 'SPEND_RESOURCES', costs: { energy: -1 } },
      { type: 'SPEND_RESOURCES', costs: { energy: Number.POSITIVE_INFINITY } },
      { type: 'SPEND_RESOURCES', costs: { food: 2, cookies: 2 } },
      { type: 'SPEND_RESOURCES', costs: {} },
    ];
    for (const action of actions) expect(reduceGameState(state, action as GameAction)).toBe(state);
  });

  it('awards XP and updates astronaut status only with valid amounts', () => {
    const state = createInitialState();
    const earned = reduceGameState(state, { type: 'ADD_XP', amount: 15, rewardId: 'tutorial-1' });
    expect(earned.xp).toBe(15);
    expect(earned.awardedRewardIds).toEqual(['tutorial-1']);
    expect(state.xp).toBe(0);
    expect(reduceGameState(earned, { type: 'ADD_XP', amount: 15, rewardId: 'tutorial-1' })).toBe(earned);
    expect(reduceGameState(earned, { type: 'ADD_XP', amount: -1, rewardId: 'bad-1' })).toBe(earned);
    expect(reduceGameState(earned, { type: 'ADD_XP', amount: 1.5, rewardId: 'bad-2' })).toBe(earned);
    const updated = reduceGameState(earned, { type: 'UPDATE_ASTRONAUT', changes: { suitOxygen: 60, health: 92 } });
    expect(updated.astronaut.suitOxygen).toBe(60);
    expect(updated.astronaut.health).toBe(92);
    expect(reduceGameState(updated, { type: 'UPDATE_ASTRONAUT', changes: { health: 120 } })).toBe(updated);
  });

  it('rejects launches while mission scenes are unavailable or energy is insufficient', () => {
    const state = createInitialState();
    expect(reduceGameState(state, start)).toBe(state);
    const poor = { ...state, resources: { ...state.resources, energy: 5 } };
    expect(reduceGameState(poor, start, availableMissions)).toBe(poor);
    expect(reduceGameState(state, { ...start, runId: '../bad' }, availableMissions)).toBe(state);
  });

  it('starts a mission, charges energy once, and tracks provisional progress', () => {
    const state = createInitialState();
    const launched = reduceGameState(state, start, availableMissions);
    expect(launched.resources.energy).toBe(69);
    expect(state.resources.energy).toBe(75);
    expect(launched.activeMissionRunId).toBe('run-1');
    expect(launched.scene).toBe('chicken-hunt');
    expect(reduceGameState(launched, start, availableMissions)).toBe(launched);
    expect(reduceGameState(launched, { type: 'COLLECT_RESOURCE', resource: 'food', amount: 10 }, availableMissions)).toBe(launched);
    const progress = reduceGameState(launched, { type: 'UPDATE_MISSION_PROGRESS', runId: 'run-1', elapsedSeconds: 8, collectedResources: { food: 6 } }, availableMissions);
    expect(progress.missionProgress).toEqual({ runId: 'run-1', missionType: 'chicken-hunt', elapsedSeconds: 8, collectedResources: { food: 6 } });
    expect(progress.resources.food).toBe(55);
    expect(reduceGameState(progress, { type: 'UPDATE_MISSION_PROGRESS', runId: 'run-1', elapsedSeconds: 7, collectedResources: { food: 6 } }, availableMissions)).toBe(progress);
  });

  it('applies mission rewards and damage exactly once', () => {
    const state = createInitialState();
    const launched = reduceGameState(state, start, availableMissions);
    const completed = reduceGameState(launched, { type: 'COMPLETE_MISSION', result }, availableMissions);
    expect(completed.resources.food).toBe(73);
    expect(completed.resources.energy).toBe(69);
    expect(completed.astronaut.health).toBe(96);
    expect(completed.xp).toBe(20);
    expect(completed.completedMissionRunIds).toEqual(['run-1']);
    expect(completed.lastMissionResult?.runId).toBe('run-1');
    expect(completed.activeMission).toBeNull();
    expect(completed.missionProgress).toBeNull();
    expect(completed.scene).toBe('moon-base');
    expect(reduceGameState(completed, { type: 'COMPLETE_MISSION', result }, availableMissions)).toBe(completed);
    expect(reduceGameState(completed, start, availableMissions)).toBe(completed);
  });

  it('gives no supplies or XP for a failed or unsafe return, but applies damage', () => {
    const launched = reduceGameState(createInitialState(), start, availableMissions);
    const failed = reduceGameState(launched, { type: 'COMPLETE_MISSION', result: { ...result, success: false, returnedSafely: false } }, availableMissions);
    expect(failed.resources.food).toBe(55);
    expect(failed.xp).toBe(0);
    expect(failed.astronaut.health).toBe(96);
    expect(failed.lastMissionResult?.collectedResources).toEqual({});
    expect(failed.completedMissionRunIds).toEqual(['run-1']);
    const zero = reduceGameState(reduceGameState(createInitialState(), start, availableMissions), {
      type: 'COMPLETE_MISSION', result: { ...result, collectedResources: {}, xpEarned: 0, healthDamage: 0 },
    }, availableMissions);
    expect(zero.resources.food).toBe(55);
    expect(zero.xp).toBe(0);
  });

  it('rejects mismatched and malformed mission results without partial changes', () => {
    const launched = reduceGameState(createInitialState(), start, availableMissions);
    const bad = [
      { ...result, runId: 'run-other' },
      { ...result, missionType: 'ice-collection' },
      { ...result, collectedResources: { water: -1 } },
      { ...result, collectedResources: { food: 5, cookies: 2 } },
      { ...result, healthDamage: Number.NaN },
      { ...result, xpEarned: 1000 },
      { ...result, duration: -1 },
      { ...result, educationalMessage: '' },
    ];
    for (const value of bad) expect(reduceGameState(launched, { type: 'COMPLETE_MISSION', result: value as MissionResult }, availableMissions)).toBe(launched);
  });

  it('ignores unsupported actions and invalid loaded state', () => {
    const state = createInitialState();
    expect(reduceGameState(state, { type: 'SOMETHING_ELSE' } as unknown as GameAction)).toBe(state);
    expect(reduceGameState(state, { type: 'LOAD_GAME', state: { resources: { food: -10 } } as never })).toBe(state);
    expect(reduceGameState(state, { type: 'ADVANCE_DAY' })).toBe(state);
  });

  it('notifies subscribers only after accepted changes and unsubscribes cleanly', () => {
    const store = new GameSessionStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const original = store.getState();
    expect(store.dispatch({ type: 'SPEND_RESOURCES', costs: { food: 999 } })).toBe(original);
    expect(listener).not.toHaveBeenCalled();
    store.dispatch({ type: 'COLLECT_RESOURCE', resource: 'water', amount: 5 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(store.getState());
    unsubscribe();
    store.dispatch({ type: 'ADD_XP', amount: 3, rewardId: 'bonus-1' });
    expect(listener).toHaveBeenCalledTimes(1);
    store.destroy();
    const before = store.getState();
    expect(store.dispatch({ type: 'ADD_XP', amount: 3, rewardId: 'bonus-2' })).toBe(before);
    expect(store.subscribe(listener)).toBeTypeOf('function');
  });
});
