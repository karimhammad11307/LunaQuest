import { describe, expect, it } from 'vitest';
import { createInitialState, pendingEarthSupplies } from './survivalRules';
import { reduceGameState } from './gameRules';
import { BALANCE } from '../../game/config/balance';
import { EARTH_SUPPLY_DELIVERIES } from '../../game/config/gameConfig';
import type { GameState } from '../models/types';

const first = EARTH_SUPPLY_DELIVERIES[0];
const second = EARTH_SUPPLY_DELIVERIES[1];
function atPod(day: number, x = first.x, y = first.y): GameState {
  const initial = createInitialState();
  return { ...initial, day, daysSurvived: day - 1,
    astronaut: { ...initial.astronaut, position: { x, y } } };
}

describe('scheduled Earth water supplies', () => {
  it('becomes due on days 2 and 4, keeping uncollected pods available', () => {
    expect(pendingEarthSupplies(atPod(1))).toEqual([]);
    expect(pendingEarthSupplies(atPod(2)).map((pod) => pod.id)).toEqual([first.id]);
    expect(pendingEarthSupplies(atPod(3)).map((pod) => pod.id)).toEqual([first.id]);
    expect(pendingEarthSupplies(atPod(4)).map((pod) => pod.id)).toEqual([first.id, second.id]);
  });

  it('collects exactly 25 water once and retains only the other uncollected pod', () => {
    const state = atPod(4);
    const next = reduceGameState(state, { type: 'COLLECT_EARTH_SUPPLY', deliveryId: first.id });
    expect(next.resources.water).toBe(state.resources.water + BALANCE.earthSupply.waterPerPod);
    expect(next.collectedEarthSupplyIds).toEqual([first.id]);
    expect(next.notices.at(-1)?.text).toBe('+25 Water — Earth Supply Received!');
    expect(reduceGameState(next, { type: 'COLLECT_EARTH_SUPPLY', deliveryId: first.id })).toBe(next);
    expect(pendingEarthSupplies(next).map((pod) => pod.id)).toEqual([second.id]);
    const moved = { ...next, astronaut: { ...next.astronaut, position: { x: second.x, y: second.y } } };
    const secondCollected = reduceGameState(moved, { type: 'COLLECT_EARTH_SUPPLY', deliveryId: second.id });
    expect(secondCollected.collectedEarthSupplyIds).toEqual([first.id, second.id]);
    expect(pendingEarthSupplies(secondCollected)).toEqual([]);
  });

  it('rejects early, remote, indoor, full-tank and active-mission collections atomically', () => {
    const early = atPod(1);
    expect(reduceGameState(early, { type: 'COLLECT_EARTH_SUPPLY', deliveryId: first.id })).toBe(early);
    const state = atPod(2);
    for (const bad of [
      { ...state, astronaut: { ...state.astronaut, position: { x: 400, y: 316 } } },
      { ...state, astronaut: { ...state.astronaut, location: 'habitat' as const } },
      { ...state, resources: { ...state.resources, water: 80 } },
      { ...state, scene: 'chicken-hunt' as const, activeMission: 'chicken-hunt' as const,
        activeMissionRunId: 'live-run', missionProgress: { runId: 'live-run', missionType: 'chicken-hunt' as const,
          elapsedSeconds: 0, collectedResources: {} } },
    ]) expect(reduceGameState(bad, { type: 'COLLECT_EARTH_SUPPLY', deliveryId: first.id })).toBe(bad);
    expect(reduceGameState(state, { type: 'COLLECT_EARTH_SUPPLY', deliveryId: 'not-a-delivery' })).toBe(state);
  });

  it('restart clears collected IDs and five-day water balance rewards timely pickup', () => {
    const firstCollected = reduceGameState(atPod(2), { type: 'COLLECT_EARTH_SUPPLY', deliveryId: first.id });
    expect(reduceGameState(firstCollected, { type: 'RESTART_GAME' }).collectedEarthSupplyIds).toEqual([]);
    expect(BALANCE.start.water - 5 * BALANCE.daily.water).toBeLessThan(0);
    expect(BALANCE.start.water + 2 * BALANCE.earthSupply.waterPerPod - 5 * BALANCE.daily.water
      - 2 * BALANCE.greenhouse.waterCost).toBeGreaterThan(0);
  });
});
