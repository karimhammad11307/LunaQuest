/**
 * MOONBOUND — deterministic survival rules.
 *
 * Pure functions: no Phaser, no React, no randomness. Every rule is
 * unit-testable via createInitialState + the store's dispatch.
 */
import type { BuildingState, GameState, Resources } from '../models/types';
import { BALANCE } from '../../game/config/balance';
import { BUILDING_LAYOUT, SPAWN_POINT } from '../../game/config/gameConfig';

export const clamp = (v: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, v));

function notice(id: number, text: string, tone: 'info' | 'good' | 'warn'): GameState['notices'][number] {
  return { id, text, tone };
}

export function trimNotices(notices: GameState['notices']): GameState['notices'] {
  return notices.slice(-6);
}

export function createInitialBuildings(): Record<string, import('../models/types').BuildingState> {
  return Object.fromEntries(
    BUILDING_LAYOUT.map((b) => [
      b.id,
      {
        id: b.id,
        type: b.type,
        level: 1,
        condition: 'good' as const,
        active: b.type === 'shield' ? false : true,
        cropGrowth: 0,
        cropPlanted: false,
      },
    ]),
  );
}

export function createInitialState(): GameState {
  return {
    day: 1,
    daysSurvived: 0,
    timeOfDay: 0,
    scene: 'moon-base',
    resources: {
      food: BALANCE.start.food,
      water: BALANCE.start.water,
      oxygen: BALANCE.start.oxygen,
      energy: BALANCE.start.energy,
    },
    astronaut: {
      health: BALANCE.start.health,
      location: 'outside',
      suitOxygen: BALANCE.start.suitOxygen,
      thermalSafety: BALANCE.start.thermal,
      radiationExposure: BALANCE.start.radiation,
      position: { ...SPAWN_POINT },
    },
    buildings: createInitialBuildings(),
    activeMission: null,
    activeMissionRunId: null,
    missionProgress: null,
    completedMissionRunIds: [],
    lastMissionResult: null,
    activeEventId: null,
    activeEvent: null,
    completedEventIds: [],
    lastEventOutcome: null,
    xp: 0,
    awardedRewardIds: [],
    weather: {
      source: 'demo',
      label: 'Demo Space Weather',
      observedAt: null,
      riskLevel: 'low',
      isRealData: false,
      latestEventType: null,
      observationCount: 0,
      checkedAt: null,
      fallbackReason: null,
      partial: false,
    },
    status: 'playing',
    paused: false,
    selectedBuildingId: null,
    lastDaySummary: null,
    notices: [
      notice(1, 'Welcome to Moonbound! Walk with WASD or arrow keys.', 'info'),
      notice(2, 'Press E near a building to interact. Visit all five!', 'info'),
    ],
  };
}

/** Whether the base-world simulation clock may advance. */
export function canTickSurvival(state: GameState): boolean {
  return state.status === 'playing' && !state.paused && state.scene === 'moon-base'
    && state.weather.source !== 'loading' && !state.activeMission;
}

/** Real-time outdoor drain of suit oxygen, thermal safety, and gentle HP fatigue. */
export function tickOutdoor(state: GameState, deltaSeconds: number): GameState {
  if (!canTickSurvival(state) || state.astronaut.location !== 'outside'
    || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0 || deltaSeconds > 5) return state;
  const astro = state.astronaut;
  const wasOxygen = Math.floor(astro.suitOxygen);
  const suitOxygen = clamp(astro.suitOxygen - BALANCE.suitOxygenDrainPerSecond * deltaSeconds);
  const thermalSafety = clamp(astro.thermalSafety - BALANCE.thermalDrainPerSecond * deltaSeconds);
  let health = clamp(astro.health - BALANCE.health.passivePerSecond * deltaSeconds);
  const notices = [...state.notices];
  if (suitOxygen <= 0) {
    health = clamp(health - BALANCE.health.suitOxygenEmptyPerSecond * deltaSeconds);
  }
  if (wasOxygen >= 25 && suitOxygen < 25) {
    notices.push(notice(Math.max(0, ...notices.map((entry) => entry.id)) + 1, 'Your suit oxygen is low — go back to base!', 'warn'));
  }
  if (astro.suitOxygen > 0 && suitOxygen === 0) {
    notices.push(notice(Math.max(0, ...notices.map((entry) => entry.id)) + 1, 'Suit oxygen empty! Return to the habitat!', 'warn'));
  }
  return {
    ...state,
    astronaut: { ...astro, suitOxygen, thermalSafety, health },
    status: health === 0 ? 'defeat' : state.status,
    scene: health === 0 ? 'result' : state.scene,
    notices: trimNotices(notices),
  };
}

/** One controlled simulation tick; only suit systems depend on being outdoors. */
export function tickSurvival(state: GameState, deltaSeconds: number): GameState {
  if (!canTickSurvival(state) || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0 || deltaSeconds > 5) return state;
  if (state.astronaut.location === 'outside') return tickOutdoor(state, deltaSeconds);
  const health = clamp(state.astronaut.health - BALANCE.health.passivePerSecond * deltaSeconds);
  return {
    ...state,
    astronaut: { ...state.astronaut, health },
    status: health === 0 ? 'defeat' : state.status,
    scene: health === 0 ? 'result' : state.scene,
  };
}

/** Reusable environmental exposure rule for later radiation incidents. */
export function applyEnvironmentalDamage(state: GameState, damage: number): GameState {
  if (state.status !== 'playing' || state.paused || state.weather.source === 'loading'
    || !Number.isFinite(damage) || damage <= 0 || damage > 100) return state;
  const { location } = state.astronaut;
  const shieldPowered = state.buildings.shield.active && state.buildings.shield.condition === 'good' && state.resources.energy > 0;
  const shieldSite = BUILDING_LAYOUT.find((building) => building.id === 'shield')!;
  const shieldDistance = Math.hypot(state.astronaut.position.x - shieldSite.x, state.astronaut.position.y - shieldSite.y);
  const protectedHere = location === 'shelter'
    ? state.resources.energy > 0 && state.buildings.shield.condition !== 'broken'
    : location === 'habitat'
      ? state.resources.energy > 0 && state.resources.oxygen > 0 && state.buildings.habitat.condition !== 'broken'
      : shieldPowered && shieldDistance <= BALANCE.emergencies.storm.shieldRadius;
  if (protectedHere) return state;
  const health = clamp(state.astronaut.health - damage);
  return { ...state, astronaut: { ...state.astronaut, health }, status: health === 0 ? 'defeat' : 'playing', scene: health === 0 ? 'result' : state.scene };
}

/** Stored charge from one simplified illuminated workday; no lunar day/night simulation. */
export function solarYieldForDay(solar: BuildingState): number {
  if (!solar.active || solar.condition === 'broken') return 0;
  return solar.condition === 'damaged'
    ? Math.floor(BALANCE.solarDailyYield * BALANCE.solarDamagedEfficiency)
    : BALANCE.solarDailyYield;
}

/** One full completed day: consumption, one solar charge, shield upkeep, and crop growth. */
export function advanceSurvivalDay(state: GameState): GameState {
  if (!canTickSurvival(state) || state.astronaut.location !== 'habitat') return state;
  const used = {
    food: Math.min(state.resources.food, BALANCE.daily.food),
    water: Math.min(state.resources.water, BALANCE.daily.water),
    oxygen: Math.min(state.resources.oxygen, BALANCE.daily.oxygen),
    energy: Math.min(state.resources.energy, BALANCE.daily.energy),
  };
  const solarPotential = solarYieldForDay(state.buildings.solar);
  const energyAfterLifeSupport = state.resources.energy - used.energy;
  const energyAfterSolar = clamp(energyAfterLifeSupport + solarPotential);
  const energyProduced = energyAfterSolar - energyAfterLifeSupport;
  const shieldWasActive = state.buildings.shield.active;
  const shieldCanRun = shieldWasActive && state.buildings.shield.condition === 'good'
    && energyAfterSolar >= BALANCE.shield.dailyEnergyUpkeep;
  const shieldEnergyUsed = shieldCanRun ? BALANCE.shield.dailyEnergyUpkeep : 0;
  const greenhouse = state.buildings.greenhouse;
  const cropCanGrow = greenhouse.cropPlanted && greenhouse.active && greenhouse.condition === 'good';
  const nextGreenhouse = cropCanGrow
    ? { ...greenhouse, cropGrowth: clamp(greenhouse.cropGrowth + BALANCE.greenhouse.growthPerDay, 0, 1) }
    : greenhouse;
  const nextShield = shieldWasActive && !shieldCanRun ? { ...state.buildings.shield, active: false } : state.buildings.shield;
  const resources: Resources = {
    food: state.resources.food - used.food,
    water: state.resources.water - used.water,
    oxygen: state.resources.oxygen - used.oxygen,
    energy: energyAfterSolar - shieldEnergyUsed,
  };
  const warnings: string[] = [];
  let damage = 0;
  if (resources.food === 0) { damage += BALANCE.health.starvePerDay; warnings.push('No food: health fell.'); }
  if (resources.water === 0) { damage += BALANCE.health.dehydratePerDay; warnings.push('No water: health fell.'); }
  if (resources.oxygen === 0 || used.energy < BALANCE.daily.energy) { damage += BALANCE.health.lifeSupportFailurePerDay; warnings.push('Life support lacked oxygen or power: health fell.'); }
  if (shieldWasActive && !shieldCanRun) warnings.push('Shield lost power and switched off.');
  if (greenhouse.cropPlanted && !cropCanGrow) warnings.push('Greenhouse needs repair before crops can grow.');
  if (state.buildings.solar.condition !== 'good') warnings.push(solarPotential > 0 ? 'Damaged solar panels made less power.' : 'Solar panels made no power.');
  const health = clamp(state.astronaut.health - damage);
  const daysSurvived = state.daysSurvived + 1;
  const status = health === 0 ? 'defeat' : daysSurvived >= BALANCE.dayLimit ? 'victory' : 'playing';
  const summary = { day: state.day, ...used, energyProduced, shieldEnergyUsed, healthLost: state.astronaut.health - health, warnings };
  const id = Math.max(0, ...state.notices.map((entry) => entry.id)) + 1;
  const text = status === 'victory' ? 'Five days survived! Mission complete!'
    : status === 'defeat' ? 'Life support failed. Try again, astronaut!'
      : `Day ${state.day} complete! Solar +${energyProduced} energy; supplies used.`;
  return {
    ...state, day: Math.min(daysSurvived + 1, BALANCE.dayLimit), daysSurvived,
    resources, buildings: { ...state.buildings, greenhouse: nextGreenhouse, shield: nextShield },
    astronaut: { ...state.astronaut, health }, status,
    scene: status === 'playing' ? state.scene : 'result', lastDaySummary: summary,
    selectedBuildingId: status === 'playing' ? state.selectedBuildingId : null,
    notices: trimNotices([...state.notices, notice(id, text, damage ? 'warn' : 'good')]),
  };
}
