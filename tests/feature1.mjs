import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.env.LUNAQUEST_URL ?? 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ headless: true });
const errors = [];

async function openGame() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  return page;
}

async function move(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(70);
}

const page = await openGame();
const canvasCount = await page.locator('#game-canvas canvas').count();
if (canvasCount !== 1) throw new Error(`Expected one Phaser canvas, got ${canvasCount}`);
for (const [name, amount] of [['Food', 55], ['Water', 40], ['Oxygen', 80], ['Energy', 75], ['Health', 100]]) {
  const label = await page.locator(`.meter[aria-label^="${name}:"]`).getAttribute('aria-label');
  if (!label.includes(`${amount} of 100`)) throw new Error(`HUD does not show shared ${name} state: ${label}`);
}
mkdirSync('artifacts', { recursive: true });
await page.waitForTimeout(3700);
await page.screenshot({ path: 'artifacts/feature1-base.png', fullPage: true });
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(230);
const walking = await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.anims.currentAnim?.key);
if (walking !== 'walk-up') throw new Error(`Walking animation did not run: ${walking}`);
await page.keyboard.up('ArrowUp');
await page.waitForTimeout(80);
const idle = await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.anims.currentAnim?.key);
if (idle !== 'idle-up') throw new Error(`Idle animation did not run: ${idle}`);
await move(page, 'ArrowUp', 1800);
const stopped = await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.y);
if (stopped < 210 || stopped > 260) throw new Error(`Habitat collision did not stop the astronaut: y=${stopped}`);
await page.keyboard.press('e');
await page.waitForTimeout(100);
const habitat = await page.locator('[role="status"]').innerText();
if (!habitat.includes('Habitat online')) throw new Error(`Habitat interaction failed: ${habitat}`);
console.log('Habitat collision/interact:', stopped, habitat);
const pointerTarget = await page.evaluate(() => {
  const scene = window.__lunaquestGame.scene.getScene('MoonBaseScene');
  const canvas = document.querySelector('#game-canvas canvas');
  const rect = canvas.getBoundingClientRect();
  const building = scene.buildings.find((item) => item.entry.id === 'habitat');
  return {
    x: rect.left + (building.x - scene.cameras.main.scrollX) * rect.width / 640,
    y: rect.top + (building.y - 18 - scene.cameras.main.scrollY) * rect.height / 360,
  };
});
const beforeClick = await page.evaluate(() => window.__lunaquestStore.getState().notices.at(-1).id);
await page.mouse.click(pointerTarget.x, pointerTarget.y);
await page.waitForTimeout(80);
const afterClick = await page.evaluate(() => window.__lunaquestStore.getState().notices.at(-1).id);
if (afterClick <= beforeClick) throw new Error('Nearby building pointer interaction did not dispatch');
console.log('Habitat pointer interaction passed');
await page.close();

const routes = [
  ['greenhouse', [['ArrowLeft', 1510]], 'Greenhouse ready'],
  ['solar', [['ArrowRight', 1580], ['ArrowUp', 420]], 'Solar array ready'],
  ['shield', [['ArrowRight', 2350], ['ArrowDown', 900]], 'Radiation shelter ready'],
  ['landingPad', [['ArrowLeft', 800], ['ArrowDown', 850]], 'Landing pad ready'],
];
for (const [id, steps, expected] of routes) {
  const visit = await openGame();
  for (const [key, ms] of steps) await move(visit, key, ms);
  await visit.keyboard.press('e');
  await visit.waitForTimeout(100);
  const notice = await visit.locator('[role="status"]').innerText();
  const position = await visit.evaluate(() => {
    const a = window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut;
    return { x: Math.round(a.x), y: Math.round(a.y) };
  });
  console.log(id, position, notice);
  if (!notice.includes(expected)) throw new Error(`${id} interaction failed at ${JSON.stringify(position)}: ${notice}`);
  await visit.close();
}

// Verify every separate structure blocks the astronaut's feet from below.
const collisionPage = await openGame();
for (const id of ['habitat', 'greenhouse', 'solar', 'shield', 'landingPad']) {
  const layout = await collisionPage.evaluate((buildingId) => {
    const scene = window.__lunaquestGame.scene.getScene('MoonBaseScene');
    const building = scene.buildings.find((item) => item.entry.id === buildingId);
    scene.astronaut.setVelocity(0, 0).setPosition(building.x, building.y + 58);
    return { x: building.x, y: building.y };
  }, id);
  await move(collisionPage, 'ArrowUp', 1200);
  const y = await collisionPage.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.y);
  if (y < layout.y + 8) throw new Error(`${id} collision failed: astronaut y=${y}, building y=${layout.y}`);
  console.log(`${id} collision stop:`, Math.round(y));
}
await collisionPage.close();

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
mobile.on('pageerror', (error) => errors.push(error.message));
await mobile.goto(url);
await mobile.waitForLoadState('networkidle');
await mobile.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
if (!(await mobile.getByRole('button', { name: 'Move left' }).isVisible())) throw new Error('Touch movement controls are hidden on mobile');
await mobile.screenshot({ path: 'artifacts/feature1-mobile.png', fullPage: true });
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth);
if (overflow) throw new Error('Mobile layout scrolls horizontally');
await mobile.close();

if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
console.log('Feature 1 browser checks passed; screenshots: artifacts/feature1-base.png and feature1-mobile.png');
await browser.close();
