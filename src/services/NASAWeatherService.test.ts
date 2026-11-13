import { describe, expect, it } from 'vitest';
import type { SpaceWeatherObservation } from '../domain/models/SpaceWeather';
import { reduceGameState } from '../domain/rules/gameRules';
import { createInitialState } from '../domain/rules/survivalRules';
import { SPACE_WEATHER } from '../game/config/spaceWeather';
import { NASAWeatherService, demoWeather, mapGameRisk, normalizeDonki } from './NASAWeatherService';

const now = Date.parse('2026-11-13T12:00:00Z');
const stamp = '2026-11-12T12:00:00Z';
const samples = {
  FLR: [{ flrID: '2026-11-12T12:00:00-FLR-001', beginTime: stamp, peakTime: stamp, classType: 'M2.1' }],
  CME: [{ activityID: '2026-11-12T12:00:00-CME-001', startTime: stamp, cmeAnalyses: [{ speed: 1200 }] }],
  SEP: [{ sepID: '2026-11-12T12:00:00-SEP-001', eventTime: stamp }],
  notifications: [{ messageID: '20261112-AL-001', messageIssueTime: stamp, messageType: 'SEP', messageBody: 'Example alert' }],
};
const storage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); }, values };
};
const fetcher = (records: Record<string, unknown> = samples, status = 200) => {
  const calls: string[] = [];
  const fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    calls.push(url.toString());
    const endpoint = url.pathname.split('/').at(-1)!;
    return new Response(JSON.stringify(records[endpoint] ?? []), { status });
  }) as typeof globalThis.fetch;
  return { fetch, calls };
};
const obs = (type: SpaceWeatherObservation['type'], observedAt = stamp, classification: string | null = null,
  speedKmS: number | null = null): SpaceWeatherObservation => ({ id: `${type}-${observedAt}`, type, observedAt, classification, speedKmS });

describe('Feature 6 DONKI parsing and educational mapping', () => {
  it('normalizes distinct FLR, CME, SEP and notification field shapes', () => {
    expect(normalizeDonki('FLR', samples.FLR)[0]).toMatchObject({ type: 'FLR', classification: 'M2.1', observedAt: '2026-11-12T12:00:00.000Z' });
    expect(normalizeDonki('CME', samples.CME)[0]).toMatchObject({ type: 'CME', speedKmS: 1200 });
    expect(normalizeDonki('SEP', samples.SEP)[0]).toMatchObject({ type: 'SEP', classification: null });
    expect(normalizeDonki('notifications', samples.notifications)[0]).toMatchObject({ type: 'notification', classification: 'SEP' });
  });

  it('rejects malformed envelope and skips records with missing IDs or dates', () => {
    expect(() => normalizeDonki('FLR', {})).toThrow();
    expect(normalizeDonki('FLR', [{ beginTime: stamp }, { flrID: 'a', beginTime: 'bad' }, samples.FLR[0]])).toHaveLength(1);
    expect(normalizeDonki('CME', [{ activityID: 'c', startTime: stamp, cmeAnalyses: [{ speed: -3 }] }])[0].speedKmS).toBeNull();
    expect(() => normalizeDonki('SEP', new Array(SPACE_WEATHER.maxRecordsPerEndpoint + 1).fill({}))).toThrow();
  });

  it('maps only selected recent observations to illustrative Normal/Elevated/High', () => {
    expect(mapGameRisk([], now)).toBe('low');
    expect(mapGameRisk([obs('FLR', stamp, 'C3.0'), obs('CME', stamp, null, 600)], now)).toBe('low');
    expect(mapGameRisk([obs('FLR', stamp, 'M2.1')], now)).toBe('moderate');
    expect(mapGameRisk([obs('CME', stamp, null, 1200)], now)).toBe('moderate');
    expect(mapGameRisk([obs('SEP')], now)).toBe('high');
    expect(mapGameRisk([obs('SEP', '2017-09-06T12:00:00Z')], now)).toBe('low');
    expect(mapGameRisk([obs('notification', stamp, 'SEP')], now)).toBe('low');
  });

  it('fetches a bounded seven-day range on all four endpoints and marks true NASA attribution', async () => {
    const mock = fetcher();
    const service = new NASAWeatherService({ fetcher: mock.fetch, storage: storage(), now: () => now, apiKey: 'DEMO_KEY' });
    const weather = await service.load('live');
    expect(mock.calls).toHaveLength(4);
    for (const call of mock.calls) {
      const url = new URL(call);
      expect(url.searchParams.get('startDate')).toBe('2026-11-06');
      expect(url.searchParams.get('endDate')).toBe('2026-11-13');
      expect(url.searchParams.get('api_key')).toBe('DEMO_KEY');
    }
    expect(weather).toMatchObject({ source: 'live', isRealData: true, riskLevel: 'high', observationCount: 4, partial: false, latestEventType: 'FLR' });
  });

  it('treats valid empty endpoint arrays as live calm conditions', async () => {
    const mock = fetcher({});
    const weather = await new NASAWeatherService({ fetcher: mock.fetch, storage: null, now: () => now }).load('live');
    expect(weather).toMatchObject({ source: 'live', isRealData: true, riskLevel: 'low', observationCount: 0, latestEventType: null });
    expect(weather.label).toContain('calm');
  });

  it('retains partial live records if an endpoint is unavailable and labels incomplete coverage', async () => {
    const mock = fetcher();
    const partial = (async (url: RequestInfo | URL, init?: RequestInit) => String(url).includes('/FLR?')
      ? new Response('{}', { status: 404 }) : mock.fetch(url, init)) as typeof globalThis.fetch;
    const weather = await new NASAWeatherService({ fetcher: partial, storage: null, now: () => now }).load('live');
    expect(weather).toMatchObject({ source: 'live', partial: true, isRealData: true, observationCount: 3 });
  });
});

describe('Feature 6 cache, fallback and shared game integration', () => {
  it('reuses a validated local cache within six hours and refetches after expiry', async () => {
    const memory = storage();
    const mock = fetcher();
    let clock = now;
    const make = () => new NASAWeatherService({ fetcher: mock.fetch, storage: memory, now: () => clock });
    expect((await make().load('live')).source).toBe('live');
    expect(memory.values.has(SPACE_WEATHER.cacheKey)).toBe(true);
    clock += SPACE_WEATHER.cacheMs - 1;
    expect((await make().load('live')).source).toBe('cached');
    expect(mock.calls).toHaveLength(4);
    clock += 2;
    expect((await make().load('live')).source).toBe('live');
    expect(mock.calls).toHaveLength(8);
  });

  it('rejects corrupt cache and fetches fresh observations', async () => {
    const memory = storage();
    memory.setItem(SPACE_WEATHER.cacheKey, JSON.stringify({ version: 99, fetchedAt: new Date(now).toISOString(), observations: [], partial: false }));
    const mock = fetcher();
    expect((await new NASAWeatherService({ fetcher: mock.fetch, storage: memory, now: () => now }).load('live')).source).toBe('live');
    expect(mock.calls).toHaveLength(4);
  });

  it('uses a labeled historical demo fixture without any network request', async () => {
    const mock = fetcher();
    const weather = await new NASAWeatherService({ fetcher: mock.fetch, storage: null, now: () => now }).load('demo');
    expect(mock.calls).toHaveLength(0);
    expect(weather).toMatchObject({ source: 'demo', isRealData: false, latestEventType: 'SEP', riskLevel: 'high', partial: false });
    expect(weather.observedAt).toContain('2017-09');
  });

  it('falls back on offline failures, HTTP 500, HTTP 429 and invalid bodies', async () => {
    const offline = (async () => { throw new TypeError('offline'); }) as typeof globalThis.fetch;
    const cases: [typeof fetch, string][] = [
      [offline, 'offline'], [fetcher({}, 500).fetch, 'http-error'], [fetcher({}, 429).fetch, 'rate-limit'],
      [fetcher({ FLR: {}, CME: {}, SEP: {}, notifications: {} }).fetch, 'invalid-response'],
    ];
    for (const [fetch, reason] of cases) {
      const weather = await new NASAWeatherService({ fetcher: fetch, storage: null, now: () => now }).load('live');
      expect(weather).toMatchObject({ source: 'demo', fallbackReason: reason, isRealData: false });
    }
  });

  it('times out a stalled endpoint and returns demo without blocking gameplay', async () => {
    const stalled = (() => new Promise<Response>(() => {})) as typeof globalThis.fetch;
    const weather = await new NASAWeatherService({ fetcher: stalled, storage: null, now: () => now, timeoutMs: 10 }).load('live');
    expect(weather).toMatchObject({ source: 'demo', fallbackReason: 'timeout' });
  });

  it('updates only shared weather context; the scripted storm and survival resources stay unchanged', () => {
    const start = createInitialState();
    const updated = reduceGameState(start, { type: 'SET_SPACE_WEATHER', weather: demoWeather() });
    expect(updated.weather.source).toBe('demo');
    expect(updated.resources).toBe(start.resources);
    expect(updated.activeEvent).toBe(start.activeEvent);
    const storm = reduceGameState(reduceGameState(updated, { type: 'INTERACT_BUILDING', buildingId: 'habitat' }), { type: 'ENTER_HABITAT' });
    expect(reduceGameState(storm, { type: 'ADVANCE_DAY' }).activeEvent?.type).toBe('solar-storm');
    const invalid = { ...demoWeather(), riskLevel: 'danger' };
    expect(reduceGameState(updated, { type: 'SET_SPACE_WEATHER', weather: invalid as never })).toBe(updated);
  });
});
