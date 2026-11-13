import Phaser from 'phaser';
import { PALETTE as C } from '../config/palette';
import { TEXTURES } from '../config/gameConfig';

type Painter = (ctx: CanvasRenderingContext2D) => void;
const box = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
};
const frame = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, edge: string = C.outline) => {
  box(c, x - 2, y - 2, w + 4, h + 4, edge);
  box(c, x, y, w, h, color);
};
const stepped = (c: CanvasRenderingContext2D, cx: number, y: number, rows: number[], step: number, color: string) => {
  rows.forEach((half, i) => box(c, cx - half, y + i * step, half * 2, step, color));
};
const pix = (c: CanvasRenderingContext2D, points: [number, number][], color: string, size = 2) => {
  points.forEach(([x, y]) => box(c, x, y, size, size, color));
};

function texture(scene: Phaser.Scene, key: string, w: number, h: number, draw: Painter): void {
  const t = scene.textures.createCanvas(key, w, h);
  if (!t) throw new Error(`Cannot create texture ${key}`);
  const ctx = t.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  t.refresh();
}

function habitat(c: CanvasRenderingContext2D) {
  box(c, 7, 69, 98, 13, C.outline);
  box(c, 12, 67, 88, 12, C.metalDark);
  box(c, 17, 73, 76, 5, C.terrainLight);
  stepped(c, 56, 19, [11, 22, 31, 38, 42, 45, 47, 48], 6, C.outline);
  stepped(c, 56, 21, [9, 20, 29, 36, 40, 43, 45, 46], 6, C.suitShadow);
  box(c, 33, 25, 28, 5, C.suitWhite); box(c, 23, 34, 20, 5, C.suitWhite);
  box(c, 77, 36, 13, 4, C.terrainLight);
  box(c, 17, 55, 8, 7, C.cyanDim); box(c, 19, 55, 4, 4, C.cyanGlow);
  box(c, 87, 54, 8, 7, C.cyanDim); box(c, 89, 54, 4, 4, C.cyanGlow);
  frame(c, 42, 52, 28, 28, C.metalDark);
  frame(c, 47, 55, 18, 24, C.spaceMid, C.cyanDim);
  box(c, 49, 57, 14, 4, C.cyanGlow); box(c, 49, 63, 14, 3, C.cyan);
  box(c, 54, 71, 4, 7, C.yellow); box(c, 37, 78, 38, 4, C.outline);
  box(c, 39, 80, 34, 2, C.yellow);
  box(c, 18, 48, 7, 2, C.outlineSoft); box(c, 87, 48, 7, 2, C.outlineSoft);
  pix(c, [[23, 69], [29, 69], [80, 68], [86, 68]], C.yellow);
}

function greenhouse(c: CanvasRenderingContext2D) {
  box(c, 7, 65, 94, 11, C.outline); box(c, 12, 65, 84, 8, C.metalDark);
  stepped(c, 54, 17, [10, 20, 29, 36, 40, 43, 45], 7, C.outline);
  stepped(c, 54, 19, [8, 18, 27, 34, 38, 41, 43], 7, C.cyanDim);
  box(c, 27, 30, 14, 17, C.cyan); box(c, 43, 22, 12, 17, C.cyanGlow);
  box(c, 64, 27, 21, 15, C.cyan); box(c, 20, 49, 70, 8, C.greenDark);
  [29, 43, 59, 75].forEach((x, i) => {
    box(c, x, 49 - (i % 2) * 3, 3, 11, C.greenDim);
    box(c, x - 4, 45 - (i % 2) * 3, 8, 5, C.green);
    box(c, x + 1, 41 - (i % 2) * 3, 7, 5, C.green);
  });
  box(c, 51, 19, 4, 45, C.suitWhite); box(c, 13, 56, 82, 3, C.suitWhite);
  frame(c, 44, 57, 20, 19, C.metalDark);
  box(c, 48, 62, 12, 14, C.spaceMid); box(c, 52, 65, 4, 3, C.green);
  pix(c, [[22, 37], [80, 38], [32, 23], [68, 22]], C.cyanGlow);
}

function solar(c: CanvasRenderingContext2D) {
  box(c, 45, 45, 10, 23, C.outline); box(c, 48, 44, 4, 20, C.metal);
  box(c, 24, 64, 52, 7, C.outline); box(c, 28, 64, 44, 4, C.terrainLight);
  [5, 53].forEach((x) => {
    frame(c, x, 19, 41, 30, C.purpleDim);
    for (let col = 0; col < 4; col++) for (let row = 0; row < 3; row++) {
      box(c, x + 2 + col * 10, 21 + row * 9, 8, 7, (col + row) % 2 ? C.spaceMid : C.purple);
      box(c, x + 3 + col * 10, 22 + row * 9, 6, 2, C.cyanDim);
    }
    box(c, x - 1, 14, 43, 4, C.metal); box(c, x + 18, 11, 5, 4, C.yellow);
  });
  box(c, 42, 32, 16, 13, C.outline); box(c, 45, 35, 10, 7, C.yellow);
  box(c, 49, 36, 2, 5, C.suitWhite);
}

function shield(c: CanvasRenderingContext2D) {
  box(c, 11, 65, 82, 12, C.outline); box(c, 15, 67, 74, 7, C.metalDark);
  stepped(c, 52, 19, [11, 20, 27, 32, 36, 38], 8, C.outline);
  stepped(c, 52, 21, [9, 18, 25, 30, 34, 36], 8, C.metal);
  box(c, 17, 53, 70, 9, C.metalDark); box(c, 24, 33, 8, 22, C.outlineSoft);
  box(c, 72, 33, 8, 22, C.outlineSoft); box(c, 25, 35, 6, 3, C.purpleGlow);
  box(c, 73, 35, 6, 3, C.purpleGlow);
  frame(c, 39, 47, 26, 29, C.outlineSoft);
  box(c, 43, 52, 18, 23, C.spaceMid); box(c, 43, 52, 18, 4, C.cyan);
  box(c, 50, 59, 4, 12, C.yellow); box(c, 47, 63, 10, 4, C.yellow);
  box(c, 18, 59, 8, 3, C.purple); box(c, 78, 59, 8, 3, C.purple);
  box(c, 34, 73, 36, 4, C.purpleGlow);
}

function landingPad(c: CanvasRenderingContext2D) {
  box(c, 4, 43, 108, 23, C.outline); box(c, 8, 45, 100, 17, C.metalDark);
  box(c, 13, 48, 90, 2, C.terrainLight); box(c, 13, 59, 90, 2, C.shadow);
  box(c, 18, 52, 13, 4, C.yellow); box(c, 85, 52, 13, 4, C.yellow);
  box(c, 36, 22, 44, 27, C.outline); box(c, 40, 23, 36, 23, C.suitWhite);
  box(c, 47, 17, 22, 22, C.outline); box(c, 51, 18, 14, 16, C.cyanDim);
  box(c, 53, 20, 8, 5, C.cyanGlow); box(c, 39, 38, 38, 7, C.metal);
  box(c, 27, 34, 14, 10, C.orange); box(c, 75, 34, 14, 10, C.orange);
  box(c, 32, 44, 9, 6, C.outlineSoft); box(c, 75, 44, 9, 6, C.outlineSoft);
  box(c, 49, 47, 18, 3, C.yellow); box(c, 49, 51, 18, 2, C.cyan);
  pix(c, [[11, 52], [103, 52], [13, 56], [101, 56]], C.cyanGlow);
}

function astronaut(c: CanvasRenderingContext2D, direction: string, frameNo: number) {
  const bob = frameNo === 1 ? 1 : 0;
  box(c, 4, 28, 18, 3, C.shadowDeep);
  box(c, 7, 21 + bob, 5, 7, C.outline); box(c, 15, 21 - bob, 5, 7, C.outline);
  box(c, 8, 22 + bob, 3, 4, C.suitShadow); box(c, 16, 22 - bob, 3, 4, C.suitShadow);
  box(c, 4, 12, 18, 12, C.outline); box(c, 6, 13, 14, 10, C.suitWhite);
  box(c, 2, 14 + bob, 4, 8, C.outline); box(c, 20, 14 - bob, 4, 8, C.outline);
  box(c, 3, 16 + bob, 2, 5, C.suitShadow); box(c, 21, 16 - bob, 2, 5, C.suitShadow);
  box(c, 8, 17, 10, 4, C.suitShadow); box(c, 11, 17, 4, 3, C.orange);
  box(c, 4, 3, 18, 13, C.outline); box(c, 6, 1, 14, 3, C.suitWhite);
  box(c, 6, 4, 14, 11, C.suitWhite);
  if (direction === 'up') {
    box(c, 8, 5, 10, 8, C.suitShadow); box(c, 10, 5, 6, 4, C.cyanDim);
    box(c, 6, 15, 3, 7, C.cyan);
  } else {
    box(c, 7, 6, 12, 7, C.visorDark); box(c, 8, 6, 9, 5, C.visor);
    box(c, direction === 'left' ? 8 : 14, 7, 3, 2, C.cyanGlow);
    if (direction === 'down') { box(c, 10, 10, 2, 2, C.outline); box(c, 15, 10, 2, 2, C.outline); }
  }
  box(c, 5, 4, 2, 9, C.yellow); box(c, 19, 4, 2, 9, C.yellow);
  box(c, 6, 23, 3, 2, C.cyan); box(c, 17, 23, 3, 2, C.cyan);
}

/** Original authored canvas sprites, each registered as its own Phaser texture. */
export function createPixelArt(scene: Phaser.Scene): void {
  texture(scene, 'ground-a', 32, 32, (c) => {
    box(c, 0, 0, 32, 32, C.terrain);
    pix(c, [[3, 6], [21, 5], [13, 22], [26, 26]], C.terrainLight);
    pix(c, [[9, 14], [24, 17], [5, 28]], C.terrainDark);
    box(c, 18, 28, 5, 2, C.shadow);
  });
  texture(scene, 'ground-b', 32, 32, (c) => {
    box(c, 0, 0, 32, 32, C.terrainMid);
    pix(c, [[4, 4], [18, 9], [28, 18], [11, 27]], C.terrainLight);
    pix(c, [[15, 3], [3, 19], [23, 29]], C.shadow);
    box(c, 20, 22, 5, 2, C.terrainDark);
  });
  texture(scene, 'crater', 52, 27, (c) => {
    stepped(c, 26, 7, [13, 20, 24, 25], 4, C.terrainLight);
    stepped(c, 26, 11, [12, 19, 23], 4, C.shadow);
    stepped(c, 26, 13, [10, 17, 20], 3, C.shadowDeep);
    box(c, 11, 21, 31, 3, C.terrainDark);
    pix(c, [[5, 15], [43, 11], [37, 22]], C.terrainLight);
  });
  texture(scene, 'rock', 26, 22, (c) => {
    box(c, 4, 14, 20, 5, C.shadowDeep); box(c, 2, 10, 22, 6, C.outline);
    box(c, 5, 5, 17, 10, C.terrainDark); box(c, 8, 3, 11, 8, C.terrainLight);
    box(c, 17, 7, 4, 7, C.shadow); box(c, 8, 6, 5, 2, C.suitWhite);
  });
  texture(scene, TEXTURES.building('habitat'), 112, 86, habitat);
  texture(scene, TEXTURES.building('greenhouse'), 108, 80, greenhouse);
  texture(scene, TEXTURES.building('solar'), 100, 74, solar);
  texture(scene, TEXTURES.building('shield'), 104, 80, shield);
  texture(scene, TEXTURES.building('landingPad'), 116, 68, landingPad);
  for (const dir of ['down', 'up', 'left', 'right']) {
    for (let frameNo = 0; frameNo < 2; frameNo++) {
      texture(scene, TEXTURES.astronaut(dir, frameNo), 26, 32, (c) => astronaut(c, dir, frameNo));
    }
  }
}
