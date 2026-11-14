# Developer A — Base, survival, and integration tasks

**Branch workflow:** The user manages the current feature branch; `feat/base-survival` was the original plan branch, not a required checkout for later features. **Role:** shared-contract owner and integration lead. **Authority:** [MASTER_PLAN.md](MASTER_PLAN.md) controls requirements; this file sequences A-owned implementation. Target delivery is a 20-hour elapsed two-person effort.

## Ownership boundaries

### Feature 1 progress (verified locally)

The first playable Moon Base is implemented on `feat/base-survival`: Phaser boot/base scenes, individually generated pixel textures, the five separate building objects, astronaut movement and animation, static collisions, contextual interactions, and a React HUD subscribed to the shared state. A minimal `GameSessionStore` supports movement and interaction notices only. The existing survival-rule tests remain intact. `npm run build`, `npm test` (four starter tests), and `node tests/feature1.mjs` passed; the browser check covered five building interactions and collision stops, walk/idle frames, HUD values, and desktop/mobile screenshots. Art source and licensing are in `src/assets/manifest.json`.

**At the Feature 1 checkpoint,** the pure reducer, action validation, mission idempotency and shared contract freeze were still pending under A1. Building economy and resource actions remained under A5. Feature 1 alone did not complete those tasks.

**Feature 2 progress:** The shared store, pure typed action reducer, validated resource rules, provisional mission state, exactly-once mission results and non-mission XP reward IDs are implemented and verified at `6231e69`. See [ImplementedFeatureA.md](ImplementedFeatureA.md) for evidence and the Developer B handoff. Event rules, full daily survival, building economy and save/resume remain future work. Existing Feature 1 browser behavior was rechecked after the store change.

**Feature 3 progress:** The habitat/shelter interactions and core five-day survival loop are implemented at `836f340` on `building-survival`. Eating, suit refill, rest, daily costs, warnings, victory/defeat and restart are verified. Greenhouse/solar production, shield upgrades, incidents and persistence remain future tasks. See [ImplementedFeatureA.md](ImplementedFeatureA.md) for test evidence. The A5/A6 plan table below records the original schedule; Feature 3 fulfills the scoped interactions and survival foundation, while production and event work remain A7–A9.

**Feature 4 progress:** A7–A8 greenhouse planting/one-day growth/harvest, solar daily charging, shield activation/upkeep/protection, and simple building repairs are implemented and verified at `290288b` on the user-managed current branch. Build, 34 Vitest cases, and Feature 1/3/4 Chromium checks passed. See [ImplementedFeatureA.md](ImplementedFeatureA.md). Incident-driven damage and timed solar warnings remain A9, while NASA data and persistence remain later tasks.

**Feature 5 progress:** A9's required scripted solar storm and oxygen leak are implemented at `5e8ee0c` on the user-managed current branch. Countdown, shelter/shield protection, radiation HP damage, habitat leak repair, section isolation, distinct costs, XP and once-only outcomes use the shared domain store. `npm run build`, 64 Vitest cases and Feature 1/3/4/HP/Feature 5 Chromium checks passed. See [ImplementedFeatureA.md](ImplementedFeatureA.md). The optional power incident was deferred; A10 NASA data and A11 persistence remain next A-owned work.

**Feature 6 progress:** A10's NASA DONKI service, normalizer, six-hour cache, explicit live mode, default historical demo mode, partial-coverage labeling, offline fallback and compact Moon Base panel are implemented at `789d294` on the user-managed current branch. The weather-to-game mapping supplies educational context only; A9's scripted storm timing and damage are unchanged. `npm run build`, 76 Vitest cases and Feature 1/3/4/HP/5/6 Chromium checks passed. A real browser request obtained CME, SEP and notifications records, while FLR returned 404 and was marked partial. See [ImplementedFeatureA.md](ImplementedFeatureA.md). A11 save/resume remains the next A-owned task; Developer B mission integration is separate.

**A12 integration checkpoint at the earlier merge:** Local merge `cc857d9` registered Chicken Hunt in the existing React/Phaser shell, enabled its landing-pad launch, passed a unique run ID, and returned results through the single reducer. The Moon Base and other A-owned features remained in place. Build, 113 Vitest cases and the Chicken Hunt plus Feature 1/3/4/HP/5/6 Chromium checks passed. At that time A12 was partial: save/resume and the then-planned Ice Collection remained. See [PROJECT_HISTORY.md](PROJECT_HISTORY.md).

**Feature 7 progress:** A11 versioned LocalStorage save/Continue/New Game/Restart is implemented at `149af56` on the then-current user-managed branch. Interrupted Chicken Hunt runs forfeit rewards and retire their run IDs; emergency warnings restart without undoing damage or awarding XP. Build, 123 Vitest cases and Feature 1/3/4/HP/5/6/7 plus Chicken Hunt Chromium checks passed. Ice Collection was still planned at this checkpoint but was later deferred by the user. See [ImplementedFeatureA.md](ImplementedFeatureA.md).

**Feature 8 progress:** A12 implementation `9d7aa26` on user-managed `Feature-8--Mission-Integration-(A12)` independently verified Chicken Hunt movement, shooting, food pickup, safe/failed return, store rewards and eating; added Day 2/4 Earth water pods (+25 each), saved once-only delivery IDs with v1→v2 migration, and seven learning signs/panels. Starting water is 40 against 9/day. Build, 129 Vitest cases, eight existing Chromium regressions and a full Feature 8 Chromium five-day run passed. Ice Collection is now a deferred enhancement, not a required MVP scene. A13 accessibility/QA polish and A14 deployment remain separate work; no deployment was performed. See [ImplementedFeatureA.md](ImplementedFeatureA.md).

**Feature 9 progress:** A15 implementation `faacbe4` on the then-current user-managed branch replaced the five-day finish with endless day progression, a completed-day/XP score, separate persistent personal records, a new Game Over result, and save v3 migration from valid v1/v2 sessions. Build, 139 Vitest cases and ten Chromium scripts passed. Its then-planned A16 water economy and A17 recurring incidents were superseded by the later Feature 10 scope decision. See [ImplementedFeatureA.md](ImplementedFeatureA.md).

**Feature 10 progress:** A16 implementation `9dc6ca2` on the user-managed Feature 10 branch retained the reducer's six-Energy Chicken Hunt charge and made it explicit in the Landing Pad, launch banner, notice and HUD. One `AudioService` plus original Web Audio synth supplies base/arcade chiptunes, action/combat/emergency cues and saved settings. Build, 149 Vitest cases and 11 Chromium scripts passed. The only Developer B-owned edits are optional cue callbacks in the existing combat scene/system; combat rules and rewards are unchanged. Feature 11 is A13 final gameplay polish/QA; Feature 12 is A14 Vercel/demo. Post-Day-4 water balance remains a known limit, with no recurring incidents or difficulty scaling planned.

**Feature 11 progress:** A13 implementation `d798f21bd246a890e5d136cf5d77163966eacd01` on the user-managed `Feature-11-—-Final-Gameplay-Polish-&-QA` branch adds E entry/Q safe exit and hidden indoor astronaut for Habitat, Greenhouse and Shelter; keyboard building menus; once-daily Habitat oxygen recycling (8 Energy → up to 15 base O₂); one queued/once-only solar storm on every day transition from Day 2; a 360-degree touch joystick for the base and Chicken Hunt; viewport-filling responsive play and optional fullscreen. Save v4 migrates valid v1–v3 progress and persists the new cooldown/incident queue. `npm run build`, 156 Vitest cases and Chromium Feature 8, 10 and 11 flows passed, including mobile portrait/landscape and arcade touch controls. Developer B's combat rules were preserved; two B-owned files received only touch input adapters. Post-Day-4 water balance remains limited. Feature 12/A14 deployment and demo remain open; no extra difficulty scaling was added.

Developer A owns `src/domain/**`, `src/game/config/**`, React shell `src/app/**`, base scenes/entities, NASA/Save services, base assets and deployment. Specific primary paths:

```text
src/domain/models/**                 shared contracts (A edits/merges)
src/domain/rules/**                  reducer, survival/event/reward rules
src/domain/store/GameSessionStore.ts
src/app/**                           React host, HUD, title/results/overlays
src/game/scenes/BootScene.ts
src/game/scenes/MoonBaseScene.ts
src/game/entities/Astronaut.ts
src/game/entities/Building.ts
src/game/entities/EducationSign.ts
src/game/entities/EarthSupplyPod.ts
src/game/config/**                   palette, balance, scene/layout/mission config
src/game/art/pixelArt.ts             original base textures and tiles
src/services/NASAWeatherService.ts
src/services/SaveService.ts
src/services/HighScoreService.ts
src/assets/manifest.json, src/assets/data/demoSpaceWeather.json
src/domain/**/*.test.ts, src/services/**/*.test.ts, src/game/config/education.test.ts
tests/feature*.mjs, tests/healthFoodAudit.mjs, tests/merge-chicken-hunt.mjs
Vercel config (A14 future), README run/deploy details
```

Do not implement Chicken Hunt/Ice Collection internals, ship/enemy/projectile entities or arcade effects. Developer B owns those files. Avoid editing B's assets/tests during parallel work. All requirements, contracts, style palette and science limitations are in MASTER_PLAN.

## Shared contract and dependencies

The starting contract exists at `src/domain/models/types.ts` and `GameAction.ts`, but is a draft. Task A1 validates/freezes it, including `GameState`, `GameAction`, `MissionResult`, scene startup/result flow, and durable mission-run idempotency if required. A writes one handoff commit and exact commit hash; B bases its branch on that commit. A owns subsequent shared contract changes and communicates them before B adapts.

Contract invariants: one canonical state and action union; pure TypeScript rules; scenes dispatch actions only; store alone applies resources, XP, costs, and each mission reward exactly once; balance constants are centralized; same palette/scene keys across both branches. B never writes shared models, balance, or the session store.

## Task sequence with deliverables and acceptance

| ID / estimate | Task and dependency | Deliverable and acceptance criteria |
|---|---|---|
| **A1 — 1.5 h** | Shared contracts + store/rules; starts H0, first task; no dependency. | Reconcile existing models/actions with MASTER_PLAN; define active mission/run ID, event choices, terminal state and validation; create `GameSessionStore` (`getState/subscribe/dispatch`) and pure reducer entry. Keep existing starter rules, avoid duplication. Unit tests prove immutable deterministic dispatch, invalid action no partial spend, exactly-once completion. Commit contract/foundation and send B exact SHA, type signatures, scene registration procedure. |
| **A2 — 1.5 h** | Phaser/app foundation; depends A1. | React `GameContainer` mounts Phaser once and cleans up; BootScene, scene-key registry, pixel-art config, logical 640×360, responsive FIT and typed coordinator/store bridge. Smoke test loads and destroys without duplicate listeners/console errors. |
| **A3 — 1.5 h** | Moon Base layout/art; depends A2. | Walkable world bounds/path/crater/rock tiles and five interactive building footprints; original consistent 3/4 pixel-art base palette, backdrop/props, collision separate from art. Screenshot acceptance: world dominates viewport and each target readable at 1x. |
| **A4 — 1.25 h** | Astronaut; depends A2/A3. | Four-direction WASD/arrows, normalized diagonal speed, body/world/building collisions, depth sorting, idle/walk frames, proximity highlight and `E` plus pointer/tap interaction. Verify movement bounds and nearest-target prompt. |
| **A5 — 1.25 h** | Building interactions; depends A1/A3/A4. | Habitat, greenhouse, solar, shield and landing pad each dispatch actions; state-specific visuals and clear action/cost/result prompt; disabled mission entries do not crash. Verify each interaction causes state or explanatory notice. |
| **A6 — 1.75 h** | Survival/day loop; depends A1/A5. | Original milestone implemented daily food/water/base O₂/energy consumption, health thresholds and defeat. Its five-day victory was removed by A15/Feature 9; current progression is endless. Retain boundary and recovery tests. |
| **A7 — 0.75 h** | Greenhouse; depends A6. | Plant checks/spends water+energy; one-day crop growth; harvest adds food and configured small O₂ benefit; seed/sprout/ready/harvest visuals. Test cost, invalid spend, timing, output. |
| **A8 — 0.75 h** | Solar/shield/repairs; depends A6. | Solar generation/storage; once/day collection if configured; shield energy cost/protection ring/status; repair transitions. Test energy constraints and visible operating/damaged state. |
| **A9 — 1.25 h** | Incidents; depends A6/A8. | Radiation warning with countdown/shelter interaction, oxygen leak repair/isolate/ignore, plus power/thermal/communication incident if time. Typed options, different costs/outcomes, visible alarm and outcome/learning feedback. Deterministic unit tests for each MVP event choice. |
| **A10 — 0.75 h** | NASA adapter; depends A1/A9. | DONKI normalization (`FLR`, `CME`, `SEP`, notifications), timeout/validation, bounded date query, 6-hour cache, live/cached/demo states and offline fixture. Attribution + limitations and no key in source. Test malformed/rate-limit/offline; full game works in demo. |
| **A11 — 0.75 h** | Save/resume; depends A1/A6. | Versioned LocalStorage envelope and schema validation; reject unsupported versions until an explicit migration exists. Save meaningful base progression, new/continue/restart, corruption fallback. Unit tests old version, malformed, bounded values and valid round trip. |
| **A12 — 1.5 h** | Chicken Hunt integration, Earth cargo and learning signs; depends B2/B3/B5, A11 and contract handoff. | Verified real flight/shooting/pickup/failure/early return, launch cost, store rewards once, habitat eating and save recovery without editing B internals. Scheduled and persisted Day 2/4 Earth pods with 25 water each and added seven WHAT/WHY/YOUR MISSION interactions. The original five-day browser victory gate passed at Feature 8; A15 superseded it. Ice Collection is deferred. |
| **A13 — original 1.5 h estimate; Feature 11 completed** | Gameplay and UX enhancement; depends A5–A12/A15/A16. | E/Q enclosed-building flow, keyboard menu, once-daily oxygen recycling, daily queued solar warnings, mobile analog movement/arcade touch actions, responsive viewport/fullscreen, regression tests and screenshot review. Implementation `d798f21`; 156 Vitest cases and Chromium Feature 8/10/11 flows passed. No new difficulty scaling. |
| **A14 — original 0.75 h estimate; Feature 12 planned** | Deployment/demo; depends A13. | Static Vercel config and public build; clean build + deployed playthrough, offline demo mode, secret scan, known-good save/video backup, three-minute demonstration and five-slide presentation. |
| **A15 — Feature 9, completed** | Endless survival and high score; depends A6/A11/A12. | Remove five-day victory; keep daily costs and defeat. Derive score from completed days and bounded XP bonus, persist personal best independently, migrate v1/v2 saves to v3, and show Game Over/new record. Verify Day 6 browser play, Day 10/20 domain progression, defeat, restart and refresh. Implementation `faacbe4`. |
| **A16 — Feature 10, completed** | Audio and launch-cost visibility; depends A12/A15. | Preserve the six-Energy domain charge, show exact launch cost and before/after result, reject insufficient/repeated launches, and add one procedural retro AudioService with base/arcade music, gameplay/event cues, persistent controls and browser unlock. Build, 149 Vitest cases and 11 Chromium scripts passed; implementation `9dc6ca2`. |

The original A1–A14 estimates totaled approximately 16.75 h of focused A-owned effort including integration; A15/A16 were later feature work outside that estimate. Feature 11/A13 is now complete. The active remaining roadmap is **Feature 12 = A14 Vercel deployment/demo**. Protect integration/QA time.

## 20-hour shared wall-clock schedule

The table below preserves the original approximately 20-hour MVP schedule as history, including its original B11 audio assignment. Later Feature 10 consolidated audio under A16 with small cue callbacks in B-owned files. Feature 9 changed the target after A12; A15/A16 were implemented separately. Hours below are elapsed from the original kickoff; tasks may overlap only across owned files. **A started first** on A1; B began asset work after the palette read and waited for the shared contract handoff before dependent scene code.

| Elapsed | Developer A | Developer B | Gate |
|---|---|---|---|
| H0–1.5 | A1 shared contract/store foundation | B1 original asset sketches/manifest starts after palette read | A1 commit and written contract handoff at H1.5 |
| H1.5–4 | A2 Phaser shell; A3 base world start | B1 finish assets; B2 Chicken Hunt scene scaffold | Canvas/base and scene conventions usable |
| H4–7 | A3 finish; A4 astronaut; A5 interactions | B3 controls; B4 enemy patterns; B5 combat | Base walk/interact; Chicken Hunt playable |
| H7–10 | A6 survival; A7 greenhouse; A8 solar/shield | B6 pickups; B7 timer/return; B8 typed result; B10 effects start | Day/resource loop + Chicken Hunt results |
| H10–13 | A9 events; A10 DONKI; A11 save | B10 effects; B11 sound; B12 arcade tests start | Events/offline data/save; Chicken Hunt playable |
| H13–16 | A12 integrate; A13 test start | B12 arcade tests; B13 integration support; B14 polish | Original five-day playthrough gate, since superseded by Feature 9 |
| H16–18 | A13 complete, fix defects | B12 browser/visual checks and captured arcade proof | Build, unit/e2e tests, desktop/mobile screenshots |
| H18–20 | A14 deploy/demo; integration owner leads rehearsal | B prepares mission demo/video and arcade/presentation content | Public MVP and rehearsed 3-minute demo, 5-slide deck |

## Milestones and integration responsibilities

1. **H1.5 contract freeze:** A validates current source contract; B acknowledges exact commit. Neither duplicates or forks types.
2. **H4 rendered base:** A's canvas, map and astronaut work; B's scene scaffold launches independently with placeholder state.
3. **H10 functioning loop:** day costs, crop/energy/shield and Chicken Hunt result work through store.
4. **H13 playable mission/events:** Chicken Hunt, Earth water deliveries, emergency decisions, local save and NASA demo/live labels work.
5. **H16 integration gate:** B PR/merge request targets A branch; A resolves conflicts and verifies no scene resource writes, duplicate formulas or double rewards.
6. **H18 QA gate:** clean build, Vitest, Playwright complete success/failure loop and visual QA.
7. **H20 delivery:** deployed game/demo, recording backup, credits/data limitation, 3-minute demo and five slides.

## NASA, tests and definition of done

A owns DONKI service and data honesty, save schema, app integration, survival and browser end-to-end suite. B owns arcade unit/browser tests, sprite manifest/credits and mission result paths. Shared test requirements live in MASTER_PLAN. Do not claim unrun tests. Do not ship NASA key in browser bundle; demo fixture always permits offline play.

**Definition of Done for A's current design:** one authoritative state/store/reducer; endless daily survival with correct completed-day score, preserved personal best, all survival stats and recovery; interactive pixel-art base/astronaut/buildings/learning signs/Earth pods; farm/solar/shield/repair and once-daily Habitat recycling; a recurring once-per-day solar alert plus scripted oxygen leak; validated NASA live/cache/demo adapter or documented demo fallback; save/resume; Chicken Hunt integrated only through shared result contract; retro audio and visible six-Energy launch cost; keyboard/touch/fullscreen play; tests/build/visual QA; deployment/demo material; accurate documentation. Ice Collection is deferred. Feature 12 deployment remains open; post-Day-4 water sustainability is a documented limit.

## Priority order

- **P0:** contract/store, playable shell/base/movement, endless day/resource/defeat loop, score/record, greenhouse, solar/shield/recycling, recurring once-per-day radiation warnings and one scripted oxygen leak, Chicken Hunt result and return, Earth water pods, seven educational interactions, save/resume, offline play, six-Energy launch feedback, retro audio, keyboard/touch controls and build/e2e proof.
- **P1:** Feature 12 public deployment, demo recording, presentation and final cross-device QA.
- **P2:** Lunar Ice Collection, additional supply economy, extra incidents, optional mission bonuses and expanded data/source exploration. These are outside the remaining Feature 12 delivery scope.
