/**
 * MOONBOUND — GAME ACTION CONTRACT (frozen for parallel development)
 *
 * Scenes and React dispatch these actions. Only the domain engine
 * mutates state in response. Minigames never touch resources directly:
 * a minigame emits COMPLETE_MISSION with a MissionResult exactly once.
 */
import type { AstronautState, MissionResult, MissionType, GameState, ResourceName, Resources, WeatherStatus } from './types';

export type GameAction =
  /** Internal clock tick from the scene update loop. */
  | { type: 'TICK'; deltaSeconds: number }
  | { type: 'SET_PAUSED'; paused: boolean }
  | { type: 'SET_SPACE_WEATHER'; weather: WeatherStatus }
  | { type: 'MOVE_PLAYER'; x: number; y: number }
  | { type: 'INTERACT_BUILDING'; buildingId: string }
  | { type: 'CLOSE_BUILDING' }
  | { type: 'ENTER_HABITAT' }
  | { type: 'LEAVE_HABITAT' }
  | { type: 'ENTER_SHELTER' }
  | { type: 'LEAVE_SHELTER' }
  | { type: 'REFILL_SUIT_OXYGEN' }
  | { type: 'EAT_FOOD' }
  | { type: 'REST_AT_HABITAT' }
  | { type: 'APPLY_ENVIRONMENTAL_EXPOSURE'; damage: number }
  | { type: 'COLLECT_RESOURCE'; resource: ResourceName; amount: number }
  | { type: 'SPEND_RESOURCES'; costs: Partial<Resources> }
  | { type: 'ADD_XP'; amount: number; rewardId: string }
  | { type: 'UPDATE_ASTRONAUT'; changes: Partial<Pick<AstronautState, 'health' | 'suitOxygen' | 'thermalSafety' | 'radiationExposure'>> }
  | { type: 'UPDATE_MISSION_PROGRESS'; runId: string; elapsedSeconds: number; collectedResources: Partial<Resources> }
  | {
      type: 'START_MISSION';
      mission: MissionType;
      runId: string;
    }
  | { type: 'COMPLETE_MISSION'; result: MissionResult }
  | { type: 'ADVANCE_DAY' }
  | { type: 'PLANT_CROP' }
  | { type: 'HARVEST_CROP' }
  | { type: 'ACTIVATE_SHIELD'; active: boolean }
  | { type: 'REPAIR_BUILDING'; buildingId: string }
  | { type: 'RESOLVE_EVENT'; eventId: string; choiceId: 'ignore' | 'isolate' }
  | { type: 'RESTART_GAME' }
  | { type: 'LOAD_GAME'; state: GameState }
  | { type: 'DISMISS_NOTICE'; noticeId: number };
