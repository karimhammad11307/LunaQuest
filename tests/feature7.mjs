import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { useExistingPlayer } from './legacyProfile.mjs';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const errors = [];
const url = process.env.LUNAQUEST_URL ?? 'http://127.0.0.1:5173/';
const trackedPage = async () => {
  const page = await context.newPage();
  await useExistingPlayer(page);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  return page;
};

try {
  let page = await trackedPage();
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  await page.evaluate(() => {
    window.__lunaquestStore.dispatch({ type: 'INTERACT_BUILDING', buildingId: 'greenhouse' });
    window.__lunaquestStore.dispatch({ type: 'ENTER_GREENHOUSE' });
  });
  await page.getByRole('button', { name: /Plant Seeds/ }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const before = await page.evaluate(() => window.__lunaquestStore.getState());
  if (!before.buildings.greenhouse.cropPlanted) throw new Error('Greenhouse planting did not run');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Continue Game' }).waitFor();
  if (await page.locator('#game-canvas canvas').count()) throw new Error('Simulation mounted before Continue');
  mkdirSync('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/feature7-continue.png', fullPage: true });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Continue Game' }).click();
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  const after = await page.evaluate(() => window.__lunaquestStore.getState());
  if (!after.buildings.greenhouse.cropPlanted || after.resources.water !== before.resources.water
    || after.resources.energy !== before.resources.energy || after.astronaut.health !== before.astronaut.health
    || !after.paused || after.astronaut.location !== 'outside') throw new Error('Continue failed to restore paused supplies and crop');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.evaluate(() => window.__lunaquestStore.dispatch({ type: 'ADD_XP', amount: 9, rewardId: 'browser-save-check' }));
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.close();

  page = await trackedPage();
  await page.getByRole('button', { name: 'Continue Game' }).click();
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  const reopened = await page.evaluate(() => window.__lunaquestStore.getState());
  if (reopened.xp !== 9 || !reopened.buildings.greenhouse.cropPlanted || !reopened.paused) throw new Error('Close/reopen did not restore session');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.evaluate(() => window.__lunaquestStore.dispatch({ type: 'INTERACT_BUILDING', buildingId: 'landingPad' }));
  await page.getByRole('button', { name: /Launch Chicken Hunt/ }).click();
  await page.waitForFunction(() => window.__lunaquestGame.scene.getScene('ChickenHuntScene').sys.isActive());
  const mission = await page.evaluate(() => window.__lunaquestStore.getState());
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Continue Game' }).click();
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  const recovered = await page.evaluate(() => window.__lunaquestStore.getState());
  if (recovered.activeMission || recovered.scene !== 'moon-base'
    || !recovered.completedMissionRunIds.includes(mission.activeMissionRunId)
    || recovered.resources.food !== mission.resources.food || recovered.xp !== mission.xp) throw new Error('Interrupted mission recovery was unsafe');
  await page.evaluate((runId) => window.__lunaquestStore.dispatch({ type: 'COMPLETE_MISSION', result: {
    runId, missionType: 'chicken-hunt', success: true, returnedSafely: true,
    collectedResources: { food: 20 }, healthDamage: 0, xpEarned: 20, duration: 10,
    educationalMessage: 'Stale result must be rejected.',
  } }), mission.activeMissionRunId);
  const afterReplay = await page.evaluate(() => window.__lunaquestStore.getState());
  if (afterReplay.resources.food !== recovered.resources.food || afterReplay.xp !== recovered.xp) throw new Error('Stale mission reward replayed');

  await page.evaluate(() => {
    const store = window.__lunaquestStore;
    store.dispatch({ type: 'INTERACT_BUILDING', buildingId: 'habitat' });
    store.dispatch({ type: 'ENTER_HABITAT' });
    store.dispatch({ type: 'ADVANCE_DAY' });
    store.dispatch({ type: 'SET_PAUSED', paused: true });
  });
  const storm = await page.evaluate(() => window.__lunaquestStore.getState());
  if (storm.activeEvent?.type !== 'solar-storm') throw new Error('Storm did not trigger');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Continue Game' }).click();
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  const stormRecovered = await page.evaluate(() => window.__lunaquestStore.getState());
  if (stormRecovered.activeEvent?.phase !== 'warning' || stormRecovered.astronaut.health !== storm.astronaut.health
    || stormRecovered.xp !== storm.xp || !stormRecovered.paused) throw new Error('Emergency recovery changed damage, XP or pause');
  await page.waitForTimeout(1000);
  const pausedRemaining = await page.evaluate(() => window.__lunaquestStore.getState().activeEvent.remainingSeconds);
  if (pausedRemaining !== stormRecovered.activeEvent.remainingSeconds) throw new Error('Emergency timer ran while paused');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.waitForTimeout(1100);
  const activeRemaining = await page.evaluate(() => window.__lunaquestStore.getState().activeEvent.remainingSeconds);
  if (!(activeRemaining < pausedRemaining && activeRemaining > pausedRemaining - 2)) throw new Error('Emergency timer did not resume once');

  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: 'Replace Save & Start' }).click();
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  const fresh = await page.evaluate(() => window.__lunaquestStore.getState());
  if (fresh.xp !== 0 || fresh.completedMissionRunIds.length || fresh.completedEventIds.length
    || fresh.resources.food !== 55 || fresh.day !== 1) throw new Error('New Game retained old progress');
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('Feature 7 browser checks passed: refresh/Continue, unloaded HP freeze, close/reopen, mission recovery, replay rejection, emergency timer recovery and New Game.');
} finally {
  await browser.close();
}
