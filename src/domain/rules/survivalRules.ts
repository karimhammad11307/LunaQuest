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

let noticeSeq = 0;

function notice(text: string, tone: 'info' | 'good' | 'warn'): GameState['notices'][number] {
  noticeSeq += 1;
  return { id: noticeSeq, text, tone };
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
      suitOxygen: BALANCE.start.suitOxygen,
      thermalSafety: BALANCE.start.thermal,
      radiationExposure: BALANCE.start.radiation,
      position: { ...SPAWN_POINT },
    },
    buildings: createInitialBuildings(),
    activeMission: null,
    activeEventId: null,
    xp: 0,
    weather: {
      source: 'demo',
      label: 'Demo Space Weather',
      observedAt: null,
      riskLevel: 'low',
      isRealData: false,
    },
    status: 'playing',
    notices: [
      notice('Welcome to Moonbound! Walk with WASD or arrow keys.', 'info'),
      notice('Press E near a building to interact. Watch suit oxygen!', 'info'),
    ],
  };
}

/** Real-time outdoor drain of suit oxygen + thermal safety. */
export function tickOutdoor(state: GameState, deltaSeconds: number): GameState {
  if (state.status !== 'playing') return state;
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
    notices.push(notice('Your suit oxygen is low — go back to base!', 'warn'));
  }
  return {
    ...state,
    astronaut: { ...astro, suitOxygen, thermalSafety, health },
    notices: trimNotices(notices),
  };
}
