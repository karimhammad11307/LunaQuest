/**
 * MOONBOUND — GAME ACTION CONTRACT (frozen for parallel development)
 *
 * Scenes and React dispatch these actions. Only the domain engine
 * mutates state in response. Minigames never touch resources directly:
 * a minigame emits COMPLETE_MISSION with a MissionResult exactly once.
 */
import type { MissionResult, MissionType, GameState } from './types';

export type GameAction =
  /** Internal clock tick from the scene update loop. */
  | { type: 'TICK'; deltaSeconds: number }
  | { type: 'MOVE_PLAYER'; x: number; y: number }
  | { type: 'INTERACT_BUILDING'; buildingId: string }
  | {
      type: 'START_MISSION';
      mission: MissionType;
    }
  | { type: 'COMPLETE_MISSION'; result: MissionResult }
  | { type: 'ADVANCE_DAY' }
  | { type: 'PLANT_CROP' }
  | { type: 'HARVEST_CROP' }
  | { type: 'ACTIVATE_SHIELD'; active: boolean }
  | { type: 'REPAIR_BUILDING'; buildingId: string }
  | { type: 'RESOLVE_EVENT'; eventId: string; choiceId: string }
  | { type: 'RESTART_GAME' }
  | { type: 'LOAD_GAME'; state: GameState }
  | { type: 'DISMISS_NOTICE'; noticeId: number };
