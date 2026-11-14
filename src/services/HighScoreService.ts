import type { GameState, PersonalBest } from '../domain/models/types';
import type { GameSessionStore } from '../domain/store/GameSessionStore';
import { beatsPersonalBest, EMPTY_PERSONAL_BEST, survivalScore, validPersonalBest } from '../domain/rules/scoreRules';

export const HIGH_SCORE_KEY = 'moonbound.highScore.v1';
export const HIGH_SCORE_VERSION = 1;

interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function parseHighScore(raw: string): PersonalBest | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const envelope = value as { version?: unknown; record?: unknown };
    return envelope.version === HIGH_SCORE_VERSION && validPersonalBest(envelope.record)
      ? { ...envelope.record } : null;
  } catch { return null; }
}

/** Independent personal record, derived only from authoritative session snapshots. */
export class HighScoreService {
  private storage: StoragePort | null;
  private record: PersonalBest;
  private listeners = new Set<() => void>();
  private unsubscribeStore: (() => void) | null = null;

  constructor(storage?: StoragePort | null) {
    if (storage !== undefined) this.storage = storage;
    else {
      try { this.storage = typeof window === 'undefined' ? null : window.localStorage; }
      catch { this.storage = null; }
    }
    try {
      const raw = this.storage?.getItem(HIGH_SCORE_KEY);
      this.record = raw ? parseHighScore(raw) ?? { ...EMPTY_PERSONAL_BEST } : { ...EMPTY_PERSONAL_BEST };
    } catch { this.record = { ...EMPTY_PERSONAL_BEST }; }
  }

  getSnapshot = (): PersonalBest => this.record;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  consider(state: Pick<GameState, 'daysSurvived' | 'xp'>): PersonalBest {
    if (!Number.isSafeInteger(state.daysSurvived) || state.daysSurvived < 0
      || !Number.isSafeInteger(state.xp) || state.xp < 0 || !beatsPersonalBest(state, this.record)) return this.record;
    this.record = { bestDaysSurvived: state.daysSurvived, bestScore: survivalScore(state) };
    try { this.storage?.setItem(HIGH_SCORE_KEY, JSON.stringify({ version: HIGH_SCORE_VERSION, record: this.record })); }
    catch { /* Keep playing and show the in-memory record when storage is blocked. */ }
    this.listeners.forEach((listener) => listener());
    return this.record;
  }

  attach(store: GameSessionStore): () => void {
    this.unsubscribeStore?.();
    this.consider(store.getState());
    const unsubscribe = store.subscribeTransitions((state) => { this.consider(state); });
    this.unsubscribeStore = unsubscribe;
    return () => {
      if (this.unsubscribeStore === unsubscribe) {
        unsubscribe();
        this.unsubscribeStore = null;
      }
    };
  }
}
