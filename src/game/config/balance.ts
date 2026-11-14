/**
 * LUNAQUEST — all balancing values live here and nowhere else.
 * Units are simplified GAME units (0–100), not real lunar measurements.
 */
export const BALANCE = {
  /** Logical render resolution. */
  view: { width: 640, height: 360 },
  /** Playable world size in pixels. */
  world: { width: 800, height: 480 },

  start: {
    food: 55,
    water: 40,
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

  /** Illustrative Earth cargo schedule; no recurring deliveries yet. */
  earthSupply: { deliveryDays: [2, 4], waterPerPod: 25, interactionRadius: 38 },

  /** Simplified illuminated workday: one charge on ADVANCE_DAY, no lunar day/night model. */
  solarDailyYield: 16,
  /** Damaged panels produce half yield; broken or inactive panels produce zero. */
  solarDamagedEfficiency: 0.5,

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

  /** Scripted, illustrative hazards. Durations are real play seconds; damage and losses are game units. */
  emergencies: {
    storm: { id: 'solar-day-2', triggerAfterDays: 1, warningSeconds: 24, dangerSeconds: 12,
      damagePerPulse: 3, exposurePerPulse: 5, pulseSeconds: 1, shieldRadius: 260, xp: 15 },
    leak: { id: 'oxygen-leak-day-3', triggerAfterDays: 2, warningSeconds: 8,
      oxygenLossPerPulse: 1, pulseSeconds: 1, criticalOxygen: 10, criticalHpLossPerPulse: 2,
      isolateEnergyCost: 4, isolateOxygenCost: 5, repairXp: 15, isolateXp: 8 },
  },

  greenhouse: {
    waterCost: 10,
    energyCost: 4,
    /** One full day from planted seed to harvest-ready crop. */
    growthPerDay: 1,
    foodYield: 26,
    oxygenYield: 4,
  },

  shield: {
    activationEnergy: 8,
    dailyEnergyUpkeep: 3,
  },

  habitat: {
    /** Illustrative closed-loop recovery: one limited reserve cycle per day. */
    recycleEnergyCost: 8,
    recycleOxygenGain: 15,
    /** Base oxygen spent per unit of suit oxygen refilled. */
    transferRatio: 0.7,
    healFoodCost: 5,
    healWaterCost: 5,
    healEnergyCost: 4,
    healAmount: 12,
    eatFoodCost: 10,
    eatHealAmount: 20,
  },

  repair: {
    energyCost: 10,
    conditionAfterRepair: 'good' as const,
  },

  health: {
    /** Gentle active-play fatigue: 3 HP per minute, in illustrative game units. */
    passivePerSecond: 0.05,
    starvePerDay: 8,
    dehydratePerDay: 12,
    lifeSupportFailurePerDay: 14,
    suitOxygenEmptyPerSecond: 2,
    lowOxygenThreshold: 10,
  },

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
