import { describe, expect, it } from 'vitest';
import { ONBOARDING_KEY, OnboardingService, parseOnboarding } from './OnboardingService';

function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe('first-time learning progress', () => {
  it('starts with a three-page introduction for a fresh profile', () => {
    const service = new OnboardingService(false, storage());
    expect(service.getSnapshot()).toEqual({ introSeen: false, tutorialLearned: false,
      tutorialStep: null, introPage: 0 });
    service.setIntroPage(2);
    expect(service.getSnapshot().introPage).toBe(2);
    expect(service.setIntroPage(3).introPage).toBe(2);
    expect(service.startMission().tutorialStep).toBe('movement');
    expect(service.getSnapshot().introSeen).toBe(true);
  });

  it('advances only in order and never grants a game reward', () => {
    const service = new OnboardingService(false, storage());
    service.startMission();
    expect(service.advance('habitat', 'enter').tutorialStep).toBe('movement');
    for (const [from, to] of [
      ['movement', 'habitat'], ['habitat', 'enter'], ['enter', 'menu'], ['menu', 'confirm'],
      ['confirm', 'resources'], ['resources', 'exit'], ['exit', 'ready'],
    ] as const) expect(service.advance(from, to).tutorialStep).toBe(to);
    expect(service.completeTutorial()).toEqual({ introSeen: true, tutorialLearned: true,
      tutorialStep: null, introPage: 0 });
    expect(service.beginNewRun().tutorialStep).toBeNull();
  });

  it('keeps Continue progress, recovers indoor guidance outdoors, and supports replay', () => {
    const port = storage();
    const service = new OnboardingService(false, port);
    service.startMission();
    service.advance('movement', 'habitat');
    service.advance('habitat', 'enter');
    service.advance('enter', 'menu');
    service.advance('menu', 'confirm');
    service.advance('confirm', 'resources');
    const restored = new OnboardingService(true, port);
    expect(restored.getSnapshot().tutorialStep).toBe('resources');
    expect(restored.recoverAtBase().tutorialStep).toBe('habitat');
    restored.skipTutorial();
    expect(restored.beginNewRun().tutorialStep).toBeNull();
    expect(restored.replay().tutorialStep).toBe('movement');
    expect(restored.getSnapshot().tutorialLearned).toBe(true);
  });

  it('does not force pre-existing saved players through a new introduction', () => {
    expect(new OnboardingService(true, storage()).getSnapshot()).toMatchObject({
      introSeen: true, tutorialLearned: true, tutorialStep: null,
    });
  });

  it('rejects corrupt and unsupported records and tolerates blocked storage', () => {
    expect(parseOnboarding('{bad')).toBeNull();
    expect(parseOnboarding(JSON.stringify({ version: 2, progress: {} }))).toBeNull();
    expect(parseOnboarding(JSON.stringify({ version: 1, progress: {
      introSeen: false, tutorialLearned: true, tutorialStep: 'ready', introPage: 9,
    } }))).toBeNull();
    const blocked = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); } };
    const service = new OnboardingService(false, blocked);
    expect(service.startMission().tutorialStep).toBe('movement');
    expect(service.skipTutorial().tutorialLearned).toBe(true);
    expect(storage().values.has(ONBOARDING_KEY)).toBe(false);
  });
});
