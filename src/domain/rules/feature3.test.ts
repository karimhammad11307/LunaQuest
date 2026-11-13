import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../game/config/balance';
import { MISSION_CONFIG } from '../../game/config/gameConfig';
import { reduceGameState } from './gameRules';
import { advanceSurvivalDay, createInitialState } from './survivalRules';
import type { GameState, MissionResult } from '../models/types';

const habitat = (state: GameState = createInitialState()) => reduceGameState(
  reduceGameState(state, { type: 'INTERACT_BUILDING', buildingId: 'habitat' }),
  { type: 'ENTER_HABITAT' },
);
const shelter = (state: GameState = createInitialState()) => reduceGameState(
  reduceGameState(state, { type: 'INTERACT_BUILDING', buildingId: 'shield' }),
  { type: 'ENTER_SHELTER' },
);

const availableMissions = { ...MISSION_CONFIG, 'chicken-hunt': { ...MISSION_CONFIG['chicken-hunt'], available: true } };
const mission: MissionResult = {
  runId: 'food-run', missionType: 'chicken-hunt', success: true, returnedSafely: true,
  collectedResources: { food: 18 }, healthDamage: 0, xpEarned: 20, duration: 30,
  educationalMessage: 'Supplies must be brought back to base.',
};

describe('Feature 3 survival and building actions', () => {
  it('enters and leaves habitat or shelter only through selected building', () => {
    const start = createInitialState();
    expect(reduceGameState(start, { type: 'ENTER_HABITAT' })).toBe(start);
    const home = habitat(start);
    expect(home.astronaut.location).toBe('habitat');
    expect(reduceGameState(home, { type: 'MOVE_PLAYER', x: 100, y: 100 })).toBe(home);
    expect(reduceGameState(home, { type: 'INTERACT_BUILDING', buildingId: 'shield' })).toBe(home);
    const outside = reduceGameState(home, { type: 'LEAVE_HABITAT' });
    expect(outside.astronaut.location).toBe('outside');
    const safe = shelter(outside);
    expect(safe.astronaut.location).toBe('shelter');
    expect(reduceGameState(safe, { type: 'LEAVE_SHELTER' }).astronaut.location).toBe('outside');
  });

  it('eats stored food to heal, caps HP and rejects shortages or full health', () => {
    const hurt = habitat({ ...createInitialState(), astronaut: { ...createInitialState().astronaut, health: 40 } });
    const fed = reduceGameState(hurt, { type: 'EAT_FOOD' });
    expect(fed.resources.food).toBe(hurt.resources.food - BALANCE.habitat.eatFoodCost);
    expect(fed.astronaut.health).toBe(60);
    expect(hurt.astronaut.health).toBe(40);
    const nearlyWell = { ...fed, astronaut: { ...fed.astronaut, health: 95 } };
    expect(reduceGameState(nearlyWell, { type: 'EAT_FOOD' }).astronaut.health).toBe(100);
    const full = { ...fed, astronaut: { ...fed.astronaut, health: 100 } };
    expect(reduceGameState(full, { type: 'EAT_FOOD' })).toBe(full);
    const hungry = { ...fed, resources: { ...fed.resources, food: 9 } };
    expect(reduceGameState(hungry, { type: 'EAT_FOOD' })).toBe(hungry);
  });

  it('transfers base oxygen into suit without creating oxygen and stops suit drain indoors', () => {
    const outside = { ...createInitialState(), astronaut: { ...createInitialState().astronaut, suitOxygen: 40 } };
    const home = habitat(outside);
    const indoors = reduceGameState(home, { type: 'TICK', deltaSeconds: 5 });
    expect(indoors.astronaut.suitOxygen).toBe(home.astronaut.suitOxygen);
    expect(indoors.astronaut.health).toBeCloseTo(home.astronaut.health - BALANCE.health.passivePerSecond * 5);
    const refilled = reduceGameState(home, { type: 'REFILL_SUIT_OXYGEN' });
    expect(refilled.astronaut.suitOxygen).toBe(100);
    expect(refilled.resources.oxygen).toBeCloseTo(home.resources.oxygen - 60 * BALANCE.habitat.transferRatio);
    expect(reduceGameState(refilled, { type: 'REFILL_SUIT_OXYGEN' })).toBe(refilled);
    const lowBase = { ...home, resources: { ...home.resources, oxygen: 7 } };
    const partial = reduceGameState(lowBase, { type: 'REFILL_SUIT_OXYGEN' });
    expect(partial.resources.oxygen).toBe(0);
    expect(partial.astronaut.suitOxygen).toBeCloseTo(50);
    expect(reduceGameState({ ...home, resources: { ...home.resources, oxygen: 0 } }, { type: 'REFILL_SUIT_OXYGEN' }).resources.oxygen).toBe(0);
  });

  it('drains suit oxygen outdoors, warns and applies gradual damage at zero', () => {
    const start = { ...createInitialState(), astronaut: { ...createInitialState().astronaut, suitOxygen: 0.1, health: 10 } };
    const empty = reduceGameState(start, { type: 'TICK', deltaSeconds: 1 });
    expect(empty.astronaut.suitOxygen).toBe(0);
    expect(empty.astronaut.health).toBeCloseTo(8 - BALANCE.health.passivePerSecond);
    expect(empty.notices.at(-1)?.text).toContain('Suit oxygen empty');
    const hurt = reduceGameState(empty, { type: 'TICK', deltaSeconds: 1 });
    expect(hurt.astronaut.health).toBeCloseTo(6 - BALANCE.health.passivePerSecond * 2);
    expect(reduceGameState(hurt, { type: 'TICK', deltaSeconds: Number.NaN })).toBe(hurt);
    expect(reduceGameState(hurt, { type: 'TICK', deltaSeconds: 1000 })).toBe(hurt);
  });

  it('charges rest supplies atomically and never heals at full HP', () => {
    const home = habitat({ ...createInitialState(), astronaut: { ...createInitialState().astronaut, health: 50, thermalSafety: 60 } });
    const rested = reduceGameState(home, { type: 'REST_AT_HABITAT' });
    expect(rested.astronaut.health).toBe(62);
    expect(rested.astronaut.thermalSafety).toBe(100);
    expect(rested.resources.food).toBe(home.resources.food - BALANCE.habitat.healFoodCost);
    const shortage = { ...home, resources: { ...home.resources, water: 0 } };
    expect(reduceGameState(shortage, { type: 'REST_AT_HABITAT' })).toBe(shortage);
    const full = { ...home, astronaut: { ...home.astronaut, health: 100 } };
    expect(reduceGameState(full, { type: 'REST_AT_HABITAT' })).toBe(full);
  });

  it('advances full days with costs, summaries and five-day victory', () => {
    let state = habitat();
    for (let n = 1; n <= 5; n++) {
      // Exercise the underlying daily economy independently of Feature 5's event gate.
      state = advanceSurvivalDay(state);
      expect(state.daysSurvived).toBe(n);
      expect(state.lastDaySummary?.day).toBe(n);
      expect(state.resources.food).toBe(55 - n * BALANCE.daily.food);
      expect(state.resources.water).toBe(Math.max(0, BALANCE.start.water - n * BALANCE.daily.water));
    }
    expect(state.status).toBe('victory');
    expect(state.day).toBe(5);
    expect(state.scene).toBe('result');
    expect(reduceGameState(state, { type: 'ADVANCE_DAY' })).toBe(state);
    expect(reduceGameState(state, { type: 'RESTART_GAME' })).toEqual(createInitialState());
  });

  it('applies starvation, dehydration and life-support penalties without negative resources', () => {
    const home = habitat();
    const poor = { ...home, resources: { food: 1, water: 1, oxygen: 1, energy: 1 } };
    const day = reduceGameState(poor, { type: 'ADVANCE_DAY' });
    expect(day.resources).toEqual({ food: 0, water: 0, oxygen: 0, energy: BALANCE.solarDailyYield });
    expect(day.astronaut.health).toBe(100 - BALANCE.health.starvePerDay - BALANCE.health.dehydratePerDay - BALANCE.health.lifeSupportFailurePerDay);
    expect(day.lastDaySummary?.warnings).toHaveLength(3);
    const defeated = reduceGameState({ ...poor, astronaut: { ...poor.astronaut, health: 10 } }, { type: 'ADVANCE_DAY' });
    expect(defeated.status).toBe('defeat');
    expect(defeated.astronaut.health).toBe(0);
  });

  it('protects against future environmental damage only with powered intact shelter', () => {
    const outside = createInitialState();
    expect(reduceGameState(outside, { type: 'APPLY_ENVIRONMENTAL_EXPOSURE', damage: 12 }).astronaut.health).toBe(88);
    const home = habitat();
    expect(reduceGameState(home, { type: 'APPLY_ENVIRONMENTAL_EXPOSURE', damage: 12 })).toBe(home);
    const safe = shelter();
    expect(reduceGameState(safe, { type: 'APPLY_ENVIRONMENTAL_EXPOSURE', damage: 12 })).toBe(safe);
    const unpowered = { ...safe, resources: { ...safe.resources, energy: 0 } };
    expect(reduceGameState(unpowered, { type: 'APPLY_ENVIRONMENTAL_EXPOSURE', damage: 12 }).astronaut.health).toBe(88);
    expect(reduceGameState(outside, { type: 'APPLY_ENVIRONMENTAL_EXPOSURE', damage: -1 })).toBe(outside);
  });

  it('adds mission food to storage exactly once without healing HP', () => {
    const injured = { ...createInitialState(), astronaut: { ...createInitialState().astronaut, health: 40 } };
    const launched = reduceGameState(injured, { type: 'START_MISSION', mission: 'chicken-hunt', runId: mission.runId }, availableMissions);
    const returned = reduceGameState(launched, { type: 'COMPLETE_MISSION', result: mission }, availableMissions);
    expect(returned.resources.food).toBe(73);
    expect(returned.astronaut.health).toBe(40);
    expect(returned.xp).toBe(20);
    expect(reduceGameState(returned, { type: 'COMPLETE_MISSION', result: mission }, availableMissions)).toBe(returned);
    const home = habitat(returned);
    expect(reduceGameState(home, { type: 'EAT_FOOD' }).astronaut.health).toBe(60);
  });
});
