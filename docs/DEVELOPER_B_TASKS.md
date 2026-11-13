# Developer B — Arcade and mission tasks

**Branch:** `feat/arcade-missions`, created from Developer A's A1 contract/foundation commit. **Scope:** Chicken Hunt, Ice Collection, original arcade art/effects/audio, mission tests and integration support. **Authority:** gameplay/architecture/science in [MASTER_PLAN.md](MASTER_PLAN.md); shared chronology in [DEVELOPER_A_TASKS.md](DEVELOPER_A_TASKS.md).

## Ownership boundaries

```text
src/game/scenes/ChickenHuntScene.ts
src/game/scenes/IceCollectionScene.ts
src/game/entities/Spaceship.ts
src/game/entities/AlienBird.ts
src/game/entities/Collectible.ts
src/assets/sprites/combat/**
src/assets/sprites/missions/**
src/assets/audio/arcade/**
tests/unit/arcade/**, tests/e2e/arcade/**
```

B owns scene internals and arcade-specific assets/tests. A owns and alone edits `src/domain/**`, `src/game/config/**`, React shell, Moon Base, common event/service code, SaveService and integration. B must not modify `GameState`, `GameAction`, `MissionResult`, balance, `GameSessionStore`, reducer, A's base entities or mission-registration config. If a type/balance/scene convention is insufficient, send a concrete proposal to A; A applies it and sends the new hash. Do not create a second state model, reward calculator or combat framework.

## Shared contracts and required flow

Work from A's exact A1 commit. Read `src/domain/models/types.ts`, `GameAction.ts`, `gameConfig.ts`, and A's scene coordinator instructions before wiring launch/result. Both developers use one `GameState`, one discriminated `GameAction`, and one `MissionResult` contract. Current draft result shape is:

```ts
interface MissionResult {
  missionType: MissionType;
  success: boolean;
  returnedSafely: boolean;
  collectedResources: Partial<Resources>;
  healthDamage: number;
  xpEarned: number;
  duration: number;
  educationalMessage: string;
}
```

The frozen contract may add run ID for idempotency; never independently extend/redeclare it. Scene flow: A validates launch and spends energy → B scene receives typed launch config → B simulates local challenge only → scene emits `COMPLETE_MISSION` with exactly one bounded result → A store validates active run and applies resources/damage/XP once → coordinator returns to Moon Base → save and UI update. A owns scene registration and changes `available: true` only when integration is ready. Use A's palette and mission/balance constants; request changes from A rather than copying values.

## Task sequence with deliverables and acceptance

| ID / estimate | Task and dependency | Deliverable and acceptance criteria |
|---|---|---|
| **B1 — 1.5 h** | Pixel asset pipeline; can start at H0.5 from palette/design spec; scene work waits for A1. | Original spaceship, alien-bird family, laser/projectile, food, ice crystal, impact/explosion sprites; sprite manifest with dimensions/frames/FPS/scale; match palette; include attribution/license record. No copied Chicken Invaders or other game IP. Art reads at logical 640×360. |
| **B2 — 1 h** | Scene scaffold; depends on A1 handoff and B1 rough assets. | `ChickenHuntScene` uses A scene key/start/return convention, creates/disposes all local groups/listeners, start/pause/end states, animated starfield. Smoke launch/return without writing resources. |
| **B3 — 0.75 h** | Ship input; depends B2. | WASD/arrows movement, normalized and bounded; Space fire with cooldown; optional pointer/touch fire/escape. Test keyboard and world bounds. |
| **B4 — 0.75 h** | Enemy behavior; depends B1/B2. | Readable formation/sine/swoop patterns, at least two visual variants, safe spawn boundaries and predictable difficulty; tests or seeded checks show determinism. |
| **B5 — 1.25 h** | Shooting/collision; depends B3/B4. | Phaser Arcade Physics groups for ship/projectiles/enemies; hit, damage, cooldown, destruction/despawn, ship-health cue. No hand-rolled physics or leaks. Test hit and failure path. |
| **B6 — 0.75 h** | Pickups/rewards in scene; depends B5. | Enemies produce food pickups; collision/magnet and collection animation, visible count and floating feedback. Keep amount local until return; scene does not alter `Resources`. |
| **B7 — 0.75 h** | Timer/return/failure; depends B5/B6. | 30–45 second timer, large early-return action, timer auto-return, readable warning; ship destroyed/failure loses unbanked cargo and reports damage but is not automatic campaign defeat. End guard ensures only one terminal path. |
| **B8 — 0.5 h** | MissionResult output; depends B7 and frozen A1 contract. | Emit bounded Chicken Hunt result once with mission type, success/safe return, food, damage, XP, duration and educational line; duplicate finish inputs ignored. Unit test exact-once emission. |
| **B9 — 1.25 h** | Ice Collection; depends B2/B8, A's suit-O₂ action/tick convention. | Compact lunar ice area, crystals, one clear hazard, suit-O₂/thermal pressure as supplied through shared bridge, collect/return control. Safe return banks water only in result; low O₂ applies partial/no cargo and damage according to contract. Emit once. |
| **B10 — 0.75 h** | Animation/effects; depends B1/B5/B6/B9. | Ship thrust, laser/hit flash, small explosion, collection particles, ice feedback, clear scene transition. Respect shared reduced-motion setting; cap particles. |
| **B11 — 0.5 h** | Arcade audio; depends B2 and shared AudioService convention. | Original or properly licensed lightweight SFX, mute preference wired to A's common control, no copyrighted music. All important sounds have visual equivalent. |
| **B12 — 1.25 h** | Tests; depends B5–B9. | Arcade tests for movement, collision, pickup, timer/early return, failure, result bounds/exactly once and restart. Playwright flows run in app shell against deterministic fixtures. |
| **B13 — 1 h** | Integration support; depends A12. | Resolve only B-owned defects; test both scenes through A coordinator; document any shared contract request; confirm launch energy once, rewards once, return/save behavior, no persistent scene listeners. |
| **B14 — 0.75 h** | Visual polish and demo evidence; depends B12/B13. | Review screenshots at desktop/mobile logical scale, repair clipping/pixel blur/difficulty spikes, final asset manifest/credits and capture arcade demo segment/video. |

Estimated B-owned effort is approximately 13 hours; the remaining parallel window is reserved for waiting on contract handoff, feedback, integration, review and demo rehearsal. Do not fill it with unrelated features before P0 completion.

## Shared 20-hour schedule

Same elapsed schedule as [Developer A's task plan](DEVELOPER_A_TASKS.md#20-hour-shared-wall-clock-schedule). Developer A starts H0; B may begin asset pipeline at H0.5 using documented palette/spec. B must not create contract-dependent scene code until A sends the A1 hash at H1.5. B creates `feat/arcade-missions` from that hash.

| Elapsed | Developer B work | Dependency / exit criterion |
|---|---|---|
| H0–1.5 | Read spec; start B1 original sprites/manifest at H0.5 | Match palette and fixed scene scale; wait for A contract. |
| H1.5–4 | Finish B1; B2 Chicken Hunt scaffold | A1 commit received; scene lifecycle understood. |
| H4–7 | B3 ship; B4 enemies; B5 combat | Chicken Hunt move/shoot/collide loop playable. |
| H7–10 | B6 pickups; B7 timer/return; B8 result; begin B9 Ice | Chicken Hunt returns typed result exactly once. |
| H10–13 | Complete B9; B10 effects; B11 sound | Both mission activities playable in isolation with local test fixtures. |
| H13–16 | B12 tests; B13 integration support; B14 first polish | A12 integrates without B editing A-owned shared files. |
| H16–18 | Finish tests/screenshots and integration fixes | Both missions complete in browser; no duplicate rewards/listeners. |
| H18–20 | B14 final arcade polish; mission portion of demo/video and slides | Rehearsal-ready mission; asset/data credits included. |

## Handoff and merge procedure

1. At H1.5 A sends contract commit SHA, result shape, action names, scene keys/data, palette path, game coordinator lifecycle, launch/result examples, and any run-ID rule. B confirms before implementation.
2. B branches from that exact foundation. Changes to A-owned files are prohibited. To request a contract addition, send A the specific field/action, reason, validation rules, and tests that need it. A commits the update; B rebases/merges that contract commit before continuing.
3. B commits in small units with build/test evidence. A reviews B's branch/PR to `feat/base-survival`; B does not merge directly into the base branch. Repository owner approval is required before any push/merge if not already authorized.
4. Integration checks: scene registration/availability; valid start config and launch cost once; mission emits one matching result; resources and XP applied once by store; failure semantics preserved; return scene and save correct; no A files overwritten; unit/browser tests pass.
5. If integration exposes domain defect, A fixes domain/store; B fixes scene internals. Resolve conflicts by ownership, not by copying duplicated logic. Update tests on both sides and record the actual commit/status.

## Priority, tests, and definition of done

- **P0:** Chicken Hunt movement/shooting/collision/timer/food/return/result; Ice collection/oxygen/return/result; both scenes use shared contract and exact-once output; original readable sprites; basic browser/test evidence.
- **P1:** polished combat feedback, touch input, reduced motion, sound/mute, responsive visual QA, mission-specific science copy and demo capture.
- **P2:** enemy variety, bonus objectives, extra effects, optional challenge scaling. Cut first if timeline slips.

B owns unit tests for arcade logic and Playwright mission interactions/screenshots. A owns shared domain/reward, complete campaign, integration, persistence and deployment verification. Avoid tests against unimplemented assumptions; use deterministic seeds and bounded mission results.

**Definition of Done for B:** two original playable mission scenes match visual spec; input/timer/collision and return paths work; resources are carried only in scene-local state until a single typed result is emitted; failure remains recoverable unless shared defeat rules say otherwise; no duplicate contract/state/reward code; tests and visual checks pass; both scenes integrate and return to base/save correctly; assets/sounds are original or licensed/credited; mission demo evidence is ready.
