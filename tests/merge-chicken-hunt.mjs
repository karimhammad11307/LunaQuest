import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await page.goto(process.env.LUNAQUEST_URL ?? 'http://127.0.0.1:5173/');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.setPosition(316, 388));
  await page.waitForTimeout(150);
  await page.keyboard.press('e');
  await page.getByRole('button', { name: /Launch Chicken Hunt/ }).click();
  await page.waitForFunction(() => window.__lunaquestGame.scene.getScene('ChickenHuntScene').sys.isActive());
  const launched = await page.evaluate(() => {
    const state = window.__lunaquestStore.getState();
    return { scene: state.scene, runId: state.activeMissionRunId, energy: state.resources.energy };
  });
  if (launched.scene !== 'chicken-hunt' || !launched.runId || launched.energy !== 69) throw new Error(`Launch state invalid: ${JSON.stringify(launched)}`);
  if (await page.locator('#game-canvas canvas').count() !== 1) throw new Error('Expected one shared Phaser canvas');
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.waitForFunction(() => window.__lunaquestGame.scene.isPaused('ChickenHuntScene'));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.waitForFunction(() => window.__lunaquestGame.scene.getScene('ChickenHuntScene').sys.isActive());
  await page.screenshot({ path: 'artifacts/merge-chicken-hunt.png', fullPage: true });
  const canvas = await page.locator('#game-canvas canvas').boundingBox();
  await page.mouse.click(canvas.x + canvas.width * 550 / 640, canvas.y + canvas.height * 20 / 360);
  await page.waitForFunction(() => window.__lunaquestStore.getState().scene === 'moon-base' && window.__lunaquestGame.scene.getScene('MoonBaseScene').sys.isActive());
  const returned = await page.evaluate(() => {
    const state = window.__lunaquestStore.getState();
    return { result: state.lastMissionResult, runIds: state.completedMissionRunIds, energy: state.resources.energy };
  });
  if (returned.result?.runId !== launched.runId || returned.runIds.length !== 1 || returned.energy !== 69) throw new Error(`Return state invalid: ${JSON.stringify(returned)}`);
  await page.getByRole('button', { name: 'Back to Moon Base' }).click();
  if (await page.locator('.mission-summary').count()) throw new Error('Mission summary did not dismiss');
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  console.log('Chicken Hunt launch, pause/resume, return, exactly-once ledger, summary and Moon Base restart passed');
} finally {
  await browser.close();
}
