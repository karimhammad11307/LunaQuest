import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameSessionStore } from '../domain/store/GameSessionStore';
import { reduceGameState } from '../domain/rules/gameRules';
import { createInitialState } from '../domain/rules/survivalRules';
import { BALANCE } from '../game/config/balance';
import { LEGACY_SAVE_KEY, parseSave, recoverSavedState, SAVE_KEY, SAVE_VERSION, SaveService } from './SaveService';
import type { GameState, MissionResult } from '../domain/models/types';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
    values,
  };
}

function envelope(state: unknown, version = SAVE_VERSION): string {
  return JSON.stringify({ schemaVersion: version, savedAt: '2026-11-14T00:00:00.000Z', state });
}

afterEach(() => vi.useRealTimers());

describe('A11 browser save and recovery', () => {
  it('round trips resources, health, crop, shield, XP and mission ledgers without offline damage', () => {
    const storage = memoryStorage();
    const service = new SaveService(storage);
    const initial = createInitialState();
    const state: GameState = { ...initial, day: 3, daysSurvived: 2, xp: 35,
      resources: { food: 21, water: 29, oxygen: 40, energy: 50 },
      astronaut: { ...initial.astronaut, health: 63, suitOxygen: 22, thermalSafety: 37, radiationExposure: 11 },
      buildings: { ...initial.buildings, greenhouse: { ...initial.buildings.greenhouse, cropPlanted: true, cropGrowth: 1 },
        shield: { ...initial.buildings.shield, active: true, condition: 'good' } },
      completedMissionRunIds: ['run-one'], awardedRewardIds: ['reward-one'] };
    expect(service.save(state)).toBe(true);
    const loaded = service.load()!;
    expect(loaded.resources).toEqual(state.resources);
    expect(loaded.astronaut.health).toBe(63);
    expect(loaded.astronaut.suitOxygen).toBe(22);
    expect(loaded.astronaut.thermalSafety).toBe(37);
    expect(loaded.astronaut.radiationExposure).toBe(11);
    expect(loaded.buildings.greenhouse).toEqual(state.buildings.greenhouse);
    expect(loaded.buildings.shield).toEqual(state.buildings.shield);
    expect(loaded.completedMissionRunIds).toEqual(['run-one']);
    expect(loaded.collectedEarthSupplyIds).toEqual([]);
    expect(loaded.xp).toBe(35);
    expect(loaded.scene).toBe('moon-base');
    expect(loaded.astronaut.position).toEqual(initial.astronaut.position);
    expect(reduceGameState(initial, { type: 'LOAD_GAME', state: loaded })).toEqual(loaded);
  });

  it('rejects bad versions, corrupt JSON, missing fields, invalid numbers and malformed ledgers', () => {
    const initial = createInitialState();
    expect(parseSave(envelope(initial, 999))).toBeNull();
    expect(parseSave('{bad json')).toBeNull();
    expect(parseSave(envelope({ day: 2 }))).toBeNull();
    expect(parseSave(envelope({ ...initial, resources: { ...initial.resources, food: 101 } }))).toBeNull();
    expect(parseSave(envelope({ ...initial, astronaut: { ...initial.astronaut, health: -1 } }))).toBeNull();
    expect(parseSave(envelope({ ...initial, completedMissionRunIds: ['duplicate', 'duplicate'] }))).toBeNull();
    expect(parseSave(envelope({ ...initial, collectedEarthSupplyIds: ['unknown'] }))).toBeNull();
    expect(parseSave(JSON.stringify({ schemaVersion: SAVE_VERSION, savedAt: 'not-a-date', state: initial }))).toBeNull();
  });

  it('migrates a valid V1 save to V2 without erasing progress or creating collected cargo', () => {
    const storage = memoryStorage();
    const original = createInitialState();
    const legacy = { ...original, day: 3, daysSurvived: 2, xp: 24 };
    const { collectedEarthSupplyIds: _unused, ...v1State } = legacy;
    storage.values.set(LEGACY_SAVE_KEY, envelope(v1State, 1));
    const service = new SaveService(storage);
    const loaded = service.load()!;
    expect(loaded.day).toBe(3);
    expect(loaded.xp).toBe(24);
    expect(loaded.collectedEarthSupplyIds).toEqual([]);
    expect(service.save(loaded)).toBe(true);
    expect(storage.values.has(SAVE_KEY)).toBe(true);
    expect(storage.values.has(LEGACY_SAVE_KEY)).toBe(false);
  });

  it('keeps the game playable when storage is unavailable or quota writes fail', () => {
    const unavailable = new SaveService(null);
    expect(unavailable.load()).toBeNull();
    expect(unavailable.save(createInitialState())).toBe(false);
    const throwing = new SaveService({ getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => { throw new Error('blocked'); } });
    expect(throwing.load()).toBeNull();
    expect(throwing.save(createInitialState())).toBe(false);
    expect(() => throwing.clear()).not.toThrow();
  });

  it('saves meaningful actions promptly and coalesces high-frequency movement and ticks', () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    const service = new SaveService(storage);
    const store = new GameSessionStore();
    const detach = service.attach(store);
    store.dispatch({ type: 'MOVE_PLAYER', x: 401, y: 316 });
    store.dispatch({ type: 'MOVE_PLAYER', x: 402, y: 316 });
    store.dispatch({ type: 'TICK', deltaSeconds: 0.25 });
    expect(storage.setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4999);
    expect(storage.setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    store.dispatch({ type: 'COLLECT_RESOURCE', resource: 'food', amount: 2 });
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    detach();
    store.dispatch({ type: 'COLLECT_RESOURCE', resource: 'food', amount: 2 });
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });

  it('re-attaches without duplicate writes or stale cleanup removing the active listener', () => {
    const storage = memoryStorage();
    const service = new SaveService(storage);
    const store = new GameSessionStore();
    const staleDetach = service.attach(store);
    const activeDetach = service.attach(store);
    staleDetach();
    store.dispatch({ type: 'COLLECT_RESOURCE', resource: 'food', amount: 1 });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    activeDetach();
    store.dispatch({ type: 'COLLECT_RESOURCE', resource: 'food', amount: 1 });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('forfeits an interrupted mission run without rewards, and rejects replay after reload', () => {
    const storage = memoryStorage();
    const service = new SaveService(storage);
    const initial = createInitialState();
    const started = reduceGameState(initial, { type: 'START_MISSION', mission: 'chicken-hunt', runId: 'run-abandoned' });
    expect(started.activeMissionRunId).toBe('run-abandoned');
    expect(service.save(started)).toBe(true);
    const recovered = service.load()!;
    expect(recovered.scene).toBe('moon-base');
    expect(recovered.activeMission).toBeNull();
    expect(recovered.completedMissionRunIds).toContain('run-abandoned');
    expect(recovered.resources.food).toBe(initial.resources.food);
    const result: MissionResult = { runId: 'run-abandoned', missionType: 'chicken-hunt', success: true,
      returnedSafely: true, collectedResources: { food: 20 }, healthDamage: 0, xpEarned: 20,
      duration: 10, educationalMessage: 'Training result.' };
    expect(reduceGameState(recovered, { type: 'COMPLETE_MISSION', result })).toBe(recovered);
    expect(reduceGameState(recovered, { type: 'START_MISSION', mission: 'chicken-hunt', runId: 'run-abandoned' })).toBe(recovered);
  });

  it('preserves a completed mission ledger and prevents duplicate rewards across reload', () => {
    const service = new SaveService(memoryStorage());
    const initial = createInitialState();
    const started = reduceGameState(initial, { type: 'START_MISSION', mission: 'chicken-hunt', runId: 'run-done' });
    const result: MissionResult = { runId: 'run-done', missionType: 'chicken-hunt', success: true,
      returnedSafely: true, collectedResources: { food: 7 }, healthDamage: 0, xpEarned: 15,
      duration: 12, educationalMessage: 'Food is stored.' };
    const done = reduceGameState(started, { type: 'COMPLETE_MISSION', result });
    service.save(done);
    const loaded = service.load()!;
    expect(loaded.resources.food).toBe(initial.resources.food + 7);
    expect(loaded.xp).toBe(15);
    expect(reduceGameState(loaded, { type: 'COMPLETE_MISSION', result })).toBe(loaded);
  });

  it('restarts interrupted emergencies at warning without restoring HP or awarding XP', () => {
    const initial = createInitialState();
    const event = { id: BALANCE.emergencies.storm.id, type: 'solar-storm' as const,
      phase: 'danger' as const, remainingSeconds: 3, pulseSeconds: 0.8, tookDamage: true, ignored: true };
    const state: GameState = { ...initial, day: 2, daysSurvived: 1, xp: 10,
      astronaut: { ...initial.astronaut, health: 52, radiationExposure: 15 },
      activeEventId: event.id, activeEvent: event };
    const loaded = recoverSavedState(state);
    expect(loaded.activeEvent).toMatchObject({ id: event.id, phase: 'warning',
      remainingSeconds: BALANCE.emergencies.storm.warningSeconds, pulseSeconds: 0, tookDamage: true });
    expect(loaded.astronaut.health).toBe(52);
    expect(loaded.xp).toBe(10);
    expect(loaded.completedEventIds).toEqual([]);
    const service = new SaveService(memoryStorage());
    service.save(state);
    expect(service.load()?.activeEvent).toEqual(loaded.activeEvent);
  });

  it('does not retain an orphaned incident countdown in a terminal saved game', () => {
    const initial = createInitialState();
    const event = { id: BALANCE.emergencies.storm.id, type: 'solar-storm' as const,
      phase: 'danger' as const, remainingSeconds: 4, pulseSeconds: 0, tookDamage: true, ignored: true };
    const terminal: GameState = { ...initial, status: 'defeat', scene: 'result',
      astronaut: { ...initial.astronaut, health: 0 }, activeEventId: event.id, activeEvent: event };
    const recovered = recoverSavedState(terminal);
    expect(recovered.activeEvent).toBeNull();
    expect(recovered.activeEventId).toBeNull();
    expect(recovered.astronaut.health).toBe(0);
    expect(recovered.status).toBe('defeat');
  });

  it('new game and terminal restart replace saved XP, IDs and emergency state', () => {
    const storage = memoryStorage();
    const service = new SaveService(storage);
    const store = new GameSessionStore();
    const detach = service.attach(store);
    const initial = store.getState();
    const changed = { ...initial, xp: 50, completedMissionRunIds: ['old-run'],
      completedEventIds: [BALANCE.emergencies.storm.id], status: 'victory' as const, scene: 'result' as const,
      daysSurvived: BALANCE.dayLimit, day: BALANCE.dayLimit };
    store.dispatch({ type: 'LOAD_GAME', state: changed });
    expect(service.load()?.xp).toBe(50);
    store.dispatch({ type: 'RESTART_GAME' });
    expect(service.load()?.xp).toBe(0);
    expect(service.load()?.completedMissionRunIds).toEqual([]);
    expect(service.load()?.completedEventIds).toEqual([]);
    service.clear();
    expect(storage.values.has(SAVE_KEY)).toBe(false);
    detach();
  });
});
