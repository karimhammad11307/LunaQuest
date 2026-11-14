import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../game/config/balance';
import { BUILDING_EXIT_POINTS } from '../../game/config/gameConfig';
import { parseSave, SAVE_VERSION, SaveService } from '../../services/SaveService';
import type { GameAction } from '../models/GameAction';
import type { GameState } from '../models/types';
import { reduceGameState, validLoadedState } from './gameRules';
import { triggerEmergency } from './eventRules';
import { createInitialState } from './survivalRules';

const act = (state: GameState, action: GameAction) => reduceGameState(state, action);
const enter = (state: GameState, id: 'habitat' | 'greenhouse' | 'shield') => {
  const selected = act(state, { type: 'INTERACT_BUILDING', buildingId: id });
  return act(selected, { type: id === 'habitat' ? 'ENTER_HABITAT' : id === 'greenhouse' ? 'ENTER_GREENHOUSE' : 'ENTER_SHELTER' });
};
const seconds = (state: GameState, count: number) => {
  let next = state;
  for (let i = 0; i < count; i++) next = act(next, { type: 'TICK', deltaSeconds: 1 });
  return next;
};

describe('Feature 11 enclosed buildings and oxygen recycling', () => {
  it('enters Habitat, Greenhouse and Shelter, freezes suit drain, and exits at safe points', () => {
    for (const [id, location, leave, exit] of [
      ['habitat', 'habitat', 'LEAVE_HABITAT', BUILDING_EXIT_POINTS.habitat],
      ['greenhouse', 'greenhouse', 'LEAVE_GREENHOUSE', BUILDING_EXIT_POINTS.greenhouse],
      ['shield', 'shelter', 'LEAVE_SHELTER', BUILDING_EXIT_POINTS.shelter],
    ] as const) {
      const inside = enter(createInitialState(), id);
      expect(inside.astronaut.location).toBe(location);
      expect(inside.selectedBuildingId).toBe(id);
      expect(act(inside, { type: 'CLOSE_BUILDING' })).toBe(inside);
      expect(seconds(inside, 2).astronaut.suitOxygen).toBe(inside.astronaut.suitOxygen);
      const outside = act(inside, { type: leave });
      expect(outside.astronaut.location).toBe('outside');
      expect(outside.astronaut.position).toEqual(exit);
      expect(outside.selectedBuildingId).toBeNull();
      expect(act(outside, { type: leave })).toBe(outside);
      expect(seconds(outside, 2).astronaut.suitOxygen).toBeLessThan(outside.astronaut.suitOxygen);
    }
  });

  it('recovers up to 15 oxygen for 8 Energy once per day, with no repeat exploit', () => {
    const inside = enter(createInitialState(), 'habitat');
    const recycled = act(inside, { type: 'RECYCLE_OXYGEN' });
    expect(recycled.resources).toMatchObject({ oxygen: 95, energy: 67 });
    expect(recycled.lastOxygenRecycleDay).toBe(1);
    expect(act(recycled, { type: 'RECYCLE_OXYGEN' })).toBe(recycled);
    const day2 = act(recycled, { type: 'ADVANCE_DAY' });
    const second = act(day2, { type: 'RECYCLE_OXYGEN' });
    expect(second.resources.oxygen).toBe(100);
    expect(second.resources.energy).toBe(day2.resources.energy - 8);
    expect(second.lastOxygenRecycleDay).toBe(2);
    expect(act(second, { type: 'RECYCLE_OXYGEN' })).toBe(second);
    const restart = act(second, { type: 'RESTART_GAME' });
    expect(restart.lastOxygenRecycleDay).toBe(0);
    expect(restart.resources.oxygen).toBe(BALANCE.start.oxygen);
  });

  it('rejects insufficient Energy, damaged Habitat, outdoor use and full tank atomically', () => {
    const inside = enter(createInitialState(), 'habitat');
    const cases = [
      { ...inside, resources: { ...inside.resources, energy: 7 } },
      { ...inside, resources: { ...inside.resources, oxygen: 100 } },
      { ...inside, buildings: { ...inside.buildings, habitat: { ...inside.buildings.habitat, condition: 'damaged' as const } } },
      act(inside, { type: 'LEAVE_HABITAT' }),
    ];
    for (const candidate of cases) expect(act(candidate, { type: 'RECYCLE_OXYGEN' })).toBe(candidate);
  });

  it('saves recycle cooldown and migrates valid v3 progress to the v4 schema', () => {
    const storage = new Map<string, string>();
    const port = { getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); } };
    const save = new SaveService(port);
    const recycled = act(enter(createInitialState(), 'habitat'), { type: 'RECYCLE_OXYGEN' });
    expect(save.save(recycled)).toBe(true);
    const loaded = save.load()!;
    expect(loaded.lastOxygenRecycleDay).toBe(1);
    expect(loaded.resources).toEqual(recycled.resources);
    const again = enter(loaded, 'habitat');
    expect(act(again, { type: 'RECYCLE_OXYGEN' })).toBe(again);
    const old = { ...recycled } as Partial<GameState>;
    delete old.lastOxygenRecycleDay;
    delete old.pendingEventIds;
    const migrated = parseSave(JSON.stringify({ schemaVersion: 3, savedAt: new Date().toISOString(), state: old }));
    expect(migrated?.lastOxygenRecycleDay).toBe(0);
    expect(migrated?.pendingEventIds).toEqual([]);
    expect(SAVE_VERSION).toBe(4);
  });
});

describe('Feature 11 recurring solar storms', () => {
  it('runs one storm on Day 2 and every later completed-day transition', () => {
    let state = act(enter(createInitialState(), 'habitat'), { type: 'ADVANCE_DAY' });
    expect(state.activeEvent?.id).toBe('solar-day-2');
    expect(state.activeEvent?.remainingSeconds).toBe(BALANCE.emergencies.storm.warningSeconds);
    state = seconds(state, 36);
    expect(state.completedEventIds).toContain('solar-day-2');
    expect(state.activeEvent).toBeNull();
    state = act(state, { type: 'ADVANCE_DAY' });
    expect(state.activeEvent?.type).toBe('oxygen-leak');
    expect(state.pendingEventIds).toEqual(['solar-day-3']);
    state = act(state, { type: 'REPAIR_BUILDING', buildingId: 'habitat' });
    expect(state.activeEvent?.id).toBe('solar-day-3');
    expect(state.activeEvent?.phase).toBe('warning');
    state = seconds(state, 36);
    expect(state.completedEventIds).toContain('solar-day-3');
    state = act(state, { type: 'ADVANCE_DAY' });
    expect(state.activeEvent?.id).toBe('solar-day-4');
    expect(triggerEmergency(state)).toBe(state);
    expect(state.completedEventIds.filter((id) => id === 'solar-day-3')).toHaveLength(1);
  });

  it('queues a due storm behind an active leak and persists it without duplicate warning or XP', () => {
    const start = act(enter(createInitialState(), 'habitat'), { type: 'ADVANCE_DAY' });
    const afterStorm = seconds(start, 36);
    const leak = act(afterStorm, { type: 'ADVANCE_DAY' });
    const synthetic = { ...leak, pendingEventIds: [] };
    const queued = triggerEmergency(synthetic);
    expect(queued.activeEvent?.id).toBe(BALANCE.emergencies.leak.id);
    expect(queued.pendingEventIds).toEqual(['solar-day-3']);
    expect(triggerEmergency(queued)).toBe(queued);
    expect(validLoadedState(queued)).toBe(true);
    const parsed = parseSave(JSON.stringify({ schemaVersion: SAVE_VERSION, savedAt: new Date().toISOString(), state: queued }))!;
    expect(parsed.pendingEventIds).toEqual(['solar-day-3']);
    expect(parsed.activeEvent?.id).toBe(BALANCE.emergencies.leak.id);
    expect(parsed.activeEvent?.phase).toBe('warning');
    const cleared = act(act(parsed, { type: 'INTERACT_BUILDING', buildingId: 'habitat' }),
      { type: 'REPAIR_BUILDING', buildingId: 'habitat' });
    expect(cleared.activeEvent?.id).toBe('solar-day-3');
    expect(cleared.pendingEventIds).toEqual([]);
    expect(cleared.xp).toBe(BALANCE.emergencies.leak.repairXp);
    expect(act(cleared, { type: 'REPAIR_BUILDING', buildingId: 'habitat' })).toBe(cleared);
    const paused = act(cleared, { type: 'SET_PAUSED', paused: true });
    expect(act(paused, { type: 'TICK', deltaSeconds: 5 })).toBe(paused);
  });
});
