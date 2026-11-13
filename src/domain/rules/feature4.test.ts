import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../game/config/balance';
import type { GameState } from '../models/types';
import { reduceGameState } from './gameRules';
import { createInitialState, solarYieldForDay } from './survivalRules';

const select = (state: GameState, buildingId: string) => reduceGameState(state, { type: 'INTERACT_BUILDING', buildingId });
const habitat = (state: GameState) => reduceGameState(select(state, 'habitat'), { type: 'ENTER_HABITAT' });
const afterDay = (state: GameState) => reduceGameState(habitat(state), { type: 'ADVANCE_DAY' });
const outside = (state: GameState) => reduceGameState(state, { type: 'LEAVE_HABITAT' });
const damaged = (state: GameState, id: string, condition: 'damaged' | 'broken' = 'damaged'): GameState => ({
  ...state, buildings: { ...state.buildings, [id]: { ...state.buildings[id], condition } },
});

describe('Feature 4 greenhouse, solar and shield rules', () => {
  it('plants one crop, charges water and energy once, and rejects a duplicate', () => {
    const ready = select(createInitialState(), 'greenhouse');
    const planted = reduceGameState(ready, { type: 'PLANT_CROP' });
    expect(planted.buildings.greenhouse).toMatchObject({ cropPlanted: true, cropGrowth: 0 });
    expect(planted.resources.water).toBe(ready.resources.water - BALANCE.greenhouse.waterCost);
    expect(planted.resources.energy).toBe(ready.resources.energy - BALANCE.greenhouse.energyCost);
    expect(ready.buildings.greenhouse.cropPlanted).toBe(false);
    expect(reduceGameState(planted, { type: 'PLANT_CROP' })).toBe(planted);
  });

  it('rejects planting when water, energy or greenhouse condition is insufficient', () => {
    const ready = select(createInitialState(), 'greenhouse');
    for (const poor of [
      { ...ready, resources: { ...ready.resources, water: 9 } },
      { ...ready, resources: { ...ready.resources, energy: 3 } },
      damaged(ready, 'greenhouse'),
      { ...ready, buildings: { ...ready.buildings, greenhouse: { ...ready.buildings.greenhouse, active: false } } },
    ]) expect(reduceGameState(poor, { type: 'PLANT_CROP' })).toBe(poor);
    const unselected = createInitialState();
    expect(reduceGameState(unselected, { type: 'PLANT_CROP' })).toBe(unselected);
  });

  it('grows from seed to ready in one completed day and harvests food, oxygen and XP once', () => {
    const planted = reduceGameState(select(createInitialState(), 'greenhouse'), { type: 'PLANT_CROP' });
    expect(reduceGameState(planted, { type: 'HARVEST_CROP' })).toBe(planted);
    const grown = afterDay(planted);
    expect(grown.buildings.greenhouse.cropGrowth).toBe(1);
    expect(grown.buildings.greenhouse.cropPlanted).toBe(true);
    const selected = select(outside(grown), 'greenhouse');
    const hp = selected.astronaut.health;
    const harvested = reduceGameState(selected, { type: 'HARVEST_CROP' });
    expect(harvested.resources.food).toBe(selected.resources.food + BALANCE.greenhouse.foodYield);
    expect(harvested.resources.oxygen).toBe(selected.resources.oxygen + BALANCE.greenhouse.oxygenYield);
    expect(harvested.xp).toBe(BALANCE.xp.supplies);
    expect(harvested.astronaut.health).toBe(hp);
    expect(harvested.buildings.greenhouse).toMatchObject({ cropPlanted: false, cropGrowth: 0 });
    expect(reduceGameState(harvested, { type: 'HARVEST_CROP' })).toBe(harvested);
  });

  it('caps harvest at capacity, rejects fully saturated storage, and pauses damaged crops', () => {
    const planted = reduceGameState(select(createInitialState(), 'greenhouse'), { type: 'PLANT_CROP' });
    const stalled = afterDay(damaged(planted, 'greenhouse'));
    expect(stalled.buildings.greenhouse.cropGrowth).toBe(0);
    expect(stalled.lastDaySummary?.warnings).toContain('Greenhouse needs repair before crops can grow.');
    const ready = { ...select(createInitialState(), 'greenhouse'),
      resources: { ...createInitialState().resources, food: 99, oxygen: 99 },
      buildings: { ...createInitialState().buildings, greenhouse: { ...createInitialState().buildings.greenhouse, cropPlanted: true, cropGrowth: 1 } } };
    const capped = reduceGameState(ready, { type: 'HARVEST_CROP' });
    expect(capped.resources.food).toBe(100);
    expect(capped.resources.oxygen).toBe(100);
    const saturated = { ...ready, resources: { ...ready.resources, food: 100, oxygen: 100 } };
    expect(reduceGameState(saturated, { type: 'HARVEST_CROP' })).toBe(saturated);
  });

  it('charges solar once per completed day, stores actual yield, and caps battery capacity', () => {
    const day = afterDay(createInitialState());
    expect(day.resources.energy).toBe(75 - BALANCE.daily.energy + BALANCE.solarDailyYield);
    expect(day.lastDaySummary?.energyProduced).toBe(BALANCE.solarDailyYield);
    expect(reduceGameState(day, { type: 'PLANT_CROP' })).toBe(day);
    const full = afterDay({ ...createInitialState(), resources: { ...createInitialState().resources, energy: 100 } });
    expect(full.resources.energy).toBe(100);
    expect(full.lastDaySummary?.energyProduced).toBe(BALANCE.daily.energy);
    const second = reduceGameState(day, { type: 'ADVANCE_DAY' });
    expect(second.daysSurvived).toBe(2);
    expect(second.lastDaySummary?.energyProduced).toBe(BALANCE.solarDailyYield);
  });

  it('reduces damaged solar yield and stops broken or inactive generation', () => {
    const initial = createInitialState();
    expect(solarYieldForDay(initial.buildings.solar)).toBe(16);
    const half = afterDay(damaged(initial, 'solar'));
    expect(half.lastDaySummary?.energyProduced).toBe(8);
    expect(half.resources.energy).toBe(78);
    const broken = afterDay(damaged(initial, 'solar', 'broken'));
    expect(broken.lastDaySummary?.energyProduced).toBe(0);
    const off = afterDay({ ...initial, buildings: { ...initial.buildings, solar: { ...initial.buildings.solar, active: false } } });
    expect(off.lastDaySummary?.energyProduced).toBe(0);
  });

  it('charges shield activation and daily upkeep, rejects repeated activation, and allows deactivation', () => {
    const selected = select(createInitialState(), 'shield');
    const active = reduceGameState(selected, { type: 'ACTIVATE_SHIELD', active: true });
    expect(active.buildings.shield.active).toBe(true);
    expect(active.resources.energy).toBe(75 - BALANCE.shield.activationEnergy);
    expect(reduceGameState(active, { type: 'ACTIVATE_SHIELD', active: true })).toBe(active);
    const day = afterDay(active);
    expect(day.lastDaySummary?.shieldEnergyUsed).toBe(BALANCE.shield.dailyEnergyUpkeep);
    expect(day.resources.energy).toBe(active.resources.energy - BALANCE.daily.energy + BALANCE.solarDailyYield - BALANCE.shield.dailyEnergyUpkeep);
    const off = reduceGameState(select(outside(day), 'shield'), { type: 'ACTIVATE_SHIELD', active: false });
    expect(off.buildings.shield.active).toBe(false);
    expect(off.resources.energy).toBe(day.resources.energy);
    expect(reduceGameState(off, { type: 'ACTIVATE_SHIELD', active: false })).toBe(off);
  });

  it('rejects low-energy or damaged shield and removes protection without power', () => {
    const selected = select(createInitialState(), 'shield');
    const poor = { ...selected, resources: { ...selected.resources, energy: 10 } };
    expect(reduceGameState(poor, { type: 'ACTIVATE_SHIELD', active: true })).toBe(poor);
    const bad = damaged(selected, 'shield');
    expect(reduceGameState(bad, { type: 'ACTIVATE_SHIELD', active: true })).toBe(bad);
    const active = reduceGameState(selected, { type: 'ACTIVATE_SHIELD', active: true });
    expect(reduceGameState(active, { type: 'APPLY_ENVIRONMENTAL_EXPOSURE', damage: 18 })).toBe(active);
    const unpowered = { ...active, resources: { ...active.resources, energy: 0 } };
    expect(reduceGameState(unpowered, { type: 'APPLY_ENVIRONMENTAL_EXPOSURE', damage: 18 }).astronaut.health).toBe(82);
    const spent = reduceGameState(active, { type: 'SPEND_RESOURCES', costs: { energy: active.resources.energy } });
    expect(spent.resources.energy).toBe(0);
    expect(spent.buildings.shield.active).toBe(false);
    const drained = afterDay({ ...active, resources: { ...active.resources, energy: 0 },
      buildings: { ...active.buildings, solar: { ...active.buildings.solar, active: false } } });
    expect(drained.buildings.shield.active).toBe(false);
    expect(drained.lastDaySummary?.shieldEnergyUsed).toBe(0);
  });

  it('repairs a damaged building for energy, restores operation, and rejects repeats or shortage', () => {
    const solar = select(damaged(createInitialState(), 'solar'), 'solar');
    const repaired = reduceGameState(solar, { type: 'REPAIR_BUILDING', buildingId: 'solar' });
    expect(repaired.resources.energy).toBe(solar.resources.energy - BALANCE.repair.energyCost);
    expect(repaired.buildings.solar).toMatchObject({ condition: 'good', active: true });
    expect(reduceGameState(repaired, { type: 'REPAIR_BUILDING', buildingId: 'solar' })).toBe(repaired);
    const poor = { ...solar, resources: { ...solar.resources, energy: 9 } };
    expect(reduceGameState(poor, { type: 'REPAIR_BUILDING', buildingId: 'solar' })).toBe(poor);
    const shield = select(damaged(createInitialState(), 'shield', 'broken'), 'shield');
    expect(reduceGameState(shield, { type: 'REPAIR_BUILDING', buildingId: 'shield' }).buildings.shield).toMatchObject({ condition: 'good', active: false });
  });
});
