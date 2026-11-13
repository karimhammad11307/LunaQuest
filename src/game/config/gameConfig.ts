/**
 * MOONBOUND — shared layout & mission configuration.
 *
 * Pure constants only: no Phaser, no React. The domain layer imports this
 * for building anchors and mission costs, so keep it dependency-free.
 */
import type { BuildingType, MissionType } from '../../domain/models/types';
import { BALANCE } from './balance';

/** Logical render resolution (integer-scaled to the viewport). */
export const VIEW = { width: 640, height: 360 } as const;

/** Playable world size in logical pixels. */
export const WORLD = { width: 800, height: 480 } as const;

/** Player walk speed in pixels per second. */
export const PLAYER_SPEED = 88;

/** How close the astronaut must be to interact, in pixels. */
export const INTERACT_RADIUS = 54;

/** Distance at which the astronaut counts as "inside" the habitat. */
export const HABITAT_RADIUS = 62;

export interface BuildingLayoutEntry {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  label: string;
  /** Short child-friendly verb shown in the interaction prompt. */
  verb: string;
}

export const BUILDING_LAYOUT: BuildingLayoutEntry[] = [
  { id: 'habitat', type: 'habitat', x: 400, y: 214, label: 'Habitat', verb: 'Refill & rest' },
  { id: 'greenhouse', type: 'greenhouse', x: 232, y: 300, label: 'Greenhouse', verb: 'Plant / harvest' },
  { id: 'solar', type: 'solar', x: 574, y: 252, label: 'Solar Array', verb: 'Collect power' },
  { id: 'shield', type: 'shield', x: 636, y: 384, label: 'Shield', verb: 'Toggle shield' },
  { id: 'landingPad', type: 'landingPad', x: 316, y: 412, label: 'Landing Pad', verb: 'Launch mission' },
];

export const BUILDING_BY_ID: Record<string, BuildingLayoutEntry> = Object.fromEntries(
  BUILDING_LAYOUT.map((entry) => [entry.id, entry]),
);

/** Where the astronaut starts each run (just below the habitat). */
export const SPAWN_POINT = { x: 400, y: 316 } as const;

/** Separate cargo objects, adjacent to the Landing Pad but clear of its collision zone. */
export const EARTH_SUPPLY_DELIVERIES = BALANCE.earthSupply.deliveryDays.map((day, index) => ({
  id: `earth-water-day-${day}`, day, x: 205, y: index === 0 ? 405 : 451,
}));

export interface MissionSpec {
  label: string;
  blurb: string;
  energyCost: number;
  /** Flipped to true by the integration owner once Developer B's scene lands. */
  available: boolean;
  sceneKey: string;
}

/**
 * Developer B registers its scenes under these keys. While `available` is
 * false the landing pad explains that the mission module is pending instead
 * of soft-locking the player into a missing scene.
 */
export const MISSION_CONFIG: Record<MissionType, MissionSpec> = {
  'chicken-hunt': {
    label: 'Galactic Chicken Hunt',
    blurb: 'Fly out, zap alien chickens, bring food home.',
    energyCost: 6,
    available: true,
    sceneKey: 'ChickenHuntScene',
  },
  'ice-collection': {
    label: 'Lunar Ice Run',
    blurb: 'Grab ice crystals before your suit oxygen runs out.',
    energyCost: 4,
    available: false,
    sceneKey: 'IceCollectionScene',
  },
  'shield-drill': {
    label: 'Shield the Base',
    blurb: 'Reach the shield before the radiation warning ends.',
    energyCost: 0,
    available: false,
    sceneKey: 'ShieldDrillScene',
  },
};

/** Texture keys generated at boot; referenced by scene + entity code. */
export const TEXTURES = {
  terrain: 'terrain',
  astronaut: (dir: string, frame: number) => `astro-${dir}-${frame}`,
  building: (type: BuildingType) => `bld-${type}`,
  greenhouseStage: (stage: number) => `bld-greenhouse-${stage}`,
  spark: 'spark',
  shieldRing: 'shield-ring',
} as const;
