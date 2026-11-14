/** UI-only learning progress. Survival resources remain in GameSessionStore. */
export type TutorialStep = 'movement' | 'habitat' | 'enter' | 'menu' | 'confirm' | 'resources' | 'exit' | 'ready';

export interface OnboardingProgress {
  journeySeen: boolean;
  introSeen: boolean;
  tutorialLearned: boolean;
  tutorialStep: TutorialStep | null;
  introPage: number;
}

interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const ONBOARDING_KEY = 'lunaquest.onboarding.v1';
const steps: TutorialStep[] = ['movement', 'habitat', 'enter', 'menu', 'confirm', 'resources', 'exit', 'ready'];

export function parseOnboarding(raw: string): OnboardingProgress | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const envelope = parsed as { version?: unknown; progress?: Partial<OnboardingProgress> };
    const progress = envelope.progress;
    if ((envelope.version !== 1 && envelope.version !== 2) || !progress || typeof progress.introSeen !== 'boolean'
      || typeof progress.tutorialLearned !== 'boolean'
      || (envelope.version === 2 && typeof (progress as Partial<OnboardingProgress>).journeySeen !== 'boolean')
      || typeof progress.introPage !== 'number' || !Number.isInteger(progress.introPage)
      || progress.introPage < 0 || progress.introPage > 2
      || progress.tutorialStep === undefined
      || (progress.tutorialStep !== null && !steps.includes(progress.tutorialStep))
      || (!progress.introSeen && (progress.tutorialLearned || progress.tutorialStep !== null))
      || (progress.tutorialStep !== null && !progress.introSeen)) return null;
    return { journeySeen: envelope.version === 1 ? progress.introSeen : (progress as OnboardingProgress).journeySeen,
      introSeen: progress.introSeen, tutorialLearned: progress.tutorialLearned,
      tutorialStep: progress.tutorialStep, introPage: progress.introPage };
  } catch { return null; }
}

export class OnboardingService {
  private readonly storage: StoragePort | null;
  private progress: OnboardingProgress;

  constructor(existingSave = false, storage?: StoragePort | null) {
    if (storage !== undefined) this.storage = storage;
    else {
      try { this.storage = typeof window === 'undefined' ? null : window.localStorage; }
      catch { this.storage = null; }
    }
    let saved: OnboardingProgress | null = null;
    try { const raw = this.storage?.getItem(ONBOARDING_KEY); saved = raw ? parseOnboarding(raw) : null; }
    catch { /* Onboarding still works without browser storage. */ }
    // Existing players predate this feature and should not be forced through the guide.
    this.progress = saved ?? { journeySeen: existingSave, introSeen: existingSave, tutorialLearned: existingSave,
      tutorialStep: null, introPage: 0 };
  }

  getSnapshot(): OnboardingProgress { return this.progress; }

  private set(progress: OnboardingProgress): OnboardingProgress {
    this.progress = progress;
    try { this.storage?.setItem(ONBOARDING_KEY, JSON.stringify({ version: 2, progress })); }
    catch { /* Gameplay continues when storage is unavailable or full. */ }
    return progress;
  }

  setIntroPage(page: number): OnboardingProgress {
    if (!Number.isInteger(page) || page < 0 || page > 2 || this.progress.introSeen) return this.progress;
    return this.set({ ...this.progress, introPage: page });
  }

  /** The journey is separate from the briefing and tutorial. Skipping also records it as seen. */
  finishJourney(): OnboardingProgress {
    return this.progress.journeySeen ? this.progress : this.set({ ...this.progress, journeySeen: true });
  }

  /** New runs only repeat onboarding until it has been learned or skipped. */
  beginNewRun(): OnboardingProgress {
    return this.set({ ...this.progress, introPage: 0,
      tutorialStep: this.progress.tutorialLearned ? null : this.progress.introSeen ? 'movement' : null });
  }

  startMission(): OnboardingProgress {
    return this.set({ ...this.progress, introSeen: true, introPage: 0,
      tutorialStep: this.progress.tutorialLearned ? null : 'movement' });
  }

  advance(expected: TutorialStep, next: TutorialStep): OnboardingProgress {
    if (this.progress.tutorialStep !== expected || steps.indexOf(next) !== steps.indexOf(expected) + 1) return this.progress;
    return this.set({ ...this.progress, tutorialStep: next });
  }

  completeTutorial(): OnboardingProgress {
    if (this.progress.tutorialStep !== 'ready') return this.progress;
    return this.set({ ...this.progress, tutorialLearned: true, tutorialStep: null });
  }

  skipTutorial(): OnboardingProgress {
    return this.set({ ...this.progress, introSeen: true, tutorialLearned: true, tutorialStep: null });
  }

  replay(): OnboardingProgress {
    return this.set({ ...this.progress, introSeen: true, tutorialStep: 'movement' });
  }

  /** SaveService returns players outdoors; restart indoor guidance at the Habitat without undoing game actions. */
  recoverAtBase(): OnboardingProgress {
    if (!['menu', 'confirm', 'resources', 'exit'].includes(this.progress.tutorialStep ?? '')) return this.progress;
    return this.set({ ...this.progress, tutorialStep: 'habitat' });
  }
}
