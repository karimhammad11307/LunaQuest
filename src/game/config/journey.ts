/** A short, fixed sequence. These are cinematic seconds, never survival time. */
export const JOURNEY_STAGE_MS = 3000;
export const JOURNEY_TOTAL_MS = JOURNEY_STAGE_MS * 4;

export const JOURNEY_STAGES = [
  { id: 'earth', caption: 'YOUR JOURNEY BEGINS!', detail: 'Leaving Earth' },
  { id: 'travel', caption: 'NEXT STOP: THE MOON!', detail: 'Crossing space' },
  { id: 'approach', caption: 'PREPARE FOR LANDING!', detail: 'Approaching the Moon' },
  { id: 'landing', caption: 'WELCOME TO THE MOON, ASTRONAUT!', detail: 'Touchdown' },
] as const;

export type JourneyStage = (typeof JOURNEY_STAGES)[number]['id'];

export function journeyStageAt(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.min(3, Math.floor(elapsedMs / JOURNEY_STAGE_MS));
}
