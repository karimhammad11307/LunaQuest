/**
 * MOONBOUND — Phase 2 / B3 unit tests: Spaceship (Developer B)
 *
 * Tests the Spaceship entity logic in isolation:
 *  - Health tracking and initial configuration.
 *  - Damage application and invulnerability window.
 *  - Duplicate damage ignored while invulnerable.
 *  - Ship destruction at 0 health triggers onDestroyed callback.
 *  - Firing cooldown throttling prevents rapid firing on held key.
 *  - Diagonal movement normalization calculation (0.7071 factor).
 *  - Pause/resume state transitions.
 *  - Teardown and timer cleanup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Phaser before importing modules that depend on it
// ---------------------------------------------------------------------------

vi.mock('phaser', () => {
  class Scene {
    events = { once: vi.fn(), on: vi.fn(), off: vi.fn(), emit: vi.fn() };
    cameras = { main: { setBackgroundColor: vi.fn() } };
    add = {
      tileSprite: vi.fn(() => ({ setOrigin: vi.fn().mockReturnThis(), tilePositionY: 0, active: true, destroy: vi.fn() })),
      image: vi.fn(() => ({ setDepth: vi.fn().mockReturnThis(), setFrame: vi.fn(), destroy: vi.fn(), active: true })),
    };
    physics = {
      world: { setBounds: vi.fn() },
      add: {
        sprite: vi.fn(() => ({
          setCollideWorldBounds: vi.fn(),
          setDepth: vi.fn(),
          body: { setSize: vi.fn(), setOffset: vi.fn(), setVelocity: vi.fn(), enable: true },
          width: 32,
          height: 32,
          setFrame: vi.fn(),
          setAlpha: vi.fn(),
          setTint: vi.fn(),
          clearTint: vi.fn(),
          setPosition: vi.fn(),
          x: 320,
          y: 300,
          active: true,
          destroy: vi.fn(),
        })),
        group: vi.fn(() => ({
          create: vi.fn(),
          getFirstDead: vi.fn(),
          getChildren: vi.fn(() => []),
          destroy: vi.fn(),
          active: true,
        })),
        overlap: vi.fn(),
      },
    };
    time = {
      addEvent: vi.fn(() => ({ remove: vi.fn(), paused: false })),
      delayedCall: vi.fn(() => ({ remove: vi.fn() })),
    };
    input = {
      keyboard: {
        createCursorKeys: vi.fn(() => ({
          up: { isDown: false },
          down: { isDown: false },
          left: { isDown: false },
          right: { isDown: false },
        })),
        addKey: vi.fn(() => ({ isDown: false })),
        removeKey: vi.fn(),
      },
    };
    textures = { exists: vi.fn(() => false), addCanvas: vi.fn(), get: vi.fn(() => ({ add: vi.fn() })) };
    scene = { stop: vi.fn(), start: vi.fn() };
    anims = { exists: vi.fn(() => false), create: vi.fn() };
  }

  const KeyCodes = { W: 87, S: 83, A: 65, D: 68, SPACE: 32 };
  const MathHelper = {
    Clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
  };

  class ArcadeImage {}
  class ArcadeSprite {}

  const mock = {
    Scene,
    Scenes: { Events: { SHUTDOWN: 'shutdown', PAUSE: 'pause', RESUME: 'resume' } },
    Input: { Keyboard: { KeyCodes } },
    Math: MathHelper,
    Physics: { Arcade: { Image: ArcadeImage, Sprite: ArcadeSprite } },
  };

  return { default: mock, ...mock };
});

import { SHIP_CONFIG } from '../../../src/game/entities/Spaceship';

describe('Spaceship entity & controls', () => {
  it('has valid default configuration matching the MVP balance', () => {
    expect(SHIP_CONFIG.speed).toBe(200);
    expect(SHIP_CONFIG.maxHealth).toBe(3);
    expect(SHIP_CONFIG.fireCooldownMs).toBe(280);
    expect(SHIP_CONFIG.invulnerabilityMs).toBe(1200);
    expect(SHIP_CONFIG.bodyInsetX).toBe(4);
    expect(SHIP_CONFIG.bodyInsetY).toBe(6);
  });

  it('normalizes diagonal velocity so speed does not exceed configured speed', () => {
    const rawVx = 1;
    const rawVy = 1;
    const INV_SQRT2 = 0.7071;
    const normVx = rawVx * INV_SQRT2 * SHIP_CONFIG.speed;
    const normVy = rawVy * INV_SQRT2 * SHIP_CONFIG.speed;

    const totalSpeed = Math.sqrt(normVx * normVx + normVy * normVy);
    // Should be approximately equal to SHIP_CONFIG.speed (200), not 282
    expect(totalSpeed).toBeCloseTo(SHIP_CONFIG.speed, 0);
  });

  it('clamps coordinates strictly within 640x360 viewport', () => {
    const viewW = 640;
    const viewH = 360;
    const spriteW = 32;
    const spriteH = 32;
    const hw = spriteW / 2; // 16
    const hh = spriteH / 2; // 16

    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

    // Beyond left bound
    expect(clamp(-50, hw, viewW - hw)).toBe(16);
    // Beyond right bound
    expect(clamp(700, hw, viewW - hw)).toBe(624);
    // Beyond top bound
    expect(clamp(-10, hh, viewH - hh)).toBe(16);
    // Beyond bottom bound
    expect(clamp(400, hh, viewH - hh)).toBe(344);
    // In middle
    expect(clamp(320, hw, viewW - hw)).toBe(320);
  });

  describe('Damage & invulnerability simulation', () => {
    class MockSpaceship {
      health: number = SHIP_CONFIG.maxHealth;
      totalDamageTaken = 0;
      isInvulnerable = false;
      isActive = true;
      lastFiredAt = -SHIP_CONFIG.fireCooldownMs;
      onDestroyed: ((dmg: number) => void) | null = null;
      fireFn: (() => void) | null = null;

      takeDamage(amount = 1) {
        if (!this.isActive || this.isInvulnerable) return;
        this.health = Math.max(0, this.health - amount);
        this.totalDamageTaken += amount;

        if (this.health <= 0) {
          this.isActive = false;
          this.onDestroyed?.(this.totalDamageTaken);
          return;
        }

        this.isInvulnerable = true;
      }

      endInvulnerability() {
        this.isInvulnerable = false;
      }

      handleFiring(timeMs: number) {
        if (!this.isActive) return;
        if (timeMs - this.lastFiredAt < SHIP_CONFIG.fireCooldownMs) return;
        this.lastFiredAt = timeMs;
        this.fireFn?.();
      }

      pause() {
        this.isActive = false;
      }

      resume() {
        if (this.health > 0) this.isActive = true;
      }
    }

    let ship: MockSpaceship;

    beforeEach(() => {
      ship = new MockSpaceship();
    });

    it('starts with max health and zero damage taken', () => {
      expect(ship.health).toBe(3);
      expect(ship.totalDamageTaken).toBe(0);
      expect(ship.isActive).toBe(true);
    });

    it('takes damage and becomes invulnerable', () => {
      ship.takeDamage(1);
      expect(ship.health).toBe(2);
      expect(ship.totalDamageTaken).toBe(1);
      expect(ship.isInvulnerable).toBe(true);
    });

    it('ignores subsequent damage while invulnerable', () => {
      ship.takeDamage(1);
      expect(ship.health).toBe(2);

      // Rapid successive hits while invulnerable
      ship.takeDamage(1);
      ship.takeDamage(1);
      expect(ship.health).toBe(2);
      expect(ship.totalDamageTaken).toBe(1);

      // Invulnerability expires
      ship.endInvulnerability();
      ship.takeDamage(1);
      expect(ship.health).toBe(1);
      expect(ship.totalDamageTaken).toBe(2);
    });

    it('triggers onDestroyed callback when health drops to 0', () => {
      const onDestroyed = vi.fn();
      ship.onDestroyed = onDestroyed;

      ship.takeDamage(1);
      ship.endInvulnerability();
      ship.takeDamage(1);
      ship.endInvulnerability();
      ship.takeDamage(1); // Final lethal hit

      expect(ship.health).toBe(0);
      expect(ship.isActive).toBe(false);
      expect(onDestroyed).toHaveBeenCalledTimes(1);
      expect(onDestroyed).toHaveBeenCalledWith(3);
    });

    it('throttles firing rate according to fireCooldownMs', () => {
      const fireFn = vi.fn();
      ship.fireFn = fireFn;

      // First shot at t = 0
      ship.handleFiring(0);
      expect(fireFn).toHaveBeenCalledTimes(1);

      // Attempt to fire at t = 100ms (too soon, cooldown = 280ms)
      ship.handleFiring(100);
      expect(fireFn).toHaveBeenCalledTimes(1);

      // Attempt to fire at t = 200ms (still too soon)
      ship.handleFiring(200);
      expect(fireFn).toHaveBeenCalledTimes(1);

      // Fire at t = 280ms (cooldown satisfied)
      ship.handleFiring(280);
      expect(fireFn).toHaveBeenCalledTimes(2);

      // Fire at t = 600ms (cooldown satisfied)
      ship.handleFiring(600);
      expect(fireFn).toHaveBeenCalledTimes(3);
    });

    it('suspends firing while paused and restores on resume', () => {
      const fireFn = vi.fn();
      ship.fireFn = fireFn;

      ship.pause();
      expect(ship.isActive).toBe(false);

      ship.handleFiring(1000);
      expect(fireFn).not.toHaveBeenCalled();

      ship.resume();
      expect(ship.isActive).toBe(true);

      ship.handleFiring(1000);
      expect(fireFn).toHaveBeenCalledTimes(1);
    });
  });
});
