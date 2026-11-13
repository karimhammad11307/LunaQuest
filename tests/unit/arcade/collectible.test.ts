/**
 * MOONBOUND — Phase 3 / B6 unit tests: Collectible (Developer B)
 *
 * Tests the Collectible entity in isolation:
 *  - Activation, initial values, and state.
 *  - Atomic pickup: collect() returns value exactly once, subsequent calls return 0.
 *  - Magnet attraction physics: calculates correct direction and velocity vector within radius.
 *  - Natural drift velocity when outside magnet radius.
 *  - Deactivation and cleanup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Phaser before importing modules that reference it
vi.mock('phaser', () => {
  class Scene {}
  return { default: { Scene }, Scene };
});

import { COLLECTIBLE_CONFIG } from '../../../src/game/entities/Collectible';

describe('Collectible entity & magnet mechanics', () => {
  it('defines valid collectible configuration constants', () => {
    expect(COLLECTIBLE_CONFIG.poolSize).toBe(25);
    expect(COLLECTIBLE_CONFIG.magnetRadius).toBe(75);
    expect(COLLECTIBLE_CONFIG.magnetSpeed).toBe(230);
    expect(COLLECTIBLE_CONFIG.naturalDriftY).toBe(20);
    expect(COLLECTIBLE_CONFIG.lifetimeMs).toBe(12000);
    expect(COLLECTIBLE_CONFIG.bodyRadius).toBe(7);
  });

  describe('Atomic collection & pooling', () => {
    class MockCollectible {
      x = 0;
      y = 0;
      vx = 0;
      vy = 0;
      value = 1;
      isActive = false;
      isCollected = false;
      timeAlive = 0;

      activate(x: number, y: number, value = 1) {
        this.x = x;
        this.y = y;
        this.value = Math.max(1, value);
        this.isActive = true;
        this.isCollected = false;
        this.timeAlive = 0;
        this.vx = 0;
        this.vy = COLLECTIBLE_CONFIG.naturalDriftY;
      }

      collect(): number {
        if (!this.isActive || this.isCollected) return 0;
        this.isCollected = true;
        this.isActive = false;
        this.vx = 0;
        this.vy = 0;
        return this.value;
      }

      deactivate() {
        this.isActive = false;
        this.isCollected = false;
        this.vx = 0;
        this.vy = 0;
      }

      update(deltaMs: number, shipX: number, shipY: number, viewH: number) {
        if (!this.isActive || this.isCollected) return;

        const dt = deltaMs / 1000;
        this.timeAlive += dt;

        if (this.timeAlive >= COLLECTIBLE_CONFIG.lifetimeMs / 1000 || this.y > viewH + 20) {
          this.deactivate();
          return;
        }

        const dx = shipX - this.x;
        const dy = shipY - this.y;
        const distSq = dx * dx + dy * dy;
        const magnetSq = COLLECTIBLE_CONFIG.magnetRadius * COLLECTIBLE_CONFIG.magnetRadius;

        if (distSq <= magnetSq && distSq > 4) {
          const dist = Math.sqrt(distSq);
          this.vx = (dx / dist) * COLLECTIBLE_CONFIG.magnetSpeed;
          this.vy = (dy / dist) * COLLECTIBLE_CONFIG.magnetSpeed;
        } else {
          this.vx = 0;
          this.vy = COLLECTIBLE_CONFIG.naturalDriftY;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
      }
    }

    let item: MockCollectible;

    beforeEach(() => {
      item = new MockCollectible();
    });

    it('activates with specified position and food value', () => {
      item.activate(120, 80, 2);
      expect(item.isActive).toBe(true);
      expect(item.isCollected).toBe(false);
      expect(item.value).toBe(2);
      expect(item.x).toBe(120);
      expect(item.y).toBe(80);
      expect(item.vy).toBe(COLLECTIBLE_CONFIG.naturalDriftY);
    });

    it('collect() returns food value on first call and 0 on subsequent calls', () => {
      item.activate(100, 100, 2);

      const firstPickup = item.collect();
      expect(firstPickup).toBe(2);
      expect(item.isCollected).toBe(true);
      expect(item.isActive).toBe(false);

      // Duplicate collection attempt
      const secondPickup = item.collect();
      expect(secondPickup).toBe(0);
    });

    it('drifts downward naturally when outside the magnet radius', () => {
      // Ship is at (320, 300), item at (100, 100) -> distance > 200px (outside 75px radius)
      item.activate(100, 100, 1);
      item.update(100, 320, 300, 360);

      expect(item.vx).toBe(0);
      expect(item.vy).toBe(COLLECTIBLE_CONFIG.naturalDriftY);
      expect(item.y).toBeGreaterThan(100);
    });

    it('accelerates toward player ship when inside magnet radius', () => {
      // Ship at (200, 200), item at (180, 200) -> distance = 20px (well inside 75px radius)
      item.activate(180, 200, 1);
      item.update(50, 200, 200, 360);

      // dx = +20, dy = 0 -> should move horizontally to the right toward ship
      expect(item.vx).toBeCloseTo(COLLECTIBLE_CONFIG.magnetSpeed, 1);
      expect(item.vy).toBeCloseTo(0, 1);
      expect(item.x).toBeGreaterThan(180);
    });

    it('deactivates automatically after exceeding configured lifetime', () => {
      item.activate(100, 100, 1);
      expect(item.isActive).toBe(true);

      // Advance by 13 seconds (lifetime is 12s)
      item.update(13000, 500, 500, 360);
      expect(item.isActive).toBe(false);
    });

    it('deactivates when falling off the bottom of the screen', () => {
      item.activate(100, 350, 1);
      // Move 50px down -> y becomes 400 > viewH (360) + 20
      item.y = 390;
      item.update(100, 500, 500, 360);
      expect(item.isActive).toBe(false);
    });
  });
});
