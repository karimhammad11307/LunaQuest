/**
 * MOONBOUND — deterministic survival rules.
 *
 * Pure functions: no Phaser, no React, no randomness. Every rule is
 * unit-testable via createInitialState + the store's dispatch.
 */
import type { GameState, Resources } from '../models/types';
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
    xp: 0,
    awardedRewardIds: [],
    weather: {
      source: 'demo',
      label: 'Demo Space Weather',
      observedAt: null,
      riskLevel: 'low',
      isRealData: false,
    },
    status: 'playing',
    selectedBuildingId: null,
    lastDaySummary: null,
    notices: [
      notice(1, 'Welcome to Moonbound! Walk with WASD or arrow keys.', 'info'),
      notice(2, 'Press E near a building to interact. Visit all five!', 'info'),
    ],
  };
}

/** Real-time outdoor drain of suit oxygen + thermal safety. */
export function tickOutdoor(state: GameState, deltaSeconds: number): GameState {
  if (state.status !== 'playing' || state.astronaut.location !== 'outside' || state.activeMission) return state;
  const astro = state.astronaut;
  const wasOxygen = Math.floor(astro.suitOxygen);
  const suitOxygen = clamp(astro.suitOxygen - BALANCE.suitOxygenDrainPerSecond * deltaSeconds);
  const thermalSafety = clamp(astro.thermalSafety - BALANCE.thermalDrainPerSecond * deltaSeconds);
  let health = astro.health;
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

/** Reusable environmental exposure rule for later radiation incidents. */
export function applyEnvironmentalDamage(state: GameState, damage: number): GameState {
  if (state.status !== 'playing' || !Number.isFinite(damage) || damage <= 0 || damage > 100) return state;
  const { location } = state.astronaut;
  const protectedHere = location === 'shelter'
    ? state.resources.energy > 0 && state.buildings.shield.condition !== 'broken'
    : location === 'habitat' && state.resources.energy > 0 && state.resources.oxygen > 0 && state.buildings.habitat.condition !== 'broken';
  if (protectedHere) return state;
  const health = clamp(state.astronaut.health - damage);
  return { ...state, astronaut: { ...state.astronaut, health }, status: health === 0 ? 'defeat' : 'playing', scene: health === 0 ? 'result' : state.scene };
}

/** One full completed day, with no Feature 4 production or mission shortcuts. */
export function advanceSurvivalDay(state: GameState): GameState {
  if (state.status !== 'playing' || state.activeMission || state.astronaut.location !== 'habitat') return state;
  const used = {
    food: Math.min(state.resources.food, BALANCE.daily.food),
    water: Math.min(state.resources.water, BALANCE.daily.water),
    oxygen: Math.min(state.resources.oxygen, BALANCE.daily.oxygen),
    energy: Math.min(state.resources.energy, BALANCE.daily.energy),
  };
  const resources: Resources = {
    food: state.resources.food - used.food,
    water: state.resources.water - used.water,
    oxygen: state.resources.oxygen - used.oxygen,
    energy: state.resources.energy - used.energy,
  };
  const warnings: string[] = [];
  let damage = 0;
  if (resources.food === 0) { damage += BALANCE.health.starvePerDay; warnings.push('No food: health fell.'); }
  if (resources.water === 0) { damage += BALANCE.health.dehydratePerDay; warnings.push('No water: health fell.'); }
  if (resources.oxygen === 0 || resources.energy === 0) { damage += BALANCE.health.lifeSupportFailurePerDay; warnings.push('Life support is low: health fell.'); }
  const health = clamp(state.astronaut.health - damage);
  const daysSurvived = state.daysSurvived + 1;
  const status = health === 0 ? 'defeat' : daysSurvived >= BALANCE.dayLimit ? 'victory' : 'playing';
  const summary = { day: state.day, ...used, healthLost: state.astronaut.health - health, warnings };
  const id = Math.max(0, ...state.notices.map((entry) => entry.id)) + 1;
  const text = status === 'victory' ? 'Five days survived! Mission complete!'
    : status === 'defeat' ? 'Life support failed. Try again, astronaut!'
      : `Day ${state.day} complete! Food -${used.food}, water -${used.water}, oxygen -${used.oxygen}, energy -${used.energy}.`;
  return {
    ...state, day: Math.min(daysSurvived + 1, BALANCE.dayLimit), daysSurvived,
    resources, astronaut: { ...state.astronaut, health }, status,
    scene: status === 'playing' ? state.scene : 'result', lastDaySummary: summary,
    selectedBuildingId: status === 'playing' ? state.selectedBuildingId : null,
    notices: trimNotices([...state.notices, notice(id, text, damage ? 'warn' : 'good')]),
  };
}
