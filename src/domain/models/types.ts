/**
 * MOONBOUND — SHARED DOMAIN CONTRACT (frozen for parallel development)
 *
 * Developer A owns this file. Developer B must consume these types,
 * never redefine them. See docs/MASTER_PLAN.md and developer task plans.
 *
 * Domain rules never import Phaser or React.
 */

/** Survival resources. All values are simplified GAME UNITS, 0–100. */
export interface Resources {
  food: number;
  water: number;
  /** Stored base oxygen (habitat supply). */
  oxygen: number;
  /** Stored electrical energy (batteries). */
  energy: number;
}

export type ResourceName = keyof Resources;

/** Astronaut physical state, 0–100 unless noted. */
export interface AstronautState {
  health: number;
  /** Current protection zone; only outside consumes portable oxygen. */
  location: 'outside' | 'habitat' | 'shelter';
  /** Portable EVA suit oxygen, drains while outside. */
  suitOxygen: number;
  /** Suit thermal protection remaining (%). */
  thermalSafety: number;
  /** Accumulated radiation exposure, 0–100. */
  radiationExposure: number;
  /** Logical world position (pixels, base scene). */
  position: { x: number; y: number };
}

export type BuildingType =
  | 'habitat'
  | 'greenhouse'
  | 'solar'
  | 'shield'
  | 'landingPad';

export type BuildingCondition = 'good' | 'damaged' | 'broken';

export interface BuildingState {
  id: string;
  type: BuildingType;
  level: number;
  condition: BuildingCondition;
  /** Currently powered / operating. */
  active: boolean;
  /** Greenhouse crop growth 0–1 when type === 'greenhouse'. */
  cropGrowth: number;
  /** Crop planted (greenhouse only). */
  cropPlanted: boolean;
  /**
   * Day index on which a once-per-day interaction (solar collection) was
   * last used. Optional so Developer B's code can construct BuildingState
   * without it.
   */
  lastCollectedDay?: number;
}

export type MissionType = 'chicken-hunt' | 'ice-collection' | 'shield-drill';

export type GameSceneId =
  | 'title'
  | 'moon-base'
  | 'chicken-hunt'
  | 'ice-collection'
  | 'result';

export interface MissionResult {
  /** Unique ID supplied at launch and returned unchanged by the mission scene. */
  runId: string;
  missionType: MissionType;
  success: boolean;
  /** Player returned to base without being carried home. */
  returnedSafely: boolean;
  /** Resources gained, in game units. */
  collectedResources: Partial<Resources>;
  /** Health damage taken (positive number reduces health). */
  healthDamage: number;
  xpEarned: number;
  /** Mission duration in seconds. */
  duration: number;
  educationalMessage: string;
}

/** Provisional mission data. It never changes base supplies until completion. */
export interface MissionProgress {
  runId: string;
  missionType: MissionType;
  elapsedSeconds: number;
  collectedResources: Partial<Resources>;
}

export type GameStatus = 'playing' | 'victory' | 'defeat';

export type WeatherSource = 'live' | 'cached' | 'demo' | 'loading';

export interface WeatherStatus {
  source: WeatherSource;
  /** Short label, e.g. "M-class Solar Flare". */
  label: string;
  /** ISO date string of the NASA observation, if any. */
  observedAt: string | null;
  /** Game risk category derived by documented simplified rules. */
  riskLevel: 'low' | 'moderate' | 'high';
  /** True when data comes from NASA DONKI, false when demo fixture. */
  isRealData: boolean;
}

export interface GameState {
  day: number;
  /** Completed survival turns; victory follows the fifth completed turn. */
  daysSurvived: number;
  /** 0–1 progress through the current day. */
  timeOfDay: number;
  scene: GameSceneId;
  resources: Resources;
  astronaut: AstronautState;
  buildings: Record<string, BuildingState>;
  activeMission: MissionType | null;
  activeMissionRunId: string | null;
  missionProgress: MissionProgress | null;
  /** Persist this ledger with the session so replayed result messages have no effect. */
  completedMissionRunIds: string[];
  lastMissionResult: MissionResult | null;
  activeEventId: string | null;
  xp: number;
  /** Idempotency keys for non-mission XP awards (tutorials and future events). */
  awardedRewardIds: string[];
  weather: WeatherStatus;
  status: GameStatus;
  selectedBuildingId: string | null;
  lastDaySummary: { day: number; food: number; water: number; oxygen: number; energy: number; healthLost: number; warnings: string[] } | null;
  /** Message log entries for HUD feedback (most recent last). */
  notices: { id: number; text: string; tone: 'info' | 'good' | 'warn' }[];
}
