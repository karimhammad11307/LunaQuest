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
const audio = () => page.evaluate(() => window.__lunaquestAudio.debug());
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  mkdirSync('artifacts', { recursive: true });
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  assert((await audio()).unlocked === false, 'Audio played before a user gesture');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => window.__lunaquestAudio?.debug().unlocked === true);
  assert((await audio()).track === 'base' && (await audio()).activeMusicTracks === 1, 'Base music did not start after gesture');

  await page.getByRole('button', { name: 'Audio settings' }).click();
  await page.getByRole('dialog', { name: 'Audio settings' }).waitFor();
  await page.locator('.audio-panel input[type=range]').first().evaluate((input) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '42'); input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('.audio-panel input[type=range]').nth(1).evaluate((input) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '27'); input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  assert((await audio()).preferences.musicVolume === 0.42 && (await audio()).preferences.sfxVolume === 0.27,
    'Volume settings did not update');
  await page.getByRole('button', { name: 'Close audio settings' }).click();

  await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.setPosition(316, 388));
  await page.waitForTimeout(180);
  await page.keyboard.press('e');
  await page.getByRole('complementary', { name: 'landingPad controls' }).waitFor();
  assert((await page.locator('.launch-preview').innerText()).includes('75 → 69'), 'Landing Pad lacks exact launch cost preview');
  const before = await state();
  await page.getByRole('button', { name: /Launch Chicken Hunt/ }).click();
  await page.waitForFunction(() => window.__lunaquestStore.getState().scene === 'chicken-hunt');
  const launched = await state();
  assert(launched.resources.energy === before.resources.energy - 6, 'Launch did not deduct six Energy');
  assert(await page.getByLabel('Energy: 69 of 100 game units').count() === 1, 'React HUD did not show the charged Energy');
  assert((await page.locator('.launch-cost-banner').innerText()).includes('75 → 69'), 'Launch Energy banner missing');
  assert((await audio()).track === 'arcade' && (await audio()).activeMusicTracks === 1, 'Arcade track did not replace base track');
  assert((await audio()).cueCounts.launch === 1, 'Launch sound was not triggered exactly once');
  const duplicate = await page.evaluate(() => {
    const store = window.__lunaquestStore;
    const before = store.getState();
    const after = store.dispatch({ type: 'START_MISSION', mission: 'chicken-hunt', runId: 'double-click' });
    return { same: before === after, energy: after.resources.energy };
  });
  assert(duplicate.same && duplicate.energy === 69, 'Repeated launch charged again');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(170);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(170);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('Space');
  await page.waitForTimeout(2400);
  await page.keyboard.up('Space');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(1050);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(1700);
  assert((await audio()).cueCounts.thruster > 0 && (await audio()).cueCounts.laser > 0,
    'Arcade thruster or laser sound hook did not fire');
  const combat = await page.evaluate(() => window.__lunaquestGame.scene.getScene('ChickenHuntScene').localFoodCollected);
  assert(combat > 0, 'No live food pickup occurred');
  assert((await audio()).cueCounts.enemyHit > 0 && (await audio()).cueCounts.enemyDefeat > 0
    && (await audio()).cueCounts.pickup > 0, 'Enemy or food-pickup sound hook did not fire');
  const canvas = await page.locator('#game-canvas canvas').boundingBox();
  await page.mouse.click(canvas.x + canvas.width * 550 / 640, canvas.y + canvas.height * 20 / 360);
  await page.waitForFunction(() => window.__lunaquestStore.getState().scene === 'moon-base'
    && window.__lunaquestGame.scene.getScene('MoonBaseScene').sys.isActive());
  assert((await state()).resources.energy === 69, 'Return refunded launch Energy');
  assert((await audio()).track === 'base' && (await audio()).activeMusicTracks === 1, 'Base music did not resume cleanly');
  assert((await audio()).cueCounts.missionSuccess > 0, 'Mission-success cue did not play');
  await page.screenshot({ path: 'artifacts/feature10-base-return.png', fullPage: true });

  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Continue Game' }).click();
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  assert((await state()).resources.energy === 69, 'Refresh reversed or duplicated launch cost');
  assert((await audio()).preferences.musicVolume === 0.42 && (await audio()).preferences.sfxVolume === 0.27,
    'Audio settings did not survive refresh');

  await page.evaluate(() => {
    window.__lunaquestStore.dispatch({ type: 'SPEND_RESOURCES', costs: { energy: 64 } });
    window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.setPosition(316, 388);
  });
  await page.waitForTimeout(180);
  await page.keyboard.press('e');
  await page.getByRole('button', { name: /Launch Chicken Hunt/ }).click();
  assert(await page.getByText('Not enough energy to launch!', { exact: true }).count() === 1,
    'Insufficient Energy message missing');
  assert((await state()).resources.energy === 5 && (await state()).scene === 'moon-base',
    'Insufficient launch changed resources or scene');
  await page.evaluate(() => window.__lunaquestStore.dispatch({ type: 'RESTART_GAME' }));
  await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.setPosition(400, 274));
  await page.waitForTimeout(180);
  await page.keyboard.press('e');
  assert((await state()).astronaut.location === 'habitat', 'E did not enter Habitat');
  await page.getByRole('button', { name: /Advance Day/ }).click();
  assert((await audio()).cueCounts.stormAlarm === 1, 'Storm warning alarm did not start once');
  await page.evaluate(() => {
    for (let i = 0; i < 25; i++) window.__lunaquestStore.dispatch({ type: 'TICK', deltaSeconds: 1 });
  });
  assert((await audio()).hazard === 'storm' && (await audio()).cueCounts.stormAlarm === 1,
    'Storm danger ambience or alarm deduplication failed');
  await page.evaluate(() => {
    for (let i = 0; i < 12; i++) window.__lunaquestStore.dispatch({ type: 'TICK', deltaSeconds: 1 });
  });
  assert((await audio()).hazard === null, 'Storm ambience continued after resolution');
  await page.getByRole('button', { name: /Advance Day/ }).click();
  assert((await audio()).cueCounts.leakAlarm === 1, 'Leak alarm did not start');
  await page.evaluate(() => {
    for (let i = 0; i < 8; i++) window.__lunaquestStore.dispatch({ type: 'TICK', deltaSeconds: 1 });
  });
  assert((await audio()).hazard === 'leak', 'Leak ambience did not start');
  await page.getByRole('button', { name: /Repair habitat/ }).click();
  assert((await audio()).hazard === null, 'Leak ambience continued after repair');

  await page.getByRole('button', { name: 'Audio settings' }).click();
  await page.getByRole('button', { name: 'MUTE ALL' }).click();
  const cueCount = (await audio()).cueCounts.confirm ?? 0;
  await page.evaluate(() => window.__lunaquestAudio.play('confirm'));
  assert(((await audio()).cueCounts.confirm ?? 0) === cueCount, 'Muted audio still played');
  await page.getByRole('button', { name: 'UNMUTE ALL' }).click();
  await page.getByRole('button', { name: 'Close audio settings' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Audio settings' }).click();
  await page.screenshot({ path: 'artifacts/feature10-audio-mobile.png', fullPage: true });
  const width = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  assert(width.content <= width.viewport, `Mobile audio panel overflows: ${JSON.stringify(width)}`);
  assert(errors.length === 0, `Browser errors: ${errors.join(' | ')}`);
  console.log('Feature 10 Chromium passed: unlock, base/arcade music, 6-Energy charge/HUD, live laser/hit/defeat/pickup/thruster cues, return, refresh/settings, shortage message, storm/leak audio, mute and mobile layout.');
} finally {
  await browser.close();
}
