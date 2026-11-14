import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const browser = await chromium.launch({ headless: true });
const url = process.env.LUNAQUEST_URL ?? 'http://127.0.0.1:5174/';
const check = (value, message) => { if (!value) throw Error(message); };
const stage = (page, index) => page.waitForFunction((n) =>
  window.__lunaquestJourney?.scene?.getScene('SpaceJourneyScene')?.stageIndex === n, index);
const pose = (page) => page.evaluate(() => {
  const scene = window.__lunaquestJourney.scene.getScene('SpaceJourneyScene');
  return { stage: scene.stageIndex, shipX: scene.lander.x, shipY: scene.lander.y,
    moonScale: scene.moon.scaleX, groundAlpha: scene.ground.alpha };
});
mkdirSync('artifacts', { recursive: true });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.getByRole('button', { name: 'New Game' }).click();
  await stage(page, 0);
  check(await page.locator('#journey-canvas canvas').count() === 1, 'Cinematic canvas did not mount');
  await page.waitForFunction(() => window.__lunaquestAudio?.debug().unlocked);
  check(await page.evaluate(() => window.__lunaquestAudio.debug().track === 'journey'),
    'Journey chiptune did not start after the New Game gesture');
  check(await page.evaluate(() => !window.__lunaquestGame), 'Playable game mounted during the cinematic');
  check(await page.evaluate(() => !localStorage.getItem('lunaquest.session.v4')),
    'Survival save started during travel');
  await page.screenshot({ path: 'artifacts/journey-earth.png', fullPage: true });
  await page.waitForTimeout(450);
  const earthStart = await pose(page);
  await page.waitForTimeout(450);
  const earthMoving = await pose(page);
  check(earthMoving.shipX > earthStart.shipX + 5, 'Ship did not visibly depart Earth');

  await stage(page, 1);
  await page.screenshot({ path: 'artifacts/journey-travel-a.png', fullPage: true });
  const travelA = await pose(page);
  await page.waitForTimeout(520);
  const travelB = await pose(page);
  await page.screenshot({ path: 'artifacts/journey-travel-b.png', fullPage: true });
  check(travelB.shipX > travelA.shipX + 5 && travelB.moonScale > travelA.moonScale,
    'Space travel or Moon approach was static');
  await page.getByRole('button', { name: 'Pause journey' }).click();
  const paused = await pose(page);
  await page.waitForTimeout(450);
  check(Math.abs((await pose(page)).shipX - paused.shipX) < 1, 'Pause did not freeze the journey');
  await page.getByRole('button', { name: 'Resume journey' }).click();

  await stage(page, 2);
  await page.screenshot({ path: 'artifacts/journey-approach.png', fullPage: true });
  const approachA = await pose(page);
  await page.waitForTimeout(520);
  check((await pose(page)).moonScale > approachA.moonScale, 'Moon did not grow on approach');
  await stage(page, 3);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'artifacts/journey-landing-a.png', fullPage: true });
  const landingA = await pose(page);
  await page.waitForTimeout(1700);
  const landingB = await pose(page);
  await page.screenshot({ path: 'artifacts/journey-landing-b.png', fullPage: true });
  check(landingB.shipY > landingA.shipY + 50 && landingB.groundAlpha === 1,
    'Lander did not descend toward the Moon Base pad');
  await page.waitForFunction(() => window.__lunaquestJourney?.scene?.getScene('SpaceJourneyScene')?.landed);
  await page.screenshot({ path: 'artifacts/journey-touchdown.png', fullPage: true });
  await page.getByRole('dialog', { name: 'LunaQuest mission introduction' }).waitFor();
  const afterLanding = await page.evaluate(() => ({ onboarding: JSON.parse(localStorage.getItem('lunaquest.onboarding.v1')),
    save: localStorage.getItem('lunaquest.session.v4'), journey: window.__lunaquestJourney }));
  check(afterLanding.onboarding.version === 2 && afterLanding.onboarding.progress.journeySeen
    && !afterLanding.onboarding.progress.introSeen && !afterLanding.save && !afterLanding.journey,
  'Landing did not hand off safely to the existing briefing');
  check(await page.evaluate(() => {
    const audio = window.__lunaquestAudio.debug();
    return audio.track === null && (audio.cueCounts.journeyTouchdown ?? 0) > 0
      && (audio.cueCounts.journeySuccess ?? 0) > 0;
  }), 'Landing cues or cinematic audio cleanup failed');
  await page.getByRole('button', { name: 'Skip Intro' }).click();
  await page.getByText("Let's explore the Moon!").waitFor();
  const firstRun = await page.evaluate(() => window.__lunaquestStore.getState());
  check(firstRun.day === 1 && firstRun.xp === 0 && firstRun.astronaut.health === 100
    && firstRun.resources.food === 55 && firstRun.resources.water === 40
    && firstRun.resources.oxygen === 80 && firstRun.resources.energy === 75,
  'Journey changed starting survival resources');
  await page.getByRole('button', { name: 'Skip Tutorial' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Continue Game' }).click();
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  check(await page.locator('#journey-canvas').count() === 0, 'Continue replayed the journey');
  check((await page.evaluate(() => window.__lunaquestStore.getState())).daysSurvived === 0,
    'Continue changed survival time');
  await page.reload();
  await page.getByRole('button', { name: 'Replay Space Journey' }).click();
  await stage(page, 0);
  await page.getByRole('button', { name: 'SKIP INTRO' }).click();
  await page.getByRole('button', { name: 'Continue Game' }).waitFor();
  check(await page.getByRole('dialog', { name: 'LunaQuest mission introduction' }).count() === 0,
    'Replay restarted the mission briefing');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: 'Replace Save & Start' }).click();
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  check(await page.locator('#journey-canvas').count() === 0
    && await page.getByRole('dialog', { name: 'LunaQuest mission introduction' }).count() === 0,
  'Second New Game unexpectedly replayed learned onboarding');
  check(errors.length === 0, `Desktop console errors: ${errors.join(' | ')}`);
  await context.close();

  for (const index of [0, 1, 2, 3]) {
    const skipContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const skipPage = await skipContext.newPage();
    await skipPage.goto(url);
    await skipPage.getByRole('button', { name: 'New Game' }).click();
    await stage(skipPage, index);
    if (index === 1) await skipPage.getByRole('button', { name: 'Pause journey' }).click();
    await skipPage.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    await skipPage.getByRole('dialog', { name: 'LunaQuest mission introduction' }).waitFor();
    check(await skipPage.locator('#journey-canvas canvas').count() === 0,
      `Stage ${index} skip left the cinematic mounted`);
    check(await skipPage.evaluate(() => window.__lunaquestAudio.debug().track === null),
      `Stage ${index} skip left journey music active`);
    await skipContext.close();
  }

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage();
  await mobile.goto(url);
  await mobile.getByRole('button', { name: 'New Game' }).tap();
  await stage(mobile, 0);
  await mobile.screenshot({ path: 'artifacts/journey-mobile.png', fullPage: true });
  check(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Mobile journey caused horizontal overflow');
  await mobile.getByRole('button', { name: 'SKIP INTRO' }).tap();
  await mobile.getByRole('dialog', { name: 'LunaQuest mission introduction' }).waitFor();
  await mobileContext.close();

  const reducedContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const reduced = await reducedContext.newPage();
  await reduced.goto(url);
  await reduced.getByRole('button', { name: 'New Game' }).click();
  await stage(reduced, 3);
  await reduced.setViewportSize({ width: 390, height: 844 });
  await reduced.waitForTimeout(250);
  await reduced.screenshot({ path: 'artifacts/journey-mobile-arrival.png', fullPage: true });
  check(await reduced.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Reduced-motion mobile arrival overflows');
  check(await reduced.evaluate(() => {
    const stageRect = document.querySelector('.journey-stage').getBoundingClientRect();
    const canvasRect = document.querySelector('#journey-canvas canvas').getBoundingClientRect();
    return canvasRect.width <= stageRect.width + 1 &&
      canvasRect.left >= stageRect.left - 1 && canvasRect.right <= stageRect.right + 1 &&
      Math.abs((canvasRect.left + canvasRect.right) / 2 - (stageRect.left + stageRect.right) / 2) < 2;
  }), 'Resizing during the cinematic left the canvas clipped or off-center');
  const reducedA = await pose(reduced);
  await reduced.waitForTimeout(300);
  const reducedB = await pose(reduced);
  check(reducedA.shipY === reducedB.shipY, 'Reduced-motion arrival animated the ship');
  await reduced.getByRole('dialog', { name: 'LunaQuest mission introduction' }).waitFor();
  await reducedContext.close();

  const muteContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const muted = await muteContext.newPage();
  await muted.addInitScript(() => localStorage.setItem('lunaquest.audio.v1', JSON.stringify({ version: 1,
    preferences: { musicEnabled: true, sfxEnabled: true, musicVolume: 0.24, sfxVolume: 0.38, muted: true } })));
  await muted.goto(url);
  await muted.getByRole('button', { name: 'New Game' }).click();
  await stage(muted, 0);
  check(await muted.evaluate(() => window.__lunaquestAudio.debug().preferences.muted), 'Mute preference was ignored');
  await muted.getByRole('button', { name: 'SKIP INTRO' }).click();
  await muteContext.close();

  const fallbackContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const fallback = await fallbackContext.newPage();
  await fallback.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillRect;
    let thrown = false;
    CanvasRenderingContext2D.prototype.fillRect = function (...args) {
      if (!thrown && this.canvas.width === 128 && this.canvas.height === 128) {
        thrown = true;
        throw Error('Synthetic cinematic texture failure');
      }
      return original.apply(this, args);
    };
  });
  await fallback.goto(url);
  await fallback.getByRole('button', { name: 'New Game' }).click();
  await fallback.getByRole('dialog', { name: 'LunaQuest mission introduction' }).waitFor();
  await fallbackContext.close();
  console.log('Space Journey Chromium passed: four animated stages, ship/Moon motion, pause, natural landing, briefing/tutorial, save safety, Continue, replay, four-stage skip, mobile, reduced motion and mute.');
} finally { await browser.close(); }
