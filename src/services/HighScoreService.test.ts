import { describe, expect, it, vi } from 'vitest';
import { GameSessionStore } from '../domain/store/GameSessionStore';
import { createInitialState } from '../domain/rules/survivalRules';
import { HIGH_SCORE_KEY, HighScoreService, parseHighScore } from './HighScoreService';
import { SaveService } from './SaveService';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
    values,
  };
}

describe('independent personal best', () => {
  it('persists and restores records independently of active saves and New Game', () => {
    const storage = memoryStorage();
    const records = new HighScoreService(storage);
    records.consider({ daysSurvived: 7, xp: 22 });
    expect(records.getSnapshot()).toEqual({ bestDaysSurvived: 7, bestScore: 7022 });
    const save = new SaveService(storage);
    save.save(createInitialState(records.getSnapshot()));
    save.clear();
    expect(storage.values.has(HIGH_SCORE_KEY)).toBe(true);
    const reopened = new HighScoreService(storage);
    expect(reopened.getSnapshot()).toEqual(records.getSnapshot());
    const newRun = createInitialState(reopened.getSnapshot());
    expect(newRun.daysSurvived).toBe(0);
    expect(newRun.recordToBeat.bestDaysSurvived).toBe(7);
  });

  it('does not write or notify twice for the same state, and rejects lower-ranked scores', () => {
    const storage = memoryStorage();
    const service = new HighScoreService(storage);
    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);
    service.consider({ daysSurvived: 4, xp: 50 });
    service.consider({ daysSurvived: 4, xp: 50 });
    service.consider({ daysSurvived: 3, xp: 1000 });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    service.consider({ daysSurvived: 5, xp: 0 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('follows the authoritative store and duplicate mission rewards cannot increase score', () => {
    const storage = memoryStorage();
    const records = new HighScoreService(storage);
    const store = new GameSessionStore();
    const detach = records.attach(store);
    store.dispatch({ type: 'ADD_XP', amount: 12, rewardId: 'event-once' });
    const first = records.getSnapshot();
    store.dispatch({ type: 'ADD_XP', amount: 12, rewardId: 'event-once' });
    expect(records.getSnapshot()).toEqual(first);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    detach();
    store.dispatch({ type: 'ADD_XP', amount: 10, rewardId: 'later' });
    expect(records.getSnapshot()).toEqual(first);
  });

  it('recovers from corrupted records and blocked LocalStorage without blocking play', () => {
    const storage = memoryStorage();
    storage.values.set(HIGH_SCORE_KEY, '{bad json');
    expect(parseHighScore(storage.values.get(HIGH_SCORE_KEY)!)).toBeNull();
    expect(new HighScoreService(storage).getSnapshot()).toEqual({ bestDaysSurvived: 0, bestScore: 0 });
    expect(parseHighScore(JSON.stringify({ version: 1, record: { bestDaysSurvived: 3, bestScore: -1 } }))).toBeNull();
    const blocked = new HighScoreService({ getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); } });
    expect(() => blocked.consider({ daysSurvived: 2, xp: 5 })).not.toThrow();
    expect(blocked.getSnapshot()).toEqual({ bestDaysSurvived: 2, bestScore: 2005 });
  });
});
