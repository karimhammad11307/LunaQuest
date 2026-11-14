import { describe, expect, it } from 'vitest';
import { JOURNEY_STAGES, JOURNEY_TOTAL_MS, journeyStageAt } from './journey';

describe('space journey timing', () => {
  it('has four distinct three-second stages and a twelve-second finish', () => {
    expect(JOURNEY_STAGES.map((stage) => stage.id)).toEqual(['earth', 'travel', 'approach', 'landing']);
    expect(JOURNEY_TOTAL_MS).toBe(12_000);
    expect([0, 2999, 3000, 5999, 6000, 8999, 9000, 12_000].map(journeyStageAt))
      .toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
});
