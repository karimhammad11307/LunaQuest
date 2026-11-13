# Developer A — verified implementation log

Record only Developer A features that were implemented and verified. Add a concise entry after each future Developer A feature; do not mark planned work complete or include Developer B's implementation.

## Feature 1 — Playable Pixel-Art Moon Base

**Status:** Completed. **Implementation commit:** `392000c` (`feat: add playable pixel-art Moon Base`). The later reference-only documentation commit is `98c60fe`.

**Implemented:** Phaser 3 boot and Moon Base scenes; original procedural pixel-art lunar tiles, props and five separate buildings (Habitat, Greenhouse, Solar Array, Radiation Shelter, Landing Pad); four-direction astronaut movement with idle/walk frames; Arcade Physics collisions; nearby `E` and pointer building interactions; compact React resource/health/day HUD subscribed to the same `GameSessionStore` used by Phaser. Art and license details are in `src/assets/manifest.json`.

**Verified:** `npm run build`; four existing Vitest tests; `node tests/feature1.mjs` in Chromium verified walk/idle animation, all five building interactions and collision stops, nearby pointer interaction, initial HUD values and mobile layout without horizontal overflow. Desktop/mobile screenshots were captured and inspected in ignored `artifacts/`.

**Limits:** Building actions are contextual messages; supply economy, missions and day advancement were outside Feature 1.

## Feature 2 — Game State & Survival Foundation

**Status:** Completed. **Implementation commit:** `6231e69` (`feat: add shared game state and mission reward rules`). Branch `feat/game-state` was created from `main` at `98c60fe` after confirming a clean checkout and matching local/remote main commits.

**Implemented:**

- **GameSessionStore:** Single central state owner with typed `getState`, `dispatch`, `subscribe`/unsubscribe and `destroy`; Phaser and React continue sharing the same instance. Accepted actions notify subscribers; rejected actions preserve object identity and send no notification.
- **Game actions:** Added typed collect, atomic spend, XP award, astronaut-status and mission-progress actions. Existing movement/building actions remain functional. Non-mission XP uses a unique `rewardId` ledger.
- **Resource rules:** Pure deterministic `reduceGameState` validates finite bounded amounts, clamps gains to 100, rejects negative/insufficient spends atomically, and avoids direct scene/UI resource arithmetic. Initial notice IDs are deterministic.
- **Mission results:** Shared `MissionResult` requires `runId`. Launch validates mission availability and energy cost, records active mission/provisional progress, and charges once. Completion validates run ID, mission type, outcome and bounded fields; applies resources and XP once on safe success, records completed run IDs, applies damage, stores the applied result and returns to base/result state. Failed or unsafe returns receive zero supplies/XP. Duplicate or malformed completions leave state unchanged.

**Files:** `src/domain/models/types.ts`, `GameAction.ts`; `src/domain/rules/gameRules.ts`, `gameRules.test.ts`, `survivalRules.ts`; `src/domain/store/GameSessionStore.ts`; `src/game/config/balance.ts`.

**Verified:** `npm run build` passed; `npm test` passed 16 tests across two files (12 new, four preserved). The existing Chromium Feature 1 check passed again, including all five building interactions/collisions, animation, HUD, pointer and mobile checks.

**Developer B contract:** Developer A's launch coordinator generates a unique `runId` and dispatches `START_MISSION` with `{ mission, runId }`. It passes that ID to the mission scene. Active state exposes `activeMission`, `activeMissionRunId` and provisional `missionProgress`. A mission scene may dispatch `UPDATE_MISSION_PROGRESS` with the matching run ID; provisional pickups do not update base supplies. On exit, dispatch `COMPLETE_MISSION` with a `MissionResult` containing the same `runId`, mission type, success/safe-return flags, collected resource amounts, health damage, XP, duration and educational message. Dispatch completion exactly once; the store also rejects replayed run IDs. Missions remain unavailable in live `MISSION_CONFIG` until their scenes are integrated by Developer A. Developer B does not need to change the central store.

**Limits:** This feature does not implement daily consumption, greenhouse, radiation events, NASA data, save/resume or any mission scene. The `completedMissionRunIds` and `awardedRewardIds` ledgers are in `GameState`; future persistence must save them for cross-session replay protection.

## Feature 3 — Building Interactions & Survival System

**Status:** Completed. **Implementation commit:** `836f340` (`feat: add building interactions and survival loop`) on the existing `building-survival` branch. No branch was created, switched, merged or pushed.

**Implemented:** Extended the shared `GameState` with astronaut location, completed-day count, selected building and daily summary. Typed actions cover entering/leaving the habitat and shelter, eating, suit refill, resting, day advancement and future environmental exposure. The same pure reducer and `GameSessionStore` remain authoritative. Eating spends 10 stored food and restores up to 20 HP; mission food remains storage only and is still awarded once per run. Suit refill transfers base oxygen at the configured ratio. Outside ticks drain suit oxygen and thermal safety; an empty suit causes gradual HP loss. Daily turns consume food, water, base oxygen and energy, apply starvation/dehydration/life-support penalties, and reach victory after five complete days or defeat at zero HP. Restart clears the entire session and mission ledgers. The pure environmental-damage rule accounts for powered, intact habitat/shelter protection for future incidents.

**Buildings/UI:** Habitat offers enter/leave, eat, refill, recover and advance day; shelter offers enter/leave; greenhouse and solar report status without production; landing pad shows disabled upcoming missions. Phaser still handles movement, collisions and proximity interactions. React uses the same store for compact building panels, six resource meters including separate suit oxygen, warnings, daily summary and victory/defeat/restart overlays.

**Files:** `src/domain/models/{types.ts,GameAction.ts}`, `src/domain/rules/{gameRules.ts,survivalRules.ts,feature3.test.ts}`, `src/game/config/balance.ts`, `src/game/entities/Astronaut.ts`, `src/game/scenes/MoonBaseScene.ts`, `src/app/{main.tsx,style.css}`, `tests/feature3.mjs`.

**Verification:** `npm run build` passed; `npm test` passed 25 tests across three files (nine new Feature 3 cases). The existing `tests/feature1.mjs` Chromium regression passed all five interactions/collisions, movement animation, initial HUD and mobile layout. New `tests/feature3.mjs` passed habitat entry, refill, eating, day costs, five-day victory, defeat/restart and shelter entry/exit in Chromium. Screenshots `artifacts/feature3-habitat.png` and `artifacts/feature3-victory.png` were inspected. Initial sandbox browser launch was blocked; the elevated rerun passed.

**Limits:** Mission launches remain disabled until Developer B scenes are integrated. No greenhouse/solar production, shield upgrades, radiation incidents, NASA DONKI, save/resume or full mission gameplay was added. Daily costs are illustrative game units. A no-mission five-day victory is possible from initial supplies, but supplies become low; future missions will provide the intended replenishment loop.

## Feature 4 — Greenhouse, Solar Energy & Radiation Shields

**Status:** Completed. **Implementation commit:** `290288b` (`feat: add greenhouse solar shields and repairs`) on the existing `Greenhouse,-Solar-Energy-&-Shields` branch. No branch was created, switched, merged or pushed.

**Implemented:** The Greenhouse panel plants one crop for 10 water and 4 energy, rejects shortages and duplicate planting, then advances the crop to harvest-ready after one completed day. Original seed, sprout-transition and ready pixel sprites show the cycle. Harvest banks up to 26 food and 4 base O₂, gives 5 XP, and resets the crop; it does not heal HP. Full storage rejects a zero-benefit harvest. The Solar Array adds up to 16 energy once per completed day under a simplified illuminated-workday assumption, capped at 100. Damaged panels produce 8; broken or inactive panels produce none. The panel shows condition, next-day potential and actual last-day stored charge.

**Shield and repairs:** Shield activation spends 8 energy and requires another 3 units available for operation; each completed day with sufficient power spends 3 energy. A powered, intact active shield prevents outside environmental HP damage. The existing powered habitat and shelter protection still applies. Loss of power or damage switches an active shield off. Any selected damaged/broken building can be repaired for 10 energy; repair restores good condition and operating state, except that a repaired shield must be activated separately. Invalid, repeated and unaffordable repairs leave state unchanged. Building sprites tint for damage, show status lamps, solar flow, shield pulse, crop stages, particles and floating feedback.

**Files:** `src/domain/models/types.ts`; `src/domain/rules/{gameRules.ts,survivalRules.ts,feature3.test.ts,feature4.test.ts}`; `src/game/config/balance.ts`; `src/game/art/pixelArt.ts`; `src/game/entities/Building.ts`; `src/game/scenes/MoonBaseScene.ts`; `src/app/{main.tsx,style.css}`; `src/assets/manifest.json`; `tests/feature4.mjs`.

**Verification:** `npm run build` passed. `npm test` passed 34 tests across four files (nine new Feature 4 cases). Chromium `tests/feature1.mjs`, `tests/feature3.mjs`, and `tests/feature4.mjs` all passed on the committed implementation. The new browser check exercised planting, seed/sprout/ready sprites, harvest rewards without HP gain, solar yield and repair, shield activation, protected exposure and power failure. Planted, harvest, repaired-solar and active-shield screenshots were captured and inspected in ignored `artifacts/`. `git diff --cached --check` passed before the implementation commit.

**Limits:** One crop cycle takes one day; the sprout is a short visual transition during day advance. Solar charging uses an illustrative illuminated-workday assumption, not a real lunar lighting forecast. Damage/repair is testable now, but routine gameplay does not create damaged buildings until later incidents. No solar-storm event, advanced power routing, Developer B missions, NASA DONKI or persistence was added.

## HP and Food Mechanics Audit — before Feature 5

**Status:** Verified and corrected. **Implementation commit:** `74f860b` (`fix: add controlled HP decay and pause-safe food recovery`) on the user-managed current `main` branch.

**Verified existing behavior:** `EAT_FOOD` consumes 10 stored food through the shared reducer/store, restores up to 20 HP, caps HP at 100, and rejects insufficient food or full-health use. Valid Chicken Hunt `MissionResult` food enters storage exactly once and does not heal HP. Daily starvation and dehydration, empty outdoor suit oxygen, and unprotected environmental exposure already caused extra bounded damage; defeat occurs at zero HP.

**Correction:** Normal active play previously had no baseline HP decay. A centralized `BALANCE.health.passivePerSecond = 0.05` now removes 3 illustrative HP per minute through bounded `TICK` actions. The Phaser scene dispatches on its controlled 250 ms simulation timer in both indoor and outdoor base play; it never changes HP directly. Suit oxygen still drains outdoors only. A typed `SET_PAUSED` action and compact pause control freeze movement, HP, suit oxygen and gameplay actions. Ticks also reject loading, non-base/mission and victory/defeat states; no paused time is accumulated on resume.

**Build compatibility:** The already committed, incomplete Developer B `ChickenHuntScene` scaffold prevented `npm run build`: three Phaser lifecycle `override` modifiers were invalid and its result omitted required `runId`. The minimal compatibility edit removes those modifiers and echoes the launch `runId` in `MissionResult`. This does not register, launch or implement Chicken Hunt gameplay.

**Files:** `src/domain/models/{types.ts,GameAction.ts}`, `src/domain/rules/{survivalRules.ts,gameRules.ts,feature3.test.ts,healthFoodAudit.test.ts}`, `src/game/config/balance.ts`, `src/game/scenes/{MoonBaseScene.ts,ChickenHuntScene.ts}`, `src/app/{main.tsx,style.css}`, `tests/{feature3.mjs,feature4.mjs,healthFoodAudit.mjs}`.

**Verification:** `npm run build` passed; `npm test` passed 51 tests across six files (eight new HP/food audit tests). Chromium `tests/healthFoodAudit.mjs` passed real-time decay, pause/resume, loading freeze, habitat eating and terminal freeze. Existing Chromium `tests/feature1.mjs`, `tests/feature3.mjs` and `tests/feature4.mjs` passed. Pause, eating and mobile screenshots were inspected under ignored `artifacts/`. `git diff --cached --check` passed before commit.

**Limits:** The Chicken Hunt scene remains an unintegrated scaffold; mission food behavior is verified with a valid domain result, not a playable Chicken Hunt run. Loading is represented by the current state/scene guards; save/resume and Feature 5 incidents remain unimplemented. No branches were changed, merged or pushed.

## Feature 5 — Space Emergencies & Survival Events

**Status:** Completed. **Implementation commit:** `5e8ee0c` (`feat: add scripted solar storm and oxygen leak emergencies`) on the user-managed `Feature-5--Space-Emergencies-(A9)` branch.

**Implemented:** A typed, data-driven emergency catalog defines unique IDs, deterministic day triggers, warning durations, choices, illustrative costs, outcomes, XP and one-sentence science takeaways. The existing domain `TICK` advances countdowns and one-second hazard pulses; pause, loading, mission and terminal states stop the clock. Active/completed event state and an ID ledger prevent overlaps, repeated resolution and duplicate XP. `RESTART_GAME` clears the event state and ledger. Day advancement waits for an active incident to resolve.

**Solar storm:** The first completed day starts a 24-second warning followed by a 12-second simulated radiation phase. The player keeps moving, can press E at the shelter to enter immediately, activate the existing paid shield, stay in the powered habitat, or ignore the warning. Shelter and a powered shield within a 260-pixel base radius prevent radiation damage; staying in the habitat also protects but does not earn the shelter/shield bonus. Unprotected exposure applies 3 HP and 5 radiation-exposure game units per one-second pulse, in addition to the existing slow HP decay. Shelter/shield survival without exposure awards 15 XP once. The shield still charges its Feature 4 energy cost.

**Oxygen leak:** The second completed day damages the habitat and starts an 8-second warning. An unresolved leak drains 1 stored base O₂ unit per second after warning; oxygen at or below 10 causes an additional 2 HP damage per pulse. Selecting the habitat's existing repair control spends 10 energy, restores condition and awards 15 XP. Isolating from inside the habitat spends 4 energy and 5 base O₂, stops the leak, damages/disables the greenhouse until paid repair, and awards 8 XP. Choosing to keep exploring leaves the leak active. Invalid or unaffordable actions are atomic and earn no XP.

**Visual/UI:** Compact emergency objective, countdown, action costs and science feedback sit over the existing playable Moon Base. Phaser shows warning tint, hazard badge, visible habitat leak marker, HP and oxygen loss floaters, and repair/isolation feedback. Movement continues during warnings; both hazard effects stop on resolution. All values are labeled simulated game units, not NASA local dose or oxygen measurements.

**Main files:** `src/domain/models/{types.ts,GameAction.ts}`, `src/domain/rules/{eventRules.ts,gameRules.ts,survivalRules.ts,feature5.test.ts}`, `src/game/config/balance.ts`, `src/game/scenes/MoonBaseScene.ts`, `src/app/{main.tsx,style.css}`, and `tests/feature5.mjs`. Earlier Feature 3/4 unit and browser regressions were adapted to exercise their original economy assertions around the new incident gate; the HP browser timing assertion was made tolerant of legitimate active-play decay.

**Verification:** `npm run build` passed; `npm test` passed 64 cases across seven files (13 Feature 5 cases). Chromium `tests/feature1.mjs`, `tests/feature3.mjs`, `tests/feature4.mjs`, `tests/healthFoodAudit.mjs`, and `tests/feature5.mjs` passed. Feature 5 browser checks covered warning/countdown, E shelter, protected XP, leak drain/repair, isolation, ignored radiation damage and pause. Warning, exposure, leak and isolation screenshots under ignored `artifacts/` were inspected. `git diff --cached --check` passed before the implementation commit.

**Limits:** Events use fixed day triggers and illustrative game values. The optional power incident and sound are not implemented. No NASA DONKI feed, Developer B mission integration or save/resume was added. Existing Chicken Hunt remains a compiling but unregistered scaffold.

## Feature 6 — NASA DONKI Integration

**Status:** Completed. **Implementation commit:** `789d294` (`feat: add NASA DONKI weather context with offline fallback`) on the user-managed `Feature-6--NASA-DONKI-Integration-(A10)` branch.

**Endpoints and modes:** `NASAWeatherService` requests the latest seven UTC days from NASA's `/DONKI/FLR`, `/DONKI/CME`, `/DONKI/SEP` and `/DONKI/notifications` endpoints only in explicit/configured live mode. Endpoint-specific parsers validate IDs, dates, flare class, optional CME-analysis speed and notification fields. Valid empty arrays mean calm observed activity. One failed endpoint with others available produces **partial live/cached** coverage; rate limit, total failure, timeout, invalid response or offline uses a labeled historical demo fixture. A six-hour cache uses memory and browser LocalStorage; no gameplay save system was added. Default startup is demo and never calls NASA.

**Weather-to-game mapping:** A recent SEP observation within 48 hours maps to **High** game context; an M/X flare or a CME with supplied analysis speed at least 1000 km/s within 72 hours maps to **Elevated**; otherwise **Normal**. These are explicitly illustrative labels, not NASA lunar dose forecasts. The existing day-triggered storm, damage, shields and HP rules are unchanged by weather data. The 2017 demo fixture uses clearly marked example IDs and a historical reference date; it is not shown as current NASA activity.

**UI and configuration:** A compact pixel-art Space Weather panel shows latest event type/date, source **Live/Cached/Demo**, game category, partial-coverage/fallback message and NASA-versus-game distinction. The panel can request live or return to demo without blocking movement or base simulation. `VITE_NASA_DATA_MODE` defaults to demo; `VITE_NASA_API_KEY` supports a public browser request. `.env.example` and `README.md` state that every `VITE_` value is shipped publicly and private keys must not be placed there. Public `DEMO_KEY` is used only for explicit live requests when no key is configured; no backend/proxy or dependency was added.

**Main files:** `src/services/NASAWeatherService.ts` and its unit tests; `src/domain/models/SpaceWeather.ts`, shared weather fields/action and reducer validation; `src/game/config/spaceWeather.ts`; `src/assets/data/demoSpaceWeather.json`; `src/app/{main.tsx,style.css}`; `.env.example`, `README.md`, and `tests/feature6.mjs`.

**Verification:** `npm run build` passed; `npm test` passed 76 cases across eight files (12 Feature 6 service tests). Chromium `tests/feature1.mjs`, `tests/feature3.mjs`, `tests/feature4.mjs`, `tests/healthFoodAudit.mjs`, `tests/feature5.mjs` and `tests/feature6.mjs` passed. Feature 6 browser checks exercised demo, mocked partial live, cached reuse, offline fallback, continued astronaut movement and mobile layout; demo/live/offline/mobile screenshots were inspected. A separate **real Chromium request** on 2026-11-13 UTC reached NASA: CME, SEP and notifications returned HTTP 200, FLR returned HTTP 404, and the panel showed `source=live`, `partial=true`, 32 available normalized records. A direct historical SEP request confirmed `sepID`/`eventTime`; historical FLR also returned 404. `git diff --cached --check` passed before implementation commit.

**Limits:** The FLR route was unavailable during verification; its parser was covered by fixtures/unit tests, not a successful live FLR payload. Live coverage may be partial and category mapping cannot predict actual lunar radiation. `DEMO_KEY` has a low shared rate limit. Save/resume, Developer B mission integration, the optional power incident and deployment remain future work.

## Feature 7 — Save & Resume System

**Status:** Completed. **Implementation commit:** `149af56` (`feat: add versioned Moonbound save and resume`) on the user-managed `Feature-7-—-Save-&-Resume-(A11)` branch. No branch was created, switched, merged or pushed.

**Persistence:** `SaveService` writes a version-1 `{ schemaVersion, savedAt, state }` envelope to browser LocalStorage. It validates loaded state with the existing domain `LOAD_GAME` rules and rejects corrupted JSON, unsupported versions, missing fields, invalid resources, out-of-range HP and malformed ID ledgers. Meaningful actions save promptly; movement, HP ticks, mission progress and weather updates coalesce into one write per five-second window, with a pagehide flush. Storage denial or quota errors leave gameplay running. The React start gate offers Continue only for a valid save; New Game requires replacement confirmation. Restart after victory/defeat uses the existing clean `RESTART_GAME` reducer and replaces the save.

**Recovery safety:** Continue mounts Phaser only after a validated store hydration, starts at the Moon Base plaza, preserves supplies, HP, XP, crop, building/shield and completed-run/event ledgers, and never simulates closed-tab time. An unfinished mission is forfeited and its run ID retired without food/XP. An interrupted solar storm or oxygen leak restarts its warning with existing HP, resources and damage history intact; no protection or reward is granted. Terminal results drop orphaned active countdowns. The existing scene, store and result contracts remain authoritative; Developer B mission internals were not modified.

**Files:** `src/services/SaveService.ts` and `SaveService.test.ts`; `src/domain/rules/gameRules.ts`; `src/domain/store/GameSessionStore.ts`; `src/app/{main.tsx,style.css}`; `tests/{feature6.mjs,feature7.mjs}`.

**Verification:** `npm run build` passed; `npm test` passed 123 cases across 14 files (10 SaveService cases). Chromium `tests/feature7.mjs` passed refresh/Continue, no unloaded HP loss, browser close/reopen, New Game reset, interrupted Chicken Hunt recovery/stale reward rejection, paused emergency recovery and one resumed countdown. Existing Feature 1, 3, 4, HP/food, 5, 6 and Chicken Hunt integration Chromium scripts passed. The Continue gate screenshot was inspected. `git diff --cached --check` passed before the implementation commit.

**Limits:** Saves are local to the current browser/profile; there is no cloud sync, migration from unsupported save versions or offline elapsed-time simulation. Browser quota/blocked storage fails gracefully but cannot provide persistence. Ice Collection and later mission polish remain outside this feature.

## Feature 8 — Chicken Hunt Verification, Earth Resupply & Interactive Education

**Status:** Completed. **Developer A implementation commit:** `9d7aa26` (`feat: integrate missions, Earth water resupply and learning signs`) on user-managed `Feature-8--Mission-Integration-(A12)`. Developer B's Chicken Hunt combat/scene/assets were preserved, not authored by A in this feature.

**Verified Chicken Hunt integration:** From the Landing Pad, E opens controls and a 6-energy launch starts the existing scene with a unique run ID. Chromium keyboard flight and Space firing destroyed normal-wave enemies, produced food drops and collected two food units; a safe early return credited food 55→57 and 15 XP through the shared store without healing HP. A separate destroyed-ship run charged 6 energy, returned no food/XP and lowered HP. Eating at the Habitat spent 10 stored food and restored HP up to the 100 cap. The pre-existing empty early-return, pause/resume and result-summary regression also passed. Replaying a completed result after reload did not credit rewards again. No Developer B combat mechanics were changed.

**Earth water supply:** A separate animated pod lands west of the pad on each of Days 2 and 4. E or nearby pointer interaction dispatches typed `COLLECT_EARTH_SUPPLY`, requiring the due ID, proximity, active base play, outdoor location and room for all 25 water units. The reducer awards water once and records `collectedEarthSupplyIds`; uncollected pods remain available. Starting water changed from 65 to 40 against 9 per day, so deliveries are useful without changing daily costs. A browser five-day run collected both pods and finished with 45 water after normal consumption. New Game/Restart clears the ledger.

**Education and persistence:** Seven separate non-blocking pixel-art signs cover Habitat, Greenhouse, Solar Array, Radiation Shelter, Landing Pad, Chicken Hunt and Earth Water Supply. E and nearby pointer input open short WHAT/WHY/YOUR MISSION panels; relevant building controls also expose Learn. The panel pauses survival and closes without automatically reopening. Chicken Hunt is explicitly fictional; Earth delivery timing and resource values are explicitly game simplifications. SaveService schema v2 persists the delivery ledger and migrates supported v1 saves with an empty ledger. Refresh/Continue and browser-tab close/reopen preserved collected pods; duplicate pod and mission result actions were rejected after reload.

**Main files:** `src/domain/models/{types.ts,GameAction.ts}`, `src/domain/rules/{gameRules.ts,survivalRules.ts,earthSupply.test.ts}`, `src/game/config/{balance.ts,gameConfig.ts,education.ts}`, `src/game/entities/{EarthSupplyPod.ts,EducationSign.ts}`, `src/game/{art/pixelArt.ts,scenes/MoonBaseScene.ts}`, `src/app/{main.tsx,style.css}`, `src/services/{SaveService.ts,SaveService.test.ts}`, `src/assets/manifest.json`, and `tests/feature8.mjs`. Existing water-value regression expectations were updated in Feature 1/3/4 tests.

**Verification:** `npm run build` passed; `npm test` passed 129 cases across 16 files; `git diff --cached --check` passed before the implementation commit. Chromium `tests/feature8.mjs` passed the playable mission, failure, eating, all seven E signs, one pointer sign, 390-pixel mobile layout, both deliveries, refresh/Continue, tab reopen, duplicate rejection, storm/leak response, five-day victory and restart. Eight existing Chromium scripts passed: Feature 1, 3, 4, 5, 6, 7, HP/food and Chicken Hunt launch/empty return. Feature 8 desktop/mobile/pod/victory screenshots were inspected; a stale message behind terminal results was fixed and the screenshot was rechecked.

**Known limits:** Earth pods are a fixed illustrative schedule, not real lunar cargo operations. Water capacity requires 25 free units to collect a full pod; partial collection is unsupported. Chicken Hunt pointer/touch flight was not separately browser-tested, and the arcade has no sound. Ice Collection is deferred, not an MVP requirement. Deployment and the separate A13 accessibility/polish gate remain open.
