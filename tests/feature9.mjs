import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { useExistingPlayer } from './legacyProfile.mjs';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
await useExistingPlayer(page);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const url = process.env.LUNAQUEST_URL ?? 'http://127.0.0.1:5174/';
const state = () => page.evaluate(() => window.__lunaquestStore.getState());
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  mkdirSync('artifacts', { recursive: true });
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  assert((await state()).daysSurvived === 0, 'New run must start with zero completed days');
  await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.setPosition(400, 274));
  await page.waitForTimeout(180);
  await page.keyboard.press('e');
  await page.getByRole('button', { name: /Advance Day/ }).click();
  await page.evaluate(() => {
    for (let i = 0; i < 36; i++) window.__lunaquestStore.dispatch({ type: 'TICK', deltaSeconds: 1 });
  });
  await page.getByRole('button', { name: /Advance Day/ }).click();
  await page.getByRole('button', { name: /Repair habitat/ }).click();
  for (let n = 3; n <= 6; n++) {
    await page.evaluate(() => {
      for (let i = 0; i < 36; i++) window.__lunaquestStore.dispatch({ type: 'TICK', deltaSeconds: 1 });
    });
    await page.getByRole('button', { name: /Advance Day/ }).click();
  }
  const playing = await state();
  assert(playing.status === 'playing' && playing.daysSurvived === 6 && playing.day === 7, 'Day-six run did not remain active');
  const expectedScore = 6000 + Math.min(999, playing.xp);
  assert(await page.getByText(`Score ${expectedScore.toLocaleString()}`, { exact: true }).count() === 1, 'Current score display is wrong');
  assert(await page.getByText('Survived 6 days', { exact: true }).count() === 1, 'Completed-day display is wrong');
  await page.screenshot({ path: 'artifacts/feature9-endless-run.png', fullPage: true });

  // The existing typed test action reaches the same zero-HP defeat path as survival damage.
  await page.evaluate(() => window.__lunaquestStore.dispatch({ type: 'UPDATE_ASTRONAUT', changes: { health: 0 } }));
  await page.getByRole('complementary', { name: 'Mission result' }).waitFor();
  assert(await page.getByText('MISSION ENDED', { exact: true }).count() === 1, 'Result heading missing');
  assert(await page.getByText('NEW RECORD!', { exact: false }).count() === 1, 'New record celebration missing');
  assert(await page.getByText('You survived 6 lunar days!', { exact: true }).count() === 1, 'Result day count wrong');
  await page.screenshot({ path: 'artifacts/feature9-game-over.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/feature9-game-over-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  const highScoreBefore = await page.evaluate(() => localStorage.getItem('lunaquest.highScore.v1'));
  assert(JSON.parse(highScoreBefore).record.bestDaysSurvived === 6, 'Personal best not persisted');

  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'View Last Result' }).click();
  assert((await state()).status === 'defeat', 'Ended run resumed as active');
  assert(await page.getByText('You survived 6 lunar days!', { exact: true }).count() === 1, 'Saved result not restored');
  assert(await page.evaluate(() => localStorage.getItem('lunaquest.highScore.v1')) === highScoreBefore, 'Reload duplicated record update');
  await page.getByRole('button', { name: 'TRY AGAIN' }).click();
  const restarted = await state();
  assert(restarted.status === 'playing' && restarted.daysSurvived === 0 && restarted.xp === 0, 'Restart retained run progress');
  assert(restarted.recordToBeat.bestDaysSurvived === 6, 'Restart lost record baseline');
  assert(await page.getByText('Best 6 days', { exact: true }).count() === 1, 'Restart did not show personal best');

  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Continue Game' }).click();
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  assert((await state()).daysSurvived === 0 && (await state()).recordToBeat.bestDaysSurvived === 6, 'Continue changed score or record');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/feature9-mobile.png', fullPage: true });
  const width = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
  assert(width.content <= width.viewport, `Mobile score HUD overflows: ${JSON.stringify(width)}`);
  assert(errors.length === 0, `Browser errors: ${errors.join(' | ')}`);
  console.log('Feature 9 Chromium passed: day-six survival, score, defeat, record, terminal refresh, restart, active Continue and mobile layout.');
} finally {
  await browser.close();
}
