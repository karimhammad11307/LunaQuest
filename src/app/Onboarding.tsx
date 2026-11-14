import { useEffect, useRef } from 'react';
import type { TutorialStep } from '../services/OnboardingService';

const introPages = [
  { heading: 'Hello, Astronaut!', lines: ["You've arrived on the Moon to build a safe home.", 'A new world is waiting for you to explore.'] },
  { heading: 'Living here takes care.', lines: ['Keep food, water, oxygen and energy ready.', 'Eat stored food at the Habitat when your health is low.'] },
  { heading: 'How long can you survive?', lines: ['Explore your base, protect your astronaut, and plan each day.', 'Survive as many lunar days as you can!'] },
] as const;

export function IntroPanel({ page, onPage, onStart, onSkip }: {
  page: number; onPage: (page: number) => void; onStart: () => void; onSkip: () => void;
}) {
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => { primary.current?.focus(); }, [page]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === 'ArrowRight' && page < 2) { event.preventDefault(); onPage(page + 1); }
      else if (event.key === 'ArrowLeft' && page > 0) { event.preventDefault(); onPage(page - 1); }
      else if (event.key === 'Escape') { event.preventDefault(); onSkip(); }
      else if ((event.key === 'Enter' || event.key.toLowerCase() === 'e')
        && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        if (page === 2) onStart(); else onPage(page + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page, onPage, onSkip, onStart]);
  return <div className="save-start intro-start"><section className="intro-panel" role="dialog" aria-modal="true" aria-label="LunaQuest mission introduction">
    <div className="intro-art" aria-hidden="true"><span className="intro-earth"/><span className="intro-star intro-star-a">✦</span><span className="intro-star intro-star-b">✧</span><span className="intro-moon"/><img className="intro-astronaut" src="/favicon.svg" alt="" /></div>
    <div className="intro-page-count">MISSION LOG · {page + 1} / 3</div>
    <strong>WELCOME TO LUNAQUEST!</strong>
    <h1>{introPages[page].heading}</h1>
    {introPages[page].lines.map((line) => <p key={line}>{line}</p>)}
    <div className="intro-actions">
      {page > 0 && <button type="button" onClick={() => onPage(page - 1)}>← Back</button>}
      <button ref={primary} type="button" onClick={() => page === 2 ? onStart() : onPage(page + 1)}>{page === 2 ? 'Start Mission' : 'Next →'}</button>
    </div>
    <button className="intro-skip" type="button" onClick={onSkip}>Skip Intro</button>
    <small>Arrow keys move through pages · Enter selects · Esc skips</small>
  </section></div>;
}

const promptCopy: Record<Exclude<TutorialStep, 'resources' | 'ready'>, { heading: string; desktop: string; mobile: string }> = {
  movement: { heading: "Let's explore the Moon!", desktop: 'Use WASD or Arrow Keys to move.', mobile: 'Use the joystick to move your astronaut.' },
  habitat: { heading: 'Find the Habitat', desktop: 'Follow the yellow marker to your safe home.', mobile: 'Follow the yellow marker to your safe home.' },
  enter: { heading: 'Step inside!', desktop: 'Press E to enter the Habitat.', mobile: 'Tap Interact to enter the Habitat.' },
  menu: { heading: 'Choose an action', desktop: 'Use ↑ and ↓ to move through the Habitat menu.', mobile: 'Tap a Habitat action to choose it.' },
  confirm: { heading: 'Try a choice', desktop: 'Press Enter or E to select the highlighted action.', mobile: 'Tap a Habitat action to select it.' },
  exit: { heading: 'Back outside', desktop: 'Press Q to leave the Habitat.', mobile: 'Tap Exit (Q) to leave the Habitat.' },
};

export function TutorialPanel({ step, mobile, onSkip, onNext }: {
  step: TutorialStep; mobile: boolean; onSkip: () => void; onNext: () => void;
}) {
  const blocking = step === 'resources' || step === 'ready';
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (blocking) primary.current?.focus(); }, [step, blocking]);
  return <aside className={`tutorial-panel${blocking ? ' tutorial-panel-blocking' : ''}`} role={blocking ? 'dialog' : 'status'}
    aria-modal={blocking ? 'true' : undefined} aria-label="Guided Moon Base tutorial">
    <div className="tutorial-eyebrow">✦ ASTRONAUT TRAINING</div>
    {step === 'resources' ? <>
      <strong>Your survival supplies</strong>
      <p><b>Oxygen</b> helps you breathe. Your suit carries its own supply outside.</p>
      <p><b>Water</b> keeps your astronaut healthy.</p>
      <p><b>Food</b> fills storage. Eat it at the Habitat to restore health.</p>
      <p><b>Energy</b> powers your Moon Base.</p>
      <p><b>HP</b> shows your astronaut's health.</p>
      <button ref={primary} type="button" onClick={onNext}>Next: leave the Habitat</button>
    </> : step === 'ready' ? <>
      <strong>Great job, Astronaut!</strong>
      <p>You're ready to explore. Manage your supplies and survive as many lunar days as you can!</p>
      <button ref={primary} type="button" onClick={onNext}>Begin Independent Survival</button>
    </> : <><strong>{promptCopy[step].heading}</strong><p>{mobile ? promptCopy[step].mobile : promptCopy[step].desktop}</p></>}
    <button className="tutorial-skip" type="button" onClick={onSkip}>Skip Tutorial</button>
  </aside>;
}
