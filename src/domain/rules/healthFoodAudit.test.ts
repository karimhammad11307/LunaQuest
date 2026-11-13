import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../game/config/balance';
import { MISSION_CONFIG } from '../../game/config/gameConfig';
import type { GameState, MissionResult } from '../models/types';
import { reduceGameState } from './gameRules';
import { createInitialState } from './survivalRules';

const habitat = (state: GameState) => reduceGameState(
  reduceGameState(state, { type: 'INTERACT_BUILDING', buildingId: 'habitat' }),
  { type: 'ENTER_HABITAT' },
);
const tick = (state: GameState, seconds: number) => reduceGameState(state, { type: 'TICK', deltaSeconds: seconds });

const availableMissions = { ...MISSION_CONFIG, 'chicken-hunt': { ...MISSION_CONFIG['chicken-hunt'], available: true } };
const foodResult: MissionResult = {
  runId: 'audit-food-1', missionType: 'chicken-hunt', success: true, returnedSafely: true,
  collectedResources: { food: 15 }, healthDamage: 0, xpEarned: 20, duration: 30,
  educationalMessage: 'Food goes into storage before the astronaut can eat it.',
};

describe('HP and food audit', () => {
  it('slowly drains HP during active outdoor play through bounded domain ticks', () => {
    const initial = createInitialState();
    let state = initial;
    for (let n = 0; n < 4; n++) state = tick(state, 5);
    expect(state.astronaut.health).toBeCloseTo(100 - BALANCE.health.passivePerSecond * 20);
    expect(state.astronaut.suitOxygen).toBeLessThan(100);
    expect(state.resources).toEqual(initial.resources);
    expect(initial.astronaut.health).toBe(100);
    expect(tick(state, 0)).toBe(state);
    expect(tick(state, -1)).toBe(state);
    expect(tick(state, 6)).toBe(state);
    expect(tick(state, Number.NaN)).toBe(state);
  });

  it('drains gentle HP indoors while leaving suit oxygen and food untouched', () => {
    const home = habitat(createInitialState());
    const after = tick(home, 5);
    expect(after.astronaut.health).toBeCloseTo(100 - BALANCE.health.passivePerSecond * 5);
    expect(after.astronaut.suitOxygen).toBe(home.astronaut.suitOxygen);
    expect(after.resources.food).toBe(home.resources.food);
  });

  it('eats from GameSessionStore storage, heals to 100, and rejects insufficient food', () => {
    const home = habitat(createInitialState());
    const tired = tick(home, 5);
    const fed = reduceGameState(tired, { type: 'EAT_FOOD' });
    expect(fed.astronaut.health).toBe(100);
    expect(fed.resources.food).toBe(tired.resources.food - BALANCE.habitat.eatFoodCost);
    expect(reduceGameState(fed, { type: 'EAT_FOOD' })).toBe(fed);
    const hungry = { ...tired, resources: { ...tired.resources, food: BALANCE.habitat.eatFoodCost - 1 } };
    expect(reduceGameState(hungry, { type: 'EAT_FOOD' })).toBe(hungry);
    expect(tired.resources.food).toBe(home.resources.food);
  });

  it('banks Chicken Hunt food once without automatic HP recovery', () => {
    const injured = { ...createInitialState(), astronaut: { ...createInitialState().astronaut, health: 40 } };
    const launched = reduceGameState(injured, { type: 'START_MISSION', mission: 'chicken-hunt', runId: foodResult.runId }, availableMissions);
    const returned = reduceGameState(launched, { type: 'COMPLETE_MISSION', result: foodResult }, availableMissions);
    expect(returned.resources.food).toBe(70);
    expect(returned.astronaut.health).toBe(40);
    expect(reduceGameState(returned, { type: 'COMPLETE_MISSION', result: foodResult }, availableMissions)).toBe(returned);
    const fed = reduceGameState(habitat(returned), { type: 'EAT_FOOD' });
    expect(fed.resources.food).toBe(60);
    expect(fed.astronaut.health).toBe(60);
  });

  it('freezes HP and suit oxygen during pause, then resumes without catch-up', () => {
    const start = createInitialState();
    const paused = reduceGameState(start, { type: 'SET_PAUSED', paused: true });
    expect(paused.paused).toBe(true);
    expect(tick(paused, 5)).toBe(paused);
    expect(reduceGameState(paused, { type: 'ADVANCE_DAY' })).toBe(paused);
    expect(reduceGameState(paused, { type: 'SET_PAUSED', paused: true })).toBe(paused);
    const resumed = reduceGameState(paused, { type: 'SET_PAUSED', paused: false });
    expect(tick(resumed, 1).astronaut.health).toBeCloseTo(100 - BALANCE.health.passivePerSecond);
    expect(reduceGameState(paused, { type: 'RESTART_GAME' })).toEqual(createInitialState());
  });

  it('does not tick during loading, other scenes, active missions, or terminal states', () => {
    const start = createInitialState();
    const states: GameState[] = [
      { ...start, weather: { ...start.weather, source: 'loading' } },
      { ...start, scene: 'title' },
      { ...start, scene: 'chicken-hunt', activeMission: 'chicken-hunt' },
      { ...start, status: 'victory' },
      { ...start, status: 'defeat' },
    ];
    for (const state of states) expect(tick(state, 5)).toBe(state);
    expect(reduceGameState(states[0], { type: 'APPLY_ENVIRONMENTAL_EXPOSURE', damage: 20 })).toBe(states[0]);
  });

  it('adds starvation, empty-suit and unprotected exposure damage without crossing zero', () => {
    const home = habitat(createInitialState());
    const starved = reduceGameState({ ...home, resources: { ...home.resources, food: 0 } }, { type: 'ADVANCE_DAY' });
    expect(starved.astronaut.health).toBe(100 - BALANCE.health.starvePerDay);
    const outside = { ...createInitialState(), astronaut: { ...createInitialState().astronaut, suitOxygen: 0, health: 10 } };
    const oxygenHurt = tick(outside, 1);
    expect(oxygenHurt.astronaut.health).toBeCloseTo(10 - BALANCE.health.suitOxygenEmptyPerSecond - BALANCE.health.passivePerSecond);
    const exposed = reduceGameState(oxygenHurt, { type: 'APPLY_ENVIRONMENTAL_EXPOSURE', damage: 5 });
    expect(exposed.astronaut.health).toBeCloseTo(oxygenHurt.astronaut.health - 5);
    const lost = tick({ ...outside, astronaut: { ...outside.astronaut, health: 1 } }, 1);
    expect(lost.astronaut.health).toBe(0);
    expect(lost.status).toBe('defeat');
    expect(tick(lost, 1)).toBe(lost);
  });

  it('rejects out-of-range HP writes and caps healing at 100', () => {
    const state = createInitialState();
    expect(reduceGameState(state, { type: 'UPDATE_ASTRONAUT', changes: { health: -1 } })).toBe(state);
    expect(reduceGameState(state, { type: 'UPDATE_ASTRONAUT', changes: { health: 101 } })).toBe(state);
    const almostFull = habitat({ ...state, astronaut: { ...state.astronaut, health: 99 } });
    const fed = reduceGameState(almostFull, { type: 'EAT_FOOD' });
    expect(fed.astronaut.health).toBe(100);
    expect(fed.resources.food).toBe(45);
  });
});
