import { describe, expect, it, vi } from 'vitest';
import { GameSessionStore } from '../domain/store/GameSessionStore';
import { createInitialState } from '../domain/rules/survivalRules';
import { AudioService, AUDIO_SETTINGS_KEY, DEFAULT_AUDIO_PREFERENCES, parseAudioPreferences, type AudioOutput } from './AudioService';
import { WebAudioSynth } from './WebAudioSynth';

function fakeOutput(unlockResult = true) {
  const output: AudioOutput = {
    unlock: vi.fn(async () => unlockResult),
    setMusic: vi.fn(),
    setHazard: vi.fn(),
    play: vi.fn(),
    setSuspended: vi.fn(),
    debug: () => ({ unlocked: unlockResult, track: null, hazard: null, activeMusicTracks: 0, cueCounts: {} }),
    dispose: vi.fn(),
  };
  return output;
}

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); }, values };
}

describe('Feature 10 centralized audio', () => {
  it('degrades without a browser audio engine or bundled audio assets', async () => {
    vi.stubGlobal('AudioContext', undefined);
    try {
      const synth = new WebAudioSynth();
      synth.setMusic('base', 0.2);
      synth.setHazard('storm', 0.2);
      expect(await synth.unlock()).toBe(false);
      expect(() => synth.play('laser', 0.4)).not.toThrow();
      synth.dispose();
    } finally { vi.unstubAllGlobals(); }
  });
  it('stores settings independently, restores them, and safely rejects corrupted preferences', () => {
    const storage = memoryStorage();
    const service = new AudioService(fakeOutput(), storage);
    service.setPreferences({ musicVolume: 0.42, sfxVolume: 0.17, musicEnabled: false, muted: true });
    expect(JSON.parse(storage.values.get(AUDIO_SETTINGS_KEY)!).version).toBe(1);
    expect(new AudioService(fakeOutput(), storage).getSnapshot()).toMatchObject({ musicVolume: 0.42,
      sfxVolume: 0.17, musicEnabled: false, muted: true });
    expect(parseAudioPreferences('{bad')).toBeNull();
    storage.values.set(AUDIO_SETTINGS_KEY, JSON.stringify({ version: 1, preferences: { ...DEFAULT_AUDIO_PREFERENCES, musicVolume: 2 } }));
    expect(new AudioService(fakeOutput(), storage).getSnapshot()).toEqual(DEFAULT_AUDIO_PREFERENCES);
    expect(() => new AudioService(fakeOutput(), { getItem: () => { throw Error('blocked'); },
      setItem: () => { throw Error('quota'); } }).setPreferences({ muted: true })).not.toThrow();
  });

  it('honors browser unlock, mute, separate volumes, and failed unlock', async () => {
    const output = fakeOutput();
    const audio = new AudioService(output, null);
    const store = new GameSessionStore();
    audio.attach(store);
    audio.play('confirm');
    expect(output.play).not.toHaveBeenCalled();
    expect(await audio.unlock()).toBe(true);
    audio.play('confirm');
    expect(output.play).toHaveBeenCalledWith('confirm', 0.38);
    audio.setPreferences({ musicVolume: 0.31, sfxVolume: 0.11 });
    expect(output.setMusic).toHaveBeenLastCalledWith('base', 0.31);
    audio.play('laser');
    expect(output.play).toHaveBeenLastCalledWith('laser', 0.11);
    audio.setPreferences({ muted: true });
    audio.play('pickup');
    expect(output.play).not.toHaveBeenCalledWith('pickup', expect.anything());
    expect(output.setMusic).toHaveBeenLastCalledWith('base', 0);
    audio.setPreferences({ muted: false, sfxEnabled: false });
    audio.play('damage');
    expect(output.play).not.toHaveBeenCalledWith('damage', expect.anything());
    const blocked = new AudioService(fakeOutput(false), null);
    expect(await blocked.unlock()).toBe(false);
    blocked.play('confirm');
    blocked.dispose();
  });

  it('changes base and arcade tracks once and cleans its subscription on detach', async () => {
    const output = fakeOutput();
    const audio = new AudioService(output, null);
    const store = new GameSessionStore();
    await audio.unlock();
    const detach = audio.attach(store);
    expect(output.setMusic).toHaveBeenLastCalledWith('base', DEFAULT_AUDIO_PREFERENCES.musicVolume);
    const before = vi.mocked(output.setMusic).mock.calls.length;
    store.dispatch({ type: 'MOVE_PLAYER', x: 401, y: 316 });
    store.dispatch({ type: 'TICK', deltaSeconds: 0.25 });
    expect(vi.mocked(output.setMusic).mock.calls.length).toBe(before);
    store.dispatch({ type: 'START_MISSION', mission: 'chicken-hunt', runId: 'audio-run' });
    expect(output.setMusic).toHaveBeenLastCalledWith('arcade', DEFAULT_AUDIO_PREFERENCES.musicVolume);
    expect(output.play).toHaveBeenCalledWith('launch', DEFAULT_AUDIO_PREFERENCES.sfxVolume);
    const active = store.getState();
    store.dispatch({ type: 'COMPLETE_MISSION', result: { runId: 'audio-run', missionType: 'chicken-hunt',
      success: false, returnedSafely: true, collectedResources: { food: 0 }, healthDamage: 0,
      xpEarned: 0, duration: 1, educationalMessage: 'No pickup.' } });
    expect(store.getState().resources.energy).toBe(active.resources.energy);
    expect(output.setMusic).toHaveBeenLastCalledWith('base', DEFAULT_AUDIO_PREFERENCES.musicVolume);
    detach();
    const detachedCalls = vi.mocked(output.setMusic).mock.calls.length;
    store.dispatch({ type: 'RESTART_GAME' });
    expect(vi.mocked(output.setMusic).mock.calls.length).toBe(detachedCalls);
    audio.dispose();
    expect(output.dispose).toHaveBeenCalledTimes(1);
  });

  it('pauses and hides playback, and does not replay a restored warning', async () => {
    const output = fakeOutput();
    const audio = new AudioService(output, null);
    await audio.unlock();
    const initial = createInitialState();
    const restored = { ...initial, day: 2, daysSurvived: 1,
      activeEventId: 'solar-day-2',
      activeEvent: { id: 'solar-day-2', type: 'solar-storm' as const, phase: 'warning' as const,
        remainingSeconds: 24, pulseSeconds: 0, tookDamage: false, ignored: false } };
    const store = new GameSessionStore(restored);
    audio.attach(store);
    expect(output.play).not.toHaveBeenCalledWith('stormAlarm', expect.anything());
    store.dispatch({ type: 'SET_PAUSED', paused: true });
    expect(output.setSuspended).toHaveBeenLastCalledWith(true);
    audio.play('laser');
    expect(output.play).not.toHaveBeenCalledWith('laser', expect.anything());
    store.dispatch({ type: 'SET_PAUSED', paused: false });
    expect(output.setSuspended).toHaveBeenLastCalledWith(false);
    audio.setHidden(true);
    expect(output.setSuspended).toHaveBeenLastCalledWith(true);
    audio.setHidden(false);
    expect(output.setSuspended).toHaveBeenLastCalledWith(false);
  });

  it('starts and stops storm/leak audio from store phases, without per-tick alarm replay', async () => {
    const output = fakeOutput();
    const audio = new AudioService(output, null);
    await audio.unlock();
    const store = new GameSessionStore();
    audio.attach(store);
    store.dispatch({ type: 'INTERACT_BUILDING', buildingId: 'habitat' });
    store.dispatch({ type: 'ENTER_HABITAT' });
    store.dispatch({ type: 'ADVANCE_DAY' });
    expect(output.play).toHaveBeenCalledWith('stormAlarm', DEFAULT_AUDIO_PREFERENCES.sfxVolume);
    expect(output.setMusic).toHaveBeenLastCalledWith('base', DEFAULT_AUDIO_PREFERENCES.musicVolume * 0.5);
    const alarms = vi.mocked(output.play).mock.calls.filter(([cue]) => cue === 'stormAlarm').length;
    for (let i = 0; i < 25; i++) store.dispatch({ type: 'TICK', deltaSeconds: 1 });
    expect(vi.mocked(output.play).mock.calls.filter(([cue]) => cue === 'stormAlarm')).toHaveLength(alarms);
    expect(output.setHazard).toHaveBeenLastCalledWith('storm', DEFAULT_AUDIO_PREFERENCES.sfxVolume * 0.26);
    for (let i = 0; i < 12; i++) store.dispatch({ type: 'TICK', deltaSeconds: 1 });
    expect(store.getState().activeEvent).toBeNull();
    expect(output.setHazard).toHaveBeenLastCalledWith(null, DEFAULT_AUDIO_PREFERENCES.sfxVolume * 0.26);
    store.dispatch({ type: 'ADVANCE_DAY' });
    expect(store.getState().activeEvent?.type).toBe('oxygen-leak');
    expect(output.play).toHaveBeenCalledWith('leakAlarm', DEFAULT_AUDIO_PREFERENCES.sfxVolume);
    for (let i = 0; i < 8; i++) store.dispatch({ type: 'TICK', deltaSeconds: 1 });
    expect(output.setHazard).toHaveBeenLastCalledWith('leak', DEFAULT_AUDIO_PREFERENCES.sfxVolume * 0.26);
    store.dispatch({ type: 'REPAIR_BUILDING', buildingId: 'habitat' });
    expect(store.getState().activeEvent).toBeNull();
    expect(output.setHazard).toHaveBeenLastCalledWith(null, DEFAULT_AUDIO_PREFERENCES.sfxVolume * 0.26);
  });
});
