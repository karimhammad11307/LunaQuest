# Implementation A Steps

This is Developer A's ordered implementation checklist. The [Master Plan](MASTER_PLAN.md) is the source of truth for game requirements; the [Developer A task plan](DEVELOPER_A_TASKS.md) contains ownership, dependencies, estimates, and acceptance criteria. Check [ImplementedFeatureA.md](ImplementedFeatureA.md) for verified completion; this checklist itself does not establish status.

**Feature 1 checkpoint:** the Phaser base world, astronaut movement/collision/animation, five contextual building interactions, and shared-state HUD were implemented and browser-verified. At that checkpoint, A1's reducer/contract work and building economy were pending. See the progress note in the Developer A task plan.

**Feature 2 checkpoint:** the GameSessionStore, pure resource/action rules and run-ID mission contract are implemented and verified. The next Developer A work is building economy and the day/survival loop. Evidence is in [ImplementedFeatureA.md](ImplementedFeatureA.md).

**Feature 8 checkpoint:** A1–A12's current MVP scope has been implemented and verified through a full Chromium five-day campaign. Chicken Hunt is the required mission; Day 2/4 Earth pods supply water; seven learning signs explain the game. Ice Collection is deferred. A13 accessibility/visual QA and A14 deployment/demo delivery remain separate gates. See [ImplementedFeatureA.md](ImplementedFeatureA.md).

**Feature 9 checkpoint:** The earlier five-day victory has been replaced by endless progression at `faacbe4`. Current day equals completed days plus one; the run score prioritizes completed days, and the personal record survives restart. Save schema v3 migrates valid v1/v2 sessions. The then-proposed long-term water and recurring-incident tasks were superseded by the user's Feature 10 scope decision. See [ImplementedFeatureA.md](ImplementedFeatureA.md).

**Feature 10 checkpoint:** A16 implementation `9dc6ca2` made the configured six-Energy Chicken Hunt charge visible and added one original procedural retro audio system with Moon Base/arcade music, action and emergency cues, and independent persistent music/SFX controls. Build, 149 Vitest cases and 11 Chromium scripts passed. Feature 11 is A13 final gameplay polish/QA; Feature 12 is A14 Vercel/demo. No recurring incidents or difficulty scaling are planned.

## 1. A1 — Freeze the shared contract and build the game store

- Review the existing `GameState`, `GameAction`, and `MissionResult` types.
- Define missing event and mission-run details, including how duplicate mission results are rejected.
- Implement the single `GameSessionStore` and pure reducer entry point.
- Add tests for immutable updates, rejected actions, invalid resource spends, and exactly-once mission results.
- Commit the foundation and give Developer B the commit hash, type signatures, scene registration convention, and mission result handoff details.

**Gate:** Developer B can build against the frozen shared contract without inventing parallel types or resource logic.

## 2. A2 — Connect the app shell to Phaser

- Mount one Phaser game instance from React.
- Set up Boot and scene registration, logical game dimensions, pixel rendering, responsive scaling, and the store/coordinator bridge.
- Ensure game instances, subscriptions, and listeners are cleaned up on unmount and scene shutdown.

**Gate:** the app loads and tears down cleanly without duplicate listeners or console errors.

## 3. A3–A4 — Build the Moon Base and astronaut

- Create the walkable pixel-art base, terrain, paths, building footprints, and world bounds.
- Add four-direction WASD/arrow movement, normalized diagonal speed, collisions, depth sorting, and idle/walk animation.
- Add nearby-building highlights and `E` plus pointer/tap interaction.

**Gate:** the astronaut moves within the world and can identify and interact with nearby buildings.

## 4. A5 — Make the buildings interactive

- Connect the habitat, greenhouse, solar array, shield/shelter, and landing pad to typed actions.
- Show building state, action costs, and feedback for successful and unavailable actions.
- Keep mission launch options safely unavailable until their scenes are integrated.

**Gate:** each building changes game state or explains why its action cannot happen.

## 5. A6–A8 — Implement survival and base systems

- Centralize tuning in `src/game/config/balance.ts`.
- Implement day advancement, resource consumption/production, warnings and health consequences. The original five-day victory was superseded by A15; current play ends only on defeat.
- Implement greenhouse planting, one-day growth, and harvest.
- Implement solar generation, shield energy/protection, and building repairs.
- Test costs, resource boundaries, failures, and recovery paths.

**Gate:** a player can complete a resource cycle and see each action's consequences through the shared rules.

## 6. A9 — Add incidents and choices

- Implement the radiation warning and shelter response, then the oxygen leak event.
- Give each event distinct choices, visible resource/health consequences, and short educational feedback.
- Make event logic deterministic in unit tests and use the same domain rules for preview and resolution.

**Gate:** choices have different outcomes, warnings are understandable, and no event silently resolves.

## 7. A10–A11 — Add NASA context and save/resume

- Add the DONKI adapter with live, cached, demo, and offline behavior, attribution, timeouts, and response validation.
- Clearly label game risk, radiation exposure, and thermal conditions as simulations; do not expose secrets in client code.
- Add validated, versioned LocalStorage saves, continue, new game, restart, and safe handling of corrupted data.

**Gate:** the game remains playable offline and saves can be loaded or safely rejected.

## 8. A12 — Verify Chicken Hunt and add Earth cargo/learning

- Register Chicken Hunt and enforce its launch requirements/cost centrally.
- Receive and validate the shared `MissionResult` contract.
- Apply resources, damage, and XP exactly once, return to the base, and persist the resulting state.
- Schedule collectible Earth water pods on Days 2 and 4; award 25 water once per pod through typed domain rules and persist their IDs.
- Add seven player-opened WHAT/WHY/YOUR MISSION learning signs and verify the initial five-day water/food loop. Post-Day-4 water sustainability remains a documented endless-play limitation.
- Keep mission scene internals in Developer B-owned files.

**Gate:** Chicken Hunt success, failure, duplicate completion, return and save behavior work through the shared store; both Earth pods and all seven learning locations work. Ice Collection is a future enhancement.

## 9. A15 — Endless survival and personal record (implemented)

- Remove automatic day-five victory while retaining daily costs, emergencies and defeat.
- Derive score as completed days × 1,000 plus at most 999 XP points; persist personal best independently of the active run.
- Migrate valid v1/v2 saves to v3, and show days/score/best on a pixel-art Game Over screen.
- Verify Day 6 in Chromium, Days 10/20 in domain tests, and record safety through refresh/restart.

**Gate:** no day cap; longer survival always ranks higher; a terminal save cannot resume as active play.

## 10. A16 — Retro audio and launch-cost visibility (implemented)

- Show Chicken Hunt's configured six-Energy launch cost and immediate before/after Energy in the Landing Pad, mission banner, HUD and notice.
- Use one AudioService across the React shell and Phaser scenes, with original procedural base/arcade chiptunes and short cues for buildings, combat, emergencies, pickups and outcomes.
- Persist separate music/SFX toggles and volumes plus mute outside the survival save. Unlock after a user gesture; pause and hidden tabs stop playback.
- Verify charge once, no refund, refresh safety, audio transitions, controls and browser behavior.

**Gate:** one charge per launch, no double music or alarm, saved audio settings and no changes to survival resources from audio.

## 11. A13 / Feature 11 — Final gameplay polish and QA

- Run domain unit tests and browser gameplay tests for start, movement, buildings, missions, incidents, endless day progression, defeat/record/restart, and save/resume.
- Inspect desktop and mobile screenshots; fix clipping, unreadable controls, focus/accessibility issues, broken interactions and audio usability.
- Keep the existing scripted incidents and current game balance; recurring incidents and difficulty scaling are out of scope.

**Gate:** the complete local gameplay loop, accessibility pass and visual/audio QA have recorded evidence.

## 12. A14 / Feature 12 — Vercel deployment and hackathon demo

- Build and deploy the static app, verify the deployed flow and offline demo mode, and prepare a demo save, recording backup, and presentation materials.
- Report only results from checks actually run.

**Gate:** the deployed MVP is playable and the three-minute demonstration plus five-slide deck are ready.

## Implementation guardrails

- The original A1–A12 implementation order is historical. Features 9 and 10 are complete; A13/Feature 11 QA and A14/Feature 12 delivery remain open. Post-Day-4 water balance is a known limitation.
- A owns the shared domain, balance/configuration, app shell, base gameplay, services, integration, and deployment.
- Keep one canonical `GameState`, `GameAction`, and `MissionResult`. Phaser scenes dispatch actions; the domain/store alone changes shared resources and awards mission rewards.
- Keep all game quantities illustrative and NASA observations distinct from simulated hazards.
- Follow the P0/P1/P2 priorities and detailed acceptance criteria in [DEVELOPER_A_TASKS.md](DEVELOPER_A_TASKS.md). Cut optional polish before compromising the core playable loop.
