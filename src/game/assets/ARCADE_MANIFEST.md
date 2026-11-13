# Moonbound — Arcade Asset Manifest (Developer B)

All assets are **procedurally generated at runtime** by
`src/game/assets/arcadeSprites.ts` using only colours from
`src/game/config/palette.ts`. No external image files are
loaded from disk; therefore no copyright attribution is required
beyond the original authorship recorded here.

---

## Attribution

| Item | Author | Licence |
|---|---|---|
| All procedural pixel-art sprites | Developer B (original work, 2026) | Same as project licence |
| Palette | Developer A (Moonbound shared palette) | Same as project licence |

No third-party sprite sheets, fonts, or image packs are used.

---

## Sprite inventory

| Key constant | Phaser texture key | Dimensions | Frames | FPS | Purpose |
|---|---|---|---|---|---|
| `ARCADE_TEXTURE_KEYS.spaceship` | `arcade-spaceship` | 32 × 32 px | 2 | 8 | Player ship: frame 0 = idle, frame 1 = thrust |
| `ARCADE_TEXTURE_KEYS.alienBirdA` | `arcade-alien-a` | 24 × 24 px | 2 | 6 | Enemy type A (1 HP): frame 0 = idle, frame 1 = flap |
| `ARCADE_TEXTURE_KEYS.alienBirdB` | `arcade-alien-b` | 24 × 24 px | 2 | 6 | Enemy type B (2 HP, armoured): frame 0 = idle, frame 1 = flap |
| `ARCADE_TEXTURE_KEYS.laserPlayer` | `arcade-laser-player` | 4 × 14 px | 1 | — | Player projectile (cyan bolt, travels upward) |
| `ARCADE_TEXTURE_KEYS.laserEnemy` | `arcade-laser-enemy` | 4 × 14 px | 1 | — | Enemy projectile (coral bolt, travels downward) |
| `ARCADE_TEXTURE_KEYS.foodGrain` | `arcade-food-grain` | 12 × 12 px | 1 | — | Food collectible dropped by defeated enemies |
| `ARCADE_TEXTURE_KEYS.iceCrystal` | `arcade-ice-crystal` | 12 × 12 px | 1 | — | Water collectible for Ice Collection scene |
| `ARCADE_TEXTURE_KEYS.impactBurst` | `arcade-impact-burst` | 16 × 16 px | 2 | 10 | Hit/explosion effect: frame 0 = flash, frame 1 = fade ring |
| `ARCADE_TEXTURE_KEYS.starfieldFar` | `arcade-stars-far` | 128 × 128 px | 1 | — | Tileable far star layer (dim, dense) |
| `ARCADE_TEXTURE_KEYS.starfieldNear` | `arcade-stars-near` | 128 × 128 px | 1 | — | Tileable near star layer (bright, sparse) |

---

## Palette compliance

Every pixel uses one of the colour tokens in `PALETTE` from
`src/game/config/palette.ts`. The generator maps hex values via
`hexToRgb()` and fills using `ctx.fillStyle`. No arbitrary hex or RGB
value appears in `arcadeSprites.ts`.

---

## Visual direction

| Requirement | Implementation |
|---|---|
| 3/4 top-down perspective | All sprites designed with top-lit highlight rows, foreshortened side view |
| Consistent light direction | Light comes from top-left; darker pixels on bottom-right |
| Limited colour ramps | Maximum 3 ramp steps per hue per sprite |
| Clean pixel edges | No `imageSmoothingEnabled`; `ctx.imageSmoothingEnabled = false` |
| No anti-aliasing | Canvas API integer coordinates; `image-rendering: pixelated` via `index.html` |
| Readable at 640×360 | Minimum feature size ≥ 2 px; silhouettes distinguishable at logical resolution |

---

## Parallax starfield

Two TileSprite layers built from the two star textures:

| Layer | Texture | Scroll speed | Purpose |
|---|---|---|---|
| Far | `arcade-stars-far` | 10 px / sec | Deep space background |
| Near | `arcade-stars-near` | 25 px / sec | Foreground parallax |

Scroll is applied via `tilePositionY` (no object movement), keeping
memory usage constant regardless of play duration.

---

## Dev A integration checklist

The following changes are **required from Developer A** before the
Chicken Hunt scene is available to players. Developer B must not make
these changes independently.

### 1. Register ChickenHuntScene in Phaser game config

In `src/game/scenes/BootScene.ts` (Dev A file, not yet created),
add `ChickenHuntScene` to the Phaser scene list:

```ts
// In BootScene or wherever Phaser.Game is instantiated:
import { ChickenHuntScene } from './ChickenHuntScene';

const config: Phaser.Types.Core.GameConfig = {
  scene: [
    BootScene,
    TitleScene,
    MoonBaseScene,
    ChickenHuntScene,   // ← add this
    IceCollectionScene, // ← add this when B9 is done
    ResultsScene,
  ],
  // ...
};
```

### 2. Flip `available: true` in `gameConfig.ts`

Once B's scene is integrated and tested, Dev A changes:

```ts
// src/game/config/gameConfig.ts
'chicken-hunt': {
  ...
  available: true,  // ← flip from false
  sceneKey: 'ChickenHuntScene',
},
```

### 3. Pass launch data when starting the scene

When the landing pad dispatches `START_MISSION`, Dev A's coordinator
must start the Phaser scene with the typed `ChickenHuntLaunchData`:

```ts
import type { ChickenHuntLaunchData } from './scenes/ChickenHuntScene';

const launchData: ChickenHuntLaunchData = {
  runId: store.getState().activeMission ?? generateRunId(),
  difficulty: 1.0,
  dispatch: store.dispatch,
};

this.scene.start('ChickenHuntScene', launchData);
```

### 4. Handle the return transition

After `finishMission()` calls `this.scene.stop()`, Dev A's
MoonBase coordinator should restart/resume MoonBaseScene.
No code change is needed in B's files for this.

---

## Known limitations (intentional for Phase 1)

- No gameplay entities (ship, enemies) exist yet — added in Phase 2.
- No HUD, timer, or score display — added in Phase 3.
- `IceCollectionScene` does not exist yet — added in Phase 4 (B9).
- Animation frame registration is complete; Phaser `anims.create()`
  calls are added in Phase 2 to avoid creating animations before the
  scene is active.
