import Phaser from 'phaser';
import { BUILDING_LAYOUT, INTERACT_RADIUS, SPAWN_POINT, VIEW, WORLD } from '../config/gameConfig';
import { PALETTE as C } from '../config/palette';
import { Building } from '../entities/Building';
import { Astronaut } from '../entities/Astronaut';
import type { GameSessionStore } from '../../domain/store/GameSessionStore';
import type { GameState } from '../../domain/models/types';

export class MoonBaseScene extends Phaser.Scene {
  private store: GameSessionStore;
  private astronaut!: Astronaut;
  private buildings: Building[] = [];
  private activeBuilding: Building | null = null;
  private prompt!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private messageTimer?: Phaser.Time.TimerEvent;
  private lastPositionSync = 0;
  private survivalTime = 0;
  private previousStatus: 'playing' | 'victory' | 'defeat' = 'playing';
  private previousState!: GameState;
  private hazardTint!: Phaser.GameObjects.Rectangle;
  private hazardBadge!: Phaser.GameObjects.Text;
  private leakBadge!: Phaser.GameObjects.Text;
  private unsubscribeStore?: () => void;

  constructor(store: GameSessionStore) {
    super('MoonBaseScene');
    this.store = store;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C.spaceDeep);
    this.physics.world.setBounds(12, 48, WORLD.width - 24, WORLD.height - 60);
    this.drawWorld();

    this.buildings = BUILDING_LAYOUT.map((entry) => new Building(this, entry));
    this.previousState = this.store.getState();
    this.buildings.forEach((building) => building.syncState(this.previousState.buildings[building.entry.id], this.previousState.resources.energy));
    this.astronaut = new Astronaut(this, SPAWN_POINT.x, SPAWN_POINT.y);
    this.astronaut.setDepth(SPAWN_POINT.y + 12);
    this.buildings.forEach((b) => this.physics.add.collider(this.astronaut, b.collision));
    this.children.list.forEach((item) => {
      const obstacle = item.getData('obstacle') as Phaser.GameObjects.Zone | undefined;
      if (obstacle) this.physics.add.collider(this.astronaut, obstacle);
    });

    this.input.keyboard!.on('keydown-E', this.interact, this);
    this.events.on('building-pointer', this.pointerInteract, this);
    const onVirtualInput = (event: Event) => {
      const input = (event as CustomEvent<string | null>).detail;
      if (input === 'interact') this.interact();
      else this.astronaut.setVirtualDirection(input);
    };
    window.addEventListener('moonbound-input', onVirtualInput);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-E', this.interact, this);
      this.events.off('building-pointer', this.pointerInteract, this);
      window.removeEventListener('moonbound-input', onVirtualInput);
    });

    this.prompt = this.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: C.outline,
      backgroundColor: C.yellow, padding: { x: 6, y: 4 },
    }).setOrigin(0.5, 1).setDepth(2000).setVisible(false);
    this.prompt.setResolution(2);
    this.message = this.add.text(VIEW.width / 2, VIEW.height - 18, '', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: C.suitWhite,
      backgroundColor: C.outline, padding: { x: 9, y: 5 },
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(3000).setVisible(false);
    this.message.setResolution(2);
    this.unsubscribeStore = this.store.subscribe(this.onStoreState);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribeStore?.());

    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.astronaut, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(80, 45);
    this.drawSkyOverlay();
    this.hazardTint = this.add.rectangle(0, 0, VIEW.width, VIEW.height, 0xff6b48, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(2502).setVisible(false);
    this.hazardBadge = this.add.text(VIEW.width / 2, 27, '', {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#FFF2D5',
      backgroundColor: '#8A3048', padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2600).setVisible(false);
    this.hazardBadge.setResolution(2);
    const habitat = this.buildings.find((building) => building.entry.id === 'habitat')!;
    this.leakBadge = this.add.text(habitat.x, habitat.y - 60, 'O₂ LEAK!', {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#FFFFFF',
      backgroundColor: '#A13D55', padding: { x: 5, y: 3 },
    }).setOrigin(0.5).setDepth(habitat.depth + 65).setVisible(false);
    this.leakBadge.setResolution(2);
    this.renderEmergency(this.previousState);
    this.showMessage('Walk with WASD or arrows. Visit a building!', 3600);
  }

  private drawWorld(): void {
    const g = this.add.graphics().setDepth(-100);
    g.fillStyle(0x5a5678).fillRect(0, 0, WORLD.width, WORLD.height);
    for (let y = 0; y < WORLD.height; y += 32) {
      for (let x = 0; x < WORLD.width; x += 32) {
        const varied = ((x / 32 * 17 + y / 32 * 11) % 7) < 2;
        this.add.image(x, y, varied ? 'ground-b' : 'ground-a').setOrigin(0).setDepth(-95);
      }
    }
    // Paved crossing and plaza: low stepped tiles preserve the top-down 3/4 perspective.
    const path = this.add.graphics().setDepth(-70);
    const paving = (x: number, y: number) => {
      path.fillStyle(0x6e6a8c).fillRect(x - 2, y - 2, 18, 12);
      path.fillStyle(0xd6d1e6).fillRect(x, y, 14, 8);
      path.fillStyle(0xa8a4c0).fillRect(x + 2, y + 6, 12, 2);
    };
    for (let y = 232; y < 438; y += 14) for (let x = 343; x < 468; x += 18) paving(x, y);
    for (let x = 225; x < 647; x += 17) for (let y = 331; y < 361; y += 14) paving(x, y);
    for (let x = 262; x < 373; x += 17) for (let y = 397; y < 425; y += 14) paving(x, y);
    for (let x = 540; x < 645; x += 17) for (let y = 368; y < 396; y += 14) paving(x, y);
    this.add.text(373, 340, 'MOONBOUND', { fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: C.outlineSoft }).setDepth(-60);
    const craters: [number, number][] = [[86, 177], [680, 164], [124, 398], [748, 443], [497, 90], [185, 92]];
    craters.forEach(([x, y]) => this.add.image(x, y, 'crater').setDepth(y - 40));
    const rocks: [number, number][] = [[95, 293], [163, 247], [524, 177], [728, 322], [738, 207], [520, 444], [55, 454]];
    rocks.forEach(([x, y]) => {
      const rock = this.add.image(x, y, 'rock').setDepth(y);
      const obstacle = this.add.zone(x, y + 5, 16, 9);
      this.physics.add.existing(obstacle, true);
      // Collider is connected after astronaut creation in create().
      rock.setData('obstacle', obstacle);
    });
    const details = this.add.graphics().setDepth(-45);
    for (let i = 0; i < 96; i++) {
      const x = (i * 137 + 43) % WORLD.width;
      const y = (i * 89 + 101) % WORLD.height;
      if (x > 192 && x < 690 && y > 185 && y < 450) continue;
      details.fillStyle(i % 3 ? 0xd6d1e6 : 0x6e6a8c).fillRect(x, y, 2 + i % 2, 2);
    }
    // Small authored props around the plaza.
    const props = this.add.graphics().setDepth(380);
    for (const [x, y] of [[198, 351], [700, 352], [515, 308]]) {
      props.fillStyle(0x292740).fillRect(x - 4, y - 2, 9, 4);
      props.fillStyle(0x6e6a88).fillRect(x - 3, y - 15, 7, 13);
      props.fillStyle(0x4edce5).fillRect(x - 2, y - 16, 5, 4);
    }
    // Flag: unmistakable lunar outpost marker.
    props.fillStyle(0x292740).fillRect(482, 305, 3, 36);
    props.fillStyle(0xffd75e).fillRect(485, 307, 26, 14);
    props.fillStyle(0x8067da).fillRect(485, 321, 26, 4);
    props.fillStyle(0x4edce5).fillRect(489, 311, 8, 7);
  }

  private drawSkyOverlay(): void {
    // Distant sky is camera-fixed, while terrain and structures are world objects.
    const sky = this.add.graphics().setScrollFactor(0).setDepth(2500);
    sky.fillStyle(0x12172f).fillRect(0, 0, VIEW.width, 42);
    sky.fillStyle(0x1b2145).fillRect(0, 40, VIEW.width, 4);
    for (let i = 0; i < 34; i++) {
      const x = (i * 73 + 33) % VIEW.width;
      const y = (i * 19 + 7) % 34;
      sky.fillStyle(i % 4 ? 0x7f7ba6 : 0xd6d1e6).fillRect(x, y, i % 5 === 0 ? 2 : 1, 1);
    }
    sky.fillStyle(0x4edce5).fillRect(535, 8, 17, 3);
    sky.fillStyle(0x4edce5).fillRect(531, 11, 25, 17);
    sky.fillStyle(0x4edce5).fillRect(535, 28, 17, 3);
    sky.fillStyle(0x80e5a0).fillRect(538, 13, 8, 4);
    sky.fillStyle(0x80e5a0).fillRect(545, 21, 7, 4);
    sky.fillStyle(0xd6d1e6).fillRect(535, 12, 3, 7);
    this.add.text(560, 15, 'EARTH', { fontFamily: 'monospace', fontSize: '10px', color: C.terrainLight }).setScrollFactor(0).setDepth(2501);
  }

  private pointerInteract(id: string): void {
    if (this.store.getState().paused) return;
    const building = this.buildings.find((item) => item.entry.id === id);
    if (!building) return;
    if (this.isNear(building)) this.activate(building);
    else this.showMessage(`Walk closer to ${building.entry.label}!`);
  }

  private interact(): void {
    if (this.store.getState().paused) return;
    if (this.activeBuilding) this.activate(this.activeBuilding);
  }

  private activate(building: Building): void {
    this.store.dispatch({ type: 'INTERACT_BUILDING', buildingId: building.entry.id });
    if (building.entry.id === 'shield' && this.store.getState().activeEvent?.type === 'solar-storm'
      && this.store.getState().astronaut.location === 'outside') this.store.dispatch({ type: 'ENTER_SHELTER' });
    const latest = this.store.getState().notices.at(-1);
    this.showMessage(latest?.text ?? `${building.entry.label} ready!`);
    this.cameras.main.flash(120, 78, 220, 229, false);
    this.tweens.add({ targets: building, scale: 1.06, duration: 100, yoyo: true });
  }

  private showMessage(value: string, duration = 2400): void {
    this.messageTimer?.remove(false);
    this.message.setText(value).setVisible(true);
    this.messageTimer = this.time.delayedCall(duration, () => this.message.setVisible(false));
  }

  private onStoreState = (state: GameState): void => {
    const before = this.previousState;
    this.previousState = state;
    if (before.activeEvent !== state.activeEvent || before.status !== state.status) this.renderEmergency(state);
    if (before.activeEvent?.id !== state.activeEvent?.id && state.activeEvent) {
      this.showMessage(state.activeEvent.type === 'solar-storm' ? 'SOLAR STORM! RUN TO SHELTER!' : 'O₂ LEAK! REPAIR THE HABITAT!', 3500);
      this.cameras.main.flash(220, 255, 104, 77, false);
    }
    for (const building of this.buildings) {
      if (before.buildings[building.entry.id] !== state.buildings[building.entry.id]
        || (building.entry.id === 'shield' && before.resources.energy !== state.resources.energy)) {
        building.syncState(state.buildings[building.entry.id], state.resources.energy);
      }
    }
    if (before.status !== 'playing' || state.status !== 'playing') return;
    if (state.activeEvent?.phase === 'danger' && before.astronaut.health - state.astronaut.health >= 1.5) {
      this.floatAt(this.astronaut.x, this.astronaut.y - 30, `-${Math.round(before.astronaut.health - state.astronaut.health)} HP`, '#FF8D63');
      this.cameras.main.shake(90, 0.003);
    }
    if (state.activeEvent?.type === 'oxygen-leak' && state.activeEvent.phase === 'danger'
      && Math.floor(before.resources.oxygen) > Math.floor(state.resources.oxygen)) {
      const habitat = this.buildings.find((building) => building.entry.id === 'habitat')!;
      this.floatAt(habitat.x, habitat.y - 55, '-1 BASE O₂', '#4EDCE5');
    }
    if (before.activeEvent && !state.activeEvent && state.lastEventOutcome) {
      const target = this.buildings.find((building) => building.entry.id === (before.activeEvent?.type === 'oxygen-leak' ? 'habitat' : 'shield'))!;
      this.pixelBurst(target, state.lastEventOutcome.xpEarned ? 0x80e5a0 : 0xff8d63);
      this.showMessage(state.lastEventOutcome.message, 3600);
    }
    const greenhouse = this.buildings.find((building) => building.entry.id === 'greenhouse')!;
    const solar = this.buildings.find((building) => building.entry.id === 'solar')!;
    const shield = this.buildings.find((building) => building.entry.id === 'shield')!;
    if (!before.buildings.greenhouse.cropPlanted && state.buildings.greenhouse.cropPlanted) {
      this.pixelBurst(greenhouse, 0x80e5a0);
      this.floatText(greenhouse, 'SEEDS PLANTED', '#80E5A0');
    } else if (before.buildings.greenhouse.cropPlanted && !state.buildings.greenhouse.cropPlanted) {
      this.pixelBurst(greenhouse, 0xffd75e);
      this.floatText(greenhouse, `+${state.resources.food - before.resources.food} FOOD  +${state.xp - before.xp} XP`, '#FFD75E');
    } else if (before.buildings.greenhouse.cropGrowth < 1 && state.buildings.greenhouse.cropGrowth >= 1) {
      this.pixelBurst(greenhouse, 0x80e5a0);
      this.floatText(greenhouse, 'CROP READY!', '#80E5A0');
    }
    if (state.daysSurvived > before.daysSurvived && state.lastDaySummary && state.lastDaySummary.energyProduced > 0) {
      this.pixelBurst(solar, 0x4edce5);
      this.floatText(solar, `+${state.lastDaySummary.energyProduced} ENERGY`, '#4EDCE5');
    }
    if (before.buildings.shield.active !== state.buildings.shield.active) {
      this.pixelBurst(shield, state.buildings.shield.active ? 0x8067da : 0xff6b81);
      this.floatText(shield, state.buildings.shield.active ? 'SHIELD ON' : 'SHIELD OFF', state.buildings.shield.active ? '#B9A7F5' : '#FF6B81');
    }
    for (const building of this.buildings) {
      const id = building.entry.id;
      if (before.buildings[id].condition !== 'good' && state.buildings[id].condition === 'good') {
        this.pixelBurst(building, 0xffd75e);
        this.floatText(building, id === 'habitat' && state.lastEventOutcome?.choice === 'isolate' ? 'SEALED!' : 'REPAIRED!', '#FFD75E');
      }
    }
  };

  private pixelBurst(building: Building, color: number): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const offsets = [[-22, -44], [-10, -53], [0, -55], [12, -50], [23, -41], [-16, -30], [16, -29]];
    offsets.forEach(([x, y], index) => {
      const pixel = this.add.rectangle(building.x + x, building.y + y, 4, 4, color).setDepth(building.depth + 40);
      this.tweens.add({ targets: pixel, x: pixel.x + (index - 3) * 3, y: pixel.y - 14 - index % 3 * 4,
        alpha: 0, duration: 520 + index * 45, onComplete: () => pixel.destroy() });
    });
  }

  private floatText(building: Building, value: string, color: string): void {
    const label = this.add.text(building.x, building.y - 65, value, {
      fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color,
      backgroundColor: C.outline, padding: { x: 5, y: 3 },
    }).setOrigin(0.5).setDepth(building.depth + 50);
    label.setResolution(2);
    this.tweens.add({ targets: label, y: label.y - 20, alpha: 0, duration: 1050, onComplete: () => label.destroy() });
  }

  private floatAt(x: number, y: number, value: string, color: string): void {
    const label = this.add.text(x, y, value, { fontFamily: 'monospace', fontSize: '10px',
      fontStyle: 'bold', color, backgroundColor: C.outline, padding: { x: 4, y: 2 } })
      .setOrigin(0.5).setDepth(3000);
    label.setResolution(2);
    this.tweens.add({ targets: label, y: y - 18, alpha: 0, duration: 850, onComplete: () => label.destroy() });
  }

  private renderEmergency(state: GameState): void {
    const event = state.status === 'playing' ? state.activeEvent : null;
    this.hazardTint.setVisible(!!event).setAlpha(event ? event.phase === 'danger' ? 0.14 : 0.06 : 0);
    this.hazardTint.setFillStyle(event?.type === 'oxygen-leak' ? 0x4edce5 : 0xff6b48);
    this.hazardBadge.setVisible(!!event).setText(event
      ? event.type === 'solar-storm'
        ? `☀ ${event.phase === 'warning' ? 'STORM IN' : 'STORM'} ${Math.ceil(event.remainingSeconds)}s`
        : event.phase === 'warning' ? `O₂ LEAK IN ${Math.ceil(event.remainingSeconds)}s` : 'O₂ LEAK ACTIVE!'
      : '');
    this.leakBadge.setVisible(event?.type === 'oxygen-leak');
  }

  private isNear(building: Building): boolean {
    const point = building.interactionPoint;
    return Phaser.Math.Distance.Between(this.astronaut.x, this.astronaut.y, point.x, point.y) <= INTERACT_RADIUS;
  }

  update(time: number, delta: number): void {
    const state = this.store.getState();
    const simulationActive = state.status === 'playing' && !state.paused && state.scene === 'moon-base'
      && state.weather.source !== 'loading' && !state.activeMission && !document.hidden;
    if (this.previousStatus !== 'playing' && state.status === 'playing') {
      this.astronaut.setPosition(SPAWN_POINT.x, SPAWN_POINT.y);
      this.survivalTime = 0;
    }
    this.previousStatus = state.status;
    if (simulationActive && state.astronaut.location === 'outside' && !state.selectedBuildingId) this.astronaut.updateMovement();
    else this.astronaut.stopMovement();
    if (simulationActive) {
      this.survivalTime += Math.min(delta, 250);
      if (this.survivalTime >= 250) {
        this.store.dispatch({ type: 'TICK', deltaSeconds: this.survivalTime / 1000 });
        this.survivalTime = 0;
      }
    } else this.survivalTime = 0;
    if (time - this.lastPositionSync > 160) {
      this.store.dispatch({ type: 'MOVE_PLAYER', x: Math.round(this.astronaut.x), y: Math.round(this.astronaut.y) });
      this.lastPositionSync = time;
    }
    let closest: Building | null = null;
    let distance = INTERACT_RADIUS;
    for (const building of this.buildings) {
      const point = building.interactionPoint;
      const d = Phaser.Math.Distance.Between(this.astronaut.x, this.astronaut.y, point.x, point.y);
      if (d <= distance) { closest = building; distance = d; }
    }
    if (closest !== this.activeBuilding) {
      this.activeBuilding?.setApproach(false);
      this.activeBuilding = closest;
      this.activeBuilding?.setApproach(true);
    }
    if (closest && simulationActive && state.astronaut.location === 'outside' && !state.selectedBuildingId) {
      this.prompt.setText(`E  ${closest.entry.label}`).setPosition(closest.x, closest.y - 57).setVisible(true);
    } else this.prompt.setVisible(false);
  }
}
