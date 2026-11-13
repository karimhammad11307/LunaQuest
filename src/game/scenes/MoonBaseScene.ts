import Phaser from 'phaser';
import { BUILDING_LAYOUT, INTERACT_RADIUS, SPAWN_POINT, VIEW, WORLD } from '../config/gameConfig';
import { PALETTE as C } from '../config/palette';
import { Building } from '../entities/Building';
import { Astronaut } from '../entities/Astronaut';
import type { GameSessionStore } from '../../domain/store/GameSessionStore';

export class MoonBaseScene extends Phaser.Scene {
  private store: GameSessionStore;
  private astronaut!: Astronaut;
  private buildings: Building[] = [];
  private activeBuilding: Building | null = null;
  private prompt!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private messageTimer?: Phaser.Time.TimerEvent;
  private lastPositionSync = 0;

  constructor(store: GameSessionStore) {
    super('MoonBaseScene');
    this.store = store;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C.spaceDeep);
    this.physics.world.setBounds(12, 48, WORLD.width - 24, WORLD.height - 60);
    this.drawWorld();

    this.buildings = BUILDING_LAYOUT.map((entry) => new Building(this, entry));
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

    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.astronaut, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(80, 45);
    this.drawSkyOverlay();
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
    const building = this.buildings.find((item) => item.entry.id === id);
    if (!building) return;
    if (this.isNear(building)) this.activate(building);
    else this.showMessage(`Walk closer to ${building.entry.label}!`);
  }

  private interact(): void {
    if (this.activeBuilding) this.activate(this.activeBuilding);
  }

  private activate(building: Building): void {
    this.store.dispatch({ type: 'INTERACT_BUILDING', buildingId: building.entry.id });
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

  private isNear(building: Building): boolean {
    const point = building.interactionPoint;
    return Phaser.Math.Distance.Between(this.astronaut.x, this.astronaut.y, point.x, point.y) <= INTERACT_RADIUS;
  }

  update(time: number): void {
    this.astronaut.updateMovement();
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
    if (closest) {
      this.prompt.setText(`E  ${closest.entry.label}`).setPosition(closest.x, closest.y - 57).setVisible(true);
    } else this.prompt.setVisible(false);
  }
}
