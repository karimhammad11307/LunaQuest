import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../game/config/balance';
import { GameSessionStore } from '../store/GameSessionStore';
import { reduceGameState } from './gameRules';
import { advanceSurvivalDay, createInitialState } from './survivalRules';
import { beatsPersonalBest, survivalScore, validPersonalBest } from './scoreRules';

describe('endless survival and authoritative score', () => {
  it('starts on day 1 with zero completed days and no score', () => {
    const state = createInitialState();
    expect(state.day).toBe(1);
    expect(state.daysSurvived).toBe(0);
    expect(survivalScore(state)).toBe(0);
  });

  it('survives days 5, 10 and 20 without a day-based victory when supplies are available', () => {
    let state = createInitialState();
    state = reduceGameState(state, { type: 'INTERACT_BUILDING', buildingId: 'habitat' });
    state = reduceGameState(state, { type: 'ENTER_HABITAT' });
    for (let n = 1; n <= 20; n++) {
      // Supply availability is a controlled test fixture; Feature 10 will add the long-term economy.
      state = { ...state, resources: { food: 100, water: 100, oxygen: 100, energy: 100 } };
      state = advanceSurvivalDay(state);
      if ([5, 10, 20].includes(n)) {
        expect(state.daysSurvived).toBe(n);
        expect(state.day).toBe(n + 1);
        expect(state.status).toBe('playing');
        expect(state.scene).toBe('moon-base');
        expect(survivalScore(state)).toBe(n * 1000);
      }
    }
    expect(state.astronaut.health).toBe(100);
  });

  it('retains zero-HP defeat and rejects further day progression', () => {
    const initial = createInitialState();
    const home = reduceGameState(reduceGameState(initial, { type: 'INTERACT_BUILDING', buildingId: 'habitat' }), { type: 'ENTER_HABITAT' });
    const poor = { ...home, astronaut: { ...home.astronaut, health: 1 }, resources: { food: 0, water: 0, oxygen: 0, energy: 0 } };
    const ended = reduceGameState(poor, { type: 'ADVANCE_DAY' });
    expect(ended.status).toBe('defeat');
    expect(ended.astronaut.health).toBe(0);
    expect(reduceGameState(ended, { type: 'ADVANCE_DAY' })).toBe(ended);
  });

  it('gives every completed day priority over XP and recognizes a new record', () => {
    const five = { daysSurvived: 5, xp: 100000 };
    const six = { daysSurvived: 6, xp: 0 };
    expect(survivalScore(five)).toBe(5999);
    expect(survivalScore(six)).toBe(6000);
    expect(beatsPersonalBest(six, { bestDaysSurvived: 5, bestScore: 5999 })).toBe(true);
    expect(beatsPersonalBest(five, { bestDaysSurvived: 6, bestScore: 6000 })).toBe(false);
    expect(validPersonalBest({ bestDaysSurvived: 2, bestScore: 2999 })).toBe(true);
    expect(validPersonalBest({ bestDaysSurvived: 2, bestScore: 1999 })).toBe(false);
  });

  it('restart resets run score and ledgers while retaining the supplied personal record baseline', () => {
    const best = { bestDaysSurvived: 8, bestScore: 8050 };
    const store = new GameSessionStore(createInitialState(best));
    store.dispatch({ type: 'ADD_XP', amount: 10, rewardId: 'once' });
    expect(survivalScore(store.getState())).toBe(10);
    const restarted = store.dispatch({ type: 'RESTART_GAME', recordToBeat: best });
    expect(restarted.recordToBeat).toEqual(best);
    expect(restarted.xp).toBe(0);
    expect(restarted.awardedRewardIds).toEqual([]);
    expect(survivalScore(restarted)).toBe(0);
    expect(beatsPersonalBest(restarted, best)).toBe(false);
    expect(BALANCE.earthSupply.deliveryDays).toEqual([2, 4]);
  });
});
