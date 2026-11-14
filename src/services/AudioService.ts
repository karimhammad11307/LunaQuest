import type { GameAction } from '../domain/models/GameAction';
import type { GameState } from '../domain/models/types';
import { beatsPersonalBest } from '../domain/rules/scoreRules';
import type { GameSessionStore } from '../domain/store/GameSessionStore';
import { BALANCE } from '../game/config/balance';
import { WebAudioSynth } from './WebAudioSynth';

export type MusicTrack = 'base' | 'arcade' | null;
export type HazardSound = 'storm' | 'leak' | null;
export type AudioCue =
  | 'uiOpen' | 'uiClose' | 'confirm' | 'invalid' | 'footstep' | 'enter' | 'exit'
  | 'eat' | 'refill' | 'recycle' | 'rest' | 'plant' | 'harvest' | 'solar' | 'shield'
  | 'podArrive' | 'podCollect' | 'launch' | 'thruster' | 'laser' | 'enemyHit'
  | 'enemyDefeat' | 'pickup' | 'damage' | 'missionSuccess' | 'missionFailure'
  | 'return' | 'stormAlarm' | 'countdown' | 'stormDanger' | 'leakAlarm'
  | 'leakDanger' | 'emergencyClear' | 'repair' | 'gameOver' | 'newRecord';

export interface AudioPreferences {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export interface AudioOutput {
  unlock(): Promise<boolean>;
  setMusic(track: MusicTrack, volume: number): void;
  setHazard(hazard: HazardSound, volume: number): void;
  play(cue: AudioCue, volume: number): void;
  setSuspended(suspended: boolean): void;
  debug(): { unlocked: boolean; track: MusicTrack; hazard: HazardSound; activeMusicTracks: number; cueCounts: Record<string, number> };
  dispose(): void;
}

interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const AUDIO_SETTINGS_KEY = 'lunaquest.audio.v1';
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = Object.freeze({
  musicEnabled: true, sfxEnabled: true, musicVolume: 0.24, sfxVolume: 0.38, muted: false,
});

export function validAudioPreferences(value: unknown): value is AudioPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as Partial<AudioPreferences>;
  return typeof p.musicEnabled === 'boolean' && typeof p.sfxEnabled === 'boolean'
    && typeof p.muted === 'boolean'
    && typeof p.musicVolume === 'number' && Number.isFinite(p.musicVolume) && p.musicVolume >= 0 && p.musicVolume <= 1
    && typeof p.sfxVolume === 'number' && Number.isFinite(p.sfxVolume) && p.sfxVolume >= 0 && p.sfxVolume <= 1;
}

export function parseAudioPreferences(raw: string): AudioPreferences | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const data = value as { version?: unknown; preferences?: unknown };
    return data.version === 1 && validAudioPreferences(data.preferences) ? { ...data.preferences } : null;
  } catch { return null; }
}

/** One audio coordinator for React controls, store transitions, and Phaser cue hooks. */
export class AudioService {
  private readonly output: AudioOutput;
  private readonly storage: StoragePort | null;
  private preferences: AudioPreferences;
  private listeners = new Set<() => void>();
  private unsubscribeStore: (() => void) | null = null;
  private attachmentId = 0;
  private unlocked = false;
  private state: GameState | null = null;
  private hidden = false;
  private recentCues = new Map<AudioCue, number>();
  private appliedMix: { suspended: boolean; track: MusicTrack; musicVolume: number; hazard: HazardSound; hazardVolume: number } | null = null;

  constructor(output: AudioOutput = new WebAudioSynth(), storage?: StoragePort | null) {
    this.output = output;
    if (storage !== undefined) this.storage = storage;
    else {
      try { this.storage = typeof window === 'undefined' ? null : window.localStorage; }
      catch { this.storage = null; }
    }
    try {
      const raw = this.storage?.getItem(AUDIO_SETTINGS_KEY);
      this.preferences = raw ? parseAudioPreferences(raw) ?? { ...DEFAULT_AUDIO_PREFERENCES } : { ...DEFAULT_AUDIO_PREFERENCES };
    } catch { this.preferences = { ...DEFAULT_AUDIO_PREFERENCES }; }
  }

  getSnapshot = (): AudioPreferences => this.preferences;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };

  setPreferences(changes: Partial<AudioPreferences>): void {
    const next = { ...this.preferences, ...changes };
    if (!validAudioPreferences(next) || Object.keys(next).some((key) => !(key in DEFAULT_AUDIO_PREFERENCES))) return;
    if (Object.keys(next).every((key) => next[key as keyof AudioPreferences] === this.preferences[key as keyof AudioPreferences])) return;
    this.preferences = next;
    try { this.storage?.setItem(AUDIO_SETTINGS_KEY, JSON.stringify({ version: 1, preferences: next })); }
    catch { /* Audio stays usable when browser storage is blocked. */ }
    this.applyMix();
    this.listeners.forEach((listener) => listener());
  }

  async unlock(): Promise<boolean> {
    if (this.unlocked) return true;
    try { this.unlocked = await this.output.unlock(); }
    catch { this.unlocked = false; }
    if (this.unlocked) this.applyMix();
    return this.unlocked;
  }

  attach(store: GameSessionStore): () => void {
    this.unsubscribeStore?.();
    const id = ++this.attachmentId;
    this.state = store.getState();
    this.applyMix(); // A restored warning gets ambience, never a replayed alarm.
    this.unsubscribeStore = store.subscribeTransitions((next, action) => {
      const before = this.state;
      this.state = next;
      this.applyMix();
      if (before) this.onTransition(before, next, action);
    });
    return () => { if (this.attachmentId === id) { this.unsubscribeStore?.(); this.unsubscribeStore = null; this.state = null; this.applyMix(); } };
  }

  setHidden(hidden: boolean): void { if (this.hidden !== hidden) { this.hidden = hidden; this.applyMix(); } }

  play(cue: AudioCue): void {
    if (!this.unlocked || this.isSuspended() || !this.preferences.sfxEnabled || this.preferences.muted) return;
    const now = Date.now();
    const minimumGap = cue === 'footstep' ? 280 : cue === 'thruster' ? 320
      : cue === 'laser' ? 85 : cue === 'enemyHit' || cue === 'enemyDefeat' ? 90 : 35;
    if (now - (this.recentCues.get(cue) ?? -Infinity) < minimumGap) return;
    this.recentCues.set(cue, now);
    this.output.play(cue, this.preferences.sfxVolume);
  }

  private isSuspended(): boolean { return this.hidden || !!this.state?.paused; }

  private applyMix(): void {
    const suspended = this.isSuspended();
    const track: MusicTrack = this.state?.status === 'playing'
      ? this.state.scene === 'chicken-hunt' ? 'arcade' : 'base' : null;
    const hazard: HazardSound = this.state?.status === 'playing' && this.state.activeEvent?.phase === 'danger'
      ? this.state.activeEvent.type === 'solar-storm' ? 'storm' : 'leak' : null;
    const musicVolume = this.preferences.muted || !this.preferences.musicEnabled ? 0
      : this.preferences.musicVolume * (this.state?.activeEvent ? 0.5 : 1);
    const hazardVolume = this.preferences.muted || !this.preferences.sfxEnabled ? 0 : this.preferences.sfxVolume * 0.26;
    const previous = this.appliedMix;
    if (!previous || previous.suspended !== suspended) this.output.setSuspended(suspended);
    if (!previous || previous.track !== track || previous.musicVolume !== musicVolume) this.output.setMusic(track, musicVolume);
    if (!previous || previous.hazard !== hazard || previous.hazardVolume !== hazardVolume) this.output.setHazard(hazard, hazardVolume);
    this.appliedMix = { suspended, track, musicVolume, hazard, hazardVolume };
  }

  private onTransition(before: GameState, after: GameState, action: GameAction): void {
    if (before.status === 'playing' && after.status !== 'playing') {
      this.play(beatsPersonalBest(after, after.recordToBeat) ? 'newRecord' : 'gameOver');
      return;
    }
    if (before.status !== 'playing' || after.status !== 'playing' || action.type === 'LOAD_GAME') return;
    if (before.activeEvent?.id !== after.activeEvent?.id && after.activeEvent) {
      this.play(after.activeEvent.type === 'solar-storm' ? 'stormAlarm' : 'leakAlarm');
    } else if (before.activeEvent?.phase === 'warning' && after.activeEvent?.phase === 'danger') {
      this.play(after.activeEvent.type === 'solar-storm' ? 'stormDanger' : 'leakDanger');
    } else if (before.activeEvent && !after.activeEvent) this.play('emergencyClear');
    else if (after.activeEvent?.phase === 'warning' && action.type === 'TICK'
      && Math.ceil(after.activeEvent.remainingSeconds) < Math.ceil(before.activeEvent?.remainingSeconds ?? Infinity)
      && after.activeEvent.remainingSeconds <= 3) this.play('countdown');

    switch (action.type) {
      case 'INTERACT_BUILDING': this.play('uiOpen'); break;
      case 'CLOSE_BUILDING': this.play('uiClose'); break;
      case 'ENTER_HABITAT': case 'ENTER_GREENHOUSE': case 'ENTER_SHELTER': this.play('enter'); break;
      case 'LEAVE_HABITAT': case 'LEAVE_GREENHOUSE': case 'LEAVE_SHELTER': this.play('exit'); break;
      case 'EAT_FOOD': this.play('eat'); break;
      case 'REFILL_SUIT_OXYGEN': this.play('refill'); break;
      case 'RECYCLE_OXYGEN': this.play('recycle'); break;
      case 'REST_AT_HABITAT': this.play('rest'); break;
      case 'PLANT_CROP': this.play('plant'); break;
      case 'HARVEST_CROP': this.play('harvest'); break;
      case 'ACTIVATE_SHIELD': this.play('shield'); break;
      case 'COLLECT_EARTH_SUPPLY': this.play('podCollect'); break;
      case 'REPAIR_BUILDING': this.play('repair'); break;
      case 'START_MISSION': this.play('launch'); break;
      case 'COMPLETE_MISSION': this.play(after.lastMissionResult?.success && after.lastMissionResult.returnedSafely ? 'missionSuccess' : 'missionFailure'); break;
      case 'ADVANCE_DAY':
        if (after.day > before.day && after.lastDaySummary && after.lastDaySummary.energyProduced > 0) this.play('solar');
        break;
      case 'RESOLVE_EVENT': if (before.activeEvent && !after.activeEvent) this.play('repair'); break;
      default: break;
    }
    if (after.day > before.day && BALANCE.earthSupply.deliveryDays.some((day) => day === after.day)) this.play('podArrive');
  }

  debug() { return { preferences: this.preferences, ...this.output.debug() }; }

  dispose(): void {
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
    this.listeners.clear();
    this.output.dispose();
  }
}
