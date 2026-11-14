import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const browser = await chromium.launch({ headless: true });
const url = process.env.LUNAQUEST_URL ?? 'http://127.0.0.1:5174/';
const check = (value, message) => { if (!value) throw Error(message); };
mkdirSync('artifacts', { recursive: true });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.getByRole('dialog', { name: 'LunaQuest mission introduction' }).waitFor();
  check(await page.title() === 'LUNAQUEST', 'Official tab title is missing');
  await page.screenshot({ path: 'artifacts/onboarding-intro-desktop.png', fullPage: true });
  check(await page.getByText('Hello, Astronaut!').isVisible(), 'First introduction page missing');
  await page.keyboard.press('ArrowRight');
  check(await page.getByText('Living here takes care.').isVisible(), 'Keyboard Next failed');
  await page.keyboard.press('ArrowLeft');
  check(await page.getByText('Hello, Astronaut!').isVisible(), 'Keyboard Back failed');
  await page.getByRole('button', { name: 'Next →' }).click();
  await page.getByRole('button', { name: 'Next →' }).click();
  check(await page.getByText('Survive as many lunar days as you can!').count() > 0, 'Endless objective missing');
  await page.getByRole('button', { name: 'Start Mission' }).click();
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  check(await page.getByText("Let's explore the Moon!").isVisible(), 'Movement tutorial missing');
  const first = await page.evaluate(() => window.__lunaquestStore.getState());
  await page.keyboard.down('w');
  await page.waitForTimeout(670);
  await page.keyboard.up('w');
  await page.getByText('Step inside!').waitFor();
  check(await page.locator('.tutorial-panel').getByText('Press E to enter the Habitat.').isVisible(), 'Habitat entry guidance missing');
  check(await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').tutorialMarker.visible),
    'Habitat world marker is missing');
  await page.screenshot({ path: 'artifacts/onboarding-habitat-guide.png', fullPage: true });
  await page.keyboard.press('e');
  await page.getByText('Choose an action').waitFor();
  check(await page.evaluate(() => !window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.visible), 'Astronaut stayed visible indoors');
  await page.keyboard.press('ArrowDown');
  await page.getByText('Try a choice').waitFor();
  await page.keyboard.press('Enter');
  await page.getByText('Your survival supplies').waitFor();
  const paused = await page.evaluate(() => window.__lunaquestStore.getState());
  check(paused.paused, 'Resource reading panel did not pause simulation');
  await page.screenshot({ path: 'artifacts/onboarding-resources-desktop.png', fullPage: true });
  await page.waitForTimeout(1050);
  const still = await page.evaluate(() => window.__lunaquestStore.getState());
  check(still.astronaut.health === paused.astronaut.health
    && still.astronaut.suitOxygen === paused.astronaut.suitOxygen, 'Health or oxygen drained while reading');
  await page.getByRole('button', { name: 'Next: leave the Habitat' }).click();
  await page.getByText('Back outside').waitFor();
  await page.keyboard.press('q');
  await page.getByText('Great job, Astronaut!').waitFor();
  check(await page.evaluate(() => window.__lunaquestStore.getState().paused), 'Final reading panel is not paused');
  await page.getByRole('button', { name: 'Begin Independent Survival' }).click();
  check(await page.locator('.tutorial-panel').count() === 0, 'Tutorial remained after completion');
  const completed = await page.evaluate(() => ({ state: window.__lunaquestStore.getState(),
    onboarding: JSON.parse(localStorage.getItem('lunaquest.onboarding.v1')) }));
  check(completed.onboarding.progress.tutorialLearned && completed.onboarding.progress.tutorialStep === null,
    'Tutorial completion did not persist');
  check(completed.state.xp === first.xp && completed.state.day === first.day,
    'Tutorial granted XP or advanced the day');
  await page.reload();
  await page.getByRole('button', { name: 'Continue Game' }).click();
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  check(await page.locator('.tutorial-panel').count() === 0, 'Continue repeated completed tutorial');
  await page.getByRole('button', { name: /How to play/ }).click();
  await page.getByRole('button', { name: 'Replay Guided Tutorial' }).click();
  await page.getByText("Let's explore the Moon!").waitFor();
  await page.getByRole('button', { name: 'Skip Tutorial' }).click();
  check(await page.locator('.tutorial-panel').count() === 0, 'Skip Tutorial failed');
  check(errors.length === 0, `Desktop browser errors: ${errors.join(' | ')}`);
  await context.close();

  const interrupted = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const interruptedPage = await interrupted.newPage();
  await interruptedPage.goto(url);
  await interruptedPage.getByRole('button', { name: 'Skip Intro' }).click();
  await interruptedPage.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  await interruptedPage.keyboard.down('w');
  await interruptedPage.waitForTimeout(650);
  await interruptedPage.keyboard.up('w');
  await interruptedPage.getByText('Step inside!').waitFor();
  await interruptedPage.keyboard.press('e');
  await interruptedPage.keyboard.press('ArrowDown');
  await interruptedPage.keyboard.press('Enter');
  await interruptedPage.getByText('Your survival supplies').waitFor();
  const beforeRefresh = await interruptedPage.evaluate(() => window.__lunaquestStore.getState());
  await interruptedPage.reload();
  await interruptedPage.getByRole('button', { name: 'Continue Game' }).click();
  await interruptedPage.getByText('Find the Habitat').waitFor();
  const afterRefresh = await interruptedPage.evaluate(() => window.__lunaquestStore.getState());
  check(!afterRefresh.paused && afterRefresh.astronaut.location === 'outside', 'Interrupted indoor guide did not recover outdoors');
  check(afterRefresh.resources.food === beforeRefresh.resources.food && afterRefresh.xp === beforeRefresh.xp,
    'Tutorial recovery changed resources or XP');
  // An emergency takes precedence over tutorial reading and the guide resumes when the warning ends.
  await interruptedPage.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.setPosition(400, 274));
  await interruptedPage.getByText('Step inside!').waitFor();
  await interruptedPage.keyboard.press('e');
  await interruptedPage.keyboard.press('ArrowDown');
  await interruptedPage.evaluate(() => window.__lunaquestStore.dispatch({ type: 'ADVANCE_DAY' }));
  await interruptedPage.getByRole('button', { name: /Refill Suit/ }).click();
  const duringStorm = await interruptedPage.evaluate(() => window.__lunaquestStore.getState());
  check(duringStorm.activeEvent?.type === 'solar-storm' && !duringStorm.paused,
    'Onboarding blocked the active storm warning');
  check(await interruptedPage.getByText('Your survival supplies').count() === 0,
    'Tutorial covered the emergency warning');
  await interruptedPage.evaluate(() => {
    for (let i = 0; i < 36; i++) window.__lunaquestStore.dispatch({ type: 'TICK', deltaSeconds: 1 });
  });
  await interruptedPage.getByText('Your survival supplies').waitFor();
  check(await interruptedPage.evaluate(() => window.__lunaquestStore.getState().paused),
    'Tutorial did not safely resume after the storm');
  await interrupted.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage();
  await mobile.goto(url);
  await mobile.getByRole('dialog', { name: 'LunaQuest mission introduction' }).waitFor();
  await mobile.screenshot({ path: 'artifacts/onboarding-intro-mobile.png', fullPage: true });
  check(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile introduction overflows horizontally');
  await mobile.getByRole('button', { name: 'Skip Intro' }).click();
  await mobile.getByText('Use the joystick to move your astronaut.').waitFor();
  await mobile.screenshot({ path: 'artifacts/onboarding-movement-mobile.png', fullPage: true });
  const joystick = await mobile.locator('.joystick').boundingBox();
  const centerX = joystick.x + joystick.width / 2;
  const centerY = joystick.y + joystick.height / 2;
  const cdp = await mobileContext.newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: centerX, y: centerY, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: centerX, y: centerY - 30, id: 1 }] });
  await mobile.waitForTimeout(650);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobile.getByText('Step inside!').waitFor();
  await mobile.getByRole('button', { name: 'Interact' }).click();
  await mobile.getByText('Choose an action').waitFor();
  await mobile.getByRole('button', { name: /Refill Suit/ }).click();
  await mobile.getByText('Your survival supplies').waitFor();
  await mobile.screenshot({ path: 'artifacts/onboarding-resources-mobile.png', fullPage: true });
  check(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile tutorial overflows horizontally');
  await mobileContext.close();
  console.log('Onboarding Chromium passed: first-run intro, keyboard pages, movement, Habitat E/menu/Q, paused resource learning, Continue/replay, interrupted refresh, and mobile touch guide.');
} finally { await browser.close(); }
