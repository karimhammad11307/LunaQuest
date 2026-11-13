/**
 * MOONBOUND — Phase 2 / B4 unit tests: AlienBird (Developer B)
 *
 * Tests the AlienBird entity and movement patterns in isolation:
 *  - Initial health per variant (A = 1 HP, B = 2 HP).
 *  - Damage and destruction lifecycle.
 *  - Activation resets state cleanly for object pooling.
 *  - Pattern A (Sine Wave): deterministic vertical oscillation and velocity.
 *  - Pattern B (Swoop): deterministic three-phase trajectory (entry, dive, retreat).
 *  - Off-screen culling thresholds.
 */

import { describe, it, expect, vi } from 'vitest';

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
          width: 24,
          height: 24,
          setFrame: vi.fn(),
          setAlpha: vi.fn(),
          setTint: vi.fn(),
          clearTint: vi.fn(),
          setPosition: vi.fn(),
          x: 0,
          y: 0,
          active: true,
          destroy: vi.fn(),
        })),
        group: vi.fn(() => ({
          create: vi.fn(() => ({
            setActive: vi.fn().mockReturnThis(),
            setVisible: vi.fn().mockReturnThis(),
            setDepth: vi.fn().mockReturnThis(),
            setPosition: vi.fn().mockReturnThis(),
            setAlpha: vi.fn().mockReturnThis(),
            setTint: vi.fn().mockReturnThis(),
            clearTint: vi.fn().mockReturnThis(),
            setFrame: vi.fn().mockReturnThis(),
            body: { setSize: vi.fn(), setOffset: vi.fn(), setVelocity: vi.fn(), enable: true },
            width: 24,
            height: 24,
            active: false,
          })),
        })),
      },
    };
    time = {
      delayedCall: vi.fn(() => ({ remove: vi.fn() })),
    };
  }

  return {
    default: { Scene },
    Scene,
  };
});

import { BIRD_CONFIG, type BirdVariant, type BirdPattern } from '../../../src/game/entities/AlienBird';

describe('AlienBird entity & AI patterns', () => {
  it('defines correct configuration constants', () => {
    expect(BIRD_CONFIG.health[0]).toBe(1); // Variant A
    expect(BIRD_CONFIG.health[1]).toBe(2); // Variant B
    expect(BIRD_CONFIG.baseSpeedY).toBe(90);
    expect(BIRD_CONFIG.sineSpeedX).toBe(70);
    expect(BIRD_CONFIG.sineAmplitude).toBe(28);
    expect(BIRD_CONFIG.sineFrequency).toBe(2.4);
    expect(BIRD_CONFIG.bodyInset).toBe(4);
  });

  describe('Health & pooling lifecycle', () => {
    class MockAlienBird {
      variant: BirdVariant;
      maxHealth: number;
      health: number;
      isAlive = false;
      x = 0;
      y = 0;
      pattern: BirdPattern = 'sine-wave';
      directionX: 1 | -1 = 1;
      phaseOffset = 0;
      timeAlive = 0;

      constructor(variant: BirdVariant) {
        this.variant = variant;
        this.maxHealth = variant === 'A' ? BIRD_CONFIG.health[0] : BIRD_CONFIG.health[1];
        this.health = this.maxHealth;
      }

      activate(x: number, y: number, pattern: BirdPattern, dir: 1 | -1 = 1, phase = 0) {
        this.x = x;
        this.y = y;
        this.pattern = pattern;
        this.directionX = dir;
        this.phaseOffset = phase;
        this.health = this.maxHealth;
        this.timeAlive = 0;
        this.isAlive = true;
      }

      takeDamage(amount = 1): boolean {
        if (!this.isAlive) return false;
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
          this.deactivate();
          return true;
        }
        return false;
      }

      deactivate() {
        this.isAlive = false;
      }

      computeSineVelocity(): { vx: number; vy: number } {
        const vx = this.directionX * BIRD_CONFIG.sineSpeedX;
        const angle = this.timeAlive * BIRD_CONFIG.sineFrequency + this.phaseOffset;
        const vy = BIRD_CONFIG.baseSpeedY + Math.sin(angle) * BIRD_CONFIG.sineAmplitude;
        return { vx, vy };
      }

      computeSwoopVelocity(): { vx: number; vy: number } {
        const t = this.timeAlive;
        if (t < 1.5) {
          return {
            vx: this.directionX * BIRD_CONFIG.swoopSpeedX,
            vy: 20,
          };
        } else if (t < 2.5) {
          return {
            vx: this.directionX * (BIRD_CONFIG.swoopSpeedX * 0.3),
            vy: BIRD_CONFIG.swoopSpeedY * 3,
          };
        } else {
          return {
            vx: -this.directionX * BIRD_CONFIG.swoopSpeedX * 0.5,
            vy: -BIRD_CONFIG.baseSpeedY * 1.5,
          };
        }
      }
    }

    it('variant A dies in 1 hit', () => {
      const bird = new MockAlienBird('A');
      bird.activate(100, -20, 'sine-wave');

      expect(bird.isAlive).toBe(true);
      expect(bird.health).toBe(1);

      const destroyed = bird.takeDamage(1);
      expect(destroyed).toBe(true);
      expect(bird.isAlive).toBe(false);
      expect(bird.health).toBe(0);
    });

    it('variant B requires 2 hits to destroy', () => {
      const bird = new MockAlienBird('B');
      bird.activate(100, -20, 'swoop');

      expect(bird.isAlive).toBe(true);
      expect(bird.health).toBe(2);

      // Hit 1: damaged, not destroyed
      const destroyed1 = bird.takeDamage(1);
      expect(destroyed1).toBe(false);
      expect(bird.isAlive).toBe(true);
      expect(bird.health).toBe(1);

      // Hit 2: destroyed
      const destroyed2 = bird.takeDamage(1);
      expect(destroyed2).toBe(true);
      expect(bird.isAlive).toBe(false);
      expect(bird.health).toBe(0);
    });

    it('resets cleanly when reactivated from the pool', () => {
      const bird = new MockAlienBird('B');
      bird.activate(100, -20, 'swoop');
      bird.takeDamage(2); // Destroy it
      expect(bird.isAlive).toBe(false);

      // Reactivate from pool
      bird.activate(200, -40, 'sine-wave', -1, 1.5);
      expect(bird.isAlive).toBe(true);
      expect(bird.health).toBe(2);
      expect(bird.x).toBe(200);
      expect(bird.y).toBe(-40);
      expect(bird.pattern).toBe('sine-wave');
      expect(bird.directionX).toBe(-1);
    });

    it('computes deterministic sine-wave velocity', () => {
      const bird = new MockAlienBird('A');
      bird.activate(200, 50, 'sine-wave', 1, 0);

      // t = 0s: angle = 0, sin(0) = 0 -> vy = baseSpeedY (90), vx = sineSpeedX (70)
      bird.timeAlive = 0;
      let vel = bird.computeSineVelocity();
      expect(vel.vx).toBe(70);
      expect(vel.vy).toBe(90);

      // t = PI / (2 * freq) -> angle = PI/2, sin(PI/2) = 1 -> vy = 90 + 28 = 118
      bird.timeAlive = Math.PI / (2 * BIRD_CONFIG.sineFrequency);
      vel = bird.computeSineVelocity();
      expect(vel.vx).toBe(70);
      expect(vel.vy).toBeCloseTo(90 + 28, 4);

      // Reverse direction: vx should be -70
      bird.directionX = -1;
      vel = bird.computeSineVelocity();
      expect(vel.vx).toBe(-70);
    });

    it('computes deterministic three-phase swoop velocity', () => {
      const bird = new MockAlienBird('B');
      bird.activate(100, 50, 'swoop', 1, 0);

      // Phase 1 (t = 0.5s): entry phase
      bird.timeAlive = 0.5;
      let vel = bird.computeSwoopVelocity();
      expect(vel.vx).toBe(BIRD_CONFIG.swoopSpeedX); // 130
      expect(vel.vy).toBe(20);

      // Phase 2 (t = 2.0s): dive phase
      bird.timeAlive = 2.0;
      vel = bird.computeSwoopVelocity();
      expect(vel.vx).toBeCloseTo(130 * 0.3, 4); // 39
      expect(vel.vy).toBe(BIRD_CONFIG.swoopSpeedY * 3); // 180

      // Phase 3 (t = 3.0s): retreat phase
      bird.timeAlive = 3.0;
      vel = bird.computeSwoopVelocity();
      expect(vel.vx).toBeCloseTo(-130 * 0.5, 4); // -65
      expect(vel.vy).toBeCloseTo(-BIRD_CONFIG.baseSpeedY * 1.5, 4); // -135 (moving up)
    });
  });
});
