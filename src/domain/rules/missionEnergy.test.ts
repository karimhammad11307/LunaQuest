import { describe, expect, it } from 'vitest';
import { MISSION_CONFIG } from '../../game/config/gameConfig';
import { GameSessionStore } from '../store/GameSessionStore';
import { SaveService } from '../../services/SaveService';

const cost = MISSION_CONFIG['chicken-hunt'].energyCost;

function result(runId: string, success: boolean) {
  return { runId, missionType: 'chicken-hunt' as const, success, returnedSafely: success,
    collectedResources: { food: success ? 3 : 0 }, healthDamage: success ? 0 : 10,
    xpEarned: success ? 15 : 0, duration: 12, educationalMessage: 'Mission ended.' };
}

describe('Chicken Hunt launch Energy', () => {
  it('charges the configured six units exactly once and reports the before/after values', () => {
    expect(cost).toBe(6);
    const store = new GameSessionStore();
    const before = store.getState();
    const launched = store.dispatch({ type: 'START_MISSION', mission: 'chicken-hunt', runId: 'energy-run' });
    expect(launched.resources.energy).toBe(before.resources.energy - cost);
    expect(launched.notices.at(-1)?.text).toContain('75 → 69');
    expect(store.dispatch({ type: 'START_MISSION', mission: 'chicken-hunt', runId: 'energy-run' })).toBe(launched);
    expect(store.dispatch({ type: 'START_MISSION', mission: 'chicken-hunt', runId: 'another-run' })).toBe(launched);
  });

  it('rejects an insufficient-energy launch without a partial charge', () => {
    const store = new GameSessionStore();
    store.dispatch({ type: 'SPEND_RESOURCES', costs: { energy: 70 } });
    const before = store.getState();
    expect(before.resources.energy).toBe(5);
    expect(store.dispatch({ type: 'START_MISSION', mission: 'chicken-hunt', runId: 'low-energy' })).toBe(before);
  });

  it('does not refund Energy on a safe return or failed mission', () => {
    for (const success of [true, false]) {
      const store = new GameSessionStore();
      store.dispatch({ type: 'START_MISSION', mission: 'chicken-hunt', runId: `return-${success}` });
      const afterLaunch = store.getState().resources.energy;
      store.dispatch({ type: 'COMPLETE_MISSION', result: result(`return-${success}`, success) });
      expect(store.getState().resources.energy).toBe(afterLaunch);
      expect(store.getState().activeMission).toBeNull();
    }
  });

  it('preserves one launch cost through refresh during and after a mission', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); } };
    const save = new SaveService(storage);
    const store = new GameSessionStore();
    store.dispatch({ type: 'START_MISSION', mission: 'chicken-hunt', runId: 'refresh-run' });
    const paid = store.getState().resources.energy;
    expect(save.save(store.getState())).toBe(true);
    const interrupted = save.load()!;
    expect(interrupted.resources.energy).toBe(paid);
    expect(interrupted.completedMissionRunIds).toContain('refresh-run');
    const resumed = new GameSessionStore(interrupted);
    expect(resumed.dispatch({ type: 'COMPLETE_MISSION', result: result('refresh-run', true) })).toBe(interrupted);
    resumed.dispatch({ type: 'START_MISSION', mission: 'chicken-hunt', runId: 'second-run' });
    resumed.dispatch({ type: 'COMPLETE_MISSION', result: result('second-run', true) });
    expect(save.save(resumed.getState())).toBe(true);
    expect(save.load()?.resources.energy).toBe(paid - cost);
  });
});
