import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import Phaser from 'phaser';
import { GameSessionStore } from '../domain/store/GameSessionStore';
import { BootScene } from '../game/scenes/BootScene';
import { MoonBaseScene } from '../game/scenes/MoonBaseScene';
import { VIEW } from '../game/config/gameConfig';
import './style.css';

const store = new GameSessionStore();

function Meter({ label, icon, value, color }: { label: string; icon: string; value: number; color: string }) {
  return <div className="meter" aria-label={`${label}: ${Math.round(value)} of 100 game units`}>
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
  const notice = state.notices.at(-1)?.text ?? '';
  const virtualInput = (direction: string | null) => window.dispatchEvent(new CustomEvent('moonbound-input', { detail: direction }));
  return (
    <main className="app-shell"><div className="game-frame">
      <header className="masthead">
        <div className="brand"><span className="brand-star">✦</span><span>MOONBOUND</span><small>Survival Mission</small></div>
        <div className="mission-day"><span>MISSION DAY</span><strong>{state.day}<em>/ 5</em></strong></div>
        <button className="help-button" type="button" onClick={() => setShowHelp(!showHelp)} aria-expanded={showHelp}>? <span>How to play</span></button>
      </header>
      <div className="hud" aria-label="Colony supplies and astronaut health">
        <Meter label="Food" icon="▣" value={state.resources.food} color="#FFD75E" />
        <Meter label="Water" icon="◆" value={state.resources.water} color="#4EDCE5" />
        <Meter label="Oxygen" icon="◉" value={state.resources.oxygen} color="#80E5A0" />
        <Meter label="Energy" icon="ϟ" value={state.resources.energy} color="#B9A7F5" />
        <Meter label="Health" icon="✚" value={state.astronaut.health} color="#FF6B81" />
      </div>
      <div className="canvas-wrap"><GameContainer />
        {showHelp && <aside className="help-panel"><strong>Explore the base</strong><p>Move with WASD or arrow keys. Walk near a building and press E, or click it when close.</p><p>Visit all five buildings!</p><button type="button" onClick={() => setShowHelp(false)}>Got it</button></aside>}
      </div>
      <div className="touch-controls" aria-label="Touch game controls">
        <div className="touch-pad">
          {(['left', 'up', 'down', 'right'] as const).map((direction) => <button key={direction} type="button" aria-label={`Move ${direction}`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); virtualInput(direction); }} onPointerUp={() => virtualInput(null)} onPointerCancel={() => virtualInput(null)}>{({ left: '◀', right: '▶', up: '▲', down: '▼' })[direction]}</button>)}
        </div>
        <button className="touch-action" type="button" onClick={() => virtualInput('interact')}>Interact</button>
      </div>
      <footer className="status-strip"><span className="status-pip" /><span role="status" aria-live="polite">{notice}</span><span className="status-hint">WASD / arrows to move · E to interact</span></footer>
    </div><p className="demo-note">Feature 1 · Supplies are sample game values. Survival systems unlock in later features.</p>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root application mount.');
createRoot(root).render(<App />);
