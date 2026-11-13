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

## Current repository status after Feature 3

The current branch is `building-survival`. The playable Phaser Moon Base, shared store and exactly-once mission reward contract from Features 1–2 remain. Feature 3 adds the functional survival loop described above. The next Developer A work is Feature 4 production/solar mechanics; Developer B missions remain separate. The code implementation is committed at `836f340`; the documentation checkpoint commit is recorded in the final task report.
