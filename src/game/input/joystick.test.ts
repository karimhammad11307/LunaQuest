import { describe, expect, it } from 'vitest';
import { joystickVector } from './joystick';

describe('Feature 11 analog joystick', () => {
  it('supports centered, diagonal, partial-speed and clamped movement', () => {
    expect(joystickVector(52, 52, 0, 0, 104)).toEqual({ x: 0, y: 0 });
    const half = joystickVector(52 + 104 * 0.17, 52, 0, 0, 104);
    expect(half.x).toBeCloseTo(0.5);
    expect(half.y).toBe(0);
    const diagonal = joystickVector(120, 120, 0, 0, 104);
    expect(diagonal.x).toBeCloseTo(Math.SQRT1_2);
    expect(diagonal.y).toBeCloseTo(Math.SQRT1_2);
    expect(joystickVector(-1000, 52, 0, 0, 104)).toEqual({ x: -1, y: 0 });
    expect(joystickVector(Number.NaN, 0, 0, 0, 104)).toEqual({ x: 0, y: 0 });
  });
});
