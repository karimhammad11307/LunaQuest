/** DONKI request and educational mapping limits. These are game choices, not NASA hazard thresholds. */
export const SPACE_WEATHER = {
  apiBase: 'https://api.nasa.gov/DONKI',
  endpoints: ['FLR', 'CME', 'SEP', 'notifications'] as const,
  lookbackDays: 7,
  cacheMs: 6 * 60 * 60 * 1000,
  timeoutMs: 6000,
  maxResponseChars: 1_000_000,
  maxRecordsPerEndpoint: 100,
  maxObservations: 400,
  highSepHours: 48,
  elevatedFlareHours: 72,
  elevatedCmeHours: 72,
  elevatedCmeSpeedKmS: 1000,
  cacheKey: 'lunaquest.donki.v1',
} as const;
