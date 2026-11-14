import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import Phaser from 'phaser';
import { GameSessionStore } from '../domain/store/GameSessionStore';
import { BootScene } from '../game/scenes/BootScene';
import { MoonBaseScene } from '../game/scenes/MoonBaseScene';
import { ChickenHuntScene } from '../game/scenes/ChickenHuntScene';
import { MISSION_CONFIG, VIEW } from '../game/config/gameConfig';
import { EDUCATION, type EducationId } from '../game/config/education';
import { BALANCE } from '../game/config/balance';
import type { GameAction } from '../domain/models/GameAction';
import type { GameSceneId } from '../domain/models/types';
import { pendingEarthSupplies, solarYieldForDay } from '../domain/rules/survivalRules';
import { NASAWeatherService } from '../services/NASAWeatherService';
import { SaveService } from '../services/SaveService';
import { HighScoreService } from '../services/HighScoreService';
import { createInitialState } from '../domain/rules/survivalRules';
import { beatsPersonalBest, survivalScore } from '../domain/rules/scoreRules';
import { AudioService, type AudioPreferences } from '../services/AudioService';
import { joystickVector } from '../game/input/joystick';
import './style.css';

const audioService = new AudioService();
const highScores = new HighScoreService();
const store = new GameSessionStore(createInitialState(highScores.getSnapshot()));
const weatherService = new NASAWeatherService({ apiKey: import.meta.env.VITE_NASA_API_KEY });
const saveService = new SaveService();
const savedAtStartup = saveService.load();

function Meter({ label, icon, value, color, low = false, flash = false, ariaLabel }: { label: string; icon: string; value: number; color: string; low?: boolean; flash?: boolean; ariaLabel?: string }) {
  return <div className={`meter${low ? ' meter-low' : ''}${flash ? ' meter-launch-flash' : ''}`} aria-label={`${ariaLabel ?? label}: ${Math.round(value)} of 100 game units`}>
    <span className="meter-icon" aria-hidden="true">{icon}</span>
    <span className="meter-data"><span className="meter-label">{label}</span><span className="meter-track"><span style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} /></span></span>
    <strong>{Math.round(value)}</strong>
  </div>;
}

function AudioSettingsPanel({ preferences, onClose, inGate = false }: { preferences: AudioPreferences; onClose: () => void; inGate?: boolean }) {
  const set = (changes: Partial<AudioPreferences>) => { audioService.setPreferences(changes); audioService.play('confirm'); };
  return <aside className={`audio-panel${inGate ? ' audio-panel-gate' : ''}`} role="dialog" aria-label="Audio settings">
    <div className="panel-head"><strong>♫ AUDIO SETTINGS</strong><button type="button" aria-label="Close audio settings" onClick={() => { audioService.play('uiClose'); onClose(); }}>×</button></div>
    <p>Original Moonbound chiptune music and game sounds.</p>
    <button type="button" aria-pressed={preferences.muted} className={preferences.muted ? 'audio-off' : ''} onClick={() => set({ muted: !preferences.muted })}>{preferences.muted ? 'UNMUTE ALL' : 'MUTE ALL'}</button>
    <button type="button" aria-pressed={preferences.musicEnabled} onClick={() => set({ musicEnabled: !preferences.musicEnabled })}>MUSIC {preferences.musicEnabled ? 'ON' : 'OFF'}</button>
    <label>Music Volume <output>{Math.round(preferences.musicVolume * 100)}%</output><input type="range" min="0" max="100" value={Math.round(preferences.musicVolume * 100)} onChange={(event) => audioService.setPreferences({ musicVolume: Number(event.target.value) / 100 })} /></label>
    <button type="button" aria-pressed={preferences.sfxEnabled} onClick={() => set({ sfxEnabled: !preferences.sfxEnabled })}>SOUND EFFECTS {preferences.sfxEnabled ? 'ON' : 'OFF'}</button>
    <label>Sound Effects Volume <output>{Math.round(preferences.sfxVolume * 100)}%</output><input type="range" min="0" max="100" value={Math.round(preferences.sfxVolume * 100)} onChange={(event) => audioService.setPreferences({ sfxVolume: Number(event.target.value) / 100 })} /></label>
    <small>Settings stay saved in this browser. Sound begins after your first click or key press.</small>
  </aside>;
}

function VirtualJoystick() {
  const [vector, setVector] = useState({ x: 0, y: 0 });
  const activePointer = useRef<number | null>(null);
  const emit = (x: number, y: number) => {
    const next = { x, y };
    setVector(next);
    window.dispatchEvent(new CustomEvent('moonbound-joystick', { detail: next }));
  };
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const next = joystickVector(event.clientX, event.clientY, rect.left, rect.top, rect.width);
    emit(next.x, next.y);
  };
  const release = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* canceled capture */ }
    emit(0, 0);
  };
  useEffect(() => () => { window.dispatchEvent(new CustomEvent('moonbound-joystick', { detail: { x: 0, y: 0 } })); }, []);
  return <div className="joystick" role="group" aria-label="Move astronaut in any direction"
    onPointerDown={(event) => { event.preventDefault(); activePointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId); move(event); }}
    onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
    <span className="joystick-cross" aria-hidden="true">✛</span>
    <span className="joystick-knob" style={{ transform: `translate(${vector.x * 34}px, ${vector.y * 34}px)` }} aria-hidden="true" />
  </div>;
}

const baseScaleMode = (scene: GameSceneId): number => scene === 'moon-base'
  && (window.matchMedia('(max-width:680px) and (orientation:portrait)').matches
    || window.matchMedia('(max-height:500px) and (orientation:landscape)').matches)
  ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT;

function GameContainer({ sceneId, runId, paused }: { sceneId: GameSceneId; runId: string | null; paused: boolean }) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const launchedRunId = useRef<string | null>(null);
  const activeScene = useRef(sceneId);
  activeScene.current = sceneId;
  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO, parent: 'game-canvas', width: VIEW.width, height: VIEW.height,
      backgroundColor: '#12172F', pixelArt: true, roundPixels: true,
      render: { antialias: false },
      scale: { mode: baseScaleMode(sceneId),
        autoCenter: Phaser.Scale.CENTER_BOTH, width: VIEW.width, height: VIEW.height },
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: [new BootScene(), new MoonBaseScene(store, (cue) => audioService.play(cue)), new ChickenHuntScene()],
    });
    gameRef.current = game;
    const resize = () => {
      game.scale.scaleMode = baseScaleMode(activeScene.current);
      game.scale.refresh();
    };
    window.addEventListener('resize', resize);
    document.addEventListener('fullscreenchange', resize);
    if (import.meta.env.DEV) Object.assign(window, { __moonboundGame: game, __moonboundStore: store });
    return () => {
      if (import.meta.env.DEV) Object.assign(window, { __moonboundGame: undefined, __moonboundStore: undefined });
      window.removeEventListener('resize', resize);
      document.removeEventListener('fullscreenchange', resize);
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    game.scale.scaleMode = baseScaleMode(sceneId);
    game.scale.refresh();
  }, [sceneId]);
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    if (sceneId === 'chicken-hunt' && runId) {
      if (launchedRunId.current !== runId) {
        launchedRunId.current = runId;
        game.scene.stop('MoonBaseScene');
        game.scene.start('ChickenHuntScene', { runId, difficulty: 1, dispatch: store.dispatch,
          onAudioCue: (cue: import('../services/AudioService').AudioCue) => audioService.play(cue) });
      }
      if (paused) game.scene.pause('ChickenHuntScene');
      else if (game.scene.isPaused('ChickenHuntScene')) game.scene.resume('ChickenHuntScene');
    } else if (launchedRunId.current !== null) {
      launchedRunId.current = null;
      game.scene.stop('ChickenHuntScene');
      game.scene.start('MoonBaseScene');
    }
  }, [sceneId, runId, paused]);
  return <div id="game-canvas" role="img" aria-label={sceneId === 'chicken-hunt' ? 'Playable Chicken Hunt arcade mission. Use WASD or arrows to fly and Space to fire.' : 'Playable pixel-art Moon Base. Use WASD or arrow keys to move, and E to interact with buildings.'} />;
}

function App() {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const personalBest = useSyncExternalStore(highScores.subscribe, highScores.getSnapshot);
  const audioPreferences = useSyncExternalStore(audioService.subscribe, audioService.getSnapshot);
  const [sessionReady, setSessionReady] = useState(!savedAtStartup);
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const [showWeather, setShowWeather] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [dismissedMissionRunId, setDismissedMissionRunId] = useState<string | null>(null);
  const [learningTopic, setLearningTopic] = useState<EducationId | null>(null);
  const [showAudio, setShowAudio] = useState(false);
  const [launchFeedback, setLaunchFeedback] = useState<{ before: number; after: number; cost: number } | null>(null);
  const [menuIndex, setMenuIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const menuOpenedAt = useRef(0);
  const weatherRequest = useRef(0);
  useEffect(() => {
    const onFullscreen = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => document.removeEventListener('fullscreenchange', onFullscreen);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frameRef.current?.requestFullscreen();
    } catch { setActionFeedback('Fullscreen is unavailable in this browser.'); }
  };
  useEffect(() => {
    const unlock = () => { void audioService.unlock(); };
    const visibility = () => audioService.setHidden(document.hidden);
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', visibility);
    if (import.meta.env.DEV) Object.assign(window, { __moonboundAudio: audioService });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
      if (import.meta.env.DEV) Object.assign(window, { __moonboundAudio: undefined });
      audioService.dispose();
    };
  }, []);
  useEffect(() => {
    if (!sessionReady) return;
    const detach = saveService.attach(store);
    const detachRecord = highScores.attach(store);
    const detachAudio = audioService.attach(store);
    saveService.save(store.getState());
    return () => { detachAudio(); detachRecord(); detach(); };
  }, [sessionReady]);
  useEffect(() => {
    if (!sessionReady) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = store.subscribeTransitions((next, action) => {
      if (action.type === 'INTERACT_BUILDING' && next.selectedBuildingId) menuOpenedAt.current = performance.now();
      if (action.type === 'START_MISSION') {
        const cost = MISSION_CONFIG[action.mission].energyCost;
        setLaunchFeedback({ before: next.resources.energy + cost, after: next.resources.energy, cost });
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => setLaunchFeedback(null), 4500);
      } else if (action.type === 'COMPLETE_MISSION' || action.type === 'RESTART_GAME') {
        setLaunchFeedback(null);
        if (timer) clearTimeout(timer);
      }
    });
    return () => { unsubscribe(); if (timer) clearTimeout(timer); };
  }, [sessionReady]);
  const notice = state.notices.at(-1)?.text ?? '';
  const selected = state.selectedBuildingId;
  const building = selected ? state.buildings[selected] : null;
  const indoors = state.astronaut.location !== 'outside';
  const emergency = state.activeEvent;
  const missionSummary = state.status === 'playing' && state.lastMissionResult?.runId !== dismissedMissionRunId ? state.lastMissionResult : null;
  const score = survivalScore(state);
  const newRecord = beatsPersonalBest(state, state.recordToBeat);
  const openEducation = (topic: EducationId) => {
    const current = store.getState();
    if (current.status !== 'playing' || current.paused || current.scene !== 'moon-base') return;
    audioService.play('uiOpen');
    if (current.selectedBuildingId && current.astronaut.location === 'outside') store.dispatch({ type: 'CLOSE_BUILDING' });
    store.dispatch({ type: 'SET_PAUSED', paused: true });
    setLearningTopic(topic);
  };
  const closeEducation = () => {
    setLearningTopic(null);
    store.dispatch({ type: 'SET_PAUSED', paused: false });
    audioService.play('uiClose');
  };
  useEffect(() => {
    const onOpen = (event: Event) => openEducation((event as CustomEvent<EducationId>).detail);
    window.addEventListener('moonbound-open-education', onOpen);
    return () => window.removeEventListener('moonbound-open-education', onOpen);
  }, []);
  const loadWeather = async (mode: 'live' | 'demo') => {
    const request = ++weatherRequest.current;
    setWeatherLoading(true);
    const weather = await weatherService.load(mode);
    if (request === weatherRequest.current) {
      store.dispatch({ type: 'SET_SPACE_WEATHER', weather });
      setWeatherLoading(false);
    }
  };
  useEffect(() => {
    if (!sessionReady) return;
    void loadWeather(import.meta.env.VITE_NASA_DATA_MODE === 'live' ? 'live' : 'demo');
    return () => { weatherRequest.current += 1; };
  }, [sessionReady]);
  useEffect(() => setActionFeedback(''), [selected]);
  useEffect(() => { setMenuIndex(0); }, [selected]);
  useEffect(() => {
    if (!selected || learningTopic || showAudio || state.scene !== 'moon-base') return;
    const allButtons = [...document.querySelectorAll<HTMLButtonElement>('.building-panel button')];
    allButtons.forEach((button) => button.classList.remove('menu-selected'));
    const buttons = allButtons.filter((button) => !button.closest('.panel-head') && !button.disabled);
    const button = buttons[Math.min(menuIndex, buttons.length - 1)];
    button?.classList.add('menu-selected');
    if (button && document.activeElement !== button) button.focus({ preventScroll: true });
  }, [selected, menuIndex, learningTopic, showAudio, state.astronaut.location,
    state.lastOxygenRecycleDay, state.resources.energy, state.resources.oxygen, building?.condition]);
  const dispatch = (action: GameAction, rejected: string) => {
    const before = store.getState();
    const after = store.dispatch(action);
    setActionFeedback(after === before ? rejected : '');
    if (after === before) audioService.play('invalid');
  };
  useEffect(() => {
    const onGameKey = (event: KeyboardEvent) => {
      if (!sessionReady) return;
      const current = store.getState();
      if (event.key === 'Escape') {
        if (showAudio) { audioService.play('uiClose'); setShowAudio(false); }
        else if (learningTopic) closeEducation();
        else if (showHelp) setShowHelp(false);
        else if (showWeather) setShowWeather(false);
        else if (current.paused) store.dispatch({ type: 'SET_PAUSED', paused: false });
        else if (current.selectedBuildingId && current.astronaut.location === 'outside') {
          store.dispatch({ type: 'CLOSE_BUILDING' }); setActionFeedback('');
        } else if (current.astronaut.location === 'outside') store.dispatch({ type: 'SET_PAUSED', paused: true });
        return;
      }
      if (current.scene !== 'moon-base' || current.status !== 'playing' || current.paused
        || learningTopic || showAudio || showHelp || showWeather) return;
      if (event.key.toLowerCase() === 'q' && !event.repeat && current.astronaut.location !== 'outside') {
        event.preventDefault();
        const exit: GameAction = current.astronaut.location === 'habitat' ? { type: 'LEAVE_HABITAT' }
          : current.astronaut.location === 'greenhouse' ? { type: 'LEAVE_GREENHOUSE' } : { type: 'LEAVE_SHELTER' };
        store.dispatch(exit);
        setActionFeedback('');
        return;
      }
      if (!current.selectedBuildingId || event.target instanceof HTMLInputElement) return;
      const buttons = [...document.querySelectorAll<HTMLButtonElement>('.building-panel button')]
        .filter((button) => !button.closest('.panel-head') && !button.disabled);
      if (!buttons.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setMenuIndex((index) => (index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length);
      } else if ((event.key === 'Enter' || event.key.toLowerCase() === 'e') && !event.repeat
        && performance.now() - menuOpenedAt.current > 180) {
        if (event.key === 'Enter' && event.target instanceof HTMLButtonElement) return;
        event.preventDefault();
        buttons[Math.min(menuIndex, buttons.length - 1)]?.click();
      }
    };
    window.addEventListener('keydown', onGameKey);
    return () => window.removeEventListener('keydown', onGameKey);
  }, [showHelp, showAudio, showWeather, sessionReady, learningTopic, menuIndex]);
  const virtualInput = (direction: string | null) => window.dispatchEvent(new CustomEvent('moonbound-input', { detail: direction }));
  const startNewGame = () => {
    saveService.clear();
    store.dispatch({ type: 'RESTART_GAME', recordToBeat: highScores.getSnapshot() });
    saveService.save(store.getState());
    setSessionReady(true);
  };
  const continueGame = () => {
    const restored = saveService.load();
    if (!restored) { startNewGame(); return; }
    store.dispatch({ type: 'LOAD_GAME', state: restored });
    setSessionReady(true);
  };
  if (!sessionReady) return <main className="app-shell"><div className="game-frame"><header className="masthead"><div className="brand"><span className="brand-star">✦</span><span>MOONBOUND</span><small>Survival Mission</small></div></header><div className="save-start"><div className="save-start-panel"><strong>{confirmNewGame ? 'START A NEW MISSION?' : 'WELCOME BACK, ASTRONAUT!'}</strong><p>Survive as many lunar days as you can!</p><p>Saved run: {savedAtStartup?.daysSurvived} days · Food {Math.round(savedAtStartup?.resources.food ?? 0)} · XP {savedAtStartup?.xp}</p><p>Personal best: {personalBest.bestDaysSurvived} days · {personalBest.bestScore.toLocaleString()} points</p>{confirmNewGame ? <><p>Your saved progress will be replaced. Your record stays safe.</p><button type="button" onClick={startNewGame}>Replace Save &amp; Start</button><button type="button" onClick={() => setConfirmNewGame(false)}>Keep Saved Game</button></> : <><p>Your Moon Base is waiting.</p><button type="button" onClick={continueGame}>{savedAtStartup?.status === 'playing' ? 'Continue Game' : 'View Last Result'}</button><button type="button" onClick={() => setConfirmNewGame(true)}>New Game</button><small>New Game replaces this saved run, not your record.</small></>}<button className="audio-gate-button" type="button" onClick={() => { audioService.play('uiOpen'); setShowAudio(!showAudio); }}>♫ Audio Settings</button>{showAudio && <AudioSettingsPanel preferences={audioPreferences} onClose={() => setShowAudio(false)} inGate />}</div></div></div></main>;
  return (
    <main className="app-shell"><div className="game-frame" ref={frameRef}>
      <header className="masthead">
        <div className="brand"><span className="brand-star">✦</span><span>MOONBOUND</span><small>Survival Mission</small></div>
        <div className="mission-day"><span>LUNAR DAY</span><strong>{state.day}</strong></div>
        <span className="xp-counter" aria-label={`${state.xp} experience points`}>XP {state.xp}</span>
        <button className="audio-settings-button" type="button" aria-label="Audio settings" aria-expanded={showAudio} onClick={() => { audioService.play('uiOpen'); setShowAudio(!showAudio); }}>♫ <span>Audio</span>{audioPreferences.muted ? ' OFF' : ''}</button>
        <button className="fullscreen-button" type="button" aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={() => void toggleFullscreen()}>{isFullscreen ? '⤢' : '⛶'} <span>{isFullscreen ? 'Window' : 'Fullscreen'}</span></button>
        <button className="pause-button" type="button" disabled={state.status !== 'playing' || !!learningTopic} onClick={() => { store.dispatch({ type: 'SET_PAUSED', paused: !state.paused }); setShowHelp(false); }}>{state.paused ? 'Resume' : 'Pause'}</button>
        <button className="help-button" type="button" disabled={!!learningTopic} onClick={() => { audioService.play(showHelp ? 'uiClose' : 'uiOpen'); setShowHelp(!showHelp); }} aria-expanded={showHelp}>? <span>How to play</span></button>
      </header>
      <div className="hud" aria-label="Colony supplies and astronaut health">
        <Meter label="Food" icon="▣" value={state.resources.food} color="#FFD75E" low={state.resources.food <= BALANCE.warnings.food} />
        <Meter label="Water" icon="◆" value={state.resources.water} color="#4EDCE5" low={state.resources.water <= BALANCE.warnings.water} />
        <Meter label="Base O₂" ariaLabel="Oxygen" icon="◉" value={state.resources.oxygen} color="#80E5A0" low={state.resources.oxygen <= BALANCE.warnings.oxygen} />
        <Meter label="Suit O₂" icon="◉" value={state.astronaut.suitOxygen} color="#4EDCE5" low={state.astronaut.suitOxygen <= BALANCE.warnings.suitOxygen} />
        <Meter label="Energy" icon="ϟ" value={state.resources.energy} color="#B9A7F5" low={state.resources.energy <= BALANCE.warnings.energy} flash={!!launchFeedback} />
        <Meter label="Health" icon="✚" value={state.astronaut.health} color="#FF6B81" low={state.astronaut.health <= BALANCE.warnings.health} />
      </div>
      <div className="score-strip" aria-label="Endless survival progress"><strong>Survive as many lunar days as you can!</strong><span>Survived {state.daysSurvived} days</span><span>Score {score.toLocaleString()}</span><span>Best {personalBest.bestDaysSurvived} days</span><span>Top {personalBest.bestScore.toLocaleString()}</span></div>
      <div className="canvas-wrap"><GameContainer sceneId={state.scene} runId={state.activeMissionRunId} paused={state.paused} />
        {state.status === 'playing' && state.scene === 'moon-base' && indoors && <div className="inside-indicator" role="status">INSIDE {state.astronaut.location === 'shelter' ? 'SHELTER' : state.astronaut.location.toUpperCase()} · Q TO EXIT</div>}
        {launchFeedback && state.scene === 'chicken-hunt' && <div className="launch-cost-banner" role="status">LAUNCH −{launchFeedback.cost} ENERGY · {launchFeedback.before} → {launchFeedback.after}</div>}
        {showAudio && <AudioSettingsPanel preferences={audioPreferences} onClose={() => setShowAudio(false)} />}
        {showWeather && <aside className="weather-panel" aria-label="NASA space weather information">
          <div className="panel-head"><strong>☀ SPACE WEATHER</strong><button type="button" aria-label="Close space weather" onClick={() => { audioService.play('uiClose'); setShowWeather(false); }}>×</button></div>
          <p className="weather-source">{state.weather.source === 'live' ? '● LIVE · NASA DONKI' : state.weather.source === 'cached' ? '◌ CACHED · NASA DONKI' : '◇ DEMO · HISTORICAL EXAMPLE'}</p>
          <p className="weather-message">{state.weather.label}</p>
          <p><b>NASA Observation:</b> {state.weather.source === 'demo' ? 'Historical training example' : state.weather.latestEventType ? ({ FLR: 'Solar flare', CME: 'Coronal mass ejection', SEP: 'Solar energetic particles', notification: 'Space weather notice' } as const)[state.weather.latestEventType] : 'No recent record in this query'}</p>
          <p><b>Observed:</b> {state.weather.observedAt ? new Date(state.weather.observedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) + ' UTC' : 'None in the last 7 days'}</p>
          <p><b>Game Risk:</b> {({ low: 'Normal', moderate: 'Elevated', high: 'High' } as const)[state.weather.riskLevel]} <small>(simplified game category)</small></p>
          {state.weather.partial && <p className="weather-disclaimer">Some DONKI sources were unavailable. This game category uses only the records received.</p>}
          {state.weather.source === 'demo' && <p className="weather-disclaimer">This 2017 example is not current NASA activity. {state.weather.fallbackReason ? `Live data unavailable: ${state.weather.fallbackReason.replace('-', ' ')}.` : ''}</p>}
          <p className="weather-disclaimer">DONKI reports solar activity, not radiation dose at this Moon Base. The storm is a scripted game event.</p>
          <div className="weather-actions"><button type="button" disabled={weatherLoading} onClick={() => void loadWeather('live')}>{weatherLoading ? 'Checking…' : 'Try NASA live'}</button><button type="button" disabled={weatherLoading} onClick={() => void loadWeather('demo')}>Use demo</button></div>
          <a href="https://api.nasa.gov/" target="_blank" rel="noreferrer">NASA Open APIs ↗</a>
        </aside>}
        {emergency && state.status === 'playing' && <aside className={`emergency-panel emergency-${emergency.type}`} role="alert" aria-label="Space emergency">
          <strong>{emergency.type === 'solar-storm' ? '☀ SOLAR STORM' : '◉ OXYGEN LEAK'}</strong>
          {emergency.phase === 'warning' && <span className="emergency-countdown">{Math.ceil(emergency.remainingSeconds)}s WARNING</span>}
          {emergency.phase === 'danger' && <span className="emergency-countdown">{emergency.type === 'solar-storm' ? `${Math.ceil(emergency.remainingSeconds)}s STORM` : 'AIR ESCAPING'}</span>}
          <p>{emergency.type === 'solar-storm'
            ? 'Run to the shelter and press E, or switch on its shield. Stay inside the habitat to avoid damage.'
            : 'Go to the habitat and repair the leak, or isolate the section from inside.'}</p>
          {emergency.type === 'oxygen-leak' && <p className="emergency-costs">Repair: −{BALANCE.repair.energyCost} energy · Isolate: −{BALANCE.emergencies.leak.isolateEnergyCost} energy, −{BALANCE.emergencies.leak.isolateOxygenCost} O₂; greenhouse needs repair.</p>}
          {emergency.type === 'oxygen-leak' && state.astronaut.location === 'habitat' && <button type="button" onClick={() => dispatch({ type: 'RESOLVE_EVENT', eventId: emergency.id, choiceId: 'isolate' }, 'Need energy and base oxygen to isolate.')}>Isolate section</button>}
          {!emergency.ignored && <button className="ignore-event" type="button" onClick={() => dispatch({ type: 'RESOLVE_EVENT', eventId: emergency.id, choiceId: 'ignore' }, 'Decision unavailable.')}>Keep exploring</button>}
          {emergency.ignored && <small>Hazard continues until you respond.</small>}
          {actionFeedback && <small className="action-feedback" role="status">{actionFeedback}</small>}
        </aside>}
        {!emergency && state.lastEventOutcome && state.status === 'playing' && <div className="event-outcome" role="status"><strong>{state.lastEventOutcome.message}{state.lastEventOutcome.xpEarned ? ` +${state.lastEventOutcome.xpEarned} XP` : ''}</strong><span>{state.lastEventOutcome.takeaway}</span></div>}
        {selected && building && state.status === 'playing' && !learningTopic && <aside className="building-panel" aria-label={`${building.type} controls`}>
          <div className="panel-head"><strong>{({ habitat: 'HABITAT', greenhouse: 'GREENHOUSE', solar: 'SOLAR ARRAY', shield: 'RADIATION SHELTER', landingPad: 'LANDING PAD' } as Record<string, string>)[selected]}</strong><button type="button" aria-label={indoors ? 'Exit building' : 'Close building controls'} onClick={() => {
            if (state.astronaut.location === 'habitat') store.dispatch({ type: 'LEAVE_HABITAT' });
            else if (state.astronaut.location === 'greenhouse') store.dispatch({ type: 'LEAVE_GREENHOUSE' });
            else if (state.astronaut.location === 'shelter') store.dispatch({ type: 'LEAVE_SHELTER' });
            else store.dispatch({ type: 'CLOSE_BUILDING' });
            setActionFeedback('');
          }}>×</button></div>
          <p className={`building-condition condition-${building.condition}`}>STATUS: {building.condition === 'good' ? 'OPERATIONAL' : building.condition.toUpperCase()}</p>
          <button className="learn-button" type="button" onClick={() => openEducation(selected as EducationId)}>Learn: {EDUCATION[selected as EducationId].title} <small>What · Why · Your mission</small></button>
          {selected === 'habitat' && <>
            {emergency?.type === 'oxygen-leak' && <p className="emergency-building-note">Oxygen is leaking! Repair this habitat or isolate the section.</p>}
            <p>{state.astronaut.location === 'habitat' ? 'Inside your safe home. Press Q to exit.' : 'Step inside to eat, rest and refill.'}</p>
            {state.astronaut.location === 'outside' ? <button type="button" onClick={() => dispatch({ type: 'ENTER_HABITAT' }, 'Move closer to the habitat.')}>Enter Habitat</button> : <>
              <button type="button" onClick={() => dispatch({ type: 'REFILL_SUIT_OXYGEN' }, 'Suit full or base oxygen empty!')}>Refill Suit O₂ <small>uses base O₂</small></button>
              <button type="button" disabled={state.lastOxygenRecycleDay === state.day || state.resources.energy < BALANCE.habitat.recycleEnergyCost || state.resources.oxygen >= 100 || building.condition !== 'good' || !building.active}
                onClick={() => dispatch({ type: 'RECYCLE_OXYGEN' }, 'Air loop unavailable today or needs more Energy!')}>Recycle Oxygen <small>−{BALANCE.habitat.recycleEnergyCost} Energy · up to +{BALANCE.habitat.recycleOxygenGain} Base O₂ · once/day</small></button>
              <p className="science-note">Space stations recycle air using equipment and resources. This limited daily recovery is a simplified game version.</p>
              <button type="button" onClick={() => dispatch({ type: 'EAT_FOOD' }, 'Need food and missing health to eat.')}>Eat Food <small>−{BALANCE.habitat.eatFoodCost} food · +{BALANCE.habitat.eatHealAmount} HP</small></button>
              <button type="button" onClick={() => dispatch({ type: 'REST_AT_HABITAT' }, 'Need supplies and missing health to rest.')}>Rest / Recover <small>−{BALANCE.habitat.healFoodCost} food · −{BALANCE.habitat.healWaterCost} water · −{BALANCE.habitat.healEnergyCost} energy</small></button>
              <p className="day-forecast">Next day: −{BALANCE.daily.food} food · −{BALANCE.daily.water} water · −{BALANCE.daily.oxygen} base O₂ · −{BALANCE.daily.energy} energy. Solar may recharge the battery.</p>
              <button className="advance-button" type="button" onClick={() => dispatch({ type: 'ADVANCE_DAY' }, emergency ? 'Resolve the emergency before advancing.' : 'Cannot advance the day now.')}>Advance Day →</button>
              <button type="button" onClick={() => dispatch({ type: 'LEAVE_HABITAT' }, 'Already outside.')}>Leave Habitat (Q)</button>
            </>}
            <p className="science-note">The habitat uses stored oxygen and power to keep the crew safe.</p>
          </>}
          {selected === 'greenhouse' && <>
            <p>Inside the greenhouse. Press Q to return outside.</p>
            <p className="crop-status">CROP: {building.cropPlanted ? building.cropGrowth >= 1 ? 'READY TO HARVEST' : 'SEEDS GROWING' : 'EMPTY BEDS'}</p>
            {!building.cropPlanted ? <button type="button" onClick={() => dispatch({ type: 'PLANT_CROP' }, 'Need water, energy and working greenhouse to plant.')}>Plant Seeds <small>−{BALANCE.greenhouse.waterCost} water · −{BALANCE.greenhouse.energyCost} energy</small></button>
              : building.cropGrowth >= 1 ? <button type="button" onClick={() => dispatch({ type: 'HARVEST_CROP' }, 'Storage is full or greenhouse needs repair.')}>Harvest Crop <small>up to +{BALANCE.greenhouse.foodYield} food · +{BALANCE.greenhouse.oxygenYield} base O₂ · +{BALANCE.xp.supplies} XP</small></button>
                : <p>Seed → Sprout → Ready after one day.</p>}
            <p className="science-note">Plants need water, light and power. Harvested food fills storage; eat at the habitat to heal.</p>
            <button type="button" onClick={() => dispatch({ type: 'LEAVE_GREENHOUSE' }, 'Already outside.')}>Leave Greenhouse (Q)</button>
          </>}
          {selected === 'solar' && <><p>Stored energy: {Math.round(state.resources.energy)} / 100</p><p className="production-status">Next day: +{solarYieldForDay(building)} energy in simplified daylight.</p><p>Last day: +{state.lastDaySummary?.energyProduced ?? 0} energy stored.</p><p className="science-note">Damaged panels make less power; broken panels make none. Battery capacity is 100.</p></>}
          {selected === 'shield' && <><p>{state.astronaut.location === 'shelter' ? 'Protected inside the shelter. Press Q to exit.' : 'A safe place during outside hazards.'}</p><p className="shield-status">SHIELD: {building.active && state.resources.energy > 0 ? 'ACTIVE' : 'OFF'}</p><button type="button" onClick={() => dispatch({ type: 'ACTIVATE_SHIELD', active: !building.active }, 'Not enough energy or shield needs repair!')}>{building.active ? 'Switch Shield Off' : 'Activate Shield'} <small>{building.active ? 'no energy refund' : `−${BALANCE.shield.activationEnergy} energy · −${BALANCE.shield.dailyEnergyUpkeep} per day`}</small></button>{state.astronaut.location === 'shelter' ? <button type="button" onClick={() => dispatch({ type: 'LEAVE_SHELTER' }, 'Already outside.')}>Leave Shelter (Q)</button> : <button type="button" onClick={() => dispatch({ type: 'ENTER_SHELTER' }, 'Move closer to the shelter.')}>Enter Shelter</button>}<p className="science-note">Shelter and the powered shield protect against simulated radiation. The shield covers the nearby base only.</p></>}
          {selected === 'landingPad' && <><p>Fly Chicken Hunt to collect food for the colony.</p><button type="button" onClick={() => openEducation('chickenHunt')}>Learn: Chicken Hunt <small>Fictional arcade training</small></button><p className="launch-preview">ENERGY {Math.round(state.resources.energy)} → {Math.max(0, Math.round(state.resources.energy - MISSION_CONFIG['chicken-hunt'].energyCost))} · Cost {MISSION_CONFIG['chicken-hunt'].energyCost}</p><button className="mission-launch-button" type="button" onClick={() => dispatch({ type: 'START_MISSION', mission: 'chicken-hunt', runId: `chicken-${crypto.randomUUID()}` }, store.getState().resources.energy < MISSION_CONFIG['chicken-hunt'].energyCost ? 'Not enough energy to launch!' : 'Finish the emergency before launching.')}>Launch Chicken Hunt <small>−{MISSION_CONFIG['chicken-hunt'].energyCost} energy · WASD / arrows to fly · Space to fire</small></button><p>{pendingEarthSupplies(state).length ? `${pendingEarthSupplies(state).length} Earth water pod${pendingEarthSupplies(state).length > 1 ? 's' : ''} waiting west of the pad.` : state.day < 4 ? `Next Earth water delivery: Day ${state.day < 2 ? 2 : 4}.` : 'All scheduled Earth deliveries have arrived.'}</p><button type="button" onClick={() => openEducation('earthSupply')}>Learn: Earth Water Supply</button><p className="science-note">Food is banked only after a safe, successful return. Eat it at the habitat to restore HP.</p></>}
          {building.condition !== 'good' && <button className="repair-button" type="button" onClick={() => dispatch({ type: 'REPAIR_BUILDING', buildingId: selected }, 'Need energy to repair.')}>Repair {building.type} <small>−{BALANCE.repair.energyCost} energy</small></button>}
          {actionFeedback && <p className="action-feedback" role="alert">{actionFeedback}</p>}
        </aside>}
        {state.status !== 'playing' && <aside className="result-panel endless-result" aria-label="Mission result"><div className="result-stars" aria-hidden="true">✦ ✧ ✦</div><strong>MISSION ENDED</strong><p>You survived <b>{state.daysSurvived} lunar {state.daysSurvived === 1 ? 'day' : 'days'}!</b></p><div className="result-stats"><span>FINAL SCORE <b>{score.toLocaleString()}</b></span><span>PERSONAL BEST <b>{personalBest.bestDaysSurvived} days</b></span><span>BEST SCORE <b>{personalBest.bestScore.toLocaleString()}</b></span></div>{newRecord && <div className="new-record" role="status">✦ NEW RECORD! ✦</div>}<p className="result-encouragement">Every mission teaches you how to survive a little longer.</p><button type="button" onClick={() => { store.dispatch({ type: 'RESTART_GAME', recordToBeat: highScores.getSnapshot() }); setActionFeedback(''); }}>TRY AGAIN</button></aside>}
        {missionSummary && <aside className="mission-summary" aria-label="Chicken Hunt mission summary"><strong>{missionSummary.success && missionSummary.returnedSafely ? 'SUPPLIES DELIVERED!' : 'MISSION ENDED'}</strong><p>{missionSummary.educationalMessage}</p><p>Food +{missionSummary.collectedResources.food ?? 0} · XP +{missionSummary.xpEarned} · Health −{missionSummary.healthDamage}</p><button type="button" onClick={() => setDismissedMissionRunId(missionSummary.runId)}>Back to Moon Base</button></aside>}
        {learningTopic && <aside className="education-panel" role="dialog" aria-modal="true" aria-label={`${EDUCATION[learningTopic].title} learning sign`}><strong>✦ {EDUCATION[learningTopic].title}</strong><p><b>WHAT?</b> {EDUCATION[learningTopic].what}</p><p><b>WHY?</b> {EDUCATION[learningTopic].why}</p><p><b>YOUR MISSION</b> {EDUCATION[learningTopic].mission}</p><button type="button" onClick={closeEducation}>Got it — back to game</button></aside>}
        {state.paused && !learningTopic && state.status === 'playing' && <aside className="pause-panel" aria-label="Game paused"><strong>PAUSED</strong><p>Take your time. Health and suit oxygen are safe while paused.</p><button type="button" onClick={() => store.dispatch({ type: 'SET_PAUSED', paused: false })}>Resume Mission</button></aside>}
        {showHelp && <aside className="help-panel"><strong>{state.scene === 'chicken-hunt' ? 'Chicken Hunt' : 'Explore the base'}</strong>{state.scene === 'chicken-hunt' ? <><p>Fly with WASD or arrow keys. Press Space to fire at alien birds and collect food drops.</p><p>Return to base before your ship is damaged. Food is stored when your mission succeeds.</p></> : <><p>Move with WASD or arrow keys. Walk near a building and press E, or click it when close.</p><p>Health slowly falls during active play. Eat stored food at the habitat to recover. Pause when you need a break.</p><p>Survive as many lunar days as you can and beat your best!</p></>}<button type="button" onClick={() => { audioService.play('uiClose'); setShowHelp(false); }}>Got it</button></aside>}
      </div>
      {state.lastDaySummary && state.status === 'playing' && <div className="day-summary" role="status">Day {state.lastDaySummary.day} survived · Food −{state.lastDaySummary.food} · Water −{state.lastDaySummary.water} · Base O₂ −{state.lastDaySummary.oxygen} · Energy −{state.lastDaySummary.energy} / +{state.lastDaySummary.energyProduced} solar{state.lastDaySummary.shieldEnergyUsed > 0 && <> · Shield −{state.lastDaySummary.shieldEnergyUsed}</>}{state.lastDaySummary.warnings.length > 0 && <strong> · {state.lastDaySummary.warnings.join(' ')}</strong>}</div>}
      {state.status === 'playing' && (state.resources.food <= BALANCE.warnings.food || state.astronaut.suitOxygen <= BALANCE.warnings.suitOxygen) && <div className="survival-warning" role="alert">{state.astronaut.suitOxygen <= BALANCE.warnings.suitOxygen ? 'Suit oxygen low! Return to the habitat.' : 'Food is running low! Find supplies soon.'}</div>}
      <div className="touch-controls" aria-label="Touch game controls">
        <VirtualJoystick />
        <div className="touch-actions">{state.scene === 'chicken-hunt' ? <><button className="touch-action" type="button"
          onPointerDown={() => window.dispatchEvent(new CustomEvent('moonbound-arcade-fire', { detail: true }))}
          onPointerUp={() => window.dispatchEvent(new CustomEvent('moonbound-arcade-fire', { detail: false }))}
          onPointerCancel={() => window.dispatchEvent(new CustomEvent('moonbound-arcade-fire', { detail: false }))}>Hold to Fire</button>
          <button className="touch-exit" type="button" onClick={() => window.dispatchEvent(new Event('moonbound-arcade-return'))}>Return</button></>
          : <><button className="touch-action" type="button" onClick={() => {
          if (indoors && selected) document.querySelector<HTMLButtonElement>('.building-panel .menu-selected')?.click();
          else virtualInput('interact');
        }}>{indoors ? 'Choose' : 'Interact'}</button>
          {indoors && <button className="touch-exit" type="button" onClick={() => store.dispatch(state.astronaut.location === 'habitat' ? { type: 'LEAVE_HABITAT' }
            : state.astronaut.location === 'greenhouse' ? { type: 'LEAVE_GREENHOUSE' } : { type: 'LEAVE_SHELTER' })}>Exit (Q)</button>}
        </>}
        </div>
      </div>
      <footer className="status-strip"><span className="status-pip" /><span role="status" aria-live="polite">{notice}</span><button className="weather-toggle" type="button" onClick={() => { audioService.play(showWeather ? 'uiClose' : 'uiOpen'); setShowWeather(!showWeather); }} aria-expanded={showWeather}>☀ Space Weather</button><span className="status-hint">{state.scene === 'chicken-hunt' ? 'WASD / arrows to fly · Space to fire' : 'WASD / arrows to move · E enter/choose · Q exit'}</span></footer>
    </div><p className="demo-note">Illustrative game units and simulated hazards, not NASA measurements or a local radiation forecast. Solar output assumes a simplified illuminated workday.</p>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root application mount.');
createRoot(root).render(<App />);
