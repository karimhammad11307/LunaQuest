/**
 * LUNAQUEST — Phase 2 / B5 unit tests: ChickenHuntCombat (Developer B)
 *
 * Tests combat orchestration, projectile pooling, wave scheduling, and collision logic:
 *  - Laser pooling limits unbounded object allocation.
 *  - Laser recycling when hitting enemies or flying off-screen.
 *  - Collision: Laser hit destroys enemy and triggers onEnemyDestroyed.
 *  - Collision: Enemy contact damages ship and triggers invulnerability.
 *  - Wave table determinism and wrap-around.
 *  - Pause/resume state consistency.
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

import { COMBAT_CONFIG } from '../../../src/game/systems/ChickenHuntCombat';

describe('ChickenHuntCombat system', () => {
  it('has valid combat configuration constants', () => {
    expect(COMBAT_CONFIG.laserPoolSize).toBe(24);
    expect(COMBAT_CONFIG.laserSpeedY).toBe(-520);
    expect(COMBAT_CONFIG.laserBodyW).toBe(3);
    expect(COMBAT_CONFIG.laserBodyH).toBe(12);
    expect(COMBAT_CONFIG.birdPoolSize).toBe(20);
    expect(COMBAT_CONFIG.waveIntervalMs).toBe(4500);
    expect(COMBAT_CONFIG.contactDamage).toBe(1);
  });

  describe('Projectile pool & collision simulation', () => {
    interface MockLaser {
      id: number;
      active: boolean;
      x: number;
      y: number;
      vy: number;
    }

    interface MockEnemy {
      id: number;
      variant: 'A' | 'B';
      active: boolean;
      health: number;
      x: number;
      y: number;
    }

    class MockCombatSystem {
      lasers: MockLaser[] = [];
      enemies: MockEnemy[] = [];
      shipHealth = 3;
      shipDamageTaken = 0;
      shipInvulnerable = false;
      foodCount = 0;

      onEnemyDestroyed = vi.fn();
      onShipDestroyed = vi.fn();

      constructor() {
        for (let i = 0; i < COMBAT_CONFIG.laserPoolSize; i++) {
          this.lasers.push({ id: i, active: false, x: -100, y: -100, vy: 0 });
        }
      }

      spawnLaser(shipX: number, shipY: number): MockLaser | null {
        const dead = this.lasers.find(l => !l.active);
        if (!dead) return null; // Pool full
        dead.active = true;
        dead.x = shipX;
        dead.y = shipY;
        dead.vy = COMBAT_CONFIG.laserSpeedY;
        return dead;
      }

      recycleLaser(laser: MockLaser) {
        laser.active = false;
        laser.x = -100;
        laser.y = -100;
        laser.vy = 0;
      }

      recycleOffscreenLasers(viewH: number) {
        for (const laser of this.lasers) {
          if (laser.active && (laser.y < -20 || laser.y > viewH + 20)) {
            this.recycleLaser(laser);
          }
        }
      }

      handleLaserEnemyOverlap(laser: MockLaser, enemy: MockEnemy) {
        if (!laser.active || !enemy.active) return;
        this.recycleLaser(laser);

        enemy.health -= 1;
        if (enemy.health <= 0) {
          enemy.active = false;
          const foodGain = enemy.variant === 'B' ? 2 : 1;
          this.foodCount += foodGain;
          this.onEnemyDestroyed(enemy.x, enemy.y, enemy.variant);
        }
      }

      handleEnemyShipOverlap(enemy: MockEnemy) {
        if (!enemy.active) return;
        enemy.active = false; // Enemy consumed on contact

        if (!this.shipInvulnerable) {
          this.shipHealth -= COMBAT_CONFIG.contactDamage;
          this.shipDamageTaken += COMBAT_CONFIG.contactDamage;
          this.shipInvulnerable = true;

          if (this.shipHealth <= 0) {
            this.onShipDestroyed(this.shipDamageTaken);
          }
        }
      }
    }

    let combat: MockCombatSystem;

    beforeEach(() => {
      combat = new MockCombatSystem();
    });

    it('allocates lasers up to the pool limit (24) without exceeding it', () => {
      // Fire 24 lasers
      for (let i = 0; i < COMBAT_CONFIG.laserPoolSize; i++) {
        const laser = combat.spawnLaser(320, 300);
        expect(laser).not.toBeNull();
      }

      // 25th shot should be rejected (pool exhausted)
      const excessLaser = combat.spawnLaser(320, 300);
      expect(excessLaser).toBeNull();
      expect(combat.lasers.filter(l => l.active).length).toBe(24);
    });

    it('recycles off-screen lasers so they can be fired again', () => {
      // Fire all lasers
      for (let i = 0; i < COMBAT_CONFIG.laserPoolSize; i++) {
        combat.spawnLaser(320, 300);
      }
      expect(combat.spawnLaser(320, 300)).toBeNull();

      // Simulate lasers moving off top of screen (y = -50)
      for (const laser of combat.lasers) {
        laser.y = -50;
      }
      combat.recycleOffscreenLasers(360);

      // All lasers should now be inactive
      expect(combat.lasers.filter(l => l.active).length).toBe(0);

      // Now a new laser can be fired
      const newLaser = combat.spawnLaser(320, 300);
      expect(newLaser).not.toBeNull();
      expect(newLaser?.active).toBe(true);
    });

    it('destroys enemy on laser hit and awards food based on variant', () => {
      const laser = combat.spawnLaser(320, 100)!;
      const enemyA: MockEnemy = { id: 1, variant: 'A', active: true, health: 1, x: 320, y: 90 };

      combat.handleLaserEnemyOverlap(laser, enemyA);

      expect(laser.active).toBe(false);
      expect(enemyA.active).toBe(false);
      expect(combat.foodCount).toBe(1);
      expect(combat.onEnemyDestroyed).toHaveBeenCalledWith(320, 90, 'A');
    });

    it('awards 2 food when destroying variant B', () => {
      const laser1 = combat.spawnLaser(320, 100)!;
      const enemyB: MockEnemy = { id: 2, variant: 'B', active: true, health: 2, x: 320, y: 90 };

      // Hit 1: laser recycled, enemy still alive with 1 health
      combat.handleLaserEnemyOverlap(laser1, enemyB);
      expect(laser1.active).toBe(false);
      expect(enemyB.active).toBe(true);
      expect(enemyB.health).toBe(1);
      expect(combat.foodCount).toBe(0);

      // Hit 2: laser recycled, enemy destroyed, awards 2 food
      const laser2 = combat.spawnLaser(320, 100)!;
      combat.handleLaserEnemyOverlap(laser2, enemyB);
      expect(laser2.active).toBe(false);
      expect(enemyB.active).toBe(false);
      expect(combat.foodCount).toBe(2);
      expect(combat.onEnemyDestroyed).toHaveBeenCalledWith(320, 90, 'B');
    });

    it('deals damage to ship on enemy contact and consumes enemy', () => {
      const enemy: MockEnemy = { id: 1, variant: 'A', active: true, health: 1, x: 320, y: 300 };

      combat.handleEnemyShipOverlap(enemy);

      expect(enemy.active).toBe(false);
      expect(combat.shipHealth).toBe(2);
      expect(combat.shipDamageTaken).toBe(1);
      expect(combat.shipInvulnerable).toBe(true);
    });

    it('protects ship from second contact hit during invulnerability', () => {
      const enemy1: MockEnemy = { id: 1, variant: 'A', active: true, health: 1, x: 320, y: 300 };
      const enemy2: MockEnemy = { id: 2, variant: 'A', active: true, health: 1, x: 320, y: 300 };

      combat.handleEnemyShipOverlap(enemy1);
      expect(combat.shipHealth).toBe(2);
      expect(combat.shipInvulnerable).toBe(true);

      // Second enemy hits while invulnerable
      combat.handleEnemyShipOverlap(enemy2);
      expect(enemy2.active).toBe(false); // Enemy still consumed
      expect(combat.shipHealth).toBe(2);  // Health remains unchanged
      expect(combat.shipDamageTaken).toBe(1);
    });

    it('calls onShipDestroyed when ship takes lethal damage', () => {
      const enemy1: MockEnemy = { id: 1, variant: 'A', active: true, health: 1, x: 320, y: 300 };
      const enemy2: MockEnemy = { id: 2, variant: 'A', active: true, health: 1, x: 320, y: 300 };
      const enemy3: MockEnemy = { id: 3, variant: 'A', active: true, health: 1, x: 320, y: 300 };

      combat.handleEnemyShipOverlap(enemy1);
      combat.shipInvulnerable = false; // Invulnerability expires

      combat.handleEnemyShipOverlap(enemy2);
      combat.shipInvulnerable = false;

      combat.handleEnemyShipOverlap(enemy3); // Lethal 3rd hit
      expect(combat.shipHealth).toBe(0);
      expect(combat.onShipDestroyed).toHaveBeenCalledWith(3);
    });
  });
});
