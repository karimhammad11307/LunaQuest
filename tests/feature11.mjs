import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const url = process.env.MOONBOUND_URL ?? 'http://127.0.0.1:5174/';
const gameState = () => page.evaluate(() => window.__moonboundStore.getState());
const scene = () => page.evaluate(() => {
  const s = window.__moonboundGame.scene.getScene('MoonBaseScene');
  return { visible: s.astronaut.visible, x: s.astronaut.x, y: s.astronaut.y };
});
const check = (condition, message) => { if (!condition) throw Error(message); };

try {
  mkdirSync('artifacts', { recursive: true });
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => window.__moonboundGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  const frame = await page.locator('.game-frame').boundingBox();
  check(Math.abs(frame.width - 1280) < 8 && Math.abs(frame.height - 900) < 8, 'Game does not fill desktop viewport');
  await page.keyboard.down('d');
  await page.waitForTimeout(260);
  await page.keyboard.up('d');
  check((await gameState()).astronaut.position.x > 400, 'Desktop keyboard movement failed');

  await page.evaluate(() => window.__moonboundGame.scene.getScene('MoonBaseScene').astronaut.setPosition(400, 276));
  await page.waitForTimeout(160);
  await page.keyboard.press('e');
  await page.waitForFunction(() => window.__moonboundStore.getState().astronaut.location === 'habitat');
  check(!(await scene()).visible, 'Astronaut remains visible indoors');
  check(await page.getByText('INSIDE HABITAT · Q TO EXIT').count() === 1, 'Indoor status missing');
  const beforeOxygen = (await gameState()).astronaut.suitOxygen;
  await page.waitForTimeout(700);
  check((await gameState()).astronaut.suitOxygen === beforeOxygen, 'Suit oxygen drained indoors');
  await page.screenshot({ path: 'artifacts/feature11-inside-habitat.png', fullPage: true });
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  check(await page.locator('.building-panel button.menu-selected').count() === 1, 'Keyboard menu highlight missing');
  check((await page.locator('.building-panel button.menu-selected').innerText()).includes('Recycle Oxygen'),
    'Keyboard arrows did not reach Recycle Oxygen');
  await page.keyboard.press('Enter');
  const recycled = await gameState();
  check(recycled.resources.oxygen === 95 && recycled.resources.energy === 67 && recycled.lastOxygenRecycleDay === 1,
    'Keyboard recycle did not apply 8 Energy / 15 oxygen once');
  check(await page.getByRole('button', { name: /Recycle Oxygen/ }).isDisabled(), 'Recycle cooldown did not disable action');
  check(!(await page.locator('.building-panel button.menu-selected').isDisabled()),
    'Keyboard selection stayed on disabled recycle action');
  await page.keyboard.press('q');
  const exited = await gameState();
  check(exited.astronaut.location === 'outside' && exited.selectedBuildingId === null, 'Q failed to exit Habitat');
  check((await scene()).visible && Math.abs((await scene()).y - 276) < 2, 'Q exit did not show astronaut at safe entrance');
  await page.keyboard.press('q');
  check((await gameState()).astronaut.location === 'outside', 'Repeated Q changed outside state');

  await page.evaluate(() => window.__moonboundGame.scene.getScene('MoonBaseScene').astronaut.setPosition(232, 355));
  await page.waitForTimeout(160);
  await page.keyboard.press('e');
  check((await gameState()).astronaut.location === 'greenhouse' && !(await scene()).visible, 'Greenhouse entry failed');
  await page.keyboard.press('q');
  check((await gameState()).astronaut.location === 'outside' && (await scene()).visible, 'Greenhouse Q exit failed');
  await page.evaluate(() => window.__moonboundGame.scene.getScene('MoonBaseScene').astronaut.setPosition(636, 432));
  await page.waitForTimeout(160);
  await page.keyboard.press('e');
  check((await gameState()).astronaut.location === 'shelter' && !(await scene()).visible, 'Shelter entry failed');
  await page.keyboard.press('q');

  await page.evaluate(() => window.__moonboundGame.scene.getScene('MoonBaseScene').astronaut.setPosition(400, 276));
  await page.waitForTimeout(160);
  await page.keyboard.press('e');
  await page.getByRole('button', { name: /Advance Day/ }).click();
  check((await gameState()).activeEvent?.id === 'solar-day-2', 'Day 2 storm not scheduled');
  await page.waitForTimeout(1200);
  check((await gameState()).activeEvent.remainingSeconds < 24, 'Storm warning did not count down in browser');
  await page.evaluate(() => { for (let i = 0; i < 36; i++) window.__moonboundStore.dispatch({ type: 'TICK', deltaSeconds: 1 }); });
  check((await gameState()).activeEvent === null, 'Day 2 storm did not complete');
  await page.getByRole('button', { name: /Advance Day/ }).click();
  check((await gameState()).activeEvent?.type === 'oxygen-leak'
    && (await gameState()).pendingEventIds.includes('solar-day-3'), 'Day 3 storm not queued behind leak');
  await page.reload();
  await page.getByRole('button', { name: 'Continue Game' }).click();
  await page.waitForFunction(() => window.__moonboundGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  check((await gameState()).pendingEventIds.includes('solar-day-3')
    && (await gameState()).activeEvent?.type === 'oxygen-leak', 'Refresh lost queued storm');
  await page.evaluate(() => window.__moonboundGame.scene.getScene('MoonBaseScene').astronaut.setPosition(400, 276));
  await page.waitForTimeout(160);
  await page.keyboard.press('e');
  await page.getByRole('button', { name: /Repair habitat/ }).click();
  check((await gameState()).activeEvent?.id === 'solar-day-3', 'Queued Day 3 storm did not start');
  await page.screenshot({ path: 'artifacts/feature11-recurring-storm.png', fullPage: true });
  await page.evaluate(() => { for (let i = 0; i < 36; i++) window.__moonboundStore.dispatch({ type: 'TICK', deltaSeconds: 1 }); });
  await page.getByRole('button', { name: /Advance Day/ }).click();
  check((await gameState()).activeEvent?.id === 'solar-day-4', 'Day 4 storm did not recur');

  await page.getByRole('button', { name: 'Enter fullscreen' }).click();
  await page.waitForTimeout(250);
  const fullscreenSupported = await page.evaluate(() => !!document.fullscreenElement);
  if (fullscreenSupported) await page.getByRole('button', { name: 'Exit fullscreen' }).click();
  await page.setViewportSize({ width: 960, height: 620 });
  await page.waitForTimeout(250);
  const resized = await page.locator('.game-frame').boundingBox();
  check(Math.abs(resized.width - 960) < 8 && Math.abs(resized.height - 620) < 8, 'Desktop resize did not refill viewport');

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage();
  const mobileErrors = [];
  mobile.on('pageerror', (error) => mobileErrors.push(error.message));
  await mobile.goto(url);
  await mobile.waitForLoadState('networkidle');
  await mobile.waitForFunction(() => window.__moonboundGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  check(await mobile.locator('.joystick').isVisible(), 'Mobile joystick hidden');
  const stick = await mobile.locator('.joystick').boundingBox();
  const centerX = stick.x + stick.width / 2;
  const centerY = stick.y + stick.height / 2;
  const cdp = await mobileContext.newCDPSession(mobile);
  const x0 = await mobile.evaluate(() => window.__moonboundGame.scene.getScene('MoonBaseScene').astronaut.x);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: centerX, y: centerY, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: centerX + 30, y: centerY - 22, id: 1 }] });
  await mobile.waitForTimeout(360);
  const moved = await mobile.evaluate(() => ({ x: window.__moonboundGame.scene.getScene('MoonBaseScene').astronaut.x,
    y: window.__moonboundGame.scene.getScene('MoonBaseScene').astronaut.y }));
  check(moved.x > x0 + 3 && moved.y < 316 - 3, 'Analog joystick did not move diagonally');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await mobile.waitForTimeout(120);
  check(await mobile.locator('.joystick-knob').evaluate((node) => node.style.transform.includes('0px, 0px')),
    'Joystick did not center after cancellation');
  await mobile.evaluate(() => window.__moonboundGame.scene.getScene('MoonBaseScene').astronaut.setPosition(400, 276));
  await mobile.waitForTimeout(160);
  await mobile.getByRole('button', { name: 'Interact' }).click();
  check(await mobile.evaluate(() => window.__moonboundStore.getState().astronaut.location) === 'habitat',
    'Mobile Interact did not enter Habitat');
  await mobile.screenshot({ path: 'artifacts/feature11-mobile-habitat.png', fullPage: true });
  await mobile.getByRole('button', { name: /Recycle Oxygen/ }).click();
  check(await mobile.evaluate(() => window.__moonboundStore.getState().resources.oxygen) === 95,
    'Mobile Habitat action did not recycle oxygen');
  await mobile.getByRole('button', { name: 'Exit (Q)' }).click();
  check(await mobile.evaluate(() => window.__moonboundStore.getState().astronaut.location) === 'outside',
    'Mobile Exit did not leave Habitat');
  await mobile.evaluate(() => window.__moonboundGame.scene.getScene('MoonBaseScene').astronaut.setPosition(316, 388));
  await mobile.waitForTimeout(160);
  await mobile.getByRole('button', { name: 'Interact' }).click();
  await mobile.getByRole('button', { name: /Launch Chicken Hunt/ }).click();
  await mobile.waitForFunction(() => window.__moonboundStore.getState().scene === 'chicken-hunt'
    && window.__moonboundGame.scene.getScene('ChickenHuntScene').sys.isActive());
  const arcadeStart = await mobile.evaluate(() => {
    const scene = window.__moonboundGame.scene.getScene('ChickenHuntScene');
    return { x: scene.ship.sprite.x, y: scene.ship.sprite.y };
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: centerX, y: centerY, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: centerX + 26, y: centerY - 24, id: 2 }] });
  await mobile.waitForTimeout(320);
  const arcadeMoved = await mobile.evaluate(() => {
    const scene = window.__moonboundGame.scene.getScene('ChickenHuntScene');
    return { x: scene.ship.sprite.x, y: scene.ship.sprite.y };
  });
  check(arcadeMoved.x > arcadeStart.x && arcadeMoved.y < arcadeStart.y, 'Mobile joystick did not move arcade ship');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const laserBefore = await mobile.evaluate(() => window.__moonboundAudio.debug().cueCounts.laser ?? 0);
  await mobile.getByRole('button', { name: 'Hold to Fire' }).dispatchEvent('pointerdown');
  await mobile.waitForTimeout(250);
  await mobile.getByRole('button', { name: 'Hold to Fire' }).dispatchEvent('pointerup');
  check(await mobile.evaluate(() => window.__moonboundAudio.debug().cueCounts.laser ?? 0) > laserBefore,
    'Mobile Fire button did not trigger arcade laser');
  await mobile.getByRole('button', { name: 'Return' }).click();
  await mobile.waitForFunction(() => window.__moonboundStore.getState().scene === 'moon-base'
    && window.__moonboundGame.scene.getScene('MoonBaseScene').sys.isActive());
  check(await mobile.evaluate(() => window.__moonboundStore.getState().resources.energy) === 61,
    'Mobile arcade return changed the six-Energy launch cost');
  await mobile.getByRole('button', { name: 'Back to Moon Base' }).click();
  const mobileBox = await mobile.locator('.game-frame').boundingBox();
  check(Math.abs(mobileBox.width - 390) < 8 && Math.abs(mobileBox.height - 844) < 8, 'Mobile game frame does not fill viewport');
  check(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile layout overflows horizontally');
  await mobile.screenshot({ path: 'artifacts/feature11-mobile.png', fullPage: true });
  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.waitForTimeout(250);
  const landscape = await mobile.locator('.game-frame').boundingBox();
  check(Math.abs(landscape.width - 844) < 8 && Math.abs(landscape.height - 390) < 8,
    'Mobile landscape resize did not refill viewport');
  const landscapeWorld = await mobile.locator('.canvas-wrap').boundingBox();
  check(landscapeWorld.height >= 240, 'Mobile landscape game world is too short to play');
  check(await mobile.locator('.joystick').isVisible()
    && await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  'Mobile landscape controls hidden or horizontally clipped');
  await mobile.screenshot({ path: 'artifacts/feature11-mobile-landscape.png', fullPage: true });
  await mobileContext.close();
  check(errors.length === 0 && mobileErrors.length === 0, `Browser errors: ${[...errors, ...mobileErrors].join(' | ')}`);
  console.log(`Feature 11 Chromium passed: E/Q indoor flow, keyboard recycle, consecutive storms/queue/reload, mobile base/arcade joystick and controls, responsive desktop/mobile; fullscreen API ${fullscreenSupported ? 'active' : 'not granted in headless Chromium'}.`);
} finally { await browser.close(); }
