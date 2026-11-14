import Phaser from 'phaser';
import { PALETTE as P } from '../config/palette';

type Painter = (ctx: CanvasRenderingContext2D) => void;
const block = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

function texture(scene: Phaser.Scene, key: string, width: number, height: number, paint: Painter): void {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) throw new Error(`Could not create ${key}`);
  const ctx = canvas.getContext();
  ctx.imageSmoothingEnabled = false;
  paint(ctx);
  canvas.refresh();
}

function hash(x: number, y: number, seed: number): number {
  let n = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function insidePolygon(x: number, y: number, points: readonly (readonly [number, number])[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

const continents = [
  [[30, 28], [45, 23], [55, 31], [50, 40], [60, 47], [52, 59], [41, 54], [36, 45], [28, 40]],
  [[61, 60], [75, 56], [81, 67], [75, 79], [68, 91], [58, 87], [56, 73]],
  [[82, 25], [95, 23], [108, 32], [105, 48], [91, 52], [83, 45], [74, 35]],
] as const;

function planet(ctx: CanvasRenderingContext2D, moon: boolean): void {
  for (let y = 4; y < 124; y += 2) for (let x = 4; x < 124; x += 2) {
    const dx = x + 1 - 64;
    const dy = y + 1 - 64;
    const radius = 59 + (hash(x, y, moon ? 4 : 7) > 0.94 ? 1 : 0);
    const r = Math.hypot(dx, dy);
    if (r > radius) continue;
    if (r > radius - 3) { block(ctx, x, y, 2, 2, P.outline); continue; }
    const speck = hash(x, y, moon ? 21 : 19);
    if (moon) {
      const shade = dx > 23 ? P.shadowDeep : dx > 4 ? P.terrain : P.terrainLight;
      block(ctx, x, y, 2, 2, speck > 0.92 ? P.suitWhite : speck < 0.08 ? P.shadow : shade);
    } else {
      const land = continents.some((points) => insidePolygon(x, y, points));
      let color: string = land ? (speck > 0.76 ? P.green : speck < 0.18 ? P.greenDark : P.greenDim)
        : dx > 17 ? P.cyanDim : P.cyan;
      if (dx < -17 && !land && speck > 0.8) color = P.cyanGlow;
      if (speck > 0.975 && y > 24 && y < 103) color = P.suitWhite;
      block(ctx, x, y, 2, 2, color);
    }
  }
  if (moon) {
    for (const [cx, cy, rx, ry] of [[41, 42, 10, 6], [78, 35, 7, 4], [89, 75, 12, 7], [51, 89, 7, 4], [70, 62, 5, 3]]) {
      for (let y = cy - ry; y <= cy + ry; y += 2) for (let x = cx - rx; x <= cx + rx; x += 2) {
        const ellipse = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (ellipse < 0.92 && Math.hypot(x - 64, y - 64) < 55)
          block(ctx, x, y, 2, 2, ellipse > 0.55 ? P.shadow : P.shadowDeep);
      }
      block(ctx, cx - rx + 2, cy - ry + 1, rx, 2, P.suitWhite);
    }
  }
}

function ship(ctx: CanvasRenderingContext2D, flame: 0 | 1 | 2): void {
  // A compact crew lander: broad cabin, two side tanks, four landing legs, one wide visor.
  block(ctx, 8, 51, 6, 15, P.outline); block(ctx, 42, 51, 6, 15, P.outline);
  block(ctx, 4, 64, 14, 4, P.metal); block(ctx, 38, 64, 14, 4, P.metal);
  block(ctx, 7, 32, 9, 26, P.outline); block(ctx, 40, 32, 9, 26, P.outline);
  block(ctx, 9, 35, 5, 18, P.purple); block(ctx, 42, 35, 5, 18, P.purple);
  block(ctx, 10, 38, 3, 8, P.purpleGlow); block(ctx, 43, 38, 3, 8, P.purpleGlow);
  block(ctx, 17, 12, 22, 47, P.outline);
  block(ctx, 21, 7, 14, 7, P.outline); block(ctx, 24, 3, 8, 5, P.outline);
  block(ctx, 24, 5, 8, 4, P.suitWhite); block(ctx, 21, 10, 14, 8, P.suitWhite);
  block(ctx, 19, 18, 18, 32, P.suitWhite);
  block(ctx, 19, 37, 5, 13, P.suitShadow); block(ctx, 33, 36, 4, 14, P.suitShadow);
  block(ctx, 21, 20, 14, 16, P.outline); block(ctx, 23, 22, 10, 12, P.cyanDim);
  block(ctx, 24, 23, 7, 5, P.cyanGlow); block(ctx, 23, 30, 10, 3, P.visorDark);
  block(ctx, 18, 39, 20, 4, P.purple); block(ctx, 21, 42, 14, 2, P.purpleGlow);
  block(ctx, 25, 47, 6, 5, P.yellow); block(ctx, 22, 52, 12, 5, P.metalDark);
  block(ctx, 24, 56, 8, 4, P.outline);
  block(ctx, 8, 47, 6, 3, P.cyan); block(ctx, 42, 47, 6, 3, P.cyan);
  block(ctx, 16, 20, 3, 5, P.yellow); block(ctx, 37, 20, 3, 5, P.yellow);
  if (flame !== 2) {
    block(ctx, 24, 60, 8, flame === 0 ? 7 : 10, P.orange);
    block(ctx, 26, 61, 4, flame === 0 ? 5 : 9, P.yellow);
    block(ctx, 27, 64, 2, flame === 0 ? 7 : 8, P.suitWhite);
  }
}

export function createJourneyArt(scene: Phaser.Scene): void {
  texture(scene, 'journey-earth', 128, 128, (ctx) => planet(ctx, false));
  texture(scene, 'journey-moon', 128, 128, (ctx) => planet(ctx, true));
  for (const flame of [0, 1, 2] as const)
    texture(scene, `journey-lander-${flame}`, 56, 72, (ctx) => ship(ctx, flame));
  for (const [key, count, size, seed] of [
    ['journey-stars-far', 70, 2, 12], ['journey-stars-near', 34, 3, 34],
  ] as const) texture(scene, key, 640, 360, (ctx) => {
    for (let i = 0; i < count; i++) {
      const x = Math.floor(hash(i, seed, 3) * 640 / 2) * 2;
      const y = Math.floor(hash(seed, i, 8) * 360 / 2) * 2;
      block(ctx, x, y, size, size, i % 7 === 0 ? P.yellow : i % 3 === 0 ? P.cyan : P.starDim);
      if (i % 12 === 0) {
        block(ctx, x - 3, y + 1, size + 6, 1, P.star);
        block(ctx, x + 1, y - 3, 1, size + 6, P.star);
      }
    }
  });
  texture(scene, 'journey-ground', 640, 180, (ctx) => {
    block(ctx, 0, 0, 640, 180, P.terrainDark);
    block(ctx, 0, 0, 640, 7, P.terrainLight);
    block(ctx, 0, 7, 640, 5, P.shadow);
    for (let y = 0; y < 180; y += 4) for (let x = 0; x < 640; x += 4) {
      const h = hash(x, y, 81);
      if (h > 0.98) block(ctx, x, y, 4, 2, P.terrainLight);
      else if (h < 0.055) block(ctx, x, y, 4, 4, P.shadow);
      else if (h > 0.44 && h < 0.50) block(ctx, x, y, 4, 4, P.terrain);
    }
    for (const [x, y, w] of [[72, 53, 36], [522, 32, 28], [560, 125, 45], [128, 138, 25]]) {
      block(ctx, x, y, w, 4, P.terrainLight); block(ctx, x + 4, y + 5, w - 8, 7, P.shadow);
      block(ctx, x + 8, y + 8, w - 16, 4, P.shadowDeep);
    }
  });
}
