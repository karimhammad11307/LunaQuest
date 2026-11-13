# Developer A — Base, survival, and integration tasks

**Branch:** `feat/base-survival` (already the working feature branch). **Role:** shared-contract owner and integration lead. **Authority:** [MASTER_PLAN.md](MASTER_PLAN.md) controls requirements; this file sequences A-owned implementation. Target delivery is a 20-hour elapsed two-person effort.

## Ownership boundaries

Developer A owns `src/domain/**`, `src/game/config/**`, React shell `src/app/**`, base scenes/entities, NASA/Save services, base assets and deployment. Specific primary paths:

```text
src/domain/models/**                 shared contracts (A edits/merges)
src/domain/rules/**                  reducer, survival/event/reward rules
src/domain/store/GameSessionStore.ts
src/app/**                           React host, HUD, title/results/overlays
src/game/scenes/BootScene.ts
src/game/scenes/TitleScene.ts
src/game/scenes/MoonBaseScene.ts
src/game/scenes/ResultsScene.ts
src/game/entities/Astronaut.ts
src/game/entities/Building.ts
src/game/config/**                   palette, balance, scene/layout/mission config
src/services/NASAWeatherService.ts
src/services/SaveService.ts
src/services/AudioService.ts         shared preferences/common UI sounds only
src/assets/tiles/**, src/assets/sprites/base/**
tests/unit/domain/**, tests/e2e/base/**
Vercel config, README run/deploy details
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
| **A6 — 1.75 h** | Survival/day loop; depends A1/A5. | Central balance values; day advance applies food/water/base O₂/energy production/consumption, health thresholds, win at day 5 and defeat; pre-action forecast and post-action summary. Unit tests at boundaries and successful five-day recovery path. |
| **A7 — 0.75 h** | Greenhouse; depends A6. | Plant checks/spends water+energy; one-day crop growth; harvest adds food and configured small O₂ benefit; seed/sprout/ready/harvest visuals. Test cost, invalid spend, timing, output. |
| **A8 — 0.75 h** | Solar/shield/repairs; depends A6. | Solar generation/storage; once/day collection if configured; shield energy cost/protection ring/status; repair transitions. Test energy constraints and visible operating/damaged state. |
| **A9 — 1.25 h** | Incidents; depends A6/A8. | Radiation warning with countdown/shelter interaction, oxygen leak repair/isolate/ignore, plus power/thermal/communication incident if time. Typed options, different costs/outcomes, visible alarm and outcome/learning feedback. Deterministic unit tests for each MVP event choice. |
| **A10 — 0.75 h** | NASA adapter; depends A1/A9. | DONKI normalization (`FLR`, `CME`, `SEP`, notifications), timeout/validation, bounded date query, 6-hour cache, live/cached/demo states and offline fixture. Attribution + limitations and no key in source. Test malformed/rate-limit/offline; full game works in demo. |
| **A11 — 0.75 h** | Save/resume; depends A1/A6. | Versioned LocalStorage envelope and schema validation/migration; save meaningful base progression, new/continue/restart, corruption fallback. Unit tests old version, malformed, bounded values and valid round trip. |
| **A12 — 1.5 h** | B integration; depends B2/B3/B5 and contract handoff. | Register mission scenes, enforce launch costs and exactly-once result processing, return to base, update rewards/XP/save; do not edit B internals. Run mission success/failure and duplicate-result checks. |
| **A13 — 1.5 h** | QA/accessibility/visual polish; depends A5–A12. | Unit suite and Playwright complete flow; keyboard/pointer/mobile, focus labels, no horizontal overflow, reduced motion, screenshot review and defect fixes. Include victory and defeat/restart. |
| **A14 — 0.75 h** | Deployment/demo; depends A13. | Static Vercel config and public build; clean build + deployed playthrough, offline demo mode, secret scan, known-good save/video backup and A-owned slide/demo evidence. |

Estimates are focused effort, approx. 16.75 h A-owned tasks including integration; remaining elapsed schedule includes shared review, polish and gates. Protect integration/QA time; reduce optional event breadth before core functionality.

## 20-hour shared wall-clock schedule

Both task files use the same schedule. Hours are elapsed from kickoff; tasks may overlap only across owned files. **A starts first** and spends H0–1.5 on A1. **B may start B1 at H0.5** against the documented palette/art constraints, but must not create contract-dependent scene code until A sends the A1 commit. B branches from that hash no later than H1.5.

| Elapsed | Developer A | Developer B | Gate |
|---|---|---|---|
| H0–1.5 | A1 shared contract/store foundation | B1 original asset sketches/manifest starts after palette read | A1 commit and written contract handoff at H1.5 |
| H1.5–4 | A2 Phaser shell; A3 base world start | B1 finish assets; B2 Chicken Hunt scene scaffold | Canvas/base and scene conventions usable |
| H4–7 | A3 finish; A4 astronaut; A5 interactions | B3 controls; B4 enemy patterns; B5 combat | Base walk/interact; Chicken Hunt playable |
| H7–10 | A6 survival; A7 greenhouse; A8 solar/shield | B6 pickups; B7 timer/return; B8 typed result; B9 Ice Collection start | Day/resource loop + first mission results |
| H10–13 | A9 events; A10 DONKI; A11 save | B9 Ice Collection; B10 effects; B11 sound | Events/offline data/save; both activities playable |
| H13–16 | A12 integrate; A13 test start | B12 arcade tests; B13 integration support; B14 polish | Merged five-day playthrough gate |
| H16–18 | A13 complete, fix defects | B12 browser/visual checks and captured arcade proof | Build, unit/e2e tests, desktop/mobile screenshots |
| H18–20 | A14 deploy/demo; integration owner leads rehearsal | B prepares mission demo/video and arcade/presentation content | Public MVP and rehearsed 3-minute demo, 5-slide deck |

## Milestones and integration responsibilities

1. **H1.5 contract freeze:** A validates current source contract; B acknowledges exact commit. Neither duplicates or forks types.
2. **H4 rendered base:** A's canvas, map and astronaut work; B's scene scaffold launches independently with placeholder state.
3. **H10 functioning loop:** day costs, crop/energy/shield and Chicken Hunt result work through store.
4. **H13 playable missions/events:** both missions, emergency decisions, local save and NASA demo/live labels work.
5. **H16 integration gate:** B PR/merge request targets A branch; A resolves conflicts and verifies no scene resource writes, duplicate formulas or double rewards.
6. **H18 QA gate:** clean build, Vitest, Playwright complete success/failure loop and visual QA.
7. **H20 delivery:** deployed game/demo, recording backup, credits/data limitation, 3-minute demo and five slides.

## NASA, tests and definition of done

A owns DONKI service and data honesty, save schema, app integration, survival and browser end-to-end suite. B owns arcade unit/browser tests, sprite manifest/credits and mission result paths. Shared test requirements live in MASTER_PLAN. Do not claim unrun tests. Do not ship NASA key in browser bundle; demo fixture always permits offline play.

**Definition of Done for A:** one authoritative state/store/reducer; five-day loop with all survival stats and recovery; interactive pixel-art base/astronaut/buildings; farm/solar/shield/repair; at least radiation and oxygen incidents; validated NASA live/cache/demo adapter or documented demo fallback; save/resume; both missions integrated only through shared result contract; tests/build/visual QA pass; deploy/demo material ready; documentation accurately reflects current implementation.

## Priority order

- **P0:** contract/store, playable shell/base/movement, day/resource/win-loss loop, greenhouse, solar/shield, radiation + oxygen incident, mission contract and both mission returns, save/resume, offline playable, build/e2e proof.
- **P1:** DONKI live mode/cache polish, full visual feedback, Ice hazard variants, accessibility refinements, demo recording and Vercel delivery.
- **P2:** extra incident variants, ambient audio, optional mission bonuses, expanded data/source exploration. Cut P2 first to protect the MVP deadline.
