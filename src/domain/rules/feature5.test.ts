import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../game/config/balance';
import type { GameState } from '../models/types';
import { GameSessionStore } from '../store/GameSessionStore';
import { EMERGENCY_CATALOG } from './eventRules';
import { reduceGameState } from './gameRules';
import { createInitialState } from './survivalRules';

const act = (state: GameState, action: Parameters<typeof reduceGameState>[1]) => reduceGameState(state, action);
const tick = (state: GameState, seconds: number) => act(state, { type: 'TICK', deltaSeconds: seconds });
const select = (state: GameState, id: string) => act(state, { type: 'INTERACT_BUILDING', buildingId: id });
const home = (state: GameState) => act(select(state, 'habitat'), { type: 'ENTER_HABITAT' });
const stormStart = () => act(home(createInitialState()), { type: 'ADVANCE_DAY' });
const runFor = (state: GameState, seconds: number) => {
  let current = state;
  for (let elapsed = 0; elapsed < seconds; elapsed += 1) current = tick(current, 1);
  return current;
};
const leakStart = () => act(runFor(stormStart(), BALANCE.emergencies.storm.warningSeconds
  + BALANCE.emergencies.storm.dangerSeconds), { type: 'ADVANCE_DAY' });

describe('Feature 5 deterministic emergencies', () => {
  it('defines unique scripted events and triggers storm then leak without overlap', () => {
    const first = stormStart();
    expect(first.activeEvent).toMatchObject({ id: BALANCE.emergencies.storm.id, phase: 'warning' });
    expect(first.activeEventId).toBe(first.activeEvent?.id);
    expect(first.daysSurvived).toBe(1);
    expect(EMERGENCY_CATALOG[BALANCE.emergencies.storm.id].choices).toEqual(['shelter', 'shield', 'ignore']);
    expect(act(first, { type: 'ADVANCE_DAY' })).toBe(first);
    const second = leakStart();
    expect(second.activeEvent).toMatchObject({ id: BALANCE.emergencies.leak.id, phase: 'warning' });
    expect(second.completedEventIds).toEqual([BALANCE.emergencies.storm.id]);
    expect(second.buildings.habitat.condition).toBe('damaged');
  });

  it('counts down and pauses/resumes warning without catch-up', () => {
    const first = stormStart();
    const elapsed = tick(first, 5);
    expect(elapsed.activeEvent?.remainingSeconds).toBe(BALANCE.emergencies.storm.warningSeconds - 5);
    const paused = act(elapsed, { type: 'SET_PAUSED', paused: true });
    expect(tick(paused, 5)).toBe(paused);
    const resumed = tick(act(paused, { type: 'SET_PAUSED', paused: false }), 1);
    expect(resumed.activeEvent?.remainingSeconds).toBe(BALANCE.emergencies.storm.warningSeconds - 6);
  });

  it('damages unprotected astronaut once per danger pulse and increases exposure', () => {
    const outside = act(stormStart(), { type: 'LEAVE_HABITAT' });
    const danger = runFor(outside, BALANCE.emergencies.storm.warningSeconds);
    expect(danger.activeEvent?.phase).toBe('danger');
    const quarter = tick(danger, 0.25);
    expect(quarter.astronaut.radiationExposure).toBe(0);
    const pulse = tick(tick(tick(quarter, 0.25), 0.25), 0.25);
    expect(pulse.astronaut.radiationExposure).toBe(BALANCE.emergencies.storm.exposurePerPulse);
    expect(danger.astronaut.health - pulse.astronaut.health).toBeCloseTo(BALANCE.emergencies.storm.damagePerPulse + BALANCE.health.passivePerSecond, 3);
  });

  it('shelter prevents storm damage, awards XP once, and ends automatically', () => {
    const outside = act(stormStart(), { type: 'LEAVE_HABITAT' });
    const sheltered = act(select(outside, 'shield'), { type: 'ENTER_SHELTER' });
    const before = sheltered.astronaut.health;
    const finished = runFor(sheltered, BALANCE.emergencies.storm.warningSeconds + BALANCE.emergencies.storm.dangerSeconds);
    expect(finished.activeEvent).toBeNull();
    expect(finished.astronaut.radiationExposure).toBe(0);
    expect(before - finished.astronaut.health).toBeCloseTo(BALANCE.health.passivePerSecond * 36, 3);
    expect(finished.xp).toBe(BALANCE.emergencies.storm.xp);
    expect(finished.lastEventOutcome?.choice).toBe('shelter');
    expect(tick(finished, 1).xp).toBe(finished.xp);
  });

  it('powered shield protects nearby only and activation spends energy', () => {
    const outside = act(stormStart(), { type: 'LEAVE_HABITAT' });
    const selected = select(outside, 'shield');
    const shielded = act(selected, { type: 'ACTIVATE_SHIELD', active: true });
    expect(shielded.resources.energy).toBe(selected.resources.energy - BALANCE.shield.activationEnergy);
    const danger = runFor(shielded, BALANCE.emergencies.storm.warningSeconds);
    const protectedTick = tick(danger, 1);
    expect(protectedTick.astronaut.radiationExposure).toBe(0);
    const far = { ...danger, astronaut: { ...danger.astronaut, position: { x: 20, y: 80 } } };
    expect(tick(far, 1).astronaut.radiationExposure).toBe(BALANCE.emergencies.storm.exposurePerPulse);
    const poor = { ...selected, resources: { ...selected.resources, energy: 2 } };
    expect(act(poor, { type: 'ACTIVATE_SHIELD', active: true })).toBe(poor);
  });

  it('storm duration limits final damage pulse and exposure can cause defeat', () => {
    const outside = act(stormStart(), { type: 'LEAVE_HABITAT' });
    const danger = runFor(outside, BALANCE.emergencies.storm.warningSeconds);
    const almostFinished = { ...danger, activeEvent: { ...danger.activeEvent!, remainingSeconds: 2 } };
    const finished = tick(almostFinished, 5);
    expect(finished.astronaut.radiationExposure).toBe(2 * BALANCE.emergencies.storm.exposurePerPulse);
    expect(finished.completedEventIds).toContain(BALANCE.emergencies.storm.id);
    const vulnerable = { ...danger, astronaut: { ...danger.astronaut, health: 2 } };
    const defeated = tick(vulnerable, 1);
    expect(defeated.status).toBe('defeat');
    expect(tick(defeated, 2)).toBe(defeated);
  });

  it('ignoring storm causes harm, but eating later uses stored food to heal', () => {
    const outside = act(stormStart(), { type: 'LEAVE_HABITAT' });
    const ignored = act(outside, { type: 'RESOLVE_EVENT', eventId: outside.activeEventId!, choiceId: 'ignore' });
    expect(ignored.activeEvent?.ignored).toBe(true);
    expect(act(ignored, { type: 'RESOLVE_EVENT', eventId: ignored.activeEventId!, choiceId: 'ignore' })).toBe(ignored);
    const exposed = runFor(ignored, BALANCE.emergencies.storm.warningSeconds + 3);
    expect(exposed.astronaut.health).toBeLessThan(ignored.astronaut.health - 3);
    const reentered = act(select(exposed, 'habitat'), { type: 'ENTER_HABITAT' });
    const eaten = act(reentered, { type: 'EAT_FOOD' });
    expect(eaten.astronaut.health).toBeGreaterThan(reentered.astronaut.health);
    expect(eaten.resources.food).toBe(reentered.resources.food - BALANCE.habitat.eatFoodCost);
  });

  it('leak drains oxygen only after warning and stops after paid repair', () => {
    const leakState = leakStart();
    const ready = runFor(leakState, BALANCE.emergencies.leak.warningSeconds);
    expect(ready.resources.oxygen).toBe(leakState.resources.oxygen);
    const leaking = tick(ready, 3);
    expect(leaking.resources.oxygen).toBe(leakState.resources.oxygen - 3 * BALANCE.emergencies.leak.oxygenLossPerPulse);
    const selected = select(leaking, 'habitat');
    const fixed = act(selected, { type: 'REPAIR_BUILDING', buildingId: 'habitat' });
    expect(fixed.activeEvent).toMatchObject({ id: 'solar-day-3', phase: 'warning' });
    expect(fixed.buildings.habitat.condition).toBe('good');
    expect(fixed.resources.energy).toBe(selected.resources.energy - BALANCE.repair.energyCost);
    expect(fixed.xp).toBe(BALANCE.emergencies.leak.repairXp);
    expect(tick(fixed, 3).resources.oxygen).toBe(fixed.resources.oxygen);
    expect(act(fixed, { type: 'REPAIR_BUILDING', buildingId: 'habitat' })).toBe(fixed);
  });

  it('rejects unaffordable leak repair atomically', () => {
    const leaking = select(leakStart(), 'habitat');
    const poor = { ...leaking, resources: { ...leaking.resources, energy: BALANCE.repair.energyCost - 1 } };
    expect(act(poor, { type: 'REPAIR_BUILDING', buildingId: 'habitat' })).toBe(poor);
  });

  it('isolation stops leak with distinct cost and shuts down greenhouse until repaired', () => {
    const leaking = leakStart();
    const isolated = act(leaking, { type: 'RESOLVE_EVENT', eventId: leaking.activeEventId!, choiceId: 'isolate' });
    expect(isolated.activeEvent).toMatchObject({ id: 'solar-day-3', phase: 'warning' });
    expect(isolated.resources.energy).toBe(leaking.resources.energy - BALANCE.emergencies.leak.isolateEnergyCost);
    expect(isolated.resources.oxygen).toBe(leaking.resources.oxygen - BALANCE.emergencies.leak.isolateOxygenCost);
    expect(isolated.buildings.greenhouse).toMatchObject({ condition: 'damaged', active: false });
    expect(isolated.xp).toBe(BALANCE.emergencies.leak.isolateXp);
    expect(tick(isolated, 2).resources.oxygen).toBe(isolated.resources.oxygen);
    expect(act(isolated, { type: 'RESOLVE_EVENT', eventId: leaking.activeEventId!, choiceId: 'isolate' })).toBe(isolated);
  });

  it('rejects isolation when energy or oxygen is insufficient without changing state', () => {
    const leaking = leakStart();
    for (const resources of [
      { ...leaking.resources, energy: BALANCE.emergencies.leak.isolateEnergyCost - 1 },
      { ...leaking.resources, oxygen: BALANCE.emergencies.leak.isolateOxygenCost - 1 },
    ]) {
      const poor = { ...leaking, resources };
      expect(act(poor, { type: 'RESOLVE_EVENT', eventId: poor.activeEventId!, choiceId: 'isolate' })).toBe(poor);
    }
  });

  it('ignored leak persists, then low oxygen causes gradual HP loss and possible defeat', () => {
    const leakState = leakStart();
    const ignored = act(leakState, { type: 'RESOLVE_EVENT', eventId: leakState.activeEventId!, choiceId: 'ignore' });
    const danger = runFor(ignored, BALANCE.emergencies.leak.warningSeconds);
    const low = { ...danger, resources: { ...danger.resources, oxygen: 2 },
      astronaut: { ...danger.astronaut, health: 3 } };
    const damaged = tick(low, 1);
    expect(damaged.resources.oxygen).toBe(1);
    expect(damaged.astronaut.health).toBeLessThan(3);
    const defeated = tick(damaged, 1);
    expect(defeated.status).toBe('defeat');
    expect(tick(defeated, 5)).toBe(defeated);
  });

  it('invalid resolutions, paused ticks, terminal ticks and restart never grant extra rewards', () => {
    const leakState = leakStart();
    expect(act(leakState, { type: 'RESOLVE_EVENT', eventId: 'wrong', choiceId: 'isolate' })).toBe(leakState);
    expect(act(leakState, { type: 'RESOLVE_EVENT', eventId: leakState.activeEventId!, choiceId: 'invalid' } as never)).toBe(leakState);
    const paused = act(leakState, { type: 'SET_PAUSED', paused: true });
    expect(tick(paused, 5)).toBe(paused);
    const restarted = act(paused, { type: 'RESTART_GAME' });
    expect(restarted).toEqual(createInitialState());
    expect(tick(restarted, 1).activeEvent).toBeNull();
    const store = new GameSessionStore();
    store.dispatch({ type: 'LOAD_GAME', state: leakState });
    expect(store.getState().activeEvent?.id).toBe(leakState.activeEventId);
    store.destroy();
  });
});
