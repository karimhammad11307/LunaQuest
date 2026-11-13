import { describe, expect, it } from 'vitest';
import { EDUCATION } from './education';
import { WORLD } from './gameConfig';

describe('seven opt-in lunar learning signs', () => {
  it('have short WHAT, WHY and YOUR MISSION copy within the walkable world', () => {
    expect(Object.keys(EDUCATION)).toEqual([
      'habitat', 'greenhouse', 'solar', 'shield', 'landingPad', 'chickenHunt', 'earthSupply',
    ]);
    for (const entry of Object.values(EDUCATION)) {
      expect(entry.x).toBeGreaterThan(20);
      expect(entry.x).toBeLessThan(WORLD.width - 20);
      expect(entry.y).toBeGreaterThan(50);
      expect(entry.y).toBeLessThan(WORLD.height - 20);
      for (const line of [entry.what, entry.why, entry.mission]) {
        expect(line.length).toBeGreaterThan(8);
        expect(line.length).toBeLessThan(115);
      }
    }
    expect(EDUCATION.chickenHunt.what).toMatch(/fictional/);
    expect(EDUCATION.earthSupply.why).toMatch(/recycling and local ice/);
  });
});
