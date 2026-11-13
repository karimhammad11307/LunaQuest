/**
 * MOONBOUND — Developer B: Arcade Sprite Generator
 *
 * Procedurally draws all Chicken Hunt / Ice Collection sprites using
 * only colours from the shared PALETTE.  Every function returns a
 * Phaser texture key string that it also registers on the given scene.
 *
 * Rules:
 * - Import PALETTE; never hardcode hex values.
 * - No Phaser Physics / GameObjects created here — pure texture work.
 * - Called once from ChickenHuntScene.preload() / IceCollectionScene.preload().
 * - All sprites are designed for the logical 640×360 viewport.
 */

import Phaser from 'phaser';
import { PALETTE } from '../config/palette';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Convert a palette hex string to [r, g, b]. */
function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}

/** Fill a rectangular region on a canvas context with one palette colour. */
function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  hex: string,
  alpha = 1,
): void {
  const [r, g, b] = hexToRgb(hex);
  ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
  ctx.fillRect(x, y, w, h);
}

/** Create an off-screen canvas, draw via the callback, add as Phaser texture. */
function makeTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): string {
  if (scene.textures.exists(key)) return key; // idempotent

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  scene.textures.addCanvas(key, canvas);
  return key;
}

/** Create a multi-frame texture by drawing each frame at x = frame * w. */
function makeFrameTexture(
  scene: Phaser.Scene,
  key: string,
  frameW: number,
  frameH: number,
  frameCount: number,
  draw: (ctx: CanvasRenderingContext2D, frame: number) => void,
): string {
  if (scene.textures.exists(key)) return key;

  const canvas = document.createElement('canvas');
  canvas.width = frameW * frameCount;
  canvas.height = frameH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let f = 0; f < frameCount; f++) {
    ctx.save();
    ctx.translate(f * frameW, 0);
    draw(ctx, f);
    ctx.restore();
  }

  scene.textures.addCanvas(key, canvas);

  // Register individual frame names so Phaser animations can reference them.
  const texture = scene.textures.get(key);
  for (let f = 0; f < frameCount; f++) {
    texture.add(f, 0, f * frameW, 0, frameW, frameH);
  }

  return key;
}

// ---------------------------------------------------------------------------
// Texture key constants (Dev A may read these to wire up scene registration)
// ---------------------------------------------------------------------------

export const ARCADE_TEXTURE_KEYS = {
  spaceship: 'arcade-spaceship',          // 2 frames: idle (0) + thrust (1)
  alienBirdA: 'arcade-alien-a',           // 2 frames: idle (0) + flap (1)
  alienBirdB: 'arcade-alien-b',           // 2 frames: idle (0) + flap (1)
  laserPlayer: 'arcade-laser-player',     // 1 frame
  laserEnemy: 'arcade-laser-enemy',       // 1 frame
  foodGrain: 'arcade-food-grain',         // 1 frame
  iceCrystal: 'arcade-ice-crystal',       // 1 frame
  impactBurst: 'arcade-impact-burst',     // 2 frames: burst (0) + fade (1)
  starfieldNear: 'arcade-stars-near',     // tileable 128×128 star field
  starfieldFar: 'arcade-stars-far',       // tileable 128×128 star field (dimmer)
} as const;

export type ArcadeTextureKey = typeof ARCADE_TEXTURE_KEYS[keyof typeof ARCADE_TEXTURE_KEYS];

// ---------------------------------------------------------------------------
// B1 — Spaceship  (32×32, 2 frames)
// 3/4 top-down: craft wider than tall, cockpit at top-centre, wings angled
// slightly toward the camera, engine glow at bottom.
// ---------------------------------------------------------------------------

export function generateSpaceshipTexture(scene: Phaser.Scene): string {
  const FW = 32, FH = 32;
  const key = ARCADE_TEXTURE_KEYS.spaceship;

  return makeFrameTexture(scene, key, FW, FH, 2, (ctx, frame) => {
    const thrustFrame = frame === 1;

    // --- Hull body (3/4 top-down elongated diamond) ---
    // Centre column
    px(ctx, 14, 6, 4, 18, PALETTE.suitWhite);
    // Upper cockpit blister
    px(ctx, 13, 4, 6, 4, PALETTE.suitShadow);
    px(ctx, 14, 3, 4, 3, PALETTE.visor);         // cockpit glass (cyan)
    px(ctx, 15, 3, 2, 2, PALETTE.cyanGlow);       // cockpit highlight

    // Hull shading
    px(ctx, 14, 8, 4, 10, PALETTE.suitShadow);    // mid-hull shadow strip

    // Wings — left
    px(ctx, 6, 12, 8, 4, PALETTE.metal);
    px(ctx, 4, 14, 4, 2, PALETTE.metal);
    px(ctx, 6, 12, 2, 2, PALETTE.metalDark);
    // Wings — right
    px(ctx, 18, 12, 8, 4, PALETTE.metal);
    px(ctx, 24, 14, 4, 2, PALETTE.metal);
    px(ctx, 24, 12, 2, 2, PALETTE.metalDark);

    // Wing accent stripe (cyan)
    px(ctx, 8, 13, 4, 1, PALETTE.cyan);
    px(ctx, 20, 13, 4, 1, PALETTE.cyan);

    // Outline — top of ship
    px(ctx, 15, 2, 2, 1, PALETTE.outline);
    // Outline — hull sides
    px(ctx, 13, 5, 1, 16, PALETTE.outline);
    px(ctx, 18, 5, 1, 16, PALETTE.outline);
    // Outline — wing edges
    px(ctx, 5, 12, 1, 4, PALETTE.outline);
    px(ctx, 23, 12, 1, 4, PALETTE.outline);

    // Engine nozzles at bottom
    px(ctx, 12, 22, 4, 3, PALETTE.metalDark);
    px(ctx, 16, 22, 4, 3, PALETTE.metalDark);

    // Engine glow — static frame: dim
    if (!thrustFrame) {
      px(ctx, 13, 25, 2, 2, PALETTE.purpleDim);
      px(ctx, 17, 25, 2, 2, PALETTE.purpleDim);
    } else {
      // Thrust frame: bright flame
      px(ctx, 12, 25, 4, 3, PALETTE.orange);
      px(ctx, 16, 25, 4, 3, PALETTE.orange);
      px(ctx, 13, 28, 2, 3, PALETTE.yellow);
      px(ctx, 17, 28, 2, 3, PALETTE.yellow);
      px(ctx, 14, 29, 1, 2, PALETTE.cyanGlow);
      px(ctx, 17, 29, 1, 2, PALETTE.cyanGlow);
    }
  });
}

// ---------------------------------------------------------------------------
// B1 — Alien Bird Variant A  (24×24, 2 frames)
// Rounded body, stubby wings raised in idle, lowered in flap.
// Colour theme: coral + orange = warm/aggressive.
// ---------------------------------------------------------------------------

export function generateAlienBirdATexture(scene: Phaser.Scene): string {
  const FW = 24, FH = 24;
  const key = ARCADE_TEXTURE_KEYS.alienBirdA;

  return makeFrameTexture(scene, key, FW, FH, 2, (ctx, frame) => {
    const flap = frame === 1;

    // Body — 3/4 view, slightly oval, top lit
    px(ctx, 8, 6, 8, 10, PALETTE.coral);
    px(ctx, 7, 8, 10, 6, PALETTE.coral);
    px(ctx, 9, 5, 6, 2, PALETTE.orange);       // top highlight

    // Head / beak at top
    px(ctx, 10, 3, 4, 4, PALETTE.coral);
    px(ctx, 11, 2, 2, 2, PALETTE.orange);       // beak top
    px(ctx, 11, 7, 2, 1, PALETTE.outline);      // beak lower line

    // Eyes (two tiny pixels)
    px(ctx, 10, 5, 1, 1, PALETTE.outline);
    px(ctx, 13, 5, 1, 1, PALETTE.outline);
    px(ctx, 10, 4, 1, 1, PALETTE.cyanGlow);    // alien glow iris left
    px(ctx, 13, 4, 1, 1, PALETTE.cyanGlow);    // alien glow iris right

    // Wings — position changes by frame
    const wingY = flap ? 12 : 9;
    px(ctx, 2, wingY, 6, 3, PALETTE.orangeDim);
    px(ctx, 16, wingY, 6, 3, PALETTE.orangeDim);
    px(ctx, 2, wingY, 2, 1, PALETTE.coralDim);
    px(ctx, 20, wingY, 2, 1, PALETTE.coralDim);

    // Talons at bottom
    px(ctx, 9, 16, 2, 3, PALETTE.yellowDim);
    px(ctx, 13, 16, 2, 3, PALETTE.yellowDim);

    // Outline
    px(ctx, 7, 7, 1, 8, PALETTE.outline);
    px(ctx, 16, 7, 1, 8, PALETTE.outline);
    px(ctx, 8, 5, 1, 2, PALETTE.outline);
    px(ctx, 15, 5, 1, 2, PALETTE.outline);
    px(ctx, 9, 15, 6, 1, PALETTE.outline);
  });
}

// ---------------------------------------------------------------------------
// B1 — Alien Bird Variant B  (24×24, 2 frames)
// Sleeker, angular; purple + purple-dim. Armoured look (2 HP enemy).
// ---------------------------------------------------------------------------

export function generateAlienBirdBTexture(scene: Phaser.Scene): string {
  const FW = 24, FH = 24;
  const key = ARCADE_TEXTURE_KEYS.alienBirdB;

  return makeFrameTexture(scene, key, FW, FH, 2, (ctx, frame) => {
    const flap = frame === 1;

    // Armoured carapace body
    px(ctx, 7, 7, 10, 9, PALETTE.purple);
    px(ctx, 6, 9, 12, 5, PALETTE.purple);
    px(ctx, 8, 6, 8, 2, PALETTE.purpleGlow);  // top highlights

    // Head wedge
    px(ctx, 9, 4, 6, 4, PALETTE.purpleDim);
    px(ctx, 10, 3, 4, 2, PALETTE.purple);
    px(ctx, 11, 2, 2, 2, PALETTE.outline);    // dark beak

    // Eyes — wide visor style
    px(ctx, 9, 6, 2, 1, PALETTE.yellow);
    px(ctx, 13, 6, 2, 1, PALETTE.yellow);

    // Armour plating lines
    px(ctx, 8, 10, 8, 1, PALETTE.purpleDim);
    px(ctx, 8, 13, 8, 1, PALETTE.purpleDim);

    // Wings — angled, angular
    const wingY = flap ? 13 : 10;
    px(ctx, 1, wingY, 7, 2, PALETTE.purpleDim);
    px(ctx, 16, wingY, 7, 2, PALETTE.purpleDim);
    px(ctx, 1, wingY, 2, 1, PALETTE.outline);
    px(ctx, 22, wingY, 1, 1, PALETTE.outline);

    // Claws (more angular)
    px(ctx, 8, 16, 2, 4, PALETTE.metalDark);
    px(ctx, 14, 16, 2, 4, PALETTE.metalDark);

    // Outline
    px(ctx, 6, 8, 1, 8, PALETTE.outline);
    px(ctx, 17, 8, 1, 8, PALETTE.outline);
    px(ctx, 7, 6, 1, 2, PALETTE.outline);
    px(ctx, 16, 6, 1, 2, PALETTE.outline);
    px(ctx, 8, 16, 8, 1, PALETTE.outline);
  });
}

// ---------------------------------------------------------------------------
// B1 — Laser (player)  (4×14, 1 frame)
// Bright cyan bolt travelling upward.
// ---------------------------------------------------------------------------

export function generatePlayerLaserTexture(scene: Phaser.Scene): string {
  const key = ARCADE_TEXTURE_KEYS.laserPlayer;
  return makeTexture(scene, key, 4, 14, (ctx) => {
    px(ctx, 1, 0, 2, 2, PALETTE.cyanGlow);    // tip brightest
    px(ctx, 1, 2, 2, 8, PALETTE.cyan);         // main bolt
    px(ctx, 1, 10, 2, 4, PALETTE.cyanDim);     // tail fade
    px(ctx, 0, 2, 1, 8, PALETTE.outline);      // left edge
    px(ctx, 3, 2, 1, 8, PALETTE.outline);      // right edge
  });
}

// ---------------------------------------------------------------------------
// B1 — Laser (enemy)  (4×14, 1 frame)
// Coral/red bolt travelling downward.
// ---------------------------------------------------------------------------

export function generateEnemyLaserTexture(scene: Phaser.Scene): string {
  const key = ARCADE_TEXTURE_KEYS.laserEnemy;
  return makeTexture(scene, key, 4, 14, (ctx) => {
    px(ctx, 1, 0, 2, 4, PALETTE.coralDim);     // tail fade
    px(ctx, 1, 4, 2, 8, PALETTE.coral);         // main bolt
    px(ctx, 1, 12, 2, 2, PALETTE.orange);       // tip brightest
    px(ctx, 0, 4, 1, 8, PALETTE.outline);
    px(ctx, 3, 4, 1, 8, PALETTE.outline);
  });
}

// ---------------------------------------------------------------------------
// B1 — Food Grain  (12×12, 1 frame)
// Small yellow-gold grain bag / capsule collectible.
// ---------------------------------------------------------------------------

export function generateFoodGrainTexture(scene: Phaser.Scene): string {
  const key = ARCADE_TEXTURE_KEYS.foodGrain;
  return makeTexture(scene, key, 12, 12, (ctx) => {
    // Bag body
    px(ctx, 2, 3, 8, 7, PALETTE.yellow);
    px(ctx, 3, 2, 6, 1, PALETTE.yellowDim);    // top rim
    // Highlight
    px(ctx, 3, 4, 2, 2, PALETTE.cyanGlow);
    // Tie/knot at top
    px(ctx, 5, 1, 2, 2, PALETTE.orange);
    // Outline
    px(ctx, 1, 3, 1, 7, PALETTE.outline);
    px(ctx, 10, 3, 1, 7, PALETTE.outline);
    px(ctx, 2, 2, 8, 1, PALETTE.outline);
    px(ctx, 2, 10, 8, 1, PALETTE.outline);
  });
}

// ---------------------------------------------------------------------------
// B1 — Ice Crystal  (12×12, 1 frame)
// Blue-cyan crystalline hexagonal shard.
// ---------------------------------------------------------------------------

export function generateIceCrystalTexture(scene: Phaser.Scene): string {
  const key = ARCADE_TEXTURE_KEYS.iceCrystal;
  return makeTexture(scene, key, 12, 12, (ctx) => {
    // Crystal body — angled hex silhouette
    px(ctx, 4, 1, 4, 2, PALETTE.cyanGlow);    // top facet
    px(ctx, 2, 3, 8, 4, PALETTE.cyan);         // main body
    px(ctx, 3, 7, 6, 2, PALETTE.cyanDim);      // lower facet
    px(ctx, 5, 9, 2, 2, PALETTE.cyanDim);      // tip
    // Inner highlight
    px(ctx, 5, 3, 2, 3, PALETTE.star);
    // Outline
    px(ctx, 3, 1, 1, 2, PALETTE.outline);
    px(ctx, 8, 1, 1, 2, PALETTE.outline);
    px(ctx, 1, 3, 2, 4, PALETTE.outline);
    px(ctx, 9, 3, 2, 4, PALETTE.outline);
    px(ctx, 2, 7, 1, 2, PALETTE.outline);
    px(ctx, 9, 7, 1, 2, PALETTE.outline);
    px(ctx, 4, 9, 1, 2, PALETTE.outline);
    px(ctx, 7, 9, 1, 2, PALETTE.outline);
  });
}

// ---------------------------------------------------------------------------
// B1 — Impact Burst  (16×16, 2 frames)
// Frame 0: bright full burst. Frame 1: fading ring.
// ---------------------------------------------------------------------------

export function generateImpactBurstTexture(scene: Phaser.Scene): string {
  const FW = 16, FH = 16;
  const key = ARCADE_TEXTURE_KEYS.impactBurst;

  return makeFrameTexture(scene, key, FW, FH, 2, (ctx, frame) => {
    if (frame === 0) {
      // Core bright flash
      px(ctx, 6, 6, 4, 4, PALETTE.cyanGlow);
      px(ctx, 5, 5, 6, 6, PALETTE.yellow);
      // Spark arms — 4 directions
      px(ctx, 7, 2, 2, 3, PALETTE.orange);   // up
      px(ctx, 7, 11, 2, 3, PALETTE.orange);  // down
      px(ctx, 2, 7, 3, 2, PALETTE.orange);   // left
      px(ctx, 11, 7, 3, 2, PALETTE.orange);  // right
      // Diagonal sparks
      px(ctx, 3, 3, 2, 2, PALETTE.coral);
      px(ctx, 11, 3, 2, 2, PALETTE.coral);
      px(ctx, 3, 11, 2, 2, PALETTE.coral);
      px(ctx, 11, 11, 2, 2, PALETTE.coral);
    } else {
      // Fading ring — hollow centre
      px(ctx, 5, 2, 6, 2, PALETTE.orange, 0.6);
      px(ctx, 5, 12, 6, 2, PALETTE.orange, 0.6);
      px(ctx, 2, 5, 2, 6, PALETTE.orange, 0.6);
      px(ctx, 12, 5, 2, 6, PALETTE.orange, 0.6);
      px(ctx, 3, 3, 2, 2, PALETTE.yellowDim, 0.5);
      px(ctx, 11, 3, 2, 2, PALETTE.yellowDim, 0.5);
      px(ctx, 3, 11, 2, 2, PALETTE.yellowDim, 0.5);
      px(ctx, 11, 11, 2, 2, PALETTE.yellowDim, 0.5);
    }
  });
}

// ---------------------------------------------------------------------------
// B1 — Starfield tiles  (128×128, 1 frame each — 2 layers)
// Near layer: brighter, fewer stars. Far layer: dimmer, denser stars.
// Seeded pseudo-random so the pattern is deterministic.
// ---------------------------------------------------------------------------

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function generateStarfieldTextures(scene: Phaser.Scene): void {
  // Far layer — dense, dim
  makeTexture(scene, ARCADE_TEXTURE_KEYS.starfieldFar, 128, 128, (ctx) => {
    px(ctx, 0, 0, 128, 128, PALETTE.spaceDeep); // background
    const rand = seededRand(0xdeadbeef);
    for (let i = 0; i < 80; i++) {
      const x = Math.floor(rand() * 128);
      const y = Math.floor(rand() * 128);
      const dim = rand() > 0.5;
      px(ctx, x, y, 1, 1, dim ? PALETTE.starDim : PALETTE.spaceMid);
    }
  });

  // Near layer — sparse, bright
  makeTexture(scene, ARCADE_TEXTURE_KEYS.starfieldNear, 128, 128, (ctx) => {
    px(ctx, 0, 0, 128, 128, PALETTE.spaceDeep); // background
    const rand = seededRand(0xcafebabe);
    for (let i = 0; i < 35; i++) {
      const x = Math.floor(rand() * 128);
      const y = Math.floor(rand() * 128);
      px(ctx, x, y, 1, 1, PALETTE.star);
      // Occasionally add a 2×2 bright star
      if (rand() > 0.8) px(ctx, x + 1, y, 1, 1, PALETTE.starDim);
    }
  });
}

// ---------------------------------------------------------------------------
// Convenience: generate ALL arcade textures in one call
// ---------------------------------------------------------------------------

export function generateAllArcadeTextures(scene: Phaser.Scene): void {
  generateSpaceshipTexture(scene);
  generateAlienBirdATexture(scene);
  generateAlienBirdBTexture(scene);
  generatePlayerLaserTexture(scene);
  generateEnemyLaserTexture(scene);
  generateFoodGrainTexture(scene);
  generateIceCrystalTexture(scene);
  generateImpactBurstTexture(scene);
  generateStarfieldTextures(scene);
}
