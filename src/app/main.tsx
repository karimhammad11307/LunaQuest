import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import Phaser from 'phaser';
import { GameSessionStore } from '../domain/store/GameSessionStore';
import { BootScene } from '../game/scenes/BootScene';
import { MoonBaseScene } from '../game/scenes/MoonBaseScene';
import { VIEW } from '../game/config/gameConfig';
import { BALANCE } from '../game/config/balance';
import type { GameAction } from '../domain/models/GameAction';
import './style.css';

const store = new GameSessionStore();

function Meter({ label, icon, value, color, low = false, ariaLabel }: { label: string; icon: string; value: number; color: string; low?: boolean; ariaLabel?: string }) {
  return <div className={`meter${low ? ' meter-low' : ''}`} aria-label={`${ariaLabel ?? label}: ${Math.round(value)} of 100 game units`}>
    <span className="meter-icon" aria-hidden="true">{icon}</span>
    <span className="meter-data"><span className="meter-label">{label}</span><span className="meter-track"><span style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} /></span></span>
    <strong>{Math.round(value)}</strong>
  </div>;
}

function GameContainer() {
  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO, parent: 'game-canvas', width: VIEW.width, height: VIEW.height,
      backgroundColor: '#12172F', pixelArt: true, roundPixels: true,
      render: { antialias: false },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: VIEW.width, height: VIEW.height },
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: [new BootScene(), new MoonBaseScene(store)],
    });
    if (import.meta.env.DEV) Object.assign(window, { __moonboundGame: game, __moonboundStore: store });
    return () => {
      if (import.meta.env.DEV) Object.assign(window, { __moonboundGame: undefined, __moonboundStore: undefined });
      game.destroy(true);
    };
  }, []);
  return <div id="game-canvas" role="img" aria-label="Playable pixel-art Moon Base. Use WASD or arrow keys to move, and E to interact with buildings." />;
}

function App() {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const [showHelp, setShowHelp] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const notice = state.notices.at(-1)?.text ?? '';
  const selected = state.selectedBuildingId;
  const indoors = state.astronaut.location !== 'outside';
  const dispatch = (action: GameAction, rejected: string) => {
    const before = store.getState();
    const after = store.dispatch(action);
    setActionFeedback(after === before ? rejected : '');
  };
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { store.dispatch({ type: 'CLOSE_BUILDING' }); setActionFeedback(''); }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);
  const virtualInput = (direction: string | null) => window.dispatchEvent(new CustomEvent('moonbound-input', { detail: direction }));
  return (
    <main className="app-shell"><div className="game-frame">
      <header className="masthead">
        <div className="brand"><span className="brand-star">✦</span><span>MOONBOUND</span><small>Survival Mission</small></div>
        <div className="mission-day"><span>MISSION DAY</span><strong>{state.day}<em>/ {BALANCE.dayLimit}</em></strong></div>
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
      <div className="canvas-wrap"><GameContainer />
        {selected && state.status === 'playing' && <aside className="building-panel" aria-label={`${state.buildings[selected].type} controls`}>
          <div className="panel-head"><strong>{({ habitat: 'HABITAT', greenhouse: 'GREENHOUSE', solar: 'SOLAR ARRAY', shield: 'RADIATION SHELTER', landingPad: 'LANDING PAD' } as Record<string, string>)[selected]}</strong><button type="button" aria-label="Close building controls" onClick={() => { store.dispatch({ type: 'CLOSE_BUILDING' }); setActionFeedback(''); }}>×</button></div>
          {selected === 'habitat' && <>
            <p>{indoors ? 'Inside your safe home.' : 'Step inside to eat, rest and refill.'}</p>
            {state.astronaut.location === 'outside' ? <button type="button" onClick={() => dispatch({ type: 'ENTER_HABITAT' }, 'Move closer to the habitat.')}>Enter Habitat</button> : <>
              <button type="button" onClick={() => dispatch({ type: 'REFILL_SUIT_OXYGEN' }, 'Suit full or base oxygen empty!')}>Refill Suit O₂ <small>uses base O₂</small></button>
              <button type="button" onClick={() => dispatch({ type: 'EAT_FOOD' }, 'Need food and missing health to eat.')}>Eat Food <small>−{BALANCE.habitat.eatFoodCost} food · +{BALANCE.habitat.eatHealAmount} HP</small></button>
              <button type="button" onClick={() => dispatch({ type: 'REST_AT_HABITAT' }, 'Need supplies and missing health to rest.')}>Rest / Recover <small>−{BALANCE.habitat.healFoodCost} food · −{BALANCE.habitat.healWaterCost} water · −{BALANCE.habitat.healEnergyCost} energy</small></button>
              <button className="advance-button" type="button" onClick={() => dispatch({ type: 'ADVANCE_DAY' }, 'Cannot advance the day now.')}>Advance Day →</button>
              <button type="button" onClick={() => dispatch({ type: 'LEAVE_HABITAT' }, 'Already outside.')}>Leave Habitat</button>
            </>}
            <p className="science-note">The habitat uses stored oxygen and power to keep the crew safe.</p>
          </>}
          {selected === 'greenhouse' && <><p>Plants are growing soon! Farming unlocks in Feature 4.</p><p className="science-note">Real plants need water, light and a controlled home.</p></>}
          {selected === 'solar' && <><p>Stored energy: {Math.round(state.resources.energy)} / 100</p><p className="science-note">Solar panels turn sunlight into electrical power. Production arrives in Feature 4.</p></>}
          {selected === 'shield' && <><p>{state.astronaut.location === 'shelter' ? 'Protected inside the shelter.' : 'A safe place during outside hazards.'}</p>{state.astronaut.location === 'shelter' ? <button type="button" onClick={() => dispatch({ type: 'LEAVE_SHELTER' }, 'Already outside.')}>Leave Shelter</button> : <button type="button" onClick={() => dispatch({ type: 'ENTER_SHELTER' }, 'Move closer to the shelter.')}>Enter Shelter</button>}<p className="science-note">Protection requires power; solar hazard events arrive later.</p></>}
          {selected === 'landingPad' && <><p>Supply missions are preparing for launch.</p><button type="button" disabled>Chicken Hunt · Coming Soon</button><button type="button" disabled>Ice Collection · Coming Soon</button><p className="science-note">Mission rewards will return through the shared mission result system.</p></>}
          {actionFeedback && <p className="action-feedback" role="alert">{actionFeedback}</p>}
        </aside>}
        {state.status !== 'playing' && <aside className="result-panel" aria-label="Mission result"><strong>{state.status === 'victory' ? 'MISSION COMPLETE!' : 'GAME OVER'}</strong><p>{state.status === 'victory' ? 'You kept the crew safe for five complete days!' : 'Your astronaut needs another try.'}</p><p>Days survived: {state.daysSurvived} / {BALANCE.dayLimit}</p><button type="button" onClick={() => { store.dispatch({ type: 'RESTART_GAME' }); setActionFeedback(''); }}>Restart Mission</button></aside>}
        {showHelp && <aside className="help-panel"><strong>Explore the base</strong><p>Move with WASD or arrow keys. Walk near a building and press E, or click it when close.</p><p>Enter the habitat to eat, refill your suit and advance the day. Keep the crew safe for five days!</p><button type="button" onClick={() => setShowHelp(false)}>Got it</button></aside>}
      </div>
      {state.lastDaySummary && state.status === 'playing' && <div className="day-summary" role="status">Day {state.lastDaySummary.day} survived · Food −{state.lastDaySummary.food} · Water −{state.lastDaySummary.water} · Base O₂ −{state.lastDaySummary.oxygen} · Energy −{state.lastDaySummary.energy}{state.lastDaySummary.warnings.length > 0 && <strong> · {state.lastDaySummary.warnings.join(' ')}</strong>}</div>}
      {state.status === 'playing' && (state.resources.food <= BALANCE.warnings.food || state.astronaut.suitOxygen <= BALANCE.warnings.suitOxygen) && <div className="survival-warning" role="alert">{state.astronaut.suitOxygen <= BALANCE.warnings.suitOxygen ? 'Suit oxygen low! Return to the habitat.' : 'Food is running low! Find supplies soon.'}</div>}
      <div className="touch-controls" aria-label="Touch game controls">
        <div className="touch-pad">
          {(['left', 'up', 'down', 'right'] as const).map((direction) => <button key={direction} type="button" aria-label={`Move ${direction}`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); virtualInput(direction); }} onPointerUp={() => virtualInput(null)} onPointerCancel={() => virtualInput(null)}>{({ left: '◀', right: '▶', up: '▲', down: '▼' })[direction]}</button>)}
        </div>
        <button className="touch-action" type="button" onClick={() => virtualInput('interact')}>Interact</button>
      </div>
      <footer className="status-strip"><span className="status-pip" /><span role="status" aria-live="polite">{notice}</span><span className="status-hint">WASD / arrows to move · E to interact</span></footer>
    </div><p className="demo-note">Illustrative game units, not NASA measurements. Supply missions and production arrive in later features.</p>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root application mount.');
createRoot(root).render(<App />);
