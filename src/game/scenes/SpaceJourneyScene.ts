import Phaser from 'phaser';
import { createJourneyArt } from '../art/journeyArt';
import { createPixelArt } from '../art/pixelArt';
import { JOURNEY_STAGE_MS } from '../config/journey';
import { PALETTE as P } from '../config/palette';
import type { AudioCue } from '../../services/AudioService';

interface JourneyCallbacks {
  complete: () => void;
  stage: (index: number) => void;
  cue: (cue: AudioCue) => void;
  reducedMotion: boolean;
}

/** A self-contained, non-interactive Phaser opening. It never receives GameSessionStore. */
export class SpaceJourneyScene extends Phaser.Scene {
  public stageIndex = 0;
  private done = false;
  private landed = false;
  private readonly callbacks: JourneyCallbacks;
  private farStars!: Phaser.GameObjects.TileSprite;
  private nearStars!: Phaser.GameObjects.TileSprite;
  private earth!: Phaser.GameObjects.Image;
  private moon!: Phaser.GameObjects.Image;
  private lander!: Phaser.GameObjects.Image;
  private ground!: Phaser.GameObjects.Container;
  private padLight!: Phaser.GameObjects.Rectangle;
  private lastEngineAt = 0;

  constructor(callbacks: JourneyCallbacks) {
    super('SpaceJourneyScene');
    this.callbacks = callbacks;
  }

  create(): void {
    try {
      createJourneyArt(this);
      createPixelArt(this); // Reuse the exact Landing Pad sprite seen in the playable base.
      this.cameras.main.setBackgroundColor(P.spaceDeep);
      this.add.rectangle(320, 180, 640, 360, 0x12172f).setDepth(-10);
      this.farStars = this.add.tileSprite(0, 0, 640, 360, 'journey-stars-far').setOrigin(0).setDepth(-8);
      this.nearStars = this.add.tileSprite(0, 0, 640, 360, 'journey-stars-near').setOrigin(0).setDepth(-7);
      this.earth = this.add.image(140, 195, 'journey-earth').setScale(1.5).setDepth(1);
      this.moon = this.add.image(720, 190, 'journey-moon').setScale(0.3).setDepth(2);
      this.ground = this.add.container(0, 0).setDepth(4).setAlpha(0);
      this.ground.add(this.add.image(320, 270, 'journey-ground'));
      this.ground.add(this.add.image(320, 270, 'bld-landingPad').setScale(1.75));
      this.ground.add(this.add.rectangle(320, 272, 82, 6, 0x4edce5, 0.28));
      this.padLight = this.add.rectangle(320, 283, 12, 4, 0xffd75e).setAlpha(0.3);
      this.ground.add(this.padLight);
      this.lander = this.add.image(203, 241, 'journey-lander-0').setAngle(62).setDepth(6);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.time.removeAllEvents();
        this.tweens.killAll();
      });
      if (this.callbacks.reducedMotion) {
        this.stageIndex = 3;
        this.callbacks.stage(3);
        this.earth.setVisible(false);
        this.moon.setVisible(false);
        this.ground.setAlpha(1);
        this.lander.setPosition(320, 205).setAngle(0).setTexture('journey-lander-2');
        this.time.delayedCall(1400, () => this.finish());
      } else this.startStage(0);
    } catch {
      // Missing canvas/texture support must not trap a first-time player.
      this.finish();
    }
  }

  update(time: number, delta: number): void {
    if (this.done || this.callbacks.reducedMotion) return;
    const travel = Math.min(delta, 80);
    this.farStars.tilePositionX += travel * 0.006;
    this.nearStars.tilePositionX += travel * 0.023;
    this.nearStars.tilePositionY -= travel * 0.003;
    if (!this.landed) {
      this.lander.setTexture(`journey-lander-${Math.floor(time / 130) % 2}`);
      if (time - this.lastEngineAt > 930) {
        this.lastEngineAt = time;
        this.callbacks.cue(this.stageIndex === 3 ? 'journeyThrusters' : 'journeyEngine');
      }
    }
    if (this.stageIndex === 3) this.padLight.setAlpha(0.35 + Math.sin(time / 260) * 0.3);
  }

  private startStage(index: number): void {
    if (this.done) return;
    this.stageIndex = index;
    this.callbacks.stage(index);
    if (index === 0) {
      this.callbacks.cue('journeyIgnite');
      this.tweens.add({ targets: this.lander, x: 332, y: 119, angle: 70, scale: 0.94,
        duration: JOURNEY_STAGE_MS, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: this.earth, x: 80, y: 228, scale: 0.97,
        duration: JOURNEY_STAGE_MS, ease: 'Sine.easeInOut' });
    } else if (index === 1) {
      this.tweens.add({ targets: this.lander, x: 492, y: 148, angle: 75,
        duration: JOURNEY_STAGE_MS, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: this.earth, x: -48, y: 256, scale: 0.37,
        duration: JOURNEY_STAGE_MS });
      this.tweens.add({ targets: this.moon, x: 558, y: 187, scale: 0.72,
        duration: JOURNEY_STAGE_MS, ease: 'Sine.easeOut' });
    } else if (index === 2) {
      this.callbacks.cue('journeyThrusters');
      this.tweens.add({ targets: this.lander, x: 355, y: 94, angle: 0, scale: 1.08,
        duration: JOURNEY_STAGE_MS, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: this.moon, x: 419, y: 231, scale: 2.25,
        duration: JOURNEY_STAGE_MS, ease: 'Sine.easeInOut' });
      this.time.delayedCall(JOURNEY_STAGE_MS - 280, () => this.cameras.main.fadeOut(260, 0, 0, 0));
    } else {
      this.lander.setPosition(338, 54).setAngle(0).setScale(1.1);
      this.earth.setVisible(false);
      this.moon.setVisible(false);
      this.ground.setAlpha(1);
      this.cameras.main.fadeIn(380, 0, 0, 0);
      this.tweens.add({ targets: this.lander, x: 320, y: 208, angle: 0, scale: 1.18,
        duration: 2500, ease: 'Sine.easeInOut', onComplete: () => this.touchDown() });
    }
    this.time.delayedCall(JOURNEY_STAGE_MS, () => index === 3 ? this.finish() : this.startStage(index + 1));
  }

  private touchDown(): void {
    if (this.done) return;
    this.landed = true;
    this.lander.setTexture('journey-lander-2');
    for (let i = 0; i < 16; i++) {
      const direction = i % 2 ? 1 : -1;
      const dust = this.add.rectangle(320 + (i % 5) * 3, 252 + Math.floor(i / 5) * 4,
        i % 3 === 0 ? 5 : 3, 3, i % 4 === 0 ? 0xd6d1e6 : 0x9995b2).setDepth(7);
      this.tweens.add({ targets: dust, x: dust.x + direction * (22 + (i % 6) * 11),
        y: dust.y - (i % 3) * 5, alpha: 0, duration: 420 + (i % 4) * 80,
        onComplete: () => dust.destroy() });
    }
    this.callbacks.cue('journeyTouchdown');
    this.callbacks.cue('journeySuccess');
  }

  /** Used by completion, skip and render fallback; the callback can run only once. */
  finish(): void {
    if (this.done) return;
    this.done = true;
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.callbacks.complete();
  }
}
