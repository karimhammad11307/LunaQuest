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
  location: 'outside' | 'habitat' | 'greenhouse' | 'shelter';
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
  /** Greenhouse crop growth 0–1: seed at 0, sprout during day transition, ready at 1. */
  cropGrowth: number;
  /** Crop planted (greenhouse only). */
  cropPlanted: boolean;
  /** Reserved for an optional future once-per-day manual collection mechanic. */
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

/** Personal record is stored separately from the active run. */
export interface PersonalBest {
  bestDaysSurvived: number;
  bestScore: number;
}

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
  /** The latest normalized DONKI record, if one exists in the bounded query window. */
  latestEventType: import('./SpaceWeather').DonkiEventType | null;
  observationCount: number;
  /** UTC time when the service last fetched or loaded the source report. */
  checkedAt: string | null;
  fallbackReason: 'offline' | 'timeout' | 'rate-limit' | 'http-error' | 'invalid-response' | null;
  partial: boolean;
}

export type EmergencyType = 'solar-storm' | 'oxygen-leak';
export type EmergencyChoice = 'shelter' | 'shield' | 'ignore' | 'repair' | 'isolate' | 'habitat';

/** Runtime countdowns live in the shared domain state, never in a scene timer. */
export interface EmergencyState {
  id: string;
  type: EmergencyType;
  phase: 'warning' | 'danger';
  remainingSeconds: number;
  pulseSeconds: number;
  tookDamage: boolean;
  ignored: boolean;
}

export interface EmergencyOutcome {
  id: string;
  choice: EmergencyChoice;
  xpEarned: number;
  message: string;
  takeaway: string;
}

export interface GameState {
  day: number;
  /** Completed survival days; the player starts Day 1 with zero completed days. */
  daysSurvived: number;
  /** Record at this run's start, for a truthful New Record result after reload. */
  recordToBeat: PersonalBest;
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
  /** Earth water cargo IDs collected; due/uncollected pods are derived from day. */
  collectedEarthSupplyIds: string[];
  lastMissionResult: MissionResult | null;
  activeEventId: string | null;
  activeEvent: EmergencyState | null;
  completedEventIds: string[];
  /** Due incidents waiting behind the current one, in deterministic order. */
  pendingEventIds: string[];
  lastEventOutcome: EmergencyOutcome | null;
  /** One limited Habitat oxygen-recycling action per displayed lunar day. */
  lastOxygenRecycleDay: number;
  xp: number;
  /** Idempotency keys for non-mission XP awards (tutorials and future events). */
  awardedRewardIds: string[];
  weather: WeatherStatus;
  status: GameStatus;
  /** Suspends base-world simulation and gameplay actions without ending the run. */
  paused: boolean;
  selectedBuildingId: string | null;
  lastDaySummary: {
    day: number;
    food: number;
    water: number;
    oxygen: number;
    energy: number;
    /** Actual solar charge stored after capacity clamping. */
    energyProduced: number;
    shieldEnergyUsed: number;
    healthLost: number;
    warnings: string[];
  } | null;
  /** Message log entries for HUD feedback (most recent last). */
  notices: { id: number; text: string; tone: 'info' | 'good' | 'warn' }[];
}
