import type { GameAction } from '../models/GameAction';
import type { AstronautState, GameState, MissionResult, MissionType, ResourceName, Resources } from '../models/types';
import { BALANCE } from '../../game/config/balance';
import { BUILDING_LAYOUT, MISSION_CONFIG, WORLD } from '../../game/config/gameConfig';
import type { MissionSpec } from '../../game/config/gameConfig';
import { advanceSurvivalDay, applyEnvironmentalDamage, clamp, createInitialState, tickOutdoor, trimNotices } from './survivalRules';

export type MissionCatalog = Record<MissionType, Pick<MissionSpec, 'available' | 'energyCost'>>;
const resources: ResourceName[] = ['food', 'water', 'oxygen', 'energy'];
const statusFields: (keyof Pick<AstronautState, 'health' | 'suitOxygen' | 'thermalSafety' | 'radiationExposure'>)[] = [
  'health', 'suitOxygen', 'thermalSafety', 'radiationExposure',
];
const buildingMessages: Record<string, string> = {
  habitat: 'Habitat online! Your crew has a safe home.',
  greenhouse: 'Greenhouse ready! Farming unlocks soon.',
  solar: 'Solar array ready! Check stored energy.',
  shield: 'Radiation shelter ready! Step inside for protection.',
  landingPad: 'Landing pad ready! Supply missions unlock soon.',
};

const numberIn = (value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

const validRunId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= BALANCE.missionResult.maxRunIdLength && /^[A-Za-z0-9_-]+$/.test(value);

/** Accept only the four known resource names and finite, nonnegative amounts. */
function validResourceMap(value: unknown, requirePositive = false): value is Partial<Resources> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  if (requirePositive && !entries.some(([, amount]) => numberIn(amount, Number.MIN_VALUE, 100))) return false;
  return entries.every(([name, amount]) => resources.includes(name as ResourceName) && numberIn(amount, 0, 100));
}

function withNotice(state: GameState, text: string, tone: 'info' | 'good' | 'warn'): GameState {
  const id = Math.max(0, ...state.notices.map((entry) => entry.id)) + 1;
  return { ...state, notices: trimNotices([...state.notices, { id, text, tone }]) };
}

function validMissionResult(value: unknown): value is MissionResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<MissionResult>;
  return validRunId(result.runId)
    && typeof result.missionType === 'string'
    && Object.prototype.hasOwnProperty.call(MISSION_CONFIG, result.missionType)
    && typeof result.success === 'boolean'
    && typeof result.returnedSafely === 'boolean'
    && validResourceMap(result.collectedResources)
    && numberIn(result.healthDamage, 0, 100)
    && Number.isInteger(result.xpEarned) && numberIn(result.xpEarned, 0, BALANCE.missionResult.maxXp)
    && numberIn(result.duration, 0, BALANCE.missionResult.maxDurationSeconds)
    && typeof result.educationalMessage === 'string'
    && result.educationalMessage.trim().length > 0
    && result.educationalMessage.length <= 240;
}

function validLoadedState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<GameState>;
  const sceneIds = ['title', 'moon-base', 'chicken-hunt', 'ice-collection', 'result'];
  return numberIn(state.day, 1, BALANCE.dayLimit)
    && Number.isInteger(state.daysSurvived) && numberIn(state.daysSurvived, 0, BALANCE.dayLimit)
    && numberIn(state.timeOfDay, 0, 1)
    && sceneIds.includes(state.scene ?? '')
    && validResourceMap(state.resources)
    && resources.every((name) => numberIn(state.resources?.[name], 0, 100))
    && !!state.astronaut
    && ['outside', 'habitat', 'shelter'].includes(state.astronaut.location)
    && statusFields.every((name) => numberIn(state.astronaut?.[name], 0, 100))
    && numberIn(state.astronaut.position?.x, 0, WORLD.width)
    && numberIn(state.astronaut.position?.y, 0, WORLD.height)
    && !!state.buildings && typeof state.buildings === 'object' && !Array.isArray(state.buildings)
    && BUILDING_LAYOUT.every(({ id, type }) => {
      const building = state.buildings?.[id];
      return building?.id === id && building.type === type
        && Number.isInteger(building.level) && numberIn(building.level, 1, 10)
        && (building.condition === 'good' || building.condition === 'damaged' || building.condition === 'broken')
        && typeof building.active === 'boolean'
        && numberIn(building.cropGrowth, 0, 1)
        && typeof building.cropPlanted === 'boolean';
    })
    && Number.isInteger(state.xp) && numberIn(state.xp, 0)
    && Array.isArray(state.awardedRewardIds)
    && state.awardedRewardIds.every(validRunId)
    && new Set(state.awardedRewardIds).size === state.awardedRewardIds.length
    && Array.isArray(state.completedMissionRunIds)
    && state.completedMissionRunIds.every(validRunId)
    && new Set(state.completedMissionRunIds).size === state.completedMissionRunIds.length
    && (state.activeMission === null || (typeof state.activeMission === 'string' && Object.prototype.hasOwnProperty.call(MISSION_CONFIG, state.activeMission)))
    && (state.activeMissionRunId === null || validRunId(state.activeMissionRunId))
    && (state.activeMission === null) === (state.activeMissionRunId === null)
    && (state.missionProgress === null || (
      validRunId(state.missionProgress?.runId)
      && state.missionProgress?.runId === state.activeMissionRunId
      && state.missionProgress?.missionType === state.activeMission
      && numberIn(state.missionProgress?.elapsedSeconds, 0, BALANCE.missionResult.maxDurationSeconds)
      && validResourceMap(state.missionProgress?.collectedResources)
    ))
    && (state.activeMission === null) === (state.missionProgress === null)
    && (state.lastMissionResult === null || (validMissionResult(state.lastMissionResult) && state.completedMissionRunIds.includes(state.lastMissionResult.runId)))
    && (state.activeEventId === null || typeof state.activeEventId === 'string')
    && !!state.weather
    && (state.weather.source === 'live' || state.weather.source === 'cached' || state.weather.source === 'demo' || state.weather.source === 'loading')
    && typeof state.weather.label === 'string'
    && (state.weather.observedAt === null || typeof state.weather.observedAt === 'string')
    && (state.weather.riskLevel === 'low' || state.weather.riskLevel === 'moderate' || state.weather.riskLevel === 'high')
    && typeof state.weather.isRealData === 'boolean'
    && (state.status === 'playing' || state.status === 'victory' || state.status === 'defeat')
    && (state.selectedBuildingId === null || (typeof state.selectedBuildingId === 'string' && !!state.buildings[state.selectedBuildingId]))
    && (state.lastDaySummary === null || (!!state.lastDaySummary && Number.isInteger(state.lastDaySummary.day)
      && numberIn(state.lastDaySummary.day, 1, BALANCE.dayLimit)
      && resources.every((name) => numberIn(state.lastDaySummary?.[name], 0, 100))
      && numberIn(state.lastDaySummary.healthLost, 0, 100)
      && Array.isArray(state.lastDaySummary.warnings)
      && state.lastDaySummary.warnings.every((warning) => typeof warning === 'string')))
    && Array.isArray(state.notices)
    && state.notices.every((entry) => Number.isInteger(entry?.id) && numberIn(entry.id, 0) && typeof entry.text === 'string' && (entry.tone === 'info' || entry.tone === 'good' || entry.tone === 'warn'));
}

/** Pure, deterministic action handling. Invalid actions return the identical state object. */
export function reduceGameState(state: GameState, action: GameAction, missions: MissionCatalog = MISSION_CONFIG): GameState {
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') return state;
  if (action.type === 'LOAD_GAME') return validLoadedState(action.state) ? action.state : state;
  if (action.type === 'RESTART_GAME') return createInitialState();
  if (action.type === 'DISMISS_NOTICE') {
    if (!state.notices.some((entry) => entry.id === action.noticeId)) return state;
    return { ...state, notices: state.notices.filter((entry) => entry.id !== action.noticeId) };
  }
  if (state.status !== 'playing') return state;

  switch (action.type) {
    case 'TICK':
      return numberIn(action.deltaSeconds, Number.MIN_VALUE, 5) ? tickOutdoor(state, action.deltaSeconds) : state;
    case 'MOVE_PLAYER': {
      if (state.astronaut.location !== 'outside') return state;
      if (!numberIn(action.x, 0, WORLD.width) || !numberIn(action.y, 0, WORLD.height)) return state;
      if (state.astronaut.position.x === action.x && state.astronaut.position.y === action.y) return state;
      return { ...state, astronaut: { ...state.astronaut, position: { x: action.x, y: action.y } } };
    }
    case 'INTERACT_BUILDING': {
      if (typeof action.buildingId !== 'string' || !state.buildings[action.buildingId]) return state;
      if (state.astronaut.location !== 'outside' && (state.astronaut.location === 'habitat' ? action.buildingId !== 'habitat' : action.buildingId !== 'shield')) return state;
      return withNotice({ ...state, selectedBuildingId: action.buildingId }, buildingMessages[action.buildingId] ?? 'Building ready!', 'good');
    }
    case 'CLOSE_BUILDING':
      return state.selectedBuildingId === null ? state : { ...state, selectedBuildingId: null };
    case 'ENTER_HABITAT':
      if (state.selectedBuildingId !== 'habitat' || state.astronaut.location !== 'outside') return state;
      return withNotice({ ...state, astronaut: { ...state.astronaut, location: 'habitat' } }, 'Welcome home, astronaut! Suit oxygen is safe indoors.', 'good');
    case 'LEAVE_HABITAT':
      if (state.astronaut.location !== 'habitat') return state;
      return withNotice({ ...state, astronaut: { ...state.astronaut, location: 'outside' } }, 'Back outside. Watch your suit oxygen!', 'info');
    case 'ENTER_SHELTER':
      if (state.selectedBuildingId !== 'shield' || state.astronaut.location !== 'outside') return state;
      return withNotice({ ...state, astronaut: { ...state.astronaut, location: 'shelter' } }, 'Shelter entered. You are protected while it has power.', 'good');
    case 'LEAVE_SHELTER':
      if (state.astronaut.location !== 'shelter') return state;
      return withNotice({ ...state, astronaut: { ...state.astronaut, location: 'outside' } }, 'You left the shelter.', 'info');
    case 'EAT_FOOD': {
      if (state.astronaut.location !== 'habitat' || state.astronaut.health >= 100 || state.resources.food < BALANCE.habitat.eatFoodCost) return state;
      return withNotice({ ...state, resources: { ...state.resources, food: state.resources.food - BALANCE.habitat.eatFoodCost },
        astronaut: { ...state.astronaut, health: clamp(state.astronaut.health + BALANCE.habitat.eatHealAmount) } }, 'Yum! Food restored your health.', 'good');
    }
    case 'REFILL_SUIT_OXYGEN': {
      if (state.astronaut.location !== 'habitat' || state.astronaut.suitOxygen >= 100 || state.resources.oxygen <= 0) return state;
      const required = (100 - state.astronaut.suitOxygen) * BALANCE.habitat.transferRatio;
      const spent = Math.min(required, state.resources.oxygen);
      const gained = spent / BALANCE.habitat.transferRatio;
      if (gained <= 0) return state;
      return withNotice({ ...state, resources: { ...state.resources, oxygen: clamp(state.resources.oxygen - spent) },
        astronaut: { ...state.astronaut, suitOxygen: clamp(state.astronaut.suitOxygen + gained) } }, 'Suit oxygen refilled from base storage.', 'good');
    }
    case 'REST_AT_HABITAT': {
      const h = BALANCE.habitat;
      if (state.astronaut.location !== 'habitat' || state.astronaut.health >= 100
        || state.resources.food < h.healFoodCost || state.resources.water < h.healWaterCost || state.resources.energy < h.healEnergyCost) return state;
      return withNotice({ ...state, resources: { ...state.resources, food: state.resources.food - h.healFoodCost,
        water: state.resources.water - h.healWaterCost, energy: state.resources.energy - h.healEnergyCost },
        astronaut: { ...state.astronaut, health: clamp(state.astronaut.health + h.healAmount), thermalSafety: BALANCE.thermalRecoveryOnRest } }, 'Rest complete! Health and thermal safety improved.', 'good');
    }
    case 'ADVANCE_DAY':
      return advanceSurvivalDay(state);
    case 'APPLY_ENVIRONMENTAL_EXPOSURE':
      return applyEnvironmentalDamage(state, action.damage);
    case 'COLLECT_RESOURCE': {
      if (state.activeMission) return state;
      if (!resources.includes(action.resource) || !numberIn(action.amount, Number.MIN_VALUE, 100)) return state;
      const value = clamp(state.resources[action.resource] + action.amount);
      if (value === state.resources[action.resource]) return state;
      return { ...state, resources: { ...state.resources, [action.resource]: value } };
    }
    case 'SPEND_RESOURCES': {
      if (state.activeMission) return state;
      if (!validResourceMap(action.costs, true)) return state;
      if (Object.entries(action.costs).some(([name, cost]) => state.resources[name as ResourceName] < cost!)) return state;
      const next = { ...state.resources };
      for (const [name, cost] of Object.entries(action.costs)) next[name as ResourceName] -= cost!;
      return { ...state, resources: next };
    }
    case 'ADD_XP': {
      if (state.activeMission) return state;
      if (!validRunId(action.rewardId) || state.awardedRewardIds.includes(action.rewardId)) return state;
      if (!Number.isInteger(action.amount) || !numberIn(action.amount, Number.MIN_VALUE)) return state;
      if (!Number.isSafeInteger(state.xp + action.amount)) return state;
      return { ...state, xp: state.xp + action.amount, awardedRewardIds: [...state.awardedRewardIds, action.rewardId] };
    }
    case 'UPDATE_ASTRONAUT': {
      const changes = action.changes;
      if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return state;
      const entries = Object.entries(changes);
      if (!entries.length || !entries.every(([name, value]) => statusFields.includes(name as typeof statusFields[number]) && numberIn(value, 0, 100))) return state;
      if (entries.every(([name, value]) => state.astronaut[name as typeof statusFields[number]] === value)) return state;
      const astronaut = { ...state.astronaut, ...changes };
      return { ...state, astronaut, status: astronaut.health === 0 ? 'defeat' : state.status };
    }
    case 'START_MISSION': {
      if (state.activeMission || !validRunId(action.runId) || state.completedMissionRunIds.includes(action.runId)) return state;
      if (!Object.prototype.hasOwnProperty.call(missions, action.mission)) return state;
      const spec = missions[action.mission];
      if (!spec.available || !numberIn(spec.energyCost, 0, 100) || state.resources.energy < spec.energyCost) return state;
      return {
        ...state,
        scene: action.mission === 'shield-drill' ? 'moon-base' : action.mission,
        resources: { ...state.resources, energy: state.resources.energy - spec.energyCost },
        activeMission: action.mission,
        activeMissionRunId: action.runId,
        missionProgress: { runId: action.runId, missionType: action.mission, elapsedSeconds: 0, collectedResources: {} },
        lastMissionResult: null,
      };
    }
    case 'UPDATE_MISSION_PROGRESS': {
      if (!state.missionProgress || action.runId !== state.activeMissionRunId) return state;
      if (!numberIn(action.elapsedSeconds, state.missionProgress.elapsedSeconds, BALANCE.missionResult.maxDurationSeconds)) return state;
      if (!validResourceMap(action.collectedResources)) return state;
      if (Object.entries(state.missionProgress.collectedResources).some(([name, amount]) => (action.collectedResources[name as ResourceName] ?? 0) < amount!)) return state;
      return { ...state, missionProgress: { ...state.missionProgress, elapsedSeconds: action.elapsedSeconds, collectedResources: { ...action.collectedResources } } };
    }
    case 'COMPLETE_MISSION': {
      const result = action.result;
      if (!validMissionResult(result) || state.completedMissionRunIds.includes(result.runId)) return state;
      if (!state.activeMission || result.runId !== state.activeMissionRunId || result.missionType !== state.activeMission) return state;
      const rewarded = result.success && result.returnedSafely;
      const awardedResources: Partial<Resources> = rewarded ? { ...result.collectedResources } : {};
      const awardedXp = rewarded ? result.xpEarned : 0;
      if (!Number.isSafeInteger(state.xp + awardedXp)) return state;
      const nextResources = { ...state.resources };
      for (const [name, amount] of Object.entries(awardedResources)) nextResources[name as ResourceName] = clamp(nextResources[name as ResourceName] + amount!);
      const health = clamp(state.astronaut.health - result.healthDamage);
      const appliedResult: MissionResult = { ...result, collectedResources: awardedResources, xpEarned: awardedXp };
      const next: GameState = {
        ...state,
        scene: health === 0 ? 'result' : 'moon-base',
        resources: nextResources,
        astronaut: { ...state.astronaut, health },
        xp: state.xp + awardedXp,
        activeMission: null,
        activeMissionRunId: null,
        missionProgress: null,
        completedMissionRunIds: [...state.completedMissionRunIds, result.runId],
        lastMissionResult: appliedResult,
        status: health === 0 ? 'defeat' : state.status,
      };
      return withNotice(next, rewarded ? `Mission returned! +${awardedXp} XP` : 'Mission ended. Crew returned without supplies.', rewarded ? 'good' : 'warn');
    }
    default:
      // Farming, shielding upgrades and incidents belong to later features.
      return state;
  }
}
