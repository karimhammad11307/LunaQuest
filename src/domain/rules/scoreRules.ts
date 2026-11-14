import type { GameState, PersonalBest } from '../models/types';

/** One completed day always outranks every XP bonus from a shorter run. */
export const SCORE_PER_DAY = 1000;
export const MAX_XP_SCORE_BONUS = SCORE_PER_DAY - 1;
export const EMPTY_PERSONAL_BEST: PersonalBest = Object.freeze({ bestDaysSurvived: 0, bestScore: 0 });

export function survivalScore(state: Pick<GameState, 'daysSurvived' | 'xp'>): number {
  const xpBonus = Math.min(MAX_XP_SCORE_BONUS, Math.max(0, Math.floor(state.xp)));
  return Math.min(Number.MAX_SAFE_INTEGER, state.daysSurvived * SCORE_PER_DAY + xpBonus);
}

export function validPersonalBest(value: unknown): value is PersonalBest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Partial<PersonalBest>;
  const minimumScore = Math.min(Number.MAX_SAFE_INTEGER, (record.bestDaysSurvived ?? 0) * SCORE_PER_DAY);
  const maximumScore = Math.min(Number.MAX_SAFE_INTEGER, (record.bestDaysSurvived ?? 0) * SCORE_PER_DAY + MAX_XP_SCORE_BONUS);
  return Number.isSafeInteger(record.bestDaysSurvived) && record.bestDaysSurvived! >= 0
    && Number.isSafeInteger(record.bestScore)
    && record.bestScore! >= minimumScore
    && record.bestScore! <= maximumScore;
}

export function beatsPersonalBest(state: Pick<GameState, 'daysSurvived' | 'xp'>, best: PersonalBest): boolean {
  const score = survivalScore(state);
  return state.daysSurvived > best.bestDaysSurvived
    || (state.daysSurvived === best.bestDaysSurvived && score > best.bestScore);
}
