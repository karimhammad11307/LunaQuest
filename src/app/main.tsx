import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import Phaser from 'phaser';
import { GameSessionStore } from '../domain/store/GameSessionStore';
import { BootScene } from '../game/scenes/BootScene';
import { MoonBaseScene } from '../game/scenes/MoonBaseScene';
import { ChickenHuntScene } from '../game/scenes/ChickenHuntScene';
import { VIEW } from '../game/config/gameConfig';
import type { GameAction } from '../domain/models/GameAction';
import type { MissionResult } from '../domain/models/types';
import './style.css';

const store = new GameSessionStore();

type GameMode = 'base' | 'chicken-hunt';

function Meter({ label, icon, value, color }: { label: string; icon: string; value: number; color: string }) {
  return (
    <div className="meter" aria-label={`${label}: ${Math.round(value)} of 100 game units`}>
      <span className="meter-icon" aria-hidden="true">{icon}</span>
      <span className="meter-data">
        <span className="meter-label">{label}</span>
        <span className="meter-track">
          <span style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
        </span>
      </span>
      <strong>{Math.round(value)}</strong>
    </div>
  );
}

interface GameCanvasProps {
  mode: GameMode;
  onMissionComplete: (result: MissionResult) => void;
}

function GameCanvas({ mode, onMissionComplete }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let game: Phaser.Game | null = null;

    if (mode === 'base') {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: VIEW.width,
        height: VIEW.height,
        backgroundColor: '#12172F',
        pixelArt: true,
        roundPixels: true,
        render: { antialias: false },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: VIEW.width,
          height: VIEW.height,
        },
        physics: {
          default: 'arcade',
          arcade: { debug: false },
        },
        scene: [new BootScene(), new MoonBaseScene(store)],
      });
    } else {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: VIEW.width,
        height: VIEW.height,
        backgroundColor: '#12172F',
        pixelArt: true,
        roundPixels: true,
        render: { antialias: false },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: VIEW.width,
          height: VIEW.height,
        },
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },
        callbacks: {
          postBoot: (bootGame) => {
            bootGame.scene.add('ChickenHuntScene', ChickenHuntScene, true, {
              runId: `run-${Date.now()}`,
              difficulty: 1.0,
              dispatch: (action: GameAction) => {
                if (action.type === 'COMPLETE_MISSION') {
                  store.dispatch(action);
                  onMissionComplete(action.result);
                }
              },
            });
          },
        },
      });
    }

    if (import.meta.env.DEV) {
      Object.assign(window, { __moonboundGame: game, __moonboundStore: store });
    }

    return () => {
      if (import.meta.env.DEV) {
        Object.assign(window, { __moonboundGame: undefined, __moonboundStore: undefined });
      }
      if (game) {
        game.destroy(true);
        game = null;
      }
    };
  }, [mode, onMissionComplete]);

  return <div ref={containerRef} id="game-canvas" role="img" aria-label="Moonbound game canvas" />;
}

function App() {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const [mode, setMode] = useState<GameMode>('base');
  const [showHelp, setShowHelp] = useState(false);
  const [missionResult, setMissionResult] = useState<MissionResult | null>(null);

  const notice = state.notices.at(-1)?.text ?? '';
  const virtualInput = (direction: string | null) => {
    window.dispatchEvent(new CustomEvent('moonbound-input', { detail: direction }));
  };

  const handleStartMission = () => {
    setMissionResult(null);
    setMode('chicken-hunt');
  };

  const handleReturnToBase = () => {
    setMissionResult(null);
    setMode('base');
  };

  return (
    <main className="app-shell">
      <div className="game-frame">
        <header className="masthead">
          <div className="brand">
            <span className="brand-star">✦</span>
            <span>MOONBOUND</span>
            <small>Survival Mission</small>
          </div>

          <div style={{ display: 'flex', gap: 6, margin: '0 auto' }}>
            <button
              type="button"
              onClick={handleReturnToBase}
              style={{
                background: mode === 'base' ? '#4EDCE5' : '#1B2145',
                color: mode === 'base' ? '#12172F' : '#D6D1E6',
                border: '1px solid #4EDCE5',
                padding: '4px 10px',
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: 'bold',
                cursor: 'pointer',
                borderRadius: 3,
              }}
            >
              🌕 Moon Base
            </button>
            <button
              type="button"
              onClick={handleStartMission}
              style={{
                background: mode === 'chicken-hunt' ? '#FFD75E' : '#1B2145',
                color: mode === 'chicken-hunt' ? '#12172F' : '#D6D1E6',
                border: '1px solid #FFD75E',
                padding: '4px 10px',
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: 'bold',
                cursor: 'pointer',
                borderRadius: 3,
              }}
            >
              🚀 Chicken Hunt (Arcade)
            </button>
          </div>

          <div className="mission-day">
            <span>MISSION DAY</span>
            <strong>{state.day}<em>/ 5</em></strong>
          </div>

          <button className="help-button" type="button" onClick={() => setShowHelp(!showHelp)} aria-expanded={showHelp}>
            ? <span>How to play</span>
          </button>
        </header>

        {/* Dev A HUD with live colony supplies & astronaut health */}
        <div className="hud" aria-label="Colony supplies and astronaut health">
          <Meter label="Food" icon="▣" value={state.resources.food} color="#FFD75E" />
          <Meter label="Water" icon="◆" value={state.resources.water} color="#4EDCE5" />
          <Meter label="Oxygen" icon="◉" value={state.resources.oxygen} color="#80E5A0" />
          <Meter label="Energy" icon="ϟ" value={state.resources.energy} color="#B9A7F5" />
          <Meter label="Health" icon="✚" value={state.astronaut.health} color="#FF6B81" />
        </div>

        <div className="canvas-wrap" style={{ position: 'relative' }}>
          <GameCanvas mode={mode} onMissionComplete={setMissionResult} />

          {/* Help Overlay */}
          {showHelp && (
            <aside className="help-panel">
              <strong>{mode === 'base' ? 'Explore Moon Base' : 'Chicken Hunt Controls'}</strong>
              {mode === 'base' ? (
                <>
                  <p>Walk with <strong>WASD</strong> or arrow keys. Press <strong>E</strong> near buildings to interact.</p>
                  <p>Click <strong>🚀 Chicken Hunt</strong> above or visit the Landing Pad to launch an arcade supply run!</p>
                </>
              ) : (
                <>
                  <p>Move your spacecraft with <strong>WASD</strong> or <strong>arrow keys</strong>.</p>
                  <p>Fire lasers with <strong>Spacebar</strong> to defeat alien birds.</p>
                  <p>Collect fallen food crates (they magnetically attract toward your ship!).</p>
                  <p>Survive 35s or click <strong>[RETURN TO BASE]</strong> in the top-right corner to bank your food!</p>
                </>
              )}
              <button type="button" onClick={() => setShowHelp(false)}>Got it</button>
            </aside>
          )}

          {/* Mission Result Overlay */}
          {missionResult && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(18, 23, 47, 0.88)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                padding: 24,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  background: '#1B2145',
                  border: `3px solid ${missionResult.returnedSafely ? '#80E5A0' : '#FF6B81'}`,
                  borderRadius: 8,
                  padding: '20px 28px',
                  maxWidth: 440,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}
              >
                <h2
                  style={{
                    margin: '0 0 12px',
                    fontSize: 18,
                    letterSpacing: '.08em',
                    color: missionResult.returnedSafely ? '#80E5A0' : '#FF6B81',
                  }}
                >
                  {missionResult.returnedSafely ? '✦ MISSION COMPLETE — SAFE RETURN ✦' : '⚠ SHIP DAMAGED — RETURNED TO BASE ⚠'}
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 0', fontSize: 13 }}>
                  <div style={{ background: '#12172F', padding: '8px 12px', borderRadius: 4, border: '1px solid #5A5678' }}>
                    <div style={{ color: '#D6D1E6', fontSize: 11 }}>FOOD BANKED</div>
                    <strong style={{ color: '#FFD75E', fontSize: 16 }}>+{missionResult.collectedResources.food ?? 0} units</strong>
                  </div>
                  <div style={{ background: '#12172F', padding: '8px 12px', borderRadius: 4, border: '1px solid #5A5678' }}>
                    <div style={{ color: '#D6D1E6', fontSize: 11 }}>HULL REPAIR</div>
                    <strong style={{ color: '#FF6B81', fontSize: 16 }}>-{missionResult.healthDamage} HP</strong>
                  </div>
                </div>

                <div style={{ color: '#80E5A0', fontSize: 12, marginBottom: 12 }}>
                  XP Earned: <strong>+{missionResult.xpEarned} XP</strong> · Duration: {missionResult.duration}s
                </div>

                <p style={{ margin: '8px 0 16px', fontSize: 12, fontStyle: 'italic', color: '#4EDCE5', lineHeight: 1.4 }}>
                  "{missionResult.educationalMessage}"
                </p>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={handleReturnToBase}
                    style={{
                      padding: '8px 18px',
                      background: '#80E5A0',
                      color: '#12172F',
                      border: 'none',
                      borderRadius: 4,
                      fontWeight: 'bold',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Return to Moon Base
                  </button>
                  <button
                    type="button"
                    onClick={handleStartMission}
                    style={{
                      padding: '8px 18px',
                      background: '#4EDCE5',
                      color: '#12172F',
                      border: 'none',
                      borderRadius: 4,
                      fontWeight: 'bold',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Play Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Touch controls for mobile / pointer */}
        <div className="touch-controls" aria-label="Touch game controls">
          <div className="touch-pad">
            {(['left', 'up', 'down', 'right'] as const).map((direction) => (
              <button
                key={direction}
                type="button"
                aria-label={`Move ${direction}`}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  virtualInput(direction);
                }}
                onPointerUp={() => virtualInput(null)}
                onPointerCancel={() => virtualInput(null)}
              >
                {({ left: '◀', right: '▶', up: '▲', down: '▼' })[direction]}
              </button>
            ))}
          </div>
          <button className="touch-action" type="button" onClick={() => virtualInput('interact')}>
            Interact
          </button>
        </div>

        <footer className="status-strip">
          <span className="status-pip" />
          <span role="status" aria-live="polite">
            {mode === 'base' ? notice : 'Chicken Hunt: Shoot birds, harvest food crates, survive 35s or click [RETURN TO BASE]!'}
          </span>
          <span className="status-hint">
            {mode === 'base' ? 'WASD / arrows to move · E to interact' : 'WASD to fly · Space to shoot'}
          </span>
        </footer>
      </div>

      <p className="demo-note">
        Moonbound · NASA Space Apps Challenge 2026 · Integrated Dev A Base & Dev B Arcade Mission
      </p>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root application mount.');
createRoot(root).render(<App />);
