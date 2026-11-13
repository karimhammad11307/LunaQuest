import type { SpaceWeatherObservation, SpaceWeatherReport, DonkiEventType } from '../domain/models/SpaceWeather';
import type { WeatherStatus } from '../domain/models/types';
import { SPACE_WEATHER } from '../game/config/spaceWeather';
import demo from '../assets/data/demoSpaceWeather.json';

type Endpoint = typeof SPACE_WEATHER.endpoints[number];
type WeatherMode = 'live' | 'demo';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
type FetchPort = typeof fetch;
type Failure = Exclude<WeatherStatus['fallbackReason'], null>;

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const string = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
const date = (value: unknown): string | null => {
  const raw = string(value);
  if (!raw || !/^\d{4}-\d\d-\d\dT/.test(raw)) return null;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
};
const category = (value: unknown): string | null => {
  const raw = string(value);
  return raw && raw.length <= 40 ? raw : null;
};

/** Endpoint-specific parsing avoids treating notification messages as flare/CME records. */
export function normalizeDonki(endpoint: Endpoint, response: unknown): SpaceWeatherObservation[] {
  if (!Array.isArray(response)) throw new Error(`Invalid ${endpoint} response`);
  if (response.length > SPACE_WEATHER.maxRecordsPerEndpoint) throw new Error(`Oversized ${endpoint} response`);
  return response.flatMap((entry): SpaceWeatherObservation[] => {
    const item = object(entry);
    if (!item) return [];
    const id = endpoint === 'FLR' ? string(item.flrID)
      : endpoint === 'CME' ? string(item.activityID)
        : endpoint === 'SEP' ? string(item.sepID) : string(item.messageID);
    const observedAt = endpoint === 'FLR' ? date(item.peakTime) ?? date(item.beginTime)
      : endpoint === 'CME' ? date(item.startTime)
        : endpoint === 'SEP' ? date(item.eventTime) : date(item.messageIssueTime);
    if (!id || id.length > 100 || !observedAt) return [];
    const type: DonkiEventType = endpoint === 'notifications' ? 'notification' : endpoint;
    const analysis = endpoint === 'CME' && Array.isArray(item.cmeAnalyses) ? object(item.cmeAnalyses[0]) : null;
    const speed = analysis?.speed;
    const speedKmS = typeof speed === 'number' && Number.isFinite(speed) && speed > 0 && speed < 10000 ? speed : null;
    return [{ id, type, observedAt,
      classification: endpoint === 'FLR' ? category(item.classType)
        : endpoint === 'notifications' ? category(item.messageType) : null,
      speedKmS }];
  });
}

const hoursAgo = (now: number, observedAt: string) => (now - Date.parse(observedAt)) / 3_600_000;

/** Observations only set an educational label. They never trigger or scale game damage. */
export function mapGameRisk(observations: SpaceWeatherObservation[], referenceTime: number): WeatherStatus['riskLevel'] {
  const recent = observations.filter((event) => hoursAgo(referenceTime, event.observedAt) >= 0
    && hoursAgo(referenceTime, event.observedAt) <= SPACE_WEATHER.lookbackDays * 24);
  if (recent.some((event) => event.type === 'SEP' && hoursAgo(referenceTime, event.observedAt) <= SPACE_WEATHER.highSepHours)) return 'high';
  if (recent.some((event) => (event.type === 'FLR' && /^[MX]/i.test(event.classification ?? '')
    && hoursAgo(referenceTime, event.observedAt) <= SPACE_WEATHER.elevatedFlareHours)
    || (event.type === 'CME' && (event.speedKmS ?? 0) >= SPACE_WEATHER.elevatedCmeSpeedKmS
      && hoursAgo(referenceTime, event.observedAt) <= SPACE_WEATHER.elevatedCmeHours))) return 'moderate';
  return 'low';
}

function status(report: SpaceWeatherReport, source: 'live' | 'cached', now: number): WeatherStatus {
  const observations = [...report.observations].sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  const latest = observations.find((event) => event.type !== 'notification') ?? observations[0];
  return { source, label: latest ? 'Solar activity detected!' : report.partial ? 'Limited NASA data received.' : 'Space weather is calm.',
    observedAt: latest?.observedAt ?? null, latestEventType: latest?.type ?? null,
    observationCount: observations.length, checkedAt: report.fetchedAt, riskLevel: mapGameRisk(observations, now),
    isRealData: true, fallbackReason: null, partial: report.partial };
}

export function demoWeather(reason: Failure | null = null): WeatherStatus {
  const observations = demo.observations as SpaceWeatherObservation[];
  const latest = observations.find((event) => event.type === 'SEP')!;
  return { source: 'demo', label: 'Demo space weather active.', observedAt: latest.observedAt,
    latestEventType: latest.type, observationCount: observations.length, checkedAt: demo.referenceTime,
    riskLevel: mapGameRisk(observations, Date.parse(demo.referenceTime)), isRealData: false, fallbackReason: reason, partial: false };
}

class WeatherFetchError extends Error {
  constructor(readonly reason: Failure) { super(reason); }
}

export interface NASAWeatherOptions {
  fetcher?: FetchPort;
  storage?: StoragePort | null;
  now?: () => number;
  apiKey?: string;
  timeoutMs?: number;
}

export class NASAWeatherService {
  private fetcher: FetchPort;
  private storage: StoragePort | null;
  private now: () => number;
  private apiKey: string;
  private timeoutMs: number;
  private memory: SpaceWeatherReport | null = null;

  constructor(options: NASAWeatherOptions = {}) {
    // Browser fetch requires the Window receiver in some engines; do not store it unbound.
    this.fetcher = options.fetcher ?? ((input, init) => globalThis.fetch(input, init));
    this.storage = options.storage === undefined ? (typeof localStorage === 'undefined' ? null : localStorage) : options.storage;
    this.now = options.now ?? Date.now;
    this.apiKey = options.apiKey?.trim() || 'DEMO_KEY';
    this.timeoutMs = options.timeoutMs ?? SPACE_WEATHER.timeoutMs;
  }

  async load(mode: WeatherMode): Promise<WeatherStatus> {
    if (mode === 'demo') return demoWeather();
    const cached = this.readCache();
    if (cached) return status(cached, 'cached', this.now());
    try {
      const report = await this.fetchRecent();
      this.memory = report;
      try { this.storage?.setItem(SPACE_WEATHER.cacheKey, JSON.stringify({ version: 1, ...report })); } catch { /* Storage denied; memory cache still works. */ }
      return status(report, 'live', this.now());
    } catch (error) {
      return demoWeather(error instanceof WeatherFetchError ? error.reason : 'offline');
    }
  }

  private readCache(): SpaceWeatherReport | null {
    let candidate: unknown = this.memory;
    const fromStorage = !candidate;
    if (!candidate) {
      try { candidate = JSON.parse(this.storage?.getItem(SPACE_WEATHER.cacheKey) ?? 'null'); } catch { return null; }
    }
    const cache = object(candidate);
    if (!cache || (fromStorage && cache.version !== 1) || !date(cache.fetchedAt) || typeof cache.partial !== 'boolean' || !Array.isArray(cache.observations)
      || cache.observations.length > SPACE_WEATHER.maxObservations) return null;
    const age = this.now() - Date.parse(cache.fetchedAt as string);
    if (age < 0 || age >= SPACE_WEATHER.cacheMs) return null;
    if (!cache.observations.every((event) => {
      const item = object(event);
      return !!item && !!string(item.id) && !!date(item.observedAt)
        && ['FLR', 'CME', 'SEP', 'notification'].includes(String(item.type))
        && (item.classification === null || typeof item.classification === 'string')
        && (item.speedKmS === null || (typeof item.speedKmS === 'number' && Number.isFinite(item.speedKmS)));
    })) return null;
    this.memory = { observations: cache.observations as SpaceWeatherObservation[], fetchedAt: cache.fetchedAt as string, partial: cache.partial as boolean };
    return this.memory;
  }

  private async fetchRecent(): Promise<SpaceWeatherReport> {
    const end = new Date(this.now()).toISOString().slice(0, 10);
    const start = new Date(this.now() - SPACE_WEATHER.lookbackDays * 86_400_000).toISOString().slice(0, 10);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new WeatherFetchError('timeout')); }, this.timeoutMs);
    });
    try {
      const requested = Promise.allSettled(SPACE_WEATHER.endpoints.map(async (endpoint) => {
        const url = new URL(`${SPACE_WEATHER.apiBase}/${endpoint}`);
        url.searchParams.set('startDate', start);
        url.searchParams.set('endDate', end);
        if (endpoint === 'notifications') url.searchParams.set('type', 'all');
        url.searchParams.set('api_key', this.apiKey);
        let response: Response;
        try { response = await this.fetcher(url.toString(), { signal: controller.signal }); }
        catch { throw new WeatherFetchError(controller.signal.aborted ? 'timeout' : 'offline'); }
        if (response.status === 429) throw new WeatherFetchError('rate-limit');
        if (!response.ok) throw new WeatherFetchError('http-error');
        const body = await response.text();
        if (body.length > SPACE_WEATHER.maxResponseChars) throw new WeatherFetchError('invalid-response');
        let parsed: unknown;
        try { parsed = JSON.parse(body); } catch { throw new WeatherFetchError('invalid-response'); }
        try {
          const normalized = normalizeDonki(endpoint, parsed);
          if (Array.isArray(parsed) && parsed.length > 0 && normalized.length === 0) throw new Error('No valid records');
          return normalized;
        } catch { throw new WeatherFetchError('invalid-response'); }
      }));
      const batches = await Promise.race([requested, timeout]);
      const failures = batches.filter((batch): batch is PromiseRejectedResult => batch.status === 'rejected');
      if (failures.some((batch) => batch.reason instanceof WeatherFetchError && batch.reason.reason === 'rate-limit')) throw new WeatherFetchError('rate-limit');
      const successful = batches.filter((batch): batch is PromiseFulfilledResult<SpaceWeatherObservation[]> => batch.status === 'fulfilled');
      if (!successful.length) throw failures[0]?.reason instanceof WeatherFetchError ? failures[0].reason : new WeatherFetchError('offline');
      const observations = successful.flatMap((batch) => batch.value);
      return { observations, fetchedAt: new Date(this.now()).toISOString(), partial: failures.length > 0 };
    } finally { if (timer) clearTimeout(timer); controller.abort(); }
  }
}
