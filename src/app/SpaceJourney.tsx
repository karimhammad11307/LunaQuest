import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { VIEW } from '../game/config/gameConfig';
import { JOURNEY_STAGES } from '../game/config/journey';
import { SpaceJourneyScene } from '../game/scenes/SpaceJourneyScene';
import type { AudioService } from '../services/AudioService';

/** The cinematic owns a Phaser instance only while the playable Moon Base is unmounted. */
export function SpaceJourney({ audio, onFinished }: { audio: AudioService; onFinished: () => void }) {
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const gameRef = useRef<Phaser.Game | null>(null);
  const completed = useRef(false);
  const userPaused = useRef(false);
  const finishRef = useRef(onFinished);
  finishRef.current = onFinished;

  const finish = () => {
    if (completed.current) return;
    completed.current = true;
    audio.setJourneyActive(false);
    finishRef.current();
  };

  useEffect(() => {
    audio.setJourneyActive(true);
    const scene = new SpaceJourneyScene({ complete: finish, stage: setStage,
      cue: (cue) => audio.play(cue), reducedMotion });
    try {
      const game = new Phaser.Game({
        type: Phaser.AUTO, parent: 'journey-canvas', width: VIEW.width, height: VIEW.height,
        backgroundColor: '#12172F', pixelArt: true, roundPixels: true,
        render: { antialias: false },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH,
          width: VIEW.width, height: VIEW.height },
        scene: [scene],
      });
      gameRef.current = game;
      if (import.meta.env.DEV) Object.assign(window, { __lunaquestJourney: game });
    } catch { finish(); }
    // Phaser's first refresh after a viewport change can still use the old
    // parentSize. Observe the actual stage size and refresh on the next frame.
    let resizeFrame = 0;
    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        const scale = gameRef.current?.scale;
        if (!scale) return;
        scale.getParentBounds();
        scale.refresh();
      });
    });
    const canvasParent = document.getElementById('journey-canvas');
    if (canvasParent) resizeObserver.observe(canvasParent);
    const onVisibility = () => {
      const game = gameRef.current;
      if (!game) return;
      if (document.hidden) game.scene.pause('SpaceJourneyScene');
      else if (!userPaused.current && game.scene.isPaused('SpaceJourneyScene')) game.scene.resume('SpaceJourneyScene');
      audio.setJourneyPaused(document.hidden || userPaused.current);
    };
    document.addEventListener('visibilitychange', onVisibility);
    let activeWatchdogMs = 0;
    const fallback = window.setInterval(() => {
      if (!document.hidden && !userPaused.current) activeWatchdogMs += 250;
      if (activeWatchdogMs >= (reducedMotion ? 2200 : 15_000)) finish();
    }, 250);
    return () => {
      window.clearInterval(fallback);
      resizeObserver.disconnect();
      window.cancelAnimationFrame(resizeFrame);
      document.removeEventListener('visibilitychange', onVisibility);
      if (import.meta.env.DEV) Object.assign(window, { __lunaquestJourney: undefined });
      gameRef.current?.destroy(true);
      gameRef.current = null;
      audio.setJourneyActive(false);
    };
  }, []);

  const skip = () => {
    const scene = gameRef.current?.scene.getScene('SpaceJourneyScene') as SpaceJourneyScene | undefined;
    if (scene?.sys?.isActive()) scene.finish();
    else finish();
  };
  const togglePause = () => {
    const game = gameRef.current;
    if (!game) return;
    userPaused.current = !userPaused.current;
    setPaused(userPaused.current);
    if (userPaused.current) game.scene.pause('SpaceJourneyScene');
    else if (!document.hidden) game.scene.resume('SpaceJourneyScene');
    audio.setJourneyPaused(userPaused.current || document.hidden);
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.repeat || event.target instanceof HTMLButtonElement) return;
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
        event.preventDefault(); skip();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  return <div className="save-start journey-start">
    <section className="journey-stage" aria-label="Animated journey from Earth to the Moon">
      <div id="journey-canvas" role="img" aria-label="A pixel-art crew lander travels from Earth through space and lands on the Moon" />
      <div className="journey-topline" aria-hidden="true">LUNAQUEST · MISSION LAUNCH</div>
      <div className="journey-actions">
        <button type="button" onClick={togglePause} aria-label={paused ? 'Resume journey' : 'Pause journey'}>
          {paused ? 'RESUME' : 'PAUSE'}
        </button>
        <button type="button" onClick={skip}>SKIP INTRO</button>
      </div>
      <div className={`journey-caption${stage === 3 ? ' journey-caption-landing' : ''}`} aria-live="polite">
        <strong>{JOURNEY_STAGES[stage].caption}</strong>
        <small>{reducedMotion ? 'Reduced-motion arrival' : JOURNEY_STAGES[stage].detail}</small>
      </div>
      <div className="journey-progress" aria-label={`Journey stage ${stage + 1} of 4`}>
        {JOURNEY_STAGES.map((item, index) => <span key={item.id} className={index <= stage ? 'active' : ''} />)}
      </div>
    </section>
    <small className="journey-key-hint">Enter, Space or Esc skips · Your supplies stay safe during travel</small>
  </div>;
}
