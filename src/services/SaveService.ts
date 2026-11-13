import type { GameAction } from '../domain/models/GameAction';
import type { GameState } from '../domain/models/types';
import type { GameSessionStore } from '../domain/store/GameSessionStore';
import { validLoadedState } from '../domain/rules/gameRules';
import { createInitialState, trimNotices } from '../domain/rules/survivalRules';
import { BALANCE } from '../game/config/balance';
import { SPAWN_POINT } from '../game/config/gameConfig';

export const SAVE_KEY = 'moonbound.session.v1';
export const SAVE_VERSION = 1;
const DEFERRED_SAVE_MS = 5000;

interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveEnvelope {
  schemaVersion: number;
  savedAt: string;
  state: GameState;
}

/** Pure recovery: no offline elapsed time, rewards or incident damage are applied. */
export function recoverSavedState(state: GameState): GameState {
  const interruptedMission = state.activeMissionRunId;
  const interruptedEvent = state.status === 'playing' ? state.activeEvent : null;
  const warningSeconds = interruptedEvent?.type === 'solar-storm'
    ? BALANCE.emergencies.storm.warningSeconds : BALANCE.emergencies.leak.warningSeconds;
  const notices = [...state.notices];
  const recoveryMessage = interruptedMission
    ? 'Mission interrupted. You returned to base without supplies.'
    : interruptedEvent ? 'Emergency warning restarted. Choose a safe response!'
      : state.status === 'playing' ? 'Welcome back to Moonbound!' : 'Your mission result is ready.';
  notices.push({ id: Math.max(0, ...notices.map((notice) => notice.id)) + 1, text: recoveryMessage,
    tone: interruptedMission || interruptedEvent ? 'warn' : 'info' });
  return {
    ...state,
    scene: state.status === 'playing' ? 'moon-base' : 'result',
    astronaut: { ...state.astronaut, location: 'outside', position: { ...SPAWN_POINT } },
    activeMission: null,
    activeMissionRunId: null,
    missionProgress: null,
    completedMissionRunIds: interruptedMission && !state.completedMissionRunIds.includes(interruptedMission)
      ? [...state.completedMissionRunIds, interruptedMission] : state.completedMissionRunIds,
    activeEvent: interruptedEvent ? { ...interruptedEvent, phase: 'warning', remainingSeconds: warningSeconds,
      pulseSeconds: 0 } : null,
    activeEventId: interruptedEvent?.id ?? null,
    selectedBuildingId: null,
    weather: state.weather.source === 'loading' ? createInitialState().weather : state.weather,
    notices: trimNotices(notices),
  };
}

export function parseSave(raw: string): GameState | null {
  try {
    const envelope: unknown = JSON.parse(raw);
    if (!envelope || typeof envelope !== 'object') return null;
    const candidate = envelope as Partial<SaveEnvelope>;
    if (candidate.schemaVersion !== SAVE_VERSION || typeof candidate.savedAt !== 'string'
      || !Number.isFinite(Date.parse(candidate.savedAt)) || !validLoadedState(candidate.state)) return null;
    const recovered = recoverSavedState(candidate.state);
    return validLoadedState(recovered) ? recovered : null;
  } catch {
    return null;
  }
}

/** Browser persistence only. All live resource changes still pass through GameSessionStore. */
export class SaveService {
  private storage: StoragePort | null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => void) | null = null;
  private attachedStore: GameSessionStore | null = null;
  private attachmentId = 0;
  private onPageHide = () => this.flush();

  constructor(storage?: StoragePort | null) {
    if (storage !== undefined) this.storage = storage;
    else {
      try { this.storage = typeof window === 'undefined' ? null : window.localStorage; }
      catch { this.storage = null; }
    }
  }

  load(): GameState | null {
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      return raw ? parseSave(raw) : null;
    } catch { return null; }
  }

  save(state: GameState): boolean {
    if (!validLoadedState(state) || !this.storage) return false;
    try {
      const envelope: SaveEnvelope = { schemaVersion: SAVE_VERSION, savedAt: new Date().toISOString(), state };
      this.storage.setItem(SAVE_KEY, JSON.stringify(envelope));
      return true;
    } catch { return false; }
  }

  clear(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    try { this.storage?.removeItem(SAVE_KEY); } catch { /* gameplay continues without storage */ }
  }

  /** One subscription. High-frequency movement/ticks coalesce into one write per window. */
  attach(store: GameSessionStore): () => void {
    this.detach();
    const id = this.attachmentId;
    this.attachedStore = store;
    this.unsubscribe = store.subscribeTransitions((_state, action) => this.onChange(action));
    if (typeof window !== 'undefined') window.addEventListener('pagehide', this.onPageHide);
    return () => { if (this.attachmentId === id) this.detach(); };
  }

  private onChange(action?: GameAction): void {
    if (action?.type === 'MOVE_PLAYER' || action?.type === 'TICK'
      || action?.type === 'UPDATE_MISSION_PROGRESS' || action?.type === 'SET_SPACE_WEATHER') {
      if (!this.timer) this.timer = setTimeout(() => this.flush(), DEFERRED_SAVE_MS);
      return;
    }
    this.flush();
  }

  flush(): boolean {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    return this.attachedStore ? this.save(this.attachedStore.getState()) : false;
  }

  detach(): void {
    this.attachmentId += 1;
    if (this.timer) this.flush();
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (typeof window !== 'undefined') window.removeEventListener('pagehide', this.onPageHide);
    this.attachedStore = null;
  }
}
