import { describe, expect, it } from 'vitest';
import { clamp, createInitialState, tickOutdoor } from './survivalRules';

describe('existing survival rule foundation', () => {
  it('clamps values to resource bounds', () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(101)).toBe(100);
    expect(clamp(42)).toBe(42);
  });

  it('creates the configured initial mission state and buildings', () => {
    const state = createInitialState();
    expect(state.day).toBe(1);
    expect(state.status).toBe('playing');
    expect(state.weather.isRealData).toBe(false);
    expect(Object.keys(state.buildings)).toEqual(expect.arrayContaining(['habitat', 'greenhouse', 'solar', 'shield', 'landingPad']));
  });

  it('drains suit systems outdoors without mutating the previous state', () => {
    const initial = createInitialState();
    const next = tickOutdoor(initial, 2);
    expect(next.astronaut.suitOxygen).toBeLessThan(initial.astronaut.suitOxygen);
    expect(next.astronaut.thermalSafety).toBeLessThan(initial.astronaut.thermalSafety);
    expect(initial.astronaut.suitOxygen).toBe(100);
  });

  it('does not tick a completed mission', () => {
    const state = { ...createInitialState(), status: 'victory' as const };
    expect(tickOutdoor(state, 10)).toBe(state);
  });
});
