import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
let nasaRequests = 0;
await page.route(/api\.nasa\.gov\/DONKI\//, async (route) => {
  nasaRequests += 1;
  const endpoint = new URL(route.request().url()).pathname.split('/').at(-1);
  const stamp = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const records = {
    FLR: [],
    CME: [{ activityID: 'browser-cme-1', startTime: stamp, cmeAnalyses: [{ speed: 1100 }] }],
    SEP: [{ sepID: 'browser-sep-1', eventTime: stamp }],
    notifications: [{ messageID: 'browser-notice-1', messageIssueTime: stamp, messageType: 'SEP' }],
  };
  await route.fulfill({ status: endpoint === 'FLR' ? 404 : 200, contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(records[endpoint] ?? []) });
});
await page.goto(process.env.LUNAQUEST_URL ?? 'http://127.0.0.1:5173/');
await page.waitForLoadState('networkidle');
await page.waitForFunction(() => window.__lunaquestGame?.scene?.getScene('MoonBaseScene')?.sys?.isActive());
mkdirSync('artifacts', { recursive: true });
await page.getByRole('button', { name: 'Space Weather' }).click();
await page.getByText('DEMO · HISTORICAL EXAMPLE').waitFor();
let state = await page.evaluate(() => window.__lunaquestStore.getState());
if (state.weather.source !== 'demo' || state.weather.isRealData || nasaRequests !== 0) throw new Error('Demo startup contacted NASA or misattributed fixture');
await page.screenshot({ path: 'artifacts/feature6-demo.png', fullPage: true });

await page.getByRole('button', { name: 'Try NASA live' }).click();
await page.getByText('LIVE · NASA DONKI').waitFor();
state = await page.evaluate(() => window.__lunaquestStore.getState());
if (state.weather.source !== 'live' || !state.weather.partial || !state.weather.isRealData
  || state.weather.riskLevel !== 'high' || nasaRequests !== 4) throw new Error('Partial live DONKI result or educational risk mapping incorrect');
await page.getByText(/Some DONKI sources were unavailable/).waitFor();
await page.screenshot({ path: 'artifacts/feature6-live-partial.png', fullPage: true });

await page.getByRole('button', { name: 'Use demo' }).click();
await page.getByText('DEMO · HISTORICAL EXAMPLE').waitFor();
await page.getByRole('button', { name: 'Try NASA live' }).click();
await page.getByText('CACHED · NASA DONKI').waitFor();
if (nasaRequests !== 4) throw new Error('Cache hit made duplicate NASA requests');
await page.screenshot({ path: 'artifacts/feature6-cached.png', fullPage: true });
await page.getByRole('button', { name: 'Close space weather' }).click();
const before = await page.evaluate(() => window.__lunaquestStore.getState());
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(400);
await page.keyboard.up('ArrowLeft');
const after = await page.evaluate(() => window.__lunaquestStore.getState());
if (!(after.astronaut.position.x < before.astronaut.position.x)) throw new Error('Weather panel broke movement');

await page.evaluate(() => localStorage.removeItem('lunaquest.donki.v1'));
await page.unroute(/api\.nasa\.gov\/DONKI\//);
await page.route(/api\.nasa\.gov\/DONKI\//, (route) => route.abort('internetdisconnected'));
await page.reload();
await page.waitForLoadState('networkidle');
await page.getByRole('button', { name: 'Continue Game' }).click();
await page.getByRole('button', { name: 'Space Weather' }).click();
await page.getByRole('button', { name: 'Try NASA live' }).click();
await page.getByText(/Live data unavailable: offline/).waitFor();
state = await page.evaluate(() => window.__lunaquestStore.getState());
if (state.weather.source !== 'demo' || state.weather.fallbackReason !== 'offline' || state.status !== 'playing') throw new Error('Offline fallback interrupted gameplay');
await page.screenshot({ path: 'artifacts/feature6-offline.png', fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
const mobile = await page.evaluate(() => {
  const panel = document.querySelector('.weather-panel').getBoundingClientRect();
  return { viewport: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth,
    left: panel.left, right: panel.right };
});
if (mobile.scrollWidth > mobile.viewport || mobile.left < 0 || mobile.right > mobile.viewport) throw new Error('Mobile weather panel overflowed viewport');
await page.screenshot({ path: 'artifacts/feature6-mobile.png', fullPage: true });
if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
console.log('Feature 6 browser checks passed: demo, partial live, cached, offline fallback, weather panel and movement.');
await browser.close();
