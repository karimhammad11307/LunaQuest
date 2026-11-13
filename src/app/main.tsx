import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import Phaser from 'phaser';
import { GameSessionStore } from '../domain/store/GameSessionStore';
import { BootScene } from '../game/scenes/BootScene';
import { MoonBaseScene } from '../game/scenes/MoonBaseScene';
import { ChickenHuntScene } from '../game/scenes/ChickenHuntScene';
import { MISSION_CONFIG, VIEW } from '../game/config/gameConfig';
import { BALANCE } from '../game/config/balance';
import type { GameAction } from '../domain/models/GameAction';
import type { GameSceneId } from '../domain/models/types';
import { solarYieldForDay } from '../domain/rules/survivalRules';
import { NASAWeatherService } from '../services/NASAWeatherService';
import { SaveService } from '../services/SaveService';
import './style.css';

const store = new GameSessionStore();
const weatherService = new NASAWeatherService({ apiKey: import.meta.env.VITE_NASA_API_KEY });
const saveService = new SaveService();
const savedAtStartup = saveService.load();

function Meter({ label, icon, value, color, low = false, ariaLabel }: { label: string; icon: string; value: number; color: string; low?: boolean; ariaLabel?: string }) {
  return <div className={`meter${low ? ' meter-low' : ''}`} aria-label={`${ariaLabel ?? label}: ${Math.round(value)} of 100 game units`}>
    <span className="meter-icon" aria-hidden="true">{icon}</span>
    <span className="meter-data"><span className="meter-label">{label}</span><span className="meter-track"><span style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} /></span></span>
    <strong>{Math.round(value)}</strong>
  </div>;
}

function GameContainer({ sceneId, runId, paused }: { sceneId: GameSceneId; runId: string | null; paused: boolean }) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const launchedRunId = useRef<string | null>(null);
  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO, parent: 'game-canvas', width: VIEW.width, height: VIEW.height,
      backgroundColor: '#12172F', pixelArt: true, roundPixels: true,
      render: { antialias: false },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: VIEW.width, height: VIEW.height },
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: [new BootScene(), new MoonBaseScene(store), new ChickenHuntScene()],
    });
    gameRef.current = game;
    if (import.meta.env.DEV) Object.assign(window, { __moonboundGame: game, __moonboundStore: store });
    return () => {
      if (import.meta.env.DEV) Object.assign(window, { __moonboundGame: undefined, __moonboundStore: undefined });
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    if (sceneId === 'chicken-hunt' && runId) {
      if (launchedRunId.current !== runId) {
        launchedRunId.current = runId;
        game.scene.stop('MoonBaseScene');
        game.scene.start('ChickenHuntScene', { runId, difficulty: 1, dispatch: store.dispatch });
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
  const [sessionReady, setSessionReady] = useState(!savedAtStartup);
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const [showWeather, setShowWeather] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [dismissedMissionRunId, setDismissedMissionRunId] = useState<string | null>(null);
  const weatherRequest = useRef(0);
  useEffect(() => {
    if (!sessionReady) return;
    const detach = saveService.attach(store);
    saveService.save(store.getState());
    return detach;
  }, [sessionReady]);
  const notice = state.notices.at(-1)?.text ?? '';
  const selected = state.selectedBuildingId;
  const building = selected ? state.buildings[selected] : null;
  const indoors = state.astronaut.location !== 'outside';
  const emergency = state.activeEvent;
  const missionSummary = state.status === 'playing' && state.lastMissionResult?.runId !== dismissedMissionRunId ? state.lastMissionResult : null;
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
  const dispatch = (action: GameAction, rejected: string) => {
    const before = store.getState();
    const after = store.dispatch(action);
    setActionFeedback(after === before ? rejected : '');
  };
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (!sessionReady) return;
      const current = store.getState();
      if (showHelp) setShowHelp(false);
      else if (current.paused) store.dispatch({ type: 'SET_PAUSED', paused: false });
      else if (current.selectedBuildingId) { store.dispatch({ type: 'CLOSE_BUILDING' }); setActionFeedback(''); }
      else store.dispatch({ type: 'SET_PAUSED', paused: true });
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [showHelp, sessionReady]);
  const virtualInput = (direction: string | null) => window.dispatchEvent(new CustomEvent('moonbound-input', { detail: direction }));
  const startNewGame = () => {
    saveService.clear();
    store.dispatch({ type: 'RESTART_GAME' });
    saveService.save(store.getState());
    setSessionReady(true);
  };
  const continueGame = () => {
    const restored = saveService.load();
    if (!restored) { startNewGame(); return; }
    store.dispatch({ type: 'LOAD_GAME', state: restored });
    setSessionReady(true);
  };
  if (!sessionReady) return <main className="app-shell"><div className="game-frame"><header className="masthead"><div className="brand"><span className="brand-star">✦</span><span>MOONBOUND</span><small>Survival Mission</small></div></header><div className="save-start"><div className="save-start-panel"><strong>{confirmNewGame ? 'START A NEW MISSION?' : 'WELCOME BACK, ASTRONAUT!'}</strong><p>Day {savedAtStartup?.day} · Food {Math.round(savedAtStartup?.resources.food ?? 0)} · XP {savedAtStartup?.xp}</p>{confirmNewGame ? <><p>Your saved progress will be replaced.</p><button type="button" onClick={startNewGame}>Replace Save &amp; Start</button><button type="button" onClick={() => setConfirmNewGame(false)}>Keep Saved Game</button></> : <><p>Your Moon Base is waiting.</p><button type="button" onClick={continueGame}>Continue Game</button><button type="button" onClick={() => setConfirmNewGame(true)}>New Game</button><small>New Game replaces this saved mission.</small></>}</div></div></div></main>;
  return (
    <main className="app-shell"><div className="game-frame">
      <header className="masthead">
        <div className="brand"><span className="brand-star">✦</span><span>MOONBOUND</span><small>Survival Mission</small></div>
        <div className="mission-day"><span>MISSION DAY</span><strong>{state.day}<em>/ {BALANCE.dayLimit}</em></strong></div>
        <span className="xp-counter" aria-label={`${state.xp} experience points`}>XP {state.xp}</span>
        <button className="pause-button" type="button" disabled={state.status !== 'playing'} onClick={() => { store.dispatch({ type: 'SET_PAUSED', paused: !state.paused }); setShowHelp(false); }}>{state.paused ? 'Resume' : 'Pause'}</button>
        <button className="help-button" type="button" onClick={() => setShowHelp(!showHelp)} aria-expanded={showHelp}>? <span>How to play</span></button>
      </header>
      <div className="hud" aria-label="Colony supplies and astronaut health">
        <Meter label="Food" icon="▣" value={state.resources.food} color="#FFD75E" low={state.resources.food <= BALANCE.warnings.food} />
        <Meter label="Water" icon="◆" value={state.resources.water} color="#4EDCE5" low={state.resources.water <= BALANCE.warnings.water} />
        <Meter label="Base O₂" ariaLabel="Oxygen" icon="◉" value={state.resources.oxygen} color="#80E5A0" low={state.resources.oxygen <= BALANCE.warnings.oxygen} />
        <Meter label="Suit O₂" icon="◉" value={state.astronaut.suitOxygen} color="#4EDCE5" low={state.astronaut.suitOxygen <= BALANCE.warnings.suitOxygen} />
        <Meter label="Energy" icon="ϟ" value={state.resources.energy} color="#B9A7F5" low={state.resources.energy <= BALANCE.warnings.energy} />
        <Meter label="Health" icon="✚" value={state.astronaut.health} color="#FF6B81" low={state.astronaut.health <= BALANCE.warnings.health} />
      </div>
      <div className="canvas-wrap"><GameContainer sceneId={state.scene} runId={state.activeMissionRunId} paused={state.paused} />
        {showWeather && <aside className="weather-panel" aria-label="NASA space weather information">
          <div className="panel-head"><strong>☀ SPACE WEATHER</strong><button type="button" aria-label="Close space weather" onClick={() => setShowWeather(false)}>×</button></div>
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
        {selected && building && state.status === 'playing' && <aside className="building-panel" aria-label={`${building.type} controls`}>
          <div className="panel-head"><strong>{({ habitat: 'HABITAT', greenhouse: 'GREENHOUSE', solar: 'SOLAR ARRAY', shield: 'RADIATION SHELTER', landingPad: 'LANDING PAD' } as Record<string, string>)[selected]}</strong><button type="button" aria-label="Close building controls" onClick={() => { store.dispatch({ type: 'CLOSE_BUILDING' }); setActionFeedback(''); }}>×</button></div>
          <p className={`building-condition condition-${building.condition}`}>STATUS: {building.condition === 'good' ? 'OPERATIONAL' : building.condition.toUpperCase()}</p>
          {selected === 'habitat' && <>
            {emergency?.type === 'oxygen-leak' && <p className="emergency-building-note">Oxygen is leaking! Repair this habitat or isolate the section.</p>}
            <p>{indoors ? 'Inside your safe home.' : 'Step inside to eat, rest and refill.'}</p>
            {state.astronaut.location === 'outside' ? <button type="button" onClick={() => dispatch({ type: 'ENTER_HABITAT' }, 'Move closer to the habitat.')}>Enter Habitat</button> : <>
              <button type="button" onClick={() => dispatch({ type: 'REFILL_SUIT_OXYGEN' }, 'Suit full or base oxygen empty!')}>Refill Suit O₂ <small>uses base O₂</small></button>
              <button type="button" onClick={() => dispatch({ type: 'EAT_FOOD' }, 'Need food and missing health to eat.')}>Eat Food <small>−{BALANCE.habitat.eatFoodCost} food · +{BALANCE.habitat.eatHealAmount} HP</small></button>
              <button type="button" onClick={() => dispatch({ type: 'REST_AT_HABITAT' }, 'Need supplies and missing health to rest.')}>Rest / Recover <small>−{BALANCE.habitat.healFoodCost} food · −{BALANCE.habitat.healWaterCost} water · −{BALANCE.habitat.healEnergyCost} energy</small></button>
              <p className="day-forecast">Next day: −{BALANCE.daily.food} food · −{BALANCE.daily.water} water · −{BALANCE.daily.oxygen} base O₂ · −{BALANCE.daily.energy} energy. Solar may recharge the battery.</p>
              <button className="advance-button" type="button" onClick={() => dispatch({ type: 'ADVANCE_DAY' }, emergency ? 'Resolve the emergency before advancing.' : 'Cannot advance the day now.')}>Advance Day →</button>
              <button type="button" onClick={() => dispatch({ type: 'LEAVE_HABITAT' }, 'Already outside.')}>Leave Habitat</button>
            </>}
            <p className="science-note">The habitat uses stored oxygen and power to keep the crew safe.</p>
          </>}
          {selected === 'greenhouse' && <>
            <p className="crop-status">CROP: {building.cropPlanted ? building.cropGrowth >= 1 ? 'READY TO HARVEST' : 'SEEDS GROWING' : 'EMPTY BEDS'}</p>
            {!building.cropPlanted ? <button type="button" onClick={() => dispatch({ type: 'PLANT_CROP' }, 'Need water, energy and working greenhouse to plant.')}>Plant Seeds <small>−{BALANCE.greenhouse.waterCost} water · −{BALANCE.greenhouse.energyCost} energy</small></button>
              : building.cropGrowth >= 1 ? <button type="button" onClick={() => dispatch({ type: 'HARVEST_CROP' }, 'Storage is full or greenhouse needs repair.')}>Harvest Crop <small>up to +{BALANCE.greenhouse.foodYield} food · +{BALANCE.greenhouse.oxygenYield} base O₂ · +{BALANCE.xp.supplies} XP</small></button>
                : <p>Seed → Sprout → Ready after one day.</p>}
            <p className="science-note">Plants need water, light and power. Harvested food fills storage; eat at the habitat to heal.</p>
          </>}
          {selected === 'solar' && <><p>Stored energy: {Math.round(state.resources.energy)} / 100</p><p className="production-status">Next day: +{solarYieldForDay(building)} energy in simplified daylight.</p><p>Last day: +{state.lastDaySummary?.energyProduced ?? 0} energy stored.</p><p className="science-note">Damaged panels make less power; broken panels make none. Battery capacity is 100.</p></>}
          {selected === 'shield' && <><p>{state.astronaut.location === 'shelter' ? 'Protected inside the shelter.' : 'A safe place during outside hazards.'}</p><p className="shield-status">SHIELD: {building.active && state.resources.energy > 0 ? 'ACTIVE' : 'OFF'}</p><button type="button" onClick={() => dispatch({ type: 'ACTIVATE_SHIELD', active: !building.active }, 'Not enough energy or shield needs repair!')}>{building.active ? 'Switch Shield Off' : 'Activate Shield'} <small>{building.active ? 'no energy refund' : `−${BALANCE.shield.activationEnergy} energy · −${BALANCE.shield.dailyEnergyUpkeep} per day`}</small></button>{state.astronaut.location === 'shelter' ? <button type="button" onClick={() => dispatch({ type: 'LEAVE_SHELTER' }, 'Already outside.')}>Leave Shelter</button> : <button type="button" onClick={() => dispatch({ type: 'ENTER_SHELTER' }, 'Move closer to the shelter.')}>Enter Shelter</button>}<p className="science-note">Shelter and the powered shield protect against simulated radiation. The shield covers the nearby base only.</p></>}
          {selected === 'landingPad' && <><p>Fly Chicken Hunt to collect food for the colony.</p><button className="mission-launch-button" type="button" onClick={() => dispatch({ type: 'START_MISSION', mission: 'chicken-hunt', runId: `chicken-${crypto.randomUUID()}` }, 'Need energy or finish the emergency first.')}>Launch Chicken Hunt <small>−{MISSION_CONFIG['chicken-hunt'].energyCost} energy · WASD / arrows to fly · Space to fire</small></button><button type="button" disabled>Ice Collection · Coming Soon</button><p className="science-note">Food is banked only after a safe, successful return. Eat it at the habitat to restore HP.</p></>}
          {building.condition !== 'good' && <button className="repair-button" type="button" onClick={() => dispatch({ type: 'REPAIR_BUILDING', buildingId: selected }, 'Need energy to repair.')}>Repair {building.type} <small>−{BALANCE.repair.energyCost} energy</small></button>}
          {actionFeedback && <p className="action-feedback" role="alert">{actionFeedback}</p>}
        </aside>}
        {state.status !== 'playing' && <aside className="result-panel" aria-label="Mission result"><strong>{state.status === 'victory' ? 'MISSION COMPLETE!' : 'GAME OVER'}</strong><p>{state.status === 'victory' ? 'You kept the crew safe for five complete days!' : 'Your astronaut needs another try.'}</p><p>Days survived: {state.daysSurvived} / {BALANCE.dayLimit}</p><button type="button" onClick={() => { store.dispatch({ type: 'RESTART_GAME' }); setActionFeedback(''); }}>Restart Mission</button></aside>}
        {missionSummary && <aside className="mission-summary" aria-label="Chicken Hunt mission summary"><strong>{missionSummary.success && missionSummary.returnedSafely ? 'SUPPLIES DELIVERED!' : 'MISSION ENDED'}</strong><p>{missionSummary.educationalMessage}</p><p>Food +{missionSummary.collectedResources.food ?? 0} · XP +{missionSummary.xpEarned} · Health −{missionSummary.healthDamage}</p><button type="button" onClick={() => setDismissedMissionRunId(missionSummary.runId)}>Back to Moon Base</button></aside>}
        {state.paused && state.status === 'playing' && <aside className="pause-panel" aria-label="Game paused"><strong>PAUSED</strong><p>Take your time. Health and suit oxygen are safe while paused.</p><button type="button" onClick={() => store.dispatch({ type: 'SET_PAUSED', paused: false })}>Resume Mission</button></aside>}
        {showHelp && <aside className="help-panel"><strong>{state.scene === 'chicken-hunt' ? 'Chicken Hunt' : 'Explore the base'}</strong>{state.scene === 'chicken-hunt' ? <><p>Fly with WASD or arrow keys. Press Space to fire at alien birds and collect food drops.</p><p>Return to base before your ship is damaged. Food is stored when your mission succeeds.</p></> : <><p>Move with WASD or arrow keys. Walk near a building and press E, or click it when close.</p><p>Health slowly falls during active play. Eat stored food at the habitat to recover. Pause when you need a break.</p><p>Keep the crew safe for five days!</p></>}<button type="button" onClick={() => setShowHelp(false)}>Got it</button></aside>}
      </div>
      {state.lastDaySummary && state.status === 'playing' && <div className="day-summary" role="status">Day {state.lastDaySummary.day} survived · Food −{state.lastDaySummary.food} · Water −{state.lastDaySummary.water} · Base O₂ −{state.lastDaySummary.oxygen} · Energy −{state.lastDaySummary.energy} / +{state.lastDaySummary.energyProduced} solar{state.lastDaySummary.shieldEnergyUsed > 0 && <> · Shield −{state.lastDaySummary.shieldEnergyUsed}</>}{state.lastDaySummary.warnings.length > 0 && <strong> · {state.lastDaySummary.warnings.join(' ')}</strong>}</div>}
      {state.status === 'playing' && (state.resources.food <= BALANCE.warnings.food || state.astronaut.suitOxygen <= BALANCE.warnings.suitOxygen) && <div className="survival-warning" role="alert">{state.astronaut.suitOxygen <= BALANCE.warnings.suitOxygen ? 'Suit oxygen low! Return to the habitat.' : 'Food is running low! Find supplies soon.'}</div>}
      <div className="touch-controls" aria-label="Touch game controls">
        <div className="touch-pad">
          {(['left', 'up', 'down', 'right'] as const).map((direction) => <button key={direction} type="button" aria-label={`Move ${direction}`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); virtualInput(direction); }} onPointerUp={() => virtualInput(null)} onPointerCancel={() => virtualInput(null)}>{({ left: '◀', right: '▶', up: '▲', down: '▼' })[direction]}</button>)}
        </div>
        <button className="touch-action" type="button" onClick={() => virtualInput('interact')}>Interact</button>
      </div>
      <footer className="status-strip"><span className="status-pip" /><span role="status" aria-live="polite">{notice}</span><button className="weather-toggle" type="button" onClick={() => setShowWeather(!showWeather)} aria-expanded={showWeather}>☀ Space Weather</button><span className="status-hint">{state.scene === 'chicken-hunt' ? 'WASD / arrows to fly · Space to fire' : 'WASD / arrows to move · E to interact'}</span></footer>
    </div><p className="demo-note">Illustrative game units and simulated hazards, not NASA measurements or a local radiation forecast. Solar output assumes a simplified illuminated workday.</p>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root application mount.');
createRoot(root).render(<App />);
