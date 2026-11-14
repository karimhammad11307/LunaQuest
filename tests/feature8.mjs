import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { useExistingPlayer } from './legacyProfile.mjs';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
let page = await context.newPage();
await useExistingPlayer(page);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const url = process.env.LUNAQUEST_URL ?? 'http://127.0.0.1:5174/';
const state = () => page.evaluate(() => window.__lunaquestStore.getState());
const scene = (key) => page.evaluate((name) => window.__lunaquestGame.scene.getScene(name).sys.isActive(), key);
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  mkdirSync('artifacts', { recursive: true });
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  assert((await state()).resources.water === 40, 'New game water balance is wrong');

  // Feature 11 changed the base collision paths; place the regression probe at the landing entrance.
  await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.setPosition(316, 388));
  await page.waitForTimeout(180);
  await page.keyboard.press('e');
  await page.getByRole('complementary', { name: 'landingPad controls' }).waitFor();
  await page.getByRole('button', { name: /Learn: Chicken Hunt/ }).click();
  await page.getByRole('dialog', { name: 'Chicken Hunt learning sign' }).waitFor();
  assert((await page.getByRole('dialog').innerText()).includes('fictional'), 'Chicken Hunt fiction label missing');
  await page.getByRole('button', { name: /back to game/ }).click();
  await page.keyboard.press('e');
  await page.getByRole('button', { name: /Launch Chicken Hunt/ }).click();
  await page.waitForFunction(() => window.__lunaquestGame.scene.getScene('ChickenHuntScene').sys.isActive());
  const launch = await state();
  assert(launch.resources.energy === 69 && !!launch.activeMissionRunId, 'Launch energy/run ID invalid');
  assert(await scene('ChickenHuntScene'), 'Chicken Hunt did not start');

  // Fire at the normal, deterministic first wave. Then fly toward the drops.
  const shipX = await page.evaluate(() => window.__lunaquestGame.scene.getScene('ChickenHuntScene').ship.sprite.x);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(170);
  await page.keyboard.up('ArrowRight');
  const movedX = await page.evaluate(() => window.__lunaquestGame.scene.getScene('ChickenHuntScene').ship.sprite.x);
  assert(movedX > shipX + 10, 'Ship did not move by keyboard');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(170);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('Space');
  await page.waitForTimeout(2400);
  await page.keyboard.up('Space');
  const dropsBefore = await page.evaluate(() => window.__lunaquestGame.scene.getScene('ChickenHuntScene').collectibles.filter((item) => item.isActive).length);
  assert(dropsBefore > 0, 'Lasers did not destroy an enemy and spawn food');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(1050);
  await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(1700);
  const combat = await page.evaluate(() => {
    const hunt = window.__lunaquestGame.scene.getScene('ChickenHuntScene');
    return { food: hunt.localFoodCollected,
      drops: hunt.collectibles.filter((item) => item.isActive).map((item) => ({ x: item.sprite.x, y: item.sprite.y })) };
  });
  console.log('Combat probe', JSON.stringify(combat));
  await page.screenshot({ path: 'artifacts/feature8-chicken-hunt.png', fullPage: true });
  assert(combat.food > 0, 'Real laser/drop/pickup path failed');

  const canvas = await page.locator('#game-canvas canvas').boundingBox();
  await page.mouse.click(canvas.x + canvas.width * 550 / 640, canvas.y + canvas.height * 20 / 360);
  await page.waitForFunction(() => window.__lunaquestStore.getState().scene === 'moon-base'
    && window.__lunaquestGame.scene.getScene('MoonBaseScene').sys.isActive());
  const returned = await state();
  assert(returned.completedMissionRunIds.includes(launch.activeMissionRunId), 'Run ID not recorded');
  assert(returned.resources.food > launch.resources.food && returned.xp > launch.xp, 'Mission rewards missing');
  assert(returned.astronaut.health <= launch.astronaut.health, 'Food healed automatically');
  await page.getByRole('button', { name: 'Back to Moon Base' }).click();
  console.log('Mission return', JSON.stringify({ food: returned.resources.food, xp: returned.xp, hp: returned.astronaut.health }));

  // A destroyed ship returns with no cargo or XP; the launch cost stays spent.
  await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.setPosition(316, 388));
  await page.waitForTimeout(200);
  await page.keyboard.press('e');
  await page.getByRole('button', { name: /Launch Chicken Hunt/ }).click();
  await page.waitForFunction(() => window.__lunaquestGame.scene.getScene('ChickenHuntScene').sys.isActive());
  const beforeFailure = await state();
  assert(beforeFailure.resources.energy === returned.resources.energy - 6, 'Second launch cost was wrong');
  await page.evaluate(() => window.__lunaquestGame.scene.getScene('ChickenHuntScene').ship.takeDamage(3));
  await page.waitForFunction(() => window.__lunaquestStore.getState().scene === 'moon-base'
    && window.__lunaquestGame.scene.getScene('MoonBaseScene').sys.isActive());
  const failed = await state();
  assert(failed.resources.food === returned.resources.food && failed.xp === returned.xp, 'Failed mission granted rewards');
  assert(failed.astronaut.health < returned.astronaut.health, 'Failed mission did not damage HP');
  await page.getByRole('button', { name: 'Back to Moon Base' }).click();

  // Eat only inside the habitat; stored food is consumed and HP recovers.
  await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.setPosition(400, 276));
  await page.waitForTimeout(180);
  await page.keyboard.press('e');
  await page.getByRole('complementary', { name: 'habitat controls' }).waitFor();
  assert((await state()).astronaut.location === 'habitat', 'E did not enter the habitat');
  const beforeEating = await state();
  await page.getByRole('button', { name: /Eat Food/ }).click();
  const eaten = await state();
  assert(eaten.resources.food === beforeEating.resources.food - 10, 'Eating did not spend ten stored food');
  assert(eaten.astronaut.health > beforeEating.astronaut.health && eaten.astronaut.health <= 100, 'Eating did not heal and cap HP');
  await page.keyboard.press('q');

  // All seven separate signposts open by E; closing never auto-reopens a panel.
  const topics = ['habitat', 'greenhouse', 'solar', 'shield', 'landingPad', 'chickenHunt', 'earthSupply'];
  for (const topic of topics) {
    await page.evaluate((id) => {
      const base = window.__lunaquestGame.scene.getScene('MoonBaseScene');
      const sign = base.signs.find((item) => item.id === id);
      base.astronaut.setPosition(sign.x, sign.y);
    }, topic);
    await page.waitForTimeout(190);
    await page.keyboard.press('e');
    const learning = page.getByRole('dialog', { name: /learning sign/ });
    await learning.waitFor();
    const copy = await learning.innerText();
    assert(copy.includes('WHAT?') && copy.includes('WHY?') && copy.includes('YOUR MISSION'), `${topic} sign missing teaching fields`);
    await page.getByRole('button', { name: /back to game/ }).click();
    await page.waitForTimeout(120);
    assert(await page.getByRole('dialog').count() === 0, `${topic} sign reopened unexpectedly`);
  }

  // Phaser pointer interaction uses the same nearby sign and learning panel.
  await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.setPosition(145, 406));
  await page.waitForTimeout(650);
  const signPoint = await page.evaluate(() => {
    const base = window.__lunaquestGame.scene.getScene('MoonBaseScene');
    const sign = base.signs.find((item) => item.id === 'earthSupply');
    return { x: sign.x - base.cameras.main.scrollX, y: sign.y - 14 - base.cameras.main.scrollY };
  });
  const signCanvas = await page.locator('#game-canvas canvas').boundingBox();
  await page.mouse.click(signCanvas.x + signCanvas.width * signPoint.x / 640,
    signCanvas.y + signCanvas.height * signPoint.y / 360);
  await page.getByRole('dialog', { name: 'Earth Water Supply learning sign' }).waitFor();
  await page.getByRole('button', { name: /back to game/ }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const base = window.__lunaquestGame.scene.getScene('MoonBaseScene');
    base.astronaut.setPosition(145, 406);
  });
  await page.waitForTimeout(160);
  await page.keyboard.press('e');
  await page.getByRole('dialog', { name: 'Earth Water Supply learning sign' }).waitFor();
  await page.screenshot({ path: 'artifacts/feature8-learning-mobile.png', fullPage: true });
  const mobileWidth = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  assert(mobileWidth.scroll <= mobileWidth.viewport, `Mobile education panel caused horizontal overflow: ${JSON.stringify(mobileWidth)}`);
  await page.getByRole('button', { name: /back to game/ }).click();
  await page.setViewportSize({ width: 1280, height: 900 });

  // Continue survival through the former five-day limit. Day 2 and Day 4 still deliver pods.
  const goHome = async () => {
    if ((await state()).astronaut.location === 'habitat') return;
    await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.setPosition(400, 274));
    await page.waitForTimeout(180);
    await page.keyboard.press('e');
    await page.getByRole('complementary', { name: 'habitat controls' }).waitFor();
    assert((await state()).astronaut.location === 'habitat', 'E did not enter the habitat');
  };
  await goHome();
  await page.getByRole('button', { name: /Advance Day/ }).click();
  await page.waitForFunction(() => window.__lunaquestStore.getState().day === 2);
  const day2 = await state();
  assert(day2.activeEvent?.type === 'solar-storm', 'Day 2 storm did not start');
  assert(await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').supplyPods.size) === 1, 'Day 2 pod did not appear');
  await page.keyboard.press('q');
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(1180);
  await page.keyboard.up('ArrowDown');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(2060);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(150);
  const nearFirstPod = await page.evaluate(() => {
    const base = window.__lunaquestGame.scene.getScene('MoonBaseScene');
    return { x: base.astronaut.x, y: base.astronaut.y, prompt: base.prompt.text };
  });
  console.log('First pod approach', JSON.stringify(nearFirstPod));
  assert(nearFirstPod.prompt.includes('Earth supplies'), 'Astronaut did not reach first Earth pod');
  await page.keyboard.press('e');
  const firstSupply = await state();
  assert(firstSupply.resources.water === day2.resources.water + 25, 'First Earth pod did not award 25 water');
  assert(firstSupply.collectedEarthSupplyIds.length === 1, 'First Earth pod ledger missing');
  await page.screenshot({ path: 'artifacts/feature8-earth-pod.png', fullPage: true });

  // Save/Continue preserves the pod ledger and blocks a repeated reward.
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Continue Game' }).click();
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  const restored = await state();
  assert(restored.resources.water === firstSupply.resources.water && restored.collectedEarthSupplyIds.length === 1, 'Pod did not survive reload');
  const replay = await page.evaluate((runId) => {
    const store = window.__lunaquestStore;
    const before = store.getState();
    const afterPod = store.dispatch({ type: 'COLLECT_EARTH_SUPPLY', deliveryId: 'earth-water-day-2' });
    const afterMission = store.dispatch({ type: 'COMPLETE_MISSION', result: {
      runId, missionType: 'chicken-hunt', success: true, returnedSafely: true,
      collectedResources: { food: 25 }, healthDamage: 0, xpEarned: 25, duration: 5,
      educationalMessage: 'Duplicate attempt',
    } });
    return { samePod: before === afterPod, sameMission: afterPod === afterMission };
  }, launch.activeMissionRunId);
  assert(replay.samePod && replay.sameMission, 'Repeated pod or mission result was accepted after reload');

  await goHome();
  await page.waitForFunction(() => window.__lunaquestStore.getState().activeEvent === null, undefined, { timeout: 45000 });
  await page.getByRole('button', { name: /Advance Day/ }).click();
  await page.waitForFunction(() => window.__lunaquestStore.getState().day === 3);
  assert((await state()).activeEvent?.type === 'oxygen-leak', 'Day 3 oxygen leak did not start');
  await page.getByRole('button', { name: /Repair habitat/ }).click();
  assert((await state()).activeEvent?.id === 'solar-day-3', 'Habitat repair did not start the queued storm');
  await page.evaluate(() => { for (let i = 0; i < 36; i++) window.__lunaquestStore.dispatch({ type: 'TICK', deltaSeconds: 1 }); });
  await page.getByRole('button', { name: /Advance Day/ }).click();
  await page.waitForFunction(() => window.__lunaquestStore.getState().day === 4);
  await page.keyboard.press('q');
  await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.setPosition(205, 451));
  await page.waitForTimeout(180);
  await page.keyboard.press('e');
  const secondSupply = await state();
  assert(secondSupply.collectedEarthSupplyIds.length === 2 && secondSupply.resources.water > 50, 'Day 4 Earth pod was not collected');
  await page.close();
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Continue Game' }).click();
  await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
  const reopened = await state();
  assert(reopened.collectedEarthSupplyIds.length === 2 && reopened.resources.water === secondSupply.resources.water,
    'Closed-browser-tab Continue lost Earth deliveries');
  await page.evaluate(() => { for (let i = 0; i < 36; i++) window.__lunaquestStore.dispatch({ type: 'TICK', deltaSeconds: 1 }); });
  await goHome();
  await page.getByRole('button', { name: /Advance Day/ }).click();
  await page.waitForFunction(() => window.__lunaquestStore.getState().day === 5);
  await page.evaluate(() => { for (let i = 0; i < 36; i++) window.__lunaquestStore.dispatch({ type: 'TICK', deltaSeconds: 1 }); });
  await page.getByRole('button', { name: /Advance Day/ }).click();
  const final = await state();
  assert(final.status === 'playing' && final.daysSurvived === 5 && final.day === 6 && final.resources.water > 0, 'Survival stopped at day five');
  await page.evaluate(() => { for (let i = 0; i < 36; i++) window.__lunaquestStore.dispatch({ type: 'TICK', deltaSeconds: 1 }); });
  await page.getByRole('button', { name: /Advance Day/ }).click();
  assert((await state()).daysSurvived === 6 && (await state()).status === 'playing', 'Day six progression failed');
  await page.screenshot({ path: 'artifacts/feature8-endless-day7.png', fullPage: true });
  await page.evaluate(() => window.__lunaquestStore.dispatch({ type: 'UPDATE_ASTRONAUT', changes: { health: 0 } }));
  await page.getByRole('complementary', { name: 'Mission result' }).waitFor();
  await page.getByRole('button', { name: 'TRY AGAIN' }).click();
  const restarted = await state();
  assert(restarted.collectedEarthSupplyIds.length === 0 && restarted.resources.water === 40 && restarted.completedMissionRunIds.length === 0, 'Restart retained delivery or mission ledger');
  await page.evaluate(() => {
    const store = window.__lunaquestStore;
    store.dispatch({ type: 'SPEND_RESOURCES', costs: { energy: 70 } });
    window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.setPosition(316, 388);
  });
  await page.waitForTimeout(180);
  await page.keyboard.press('e');
  await page.getByRole('button', { name: /Launch Chicken Hunt/ }).click();
  const lowEnergy = await state();
  assert(lowEnergy.scene === 'moon-base' && lowEnergy.resources.energy === 5 && !lowEnergy.activeMission,
    'Insufficient-energy mission launch was not rejected atomically');

  assert(errors.length === 0, `Browser errors: ${errors.join(' | ')}`);
  console.log('Feature 8 Chromium flow passed: combat/pickup, success/failure, eating, seven signs, mobile, both supplies, reload/idempotency, emergencies, endless day-six progression and restart.');
} finally {
  await browser.close();
}
