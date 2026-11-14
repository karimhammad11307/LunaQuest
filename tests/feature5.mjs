import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto(process.env.LUNAQUEST_URL ?? 'http://127.0.0.1:5173/');
await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
mkdirSync('artifacts', { recursive: true });
const state = () => page.evaluate(() => window.__lunaquestStore.getState());
const moveTo = async (x, y) => {
  await page.evaluate(([px, py]) => window.__lunaquestGame.scene.getScene('MoonBaseScene').astronaut.setPosition(px, py), [x, y]);
  await page.waitForTimeout(260);
  await page.keyboard.press('e');
};
const fastForward = async (seconds) => page.evaluate((amount) => {
  for (let i = 0; i < amount; i++) window.__lunaquestStore.dispatch({ type: 'TICK', deltaSeconds: 1 });
}, seconds);
const close = () => page.getByRole('button', { name: 'Close building controls' }).click();

await moveTo(400, 226);
await page.getByRole('button', { name: 'Enter Habitat' }).click();
await page.getByRole('button', { name: 'Advance Day' }).click();
let current = await state();
if (current.activeEvent?.type !== 'solar-storm' || current.activeEvent.phase !== 'warning') throw new Error('Solar warning did not trigger');
await page.getByRole('alert', { name: 'Space emergency' }).getByText(/SOLAR STORM/).waitFor();
let visual = await page.evaluate(() => {
  const scene = window.__lunaquestGame.scene.getScene('MoonBaseScene');
  return { tint: scene.hazardTint.visible, badge: scene.hazardBadge.visible };
});
if (!visual.tint || !visual.badge) throw new Error('Storm scene effects missing');
await page.screenshot({ path: 'artifacts/feature5-storm-warning.png', fullPage: true });

await page.getByRole('button', { name: 'Leave Habitat' }).click();
await close();
await moveTo(608, 371);
current = await state();
if (current.astronaut.location !== 'shelter') throw new Error('E did not enter shelter during storm');
await fastForward(36);
current = await state();
if (current.activeEvent || current.xp !== 15 || current.astronaut.radiationExposure !== 0) throw new Error('Sheltered storm outcome incorrect');
await page.screenshot({ path: 'artifacts/feature5-storm-safe.png', fullPage: true });

await page.getByRole('button', { name: 'Leave Shelter' }).click();
await close();
await moveTo(400, 226);
await page.getByRole('button', { name: 'Enter Habitat' }).click();
await page.getByRole('button', { name: 'Advance Day' }).click();
current = await state();
if (current.activeEvent?.type !== 'oxygen-leak' || current.buildings.habitat.condition !== 'damaged') throw new Error('Leak did not damage habitat');
visual = await page.evaluate(() => window.__lunaquestGame.scene.getScene('MoonBaseScene').leakBadge.visible);
if (!visual) throw new Error('Leak marker missing from habitat');
await page.screenshot({ path: 'artifacts/feature5-leak-warning.png', fullPage: true });
await fastForward(10);
const beforeRepair = await state();
if (!(beforeRepair.resources.oxygen < current.resources.oxygen)) throw new Error('Unresolved leak did not drain oxygen');
await page.getByRole('button', { name: /Repair habitat/ }).click();
current = await state();
if (current.activeEvent || current.buildings.habitat.condition !== 'good' || current.xp !== 30
  || current.resources.energy !== beforeRepair.resources.energy - 10) throw new Error('Leak repair did not resolve correctly');
await page.screenshot({ path: 'artifacts/feature5-leak-repaired.png', fullPage: true });
const oxygenAfterRepair = current.resources.oxygen;
await fastForward(2);
if (Math.abs((await state()).resources.oxygen - oxygenAfterRepair) > 0.01) throw new Error('Leak continued after repair');

await page.evaluate(() => window.__lunaquestStore.dispatch({ type: 'RESTART_GAME' }));
await moveTo(400, 226);
await page.getByRole('button', { name: 'Enter Habitat' }).click();
await page.getByRole('button', { name: 'Advance Day' }).click();
await fastForward(36);
await page.getByRole('button', { name: 'Advance Day' }).click();
const beforeIsolation = await state();
await page.getByRole('button', { name: 'Isolate section' }).click();
current = await state();
if (current.activeEvent || current.buildings.greenhouse.condition !== 'damaged' || current.buildings.greenhouse.active
  || current.resources.oxygen !== beforeIsolation.resources.oxygen - 5 || current.xp !== 8) throw new Error('Isolation choice incorrect');
await page.screenshot({ path: 'artifacts/feature5-isolation.png', fullPage: true });
await page.evaluate(() => window.__lunaquestStore.dispatch({ type: 'RESTART_GAME' }));
await moveTo(400, 226);
await page.getByRole('button', { name: 'Enter Habitat' }).click();
await page.getByRole('button', { name: 'Advance Day' }).click();
await page.getByRole('button', { name: 'Leave Habitat' }).click();
await close();
await page.getByRole('alert', { name: 'Space emergency' }).getByRole('button', { name: 'Keep exploring' }).click();
await fastForward(24);
const beforeExposure = await state();
await fastForward(2);
current = await state();
if (current.astronaut.radiationExposure <= 0 || !(current.astronaut.health < beforeExposure.astronaut.health - 5)) throw new Error('Ignored storm did not cause visible exposure damage');
await page.screenshot({ path: 'artifacts/feature5-storm-exposure.png', fullPage: true });
await page.getByRole('button', { name: 'Pause', exact: true }).click();
const paused = await state();
await page.waitForTimeout(1100);
current = await state();
if (current.activeEvent?.remainingSeconds !== paused.activeEvent?.remainingSeconds
  || current.astronaut.health !== paused.astronaut.health) throw new Error('Paused storm timer or HP continued running');
await page.getByRole('button', { name: 'Resume Mission' }).click();
if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
console.log('Feature 5 browser checks passed: warning, E shelter, protected XP, leak drain/repair, isolation, ignored radiation, pause and visuals.');
await browser.close();
