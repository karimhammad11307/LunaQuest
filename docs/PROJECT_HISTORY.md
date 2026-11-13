# Moonbound project history and verified status

This is the provenance record. It separates **repository/Git evidence**, **documented design decisions**, and **user-provided history**. A plan is not evidence that a feature shipped.

## Project origin and changes in direction

### NASA Space Apps and Mars Commander

**User-provided project context:** The project began for the NASA Space Apps Challenge 2026, Junior Astronaut Mission Trainer. The initial working title was **Mars Commander**, intended as an educational mission/outpost game for children. The submitted challenge URL is <https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/?tab=details>.

**Historical design record:** `design/MARS_COMMANDER_DESIGN_PLAN.md` documented an audience alignment of NASA's 7–12 age range with a requested 8–14 audience, simple play plus optional science context, an outpost resource loop, five proposed screens, accessibility considerations, and potential NASA data sources. The Figma file record in root history names a separate Mars Commander file and describes five editable screens and prototype links. That design was a guided screen prototype, not a full simulation.

**User-provided rejection:** The user later said the Figma work looked like a conventional educational website, not gameplay, and the visual quality was below expectations. The user rejected that direction and asked for a playable world with actual resource decisions. This is a design critique supplied by the user, not a Git-derived evaluation.

### Website-style Mars prototype

**Repository evidence:** Commit `cf01cb4` (`Add core game functionality and initial tests for Mars colony simulation`) contains `src/main.tsx`, `src/World.tsx`, `src/game.ts`, `src/style.css`, a simulation test, browser/mission test scripts, and screenshots under `artifacts/`. `design/GAME_ARCHITECTURE.md` records React + TypeScript, an interactive SVG colony, a pure deterministic reducer, discrete day turns, save/local browser behavior and verification scope. Root `PROJECT_HISTORY.md` records that prototype as a playable 30-day Mars colony with five selectable buildings, upgrades, events, resource management, save/resume and browser testing. Those details describe the **old Mars prototype**, not the current Moonbound source tree.

**User-provided rejection:** The user judged the previous website-style implementation inadequate for the intended game and directed a rebuild centered on real-time playable gameplay. Preserve it as historical work on `backup/mars-commander-codex`; do not treat it as the Moonbound implementation.

### Transition to Moonbound

**Documented design decisions** in `doc/PLAN.md` and `doc/REPORT.md` changed the setting and scope to **Moonbound: Survival Mission**: a playful lunar outpost, five in-game survival days, resource-gathering activities, sheltering from solar hazards, and child-friendly survival tradeoffs. The user emphasized the Moon setting and fictional alien birds; the plans explicitly reject Martian atmosphere/dust-storm assumptions. The intended rendering direction is strict, consistent **top-down 3/4-view pixel art**, with frame-based animation. The game loop is `HOME BASE → GO ON A MISSION → RETURN WITH SUPPLIES → BUILD AND PROTECT → SURVIVE → REPEAT`.

### Earlier Figma and skill setup records

**Prior root history report:** On 2026-11-13, a new Mars Commander Figma design file was created (recorded link: <https://www.figma.com/design/k5njYduNxFJTkyITCiqeD8>) with five 1440×1024 screens, an upgrade preview, editable vector/UI components, variables/styles and nine prototype navigation links. The report says the Figma user/authentication check succeeded and that no prior Figma file was edited. It also records prototype limits: the design was guided navigation, not simulation; emergency branches led to an illustrative summary; some greenhouse/battery screens were visual concepts; live NASA data and implemented accessibility were absent. Those are historical claims from the prior project log, not checks repeated during this consolidation.

The root history also records a `frontend-design` skill installation and unsuccessful/blocked setup for `develop-web-game`, `ui-ux-pro-max`, and live Codex skill discovery due to network/permission limits. Those setup details are not Moonbound features or current application requirements; they are retained here so the historical record is not lost.

## Cline attempt and repository evidence

**Verified Git evidence:** Commit `5a5eefc` (`Refactor game structure and implement new domain models`) is on branch `base-survival` and its remote tracking branch. Its diff changes package/build configuration and `index.html`, adds `src/domain/models/{types.ts,GameAction.ts}`, `src/domain/rules/survivalRules.ts`, and `src/game/config/{palette.ts,balance.ts,gameConfig.ts}`, and removes the prior app entry, SVG world, reducer and old test from that branch.

**User-provided context from the task:** These changes were Cline's interrupted implementation. This attribution and interruption history comes from the user; Git confirms the commit and file delta, not the authoring tool or why work stopped.

**What was actually present in the inspected tree at `4a447bb`:** shared state/action models, centralized palette/balance/world/mission configuration, a partial pure rule foundation (`clamp`, initial buildings/state, outdoor suit oxygen and thermal drain, notice helpers), a minimal React bootstrap, and four starter unit tests. Mission configs are unavailable pending scenes. No `GameSessionStore`, Phaser game instance/scene, astronaut controller, Moon Base gameplay, complete day/resource simulation, mission, event resolution, NASA service, save/load flow, or playable results loop exists in that tree.

## Codex repository preparation

**Verified commit:** `4a447bb2ac0c9a4525a789e3df4be7681831ed61` (`chore: prepare Moonbound base survival repository`) is the feature branch starting point before this documentation consolidation. Its commit summary adds the bootstrap/testing/repository preparation and `docs/HANDOFF.md`; `docs/HANDOFF.md` records the verified state, and `.gitignore` excludes dependencies, build output, test output, artifacts and common secret files. The preparation did not implement game scenes. A prior status in the handoff says build and four tests passed; this history records that as the prior checkpoint's report, not a new run during this documentation task.

## Branches and commits

Git references inspected at the earlier documentation-consolidation checkpoint:

| Ref | Commit | Verified description |
|---|---|---|
| `feat/base-survival` (then current) | `4a447bb` | Repository preparation baseline; clean before that consolidation. |
| `main`, `origin/main` | `4a447bb` | Same commit as feature-branch baseline at inspection. |
| `base-survival`, `origin/base-survival` | `5a5eefc` | Cline-attributed partial Moonbound scaffold. |
| `backup/mars-commander-codex`, `TestCline` | `cf01cb4` | Previous Mars Commander implementation preserved. |
| `016a2a1` | project plans/progress report | Adds `doc/PLAN.md`, `doc/PLAN_DEV_A.md`, `doc/PLAN_DEV_B.md`, `doc/REPORT.md`. |

These were historical observations at that checkpoint, not a claim about the current checkout.

## Technical state at repository preparation baseline

- Package is `moonbound`; scripts are Vite `dev`, TypeScript/Vite `build`, `preview`, Vitest `test` and `test:watch`.
- Declared stack: React 19, TypeScript, Vite 6, Phaser 3.90, Vitest, Playwright tooling. Phaser is a dependency, not evidence of an implemented Phaser game.
- `index.html` points to `src/app/main.tsx`. That file is a bootstrap placeholder.
- `src/domain/models/types.ts` and `GameAction.ts` provide the current shared contract; see [MASTER_PLAN.md](MASTER_PLAN.md) and both developer task documents before changing it.
- `src/game/config/` centralizes palette, tuning and world/building/mission configuration.
- `src/domain/rules/survivalRules.ts` contains starter rules only. Four tests cover existing starter behavior.
- No live NASA DONKI integration, credentials, server, or deployed game is present.

## What worked and remained at that baseline

**Present and previously verified/reported:** configuration and lockfile exist; Vite/React bootstrap; basic initial state/building construction, clamping, outdoor oxygen/thermal drain; four starter Vitest cases. The prior handoff reports `npm install`, production build, and these tests succeeded at the repository-preparation checkpoint.

**Not implemented at the baseline:** complete pure game reducer/store; real-time playable Phaser world and pixel-art assets; movement and building interaction; all resource/day rules and recovery; greenhouse/solar/shield/build/repair flows; emergency incidents; Chicken Hunt and Ice Collection; typed exactly-once mission rewards; results/win/loss flow; NASA DONKI service; save/resume; full unit and browser gameplay test suites; deployment/demo package.

## Lessons and guardrails

- Figma screens and static web layouts do not constitute a playable game; validate gameplay in the browser.
- Separate domain rules from renderer, and keep one authoritative resource/reward implementation.
- Freeze shared contracts before parallel mission work; B emits a result and A's store applies it once.
- Keep the Mars prototype, its 30-day loop and Figma exploration distinct from the lunar five-day plan.
- NASA solar observations are contextual inputs, not local Moon measurements or exact radiation dose. Mark game values, derived hazards and thermal conditions as simulations.
- Earlier root history records Figma authentication/design verification and skill-setup limitations; those are historical reports, not claims about this current Moonbound build. The Figma project is not part of this task.

## Documentation consolidation record

This documentation-only consolidation replaces `doc/PLAN.md`, `doc/PLAN_DEV_A.md`, `doc/PLAN_DEV_B.md`, `doc/REPORT.md`, root `PROJECT_HISTORY.md`, `docs/HANDOFF.md`, and the two historical Mars notes under `design/` with the authoritative set in `docs/`: this history, [MASTER_PLAN.md](MASTER_PLAN.md), [DEVELOPER_A_TASKS.md](DEVELOPER_A_TASKS.md), and [DEVELOPER_B_TASKS.md](DEVELOPER_B_TASKS.md). Unique history, architecture, decisions, verification reports and task requirements were incorporated before those duplicate/legacy files were removed. `README.md` and `AGENTS.md` now link to the four documents and describe the actual partial state. Verification on `feat/base-survival`: exactly four Markdown files in `docs/`; old `doc/` directory and root planning file are absent; internal references were searched; `git diff --check` passed; no source, dependency, lockfile or game configuration changes appear in the diff. No tests/build were run because this is documentation-only. No Figma files, branches or remotes changed. Commit state is reported in the task response.

## 2026-11-13 — Feature 1: playable pixel-art Moon Base

**Request:** implement the first playable Phaser feature on `feat/base-survival`, including original top-down 3/4 pixel environment, five buildings, animated astronaut, movement/collisions, proximity interactions, and compact shared-state HUD; defer economy, missions and other survival features.

**Actual changes:** Added original procedural canvas textures and an asset/licensing manifest; Phaser Boot and MoonBase scenes; reusable Astronaut and Building objects; a minimal `GameSessionStore`; React Phaser host, resource HUD, help, mobile touch controls and pixel-styled shell; a focused Chromium gameplay check. Reused existing `GameState`, `GameAction`, layout, palette and initial-state rules. The store handles only movement, interaction notices, load/restart and notice dismissal in this feature; it does not implement the survival reducer.

**Verification:** `npm run build` passed; existing `npm test` passed four cases; headless Chromium loaded the running Vite app and verified walk/idle animations, keyboard interactions with all five buildings, nearby pointer interaction, collision stops at all five building footprints, HUD initial values, mobile controls and absence of horizontal overflow. Desktop/mobile screenshots were captured and visually inspected under ignored `artifacts/`. A browser launch initially failed inside the sandbox, then succeeded with required elevated permission. The user clarified that the reference is a style guide rather than a composition to copy. The image itself was not present in the accessible conversation, so direct visual comparison remains open; the documented top-down 3/4 pixel-art direction and palette guided the original art.

**Remaining:** complete A1 domain rules/contract freeze, building economy, resource depletion/day loop, missions, incidents, NASA, persistence and deployment. No Developer B-owned gameplay files or old backup branch were edited. No push or merge was performed.

**Style reference clarification:** After the Feature 1 commit, the user supplied a public [astronaut sprite prompt page](https://stablediffusionweb.com/prompts/sprite-for-an-astronaut-for-top-down-2d-game) as a reference for pixel quality, outline/shading, astronaut design language and color richness, explicitly not for copying composition or assets. The game remains a top-down 3/4 playable map assembled from separate objects. The available web reader exposed the page text but not the actual image; a direct fetch returned HTTP 403. `src/assets/manifest.json` records the reference-only use. No game asset from that site was imported.

## 2026-11-13 — Feature 2: shared game state and mission rewards

**Request and Git:** The user stated Feature 1 was merged to main and requested a new `feat/game-state` branch. Inspection found a clean `Game-State` checkout; `main` and `origin/main` both pointed to `98c60fe` and contained Feature 1. Codex created `feat/game-state` from that commit without editing the existing branch. The verified implementation commit is `6231e69` (`feat: add shared game state and mission reward rules`).

**Implemented:** Extended existing GameState/GameAction/MissionResult rather than replacing them. A pure reducer validates resource collection/spending, XP reward IDs, astronaut status, mission launch/provisional progress and exactly-once completion. The shared GameSessionStore delegates to those rules and notifies subscribers only on accepted changes. Mission run IDs and completed-run ledger are in state for future persistence. Default mission availability remains false, so no unfinished scene launches.

**Verification:** `npm run build` passed. `npm test` passed 16 tests (12 new and four preserved). The existing Feature 1 Chromium check passed with all five building interactions/collisions, walk/idle frames, pointer interaction, HUD and mobile layout. No Developer B-owned files, mission scenes, backend, NASA integration or daily survival simulation were changed. No push or merge was performed.

**Next work:** implement building economy and the day/survival loop, then integrate mission scenes through the frozen run-ID contract. See [ImplementedFeatureA.md](ImplementedFeatureA.md) for the concise Developer A log and handoff.

## 2026-11-13 — Feature 3: building interactions and survival

**Request and Git:** The user requested Feature 3 and then explicitly instructed Codex to work in the already checked-out branch without branch management. Inspection found a clean `building-survival` checkout at `76f6649` before edits. The verified implementation commit is `836f340` (`feat: add building interactions and survival loop`). No branch creation, switching, merge or push occurred.

**Implemented:** Developer A extended the existing shared state/reducer/store with typed habitat and shelter actions, stored-food eating and HP recovery, base-to-suit oxygen transfer, outdoor oxygen drain and gradual empty-suit damage, deterministic daily food/water/base-oxygen/energy consumption, health consequences, five-complete-day victory, defeat and clean restart. Phaser keeps movement, collisions and proximity detection; React renders compact building actions, separate base/suit oxygen, warnings, summaries and result overlays. Greenhouse/solar remain informational; landing missions remain disabled. The reusable environmental damage rule recognizes powered, intact protected locations, but no incident is triggered in this feature. Existing mission rewards still add food to storage once and do not auto-heal HP.

**Verification:** `npm run build` passed and `npm test` passed 25 tests across three files. Existing Chromium `tests/feature1.mjs` passed all five interactions/collisions, movement animation, initial HUD and mobile layout. New Chromium `tests/feature3.mjs` passed habitat entry, refill, eating, daily costs, victory, defeat/restart and shelter entry/exit. Habitat and victory screenshots were captured and inspected in ignored `artifacts/`. Initial Chromium launch inside the sandbox was blocked; an elevated rerun passed. `git diff --check` passed before the implementation commit.

**Decisions and limits:** Day 1 is the first playable day; each `ADVANCE_DAY` completes one day, and victory follows the fifth completed day while HP remains above zero. Daily resource shortage causes gradual HP penalties; zero HP is the terminal defeat condition. Day advance is available in the habitat. Resource amounts are illustrative game units, not NASA measurements. Initial supplies permit five-day victory without missions, but replenishment gameplay awaits Developer B integration. Greenhouse/solar production, radiation incidents, NASA DONKI and persistence remain unimplemented. No Developer B-owned mission files were changed.

## Repository status after Feature 3 checkpoint

At that checkpoint, the branch was `building-survival`. The playable Phaser Moon Base, shared store and exactly-once mission reward contract from Features 1–2 remained. Feature 3 added the functional survival loop described above. The next Developer A work then was Feature 4 production/solar mechanics; Developer B missions remained separate. The code implementation was committed at `836f340`; its documentation checkpoint was reported in that task's final response.

## 2026-11-13 — Feature 4: greenhouse, solar energy and shields

**Request and Git:** The user requested Developer A tasks A7–A8 and explicitly retained branch management. Codex found a clean checkout on `Greenhouse,-Solar-Energy-&-Shields`, made no branch changes, and committed the verified implementation as `290288b` (`feat: add greenhouse solar shields and repairs`). No merge or push occurred.

**Implemented:** The Greenhouse plants for water/energy, grows from seed to ready on one day advance with a brief sprout visual, then harvests bounded food/base oxygen and XP once per crop without restoring HP. Solar production is calculated in the pure day rule once per completed day, capped by battery capacity, halved when damaged, and absent when broken/inactive. Shield activation and day upkeep spend energy; powered outside shielding is integrated with the Feature 3 environmental-damage rule. Power loss or damage switches the shield off. Selected damaged/broken buildings can be repaired for energy, with repeat/shortage rejection. Phaser now renders separate crop stages, status lamps, solar glow, shield pulse, repair sparks and floating resource feedback. React retains the compact building panels and displays costs, condition, production and XP. No Developer B-owned files or mission contract shape changed.

**Verification:** `npm run build` passed. `npm test` passed 34 tests in four files. The existing Feature 1 and Feature 3 Chromium scripts passed on the committed implementation, as did new `tests/feature4.mjs` for planting, growth sprites, harvest, solar output/repair, shield protection and power failure. Four Feature 4 screenshots were captured and visually inspected under ignored `artifacts/`. `git diff --cached --check` passed before commit.

**Decisions and limits:** All amounts are illustrative game units. The simplified daily sequence spends base life-support energy, charges the battery from an assumed illuminated workday, then charges shield upkeep; missing morning life-support power can still harm health. The sprout is a short visual transition within the one-day crop cycle. A repaired shield remains off until activated. Building damage is reachable through test fixtures; normal damage events are Feature 5 work. Solar-storm decisions, missions, NASA DONKI and save/resume remain unimplemented.

## Repository status after Feature 4 checkpoint

At that checkpoint, the branch was `Greenhouse,-Solar-Energy-&-Shields`. Features 1–4 were implemented locally with the shared `GameSessionStore` and an unchanged `MissionResult` contract. Feature 4 implementation was committed at `290288b`. Feature 5 incidents and later NASA/persistence/integration work remained; Developer B mission scenes remained separate. Its documentation checkpoint was reported in that task's final response.

## 2026-11-13 — HP and food audit before Feature 5

**Request and Git:** The user requested an audit of normal HP decay, food healing and storage, pause/loading/terminal behavior, and extra survival damage before any Feature 5 work. Inspection found a clean `main` checkout at `1328f0e`, a merge commit already present before this operation. Codex did not switch, create, merge or push branches. The verified implementation commit is `74f860b` (`fix: add controlled HP decay and pause-safe food recovery`).

**Finding and change:** Existing eating already spent stored food and healed through the single reducer, with HP capped at 100; valid mission food entered storage without automatic healing. Starvation, empty suit oxygen and unprotected environmental exposure already caused additional damage. The missing behavior was slow HP decay during ordinary active play. Developer A added 0.05 illustrative HP per second through bounded domain `TICK` actions on the controlled Phaser timer, including indoor base time. A typed pause state/action and small React control stop gameplay and simulation while paused; ticks also reject loading, other scenes/active missions and terminal states. The scene resets its tick accumulator on pause or hidden-tab time, avoiding catch-up damage. No HP mutation was added to Phaser or React.

**Build compatibility finding:** The merged, incomplete Developer B Chicken Hunt scaffold had four pre-existing TypeScript errors: three invalid lifecycle `override` modifiers and a `MissionResult` missing `runId`. To verify the requested build and the food-result contract, Codex made only those compatibility corrections in `src/game/scenes/ChickenHuntScene.ts`. The scene remains unregistered and unplayable; no arcade gameplay was implemented.

**Verification:** `npm run build` passed after the compatibility fix. `npm test` passed 51 cases across six files, including eight new HP/food audit cases. Chromium `tests/healthFoodAudit.mjs` verified actual slow decay, pause/resume, loading freeze, habitat eating and terminal freeze. Existing Feature 1, 3 and 4 Chromium regressions passed. Pause/eating/mobile screenshots were captured or refreshed and visually inspected under ignored `artifacts/`. `git diff --cached --check` passed before commit.

**Limits and next work:** Chicken Hunt is still a scaffold; its food-result rule was exercised through domain tests, not a completed mission. Save/resume, full loading flow, and Feature 5 incidents remain unimplemented. The current build uses no NASA data. This audit did not begin Feature 5.

## Repository status after the HP audit checkpoint

The current branch is `main`; implementation is committed at `74f860b`. Features 1–4 and the corrected HP/food rules are locally verified. Chicken Hunt has a compiling scaffold but no playable mission flow. Feature 5 incidents remain the next Developer A feature. The documentation checkpoint commit is reported in the final task response.

## 2026-11-13 — Feature 5: space emergencies and survival events

**Request and Git:** The user requested Developer A's Feature 5 only and retained all branch management. Inspection found a clean checkout on `Feature-5--Space-Emergencies-(A9)` before edits. The verified implementation commit is `5e8ee0c` (`feat: add scripted solar storm and oxygen leak emergencies`). No branch was created, switched, merged or pushed.

**Implemented:** A typed emergency catalog and pure domain rules extend the existing `GameState`, `GameAction` and `GameSessionStore`. The first completed day triggers a 24-second solar warning and 12-second simulated storm; the second completed day triggers an 8-second oxygen-leak warning. No incidents overlap, and an active incident must resolve before another day advances. Domain `TICK` applies bounded one-second pulses, with no timer progress during pause, loading, mission or terminal states. Completed-event IDs and outcomes prevent replayed rewards. Restart clears both.

**Player decisions and consequences:** During the storm the astronaut can keep moving, press E at the shelter to enter, activate the existing shield for energy, stay in the powered habitat, or ignore the warning. The active shield protects only within the documented nearby-base radius. Unprotected radiation reduces HP and increases the illustrative exposure meter; surviving in the shelter or shield area without exposure grants 15 XP once. During the leak, paid habitat repair stops oxygen loss for 15 XP; isolation costs less energy plus base oxygen, stops the loss, disables/damages the greenhouse until repair, and grants 8 XP. Ignoring the leak leaves oxygen draining and can cause gradual HP damage and defeat. Existing food healing, suit oxygen, solar, repairs and five-day outcomes remain in the same reducer.

**Visuals and science labeling:** React shows a compact warning/countdown, actions and costs. Phaser shows warning tint, hazard badges, a habitat leak marker, HP/O₂ loss floaters and clear repair/isolation feedback while retaining astronaut movement. Science takeaways state that these are simulated game hazards, not NASA local lunar dose or oxygen measurements. No NASA DONKI connection was added.

**Verification:** `npm run build` passed; `npm test` passed 64 cases across seven files, including 13 Feature 5 cases. Chromium `tests/feature1.mjs`, `tests/feature3.mjs`, `tests/feature4.mjs`, `tests/healthFoodAudit.mjs` and `tests/feature5.mjs` passed; the new browser script covered the storm warning, E shelter, protected XP, oxygen leak drain/repair, isolation, ignored storm damage and pause. Feature 5 screenshots of warning, exposure, leak and isolation were captured and inspected. `git diff --cached --check` passed before the implementation commit. Earlier day-loop regression tests were adapted to account for the new event gate; an HP browser assertion was adjusted to tolerate ongoing legitimate decay. The first `npm test` run after the event gate found two old day-loop expectations that needed this adaptation; the first Feature 5 test run found an incorrect object-identity assertion. A later build caught a test-only catalog index type error. All were corrected and the final build/test run passed. A local Vite browser launch initially failed under the filesystem sandbox and then ran with approved escalation.

**Limits and next work:** The event schedule is deterministic and game values are illustrative. The optional power emergency and audio cues were not implemented. Chicken Hunt remains an unregistered scaffold; Developer B mission integration, NASA DONKI and save/resume remain future work. No dependencies changed. Feature 5 is complete at the implementation commit; this documentation checkpoint is committed separately.

## Repository status after Feature 5 checkpoint

The current user-managed branch is `Feature-5--Space-Emergencies-(A9)`. Features 1–5 and the HP/food audit are implemented and locally verified as described above. Required A9 incidents are playable; A10 NASA data, A11 persistence, Developer B mission integration and final deployment remain unimplemented. See [ImplementedFeatureA.md](ImplementedFeatureA.md) for the concise Developer A verification log and [MASTER_PLAN.md](MASTER_PLAN.md) for planned scope.

## 2026-11-14 — Feature 6: NASA DONKI space-weather context

**Request and Git:** The user requested Developer A's Feature 6 only, keeping branch management with the user. Inspection found a clean checkout on `Feature-6--NASA-DONKI-Integration-(A10)`. The verified implementation commit is `789d294` (`feat: add NASA DONKI weather context with offline fallback`). No branch was created, switched, renamed, merged or pushed.

**Implementation:** A browser-side `NASAWeatherService` isolates recent DONKI `/FLR`, `/CME`, `/SEP` and `/notifications` requests, endpoint-specific normalization, bounded payload/record validation, six-second timeout, rate-limit and network handling, six-hour memory/LocalStorage cache and historical demo fallback. The default mode is demo and starts without network. A compact optional React panel shows source, latest relevant event/date, simplified game category, partial coverage, fallback reason and science labeling. A typed `SET_SPACE_WEATHER` action updates only the existing shared `GameSessionStore` weather field; Phaser does not fetch NASA data. The Feature 5 storm still triggers by completed day and keeps the same timer, shield, HP and XP rules.

**Scientific and security decisions:** The game maps a recent SEP to High context and selected M/X flare or analyzed fast CME to Elevated context; other observations map to Normal. Those are educational **game labels**, not NASA lunar surface measurements or hazard forecasts. Notifications provide context but do not by themselves escalate risk. The demo fixture uses illustrative normalized example IDs tied to documented September 2017 solar activity and is explicitly historical, not a current NASA reading. `VITE_NASA_API_KEY` is optional and public in the browser bundle; no private key or backend is used. Explicit live mode uses public `DEMO_KEY` when no key is configured. NASA's [API authentication guide](https://api.nasa.gov/assets/html/authentication.html) documents the shared `DEMO_KEY` limit; the [DONKI endpoint list](https://api.nasa.gov/) and [NASA 2017 flare record](https://science.nasa.gov/resource/major-solar-flare/) support the endpoint and fixture choices. The master plan and README were updated to state the public-key constraint accurately.

**Live endpoint finding:** On 2026-11-13 UTC, direct legitimate requests and a real Chromium request reached NASA. The latest-week CME, SEP and notifications endpoints returned HTTP 200; FLR returned HTTP 404, including a separate historical FLR query. The browser service therefore showed partial live coverage with 32 available normalized records and no change to gameplay. A historical SEP response confirmed the `sepID` and `eventTime` fields. Initial sandboxed `curl` could not resolve `api.nasa.gov`; the approved network rerun succeeded. Browser live requests used public `DEMO_KEY` within the documented low-volume quota. This is point-in-time verification, not a claim that FLR is permanently unavailable.

**Verification:** `npm run build` passed and `npm test` passed 76 cases across eight files, including 12 new service/mapping/cache/fallback cases. Chromium Feature 1, 3, 4, HP/food, 5 and 6 scripts passed. Feature 6 checked demo startup without network, mocked partial live and cached states, offline fallback, movement and mobile panel bounds. Demo, partial-live, offline and mobile screenshots were captured and inspected; the mobile panel was enlarged after its first screenshot showed clipped controls. A browser-only fetch-binding issue was found in the first Feature 6 run and corrected before the passing rerun. `git diff --cached --check` passed before the implementation commit.

**Limits and remaining work:** FLR parsing is unit-tested but was not verified against a successful live FLR response. Partial coverage is labeled; NASA observations do not control storm timing or supply measured Moon Base dose. Save/resume (A11), Developer B mission integration, the optional power incident and deployment remain unimplemented. No dependencies or Developer B-owned gameplay files changed. The Feature 6 implementation is committed separately from this documentation checkpoint.

## Current repository status

At the Feature 6 checkpoint, the user-managed branch was `Feature-6--NASA-DONKI-Integration-(A10)`. Features 1–6 were implemented and locally verified as described above; mission integration and final delivery were still future work at that time. See [ImplementedFeatureA.md](ImplementedFeatureA.md) for the verified A feature records.

## 2026-11-14 — Local Chicken Hunt merge and conflict resolution

**Request and Git evidence:** The user asked to solve conflicts while merging the current Developer B branch into `main`, with particular care for `src/app/main.tsx`. Inspection found clean `devB_first` at `4a57850` and local `main` at `5d3847a`, diverged from common ancestor `1cff7fa`. A read-only merge preview predicted nine conflicts. A real `git merge --no-commit main` on `devB_first` confirmed conflicts in `main.tsx`, stylesheet, asset manifest, shared store, pixel art, astronaut, building, Chicken Hunt and Moon Base scene files. The resolved merge commit is `cc857d9` (`merge: integrate Chicken Hunt with Moonbound survival systems`). Local `main` was then fast-forwarded to that commit. No remote push or merge request was made.

**Resolution and behavior:** Main's authoritative React shell, GameSessionStore, domain rules, Moon Base, survival systems, weather panel and emergency UI were preserved. Developer B's Chicken Hunt scene and its ship, birds, combat, pickups and unit tests were retained. `main.tsx` now registers both Phaser play scenes in one canvas, launches Chicken Hunt from the Landing Pad with a unique run ID and energy cost, pauses/resumes the arcade scene, and restores the Moon Base after a result. The scene sends its result with the required run ID; only the shared reducer credits food and XP, records the run ID and blocks duplicate rewards. The launch notice, controls hint, help text and short return summary match the active scene. Chicken Hunt was enabled in the mission catalog; Ice Collection stays disabled. An obsolete unit-test assumption about Chicken Hunt availability was updated while retaining its unavailable-mission and low-energy checks.

**Verification:** On the resolved tree, `npm run build` passed and `npm test` passed 113 cases across 13 files. Chromium `tests/merge-chicken-hunt.mjs` passed launch, one-canvas transition, pause/resume, actual in-canvas return button, completed-run ledger, result summary and Moon Base restart. Existing `feature1`, `feature3`, `feature4`, `healthFoodAudit`, `feature5` and `feature6` Chromium scripts passed. The captured arcade screenshot was inspected. `git diff --cached --check` passed and no conflict markers remained. Before the final pass, one test failed because it still assumed Chicken Hunt was unavailable; the browser check initially placed the astronaut outside the Landing Pad's interaction radius and then used an ambiguous Resume selector. Those test issues were corrected. A local server and Chromium required sandbox escalation; Python Playwright was absent, so the repository's installed Node Playwright runner was used.

**Limits and next work:** The successful browser run verified launch and an early return with zero food; reward application and duplicate rejection are additionally covered by domain/arcade unit tests. Full food pickup through live combat was not claimed in that browser check. Ice Collection, arcade touch controls, sound, save/resume, deployment and the optional power incident remain open. NASA live endpoints were not retested during this merge.

## Current repository status

At the Chicken Hunt merge checkpoint, local `main` contained `cc857d9`. The Moon Base, survival loop, scripted emergencies, optional DONKI context and Chicken Hunt launch/return were integrated. A11 save/resume was still planned at that point, and Developer B's remaining mission scope included Ice Collection.

## 2026-11-14 — Feature 7: browser save and resume

**Request and Git:** The user requested only A11 browser persistence and retained all branch management. Inspection found a clean checkout on `Feature-7-—-Save-&-Resume-(A11)`. The verified implementation commit is `149af56` (`feat: add versioned Moonbound save and resume`). No branches were created, switched, renamed, merged or pushed during this feature.

**Implementation:** `SaveService` stores a versioned LocalStorage envelope of the serializable `GameState`, using the existing reducer's loaded-state validator and `LOAD_GAME` action for hydration. It writes meaningful actions promptly and coalesces movement, HP timer ticks, mission progress and weather updates into one write per five seconds. Pagehide flushes pending progress. A single action-aware transition subscription preserves the existing React/Phaser state-subscription API. Missing/invalid versions, corrupt data, out-of-range values and storage errors fail safely. A valid save presents Continue/New Game before the Phaser canvas mounts; New Game confirms replacement, while terminal Restart uses the existing clean reducer.

**Recovery decisions:** No elapsed wall time is simulated while the tab is closed. Continue returns the astronaut to the base plaza without changing HP, supplies, crop, shield or XP. An interrupted mission is canceled without rewards and its run ID is added to the completed ledger so stale results and same-ID relaunches cannot apply. An interrupted storm or oxygen leak restarts its warning, retaining previous damage, resources and event ID; no safety or XP is granted. A terminal result drops an orphaned active countdown. Unsupported save schemas are rejected rather than guessed at; no migration path exists yet. The existing Chicken Hunt scene and Developer B assets were not modified.

**Verification:** `npm run build` passed and `npm test` passed 123 cases across 14 files, including 10 new SaveService cases. Chromium `tests/feature7.mjs` passed refresh/Continue, paused unloaded HP freeze, close/reopen in one browser context, mission interruption and stale-result rejection, emergency warning recovery/paused timer/resume, and New Game reset. Chromium Feature 1, 3, 4, HP/food, 5, 6 and Chicken Hunt integration regressions passed. The Continue screenshot was inspected. The first unit run exposed an existing one-argument subscriber expectation; the implementation kept that contract and added a separate action-aware subscription, then the final tests passed. Sandboxed local server launch required the approved elevated rerun. `git diff --cached --check` passed before commit.

**Limits and remaining work:** Persistence is browser/profile-local, not cloud sync. Quota or unavailable storage leaves the game playable without saving. No unsupported-schema migration, Developer B Ice Collection, arcade touch controls, optional power incident or deployment was added. NASA live endpoints were not retested for this feature.

## Current repository status

The user-managed checkout is `Feature-7-—-Save-&-Resume-(A11)` at implementation commit `149af56` before this documentation checkpoint. Features 1–7, the Chicken Hunt launch/return, and local save/resume are implemented and verified as stated above. Ice Collection and final integration/deployment remain open. No push or merge was performed for Feature 7.

## 2026-11-14 — Feature 8: mission verification, Earth water pods and learning signs

**Request and scope decision:** The user asked Developer A to independently verify Developer B's Chicken Hunt integration, replace Ice Collection as the MVP water source with scheduled Earth supplies, and make seven Moon Base locations educational. Ice Collection is now explicitly **deferred**, not a required MVP scene. This is a design decision from the user; earlier entries above retain what was planned at their own checkpoints.

**Repository evidence and implementation:** Work stayed on the user-managed `Feature-8--Mission-Integration-(A12)` branch. At inspection, Chicken Hunt was registered and had an energy cost, result dispatch, enemy drops and collectible overlap, but its earlier browser proof covered only empty early return. The Feature 8 implementation commit is `9d7aa26` (`feat: integrate missions, Earth water resupply and learning signs`). No Developer B-owned combat/arcade scene files changed. The shared reducer gained `COLLECT_EARTH_SUPPLY` and a collected-delivery ledger, with due-date, range, outdoor/base scene, active-mission and capacity checks. Day 2/4 pod objects render separately near the pad and persist until collected. Each awards 25 water once; starting water was reduced from 65 to 40 while daily water use remained 9. SaveService advanced from schema v1 to v2, migrates a valid v1 save with an empty delivery ledger, and preserves pod IDs across Continue. Seven separate pixel-art signposts and compact WHAT/WHY/YOUR MISSION panels give player-initiated learning; Chicken Hunt is identified as fiction and the Earth delivery schedule is identified as a game abstraction. A stale Moon Base message behind terminal results was corrected after screenshot review.

**Verified behavior:** `npm run build` passed. `npm test` passed 129 cases across 16 files. The new Chromium `tests/feature8.mjs` walked to the Landing Pad, launched Chicken Hunt at a six-energy cost, moved and fired the ship, destroyed enemies, collected two food drops, returned safely with food/XP but no automatic HP healing, failed another run without rewards, then ate stored food at the Habitat to restore HP. It opened all seven learning signs with E and one by mouse, checked a 390-pixel mobile panel, collected both pods, refreshed and continued, closed/reopened the tab, rejected duplicate pod and mission rewards, handled the scripted storm and leak, and reached five-day victory with 45 water remaining. Restart cleared delivery and mission IDs; low-energy launch was rejected. Eight prior Chromium regressions also passed: Feature 1, 3, 4, 5, 6, 7, HP/food and Chicken Hunt launch/empty return. Screenshots of the arcade, mobile learning panel, Earth pod collection and victory were inspected. `git diff --cached --check` passed before implementation commit.

**Limits and remaining work:** The real arcade pickup path was verified with its ordinary deterministic wave, but Chicken Hunt touch flight, audio and broader visual polish were not completed here. Earth water deliveries are illustrative, fixed game events, not NASA cargo observations. A full tank cannot partially accept a pod. NASA live endpoints were not retested in this feature. Ice Collection remains in the disabled mission catalog only for compatibility; it is outside the MVP. A13 accessibility/polish, A14 deployment/demo delivery and any later Developer B polish remain separate work. No branch was created, switched, merged or pushed during Feature 8.

## Current repository status

At the Feature 8 implementation checkpoint, the user-managed branch is `Feature-8--Mission-Integration-(A12)` with implementation commit `9d7aa26`. Features 1–8 provide the playable Moon Base, one shared domain store, Chicken Hunt food-to-Habitat loop, scheduled Earth water pods, seven educational interactions, scripted emergencies, optional NASA DONKI context, save/resume and verified five-day victory. The documentation checkpoint follows in a separate commit. Ice Collection is deferred; deployment was not performed. See [ImplementedFeatureA.md](ImplementedFeatureA.md) for the concise implementation record.
