/**
 * MOONBOUND — all balancing values live here and nowhere else.
 * Units are simplified GAME units (0–100), not real lunar measurements.
 */
export const BALANCE = {
  /** Logical render resolution. */
  view: { width: 640, height: 360 },
  /** Playable world size in pixels. */
  world: { width: 800, height: 480 },

  start: {
    food: 55,
    water: 65,
    oxygen: 80,
    energy: 75,
    health: 100,
    suitOxygen: 100,
    thermal: 100,
    radiation: 0,
  },

  /** Charged once per day when the player advances to the next day. */
  daily: {
    food: 7,
    water: 9,
    oxygen: 6,
    energy: 5,
  },

  /** Solar array produces this each day when healthy. */
  solarDailyYield: 16,
  /** Manual "collect power" interaction. */
  solarCollectYield: 7,

  /** Real-time outdoor drain (per second while outside the habitat). */
  suitOxygenDrainPerSecond: 0.45,
  thermalDrainPerSecond: 0.25,
  thermalRecoveryOnRest: 100,

  radiation: {
    perDayModerate: 8,
    perDayHigh: 18,
    shieldReduction: 0.85,
    damageAbove: 70,
    damagePerDay: 6,
  },

  greenhouse: {
    waterCost: 10,
    energyCost: 4,
    growthPerDay: 1,
    foodYield: 26,
    oxygenYield: 4,
  },

  shield: {
    activationEnergy: 8,
    dailyEnergyUpkeep: 3,
  },

  habitat: {
    /** Base oxygen spent per unit of suit oxygen refilled. */
    transferRatio: 0.7,
    healFoodCost: 5,
    healWaterCost: 5,
    healEnergyCost: 4,
    healAmount: 12,
    eatFoodCost: 10,
    eatHealAmount: 20,
  },

  solar: {
    collectEnergyCost: 0,
  },

  repair: {
    energyCost: 10,
    conditionAfterRepair: 'good' as const,
  },

  health: {
    starvePerDay: 8,
    dehydratePerDay: 12,
    lifeSupportFailurePerDay: 14,
    suitOxygenEmptyPerSecond: 2,
    lowOxygenThreshold: 10,
  },

  dayLimit: 5,

  xp: {
    mission: 20,
    emergency: 15,
    supplies: 5,
    daySurvived: 10,
  },

  missionResult: {
    maxXp: 100,
    maxDurationSeconds: 3600,
    maxRunIdLength: 80,
  },

  warnings: {
    food: 20,
    water: 20,
    oxygen: 20,
    energy: 15,
    suitOxygen: 25,
    health: 35,
    radiation: 60,
  },
} as const;

export type Balance = typeof BALANCE;
