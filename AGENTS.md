# LunaQuest

## Project documentation

Use the four documents in `docs/` as the authoritative planning set:

- [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) — verified history and current repository state.
- [MASTER_PLAN.md](docs/MASTER_PLAN.md) — single source of truth for gameplay, science, art, architecture, QA and delivery.
- [DEVELOPER_A_TASKS.md](docs/DEVELOPER_A_TASKS.md) — base, survival and integration ownership.
- [DEVELOPER_B_TASKS.md](docs/DEVELOPER_B_TASKS.md) — arcade and mission ownership.

The [Developer A implementation steps](docs/IMPLEMENTATION_A_STEPS.md) provide an execution checklist; [ImplementedFeatureA.md](docs/ImplementedFeatureA.md) records verified A work. MASTER_PLAN remains authoritative.

## Current status

On user-managed `Feature-11-—-Final-Gameplay-Polish-&-QA`, Features 1–11 provide the playable endless Phaser Moon Base, one `GameSessionStore`, verified Chicken Hunt food-to-Habitat loop, NASA DONKI context, browser-local save/records, visible six-Energy mission charge and original procedural retro audio. The first-time experience Task 1 implementation `70b2d3c` adds a static three-page LUNAQUEST introduction and an interactive Moon Base guide with skip, replay and safe Continue. Feature 11's E/Q entry, keyboard menus, once-daily Habitat oxygen recycling, daily solar storms and mobile joystick remain. The desktop application uses the later user-requested approximately 900px centered arcade frame; fullscreen is optional. Save schema v4 migrates valid v1–v3 progress. `npm run build`, 161 Vitest cases and Chromium onboarding plus Feature 7–11 scripts passed; desktop/mobile screenshots were inspected. Day 2/4 water pods remain the only deliveries; post-Day-4 balance is a known limit. Ice Collection is deferred. The old Mars Commander prototype is preserved on `backup/mars-commander-codex`. See [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) for verified details.

## Current handoff

First-time experience Task 1 is committed locally at `70b2d3c` on the current user-managed branch, with documentation recorded in a separate commit. No push or merge was performed. **Next:** review Task 1, then implement the separately requested spacecraft journey (Task 2) or Feature 12 deployment only when the user authorizes it. `OnboardingService` owns browser-local learning progress; `SaveService` owns the active run and queue/recycling cooldown; `HighScoreService` owns the independent record; `AudioService` owns preferences and playback. Phaser and React continue to use the single domain store. Daily solar storms are scripted game events; DONKI is educational context only. Check [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) before changing progression or save flow.

## Project guardrails

- Keep the LunaQuest game top-down 3/4-view pixel art and the lunar setting.
- Domain rules own all resources, costs, consequences and mission rewards; scenes dispatch typed actions and do not mutate shared resources.
- Keep one `GameState`, `GameAction` and `MissionResult` contract. Developer A owns shared contract/config and integration; Developer B consumes it and owns arcade scenes/assets.
- Keep all game numbers explicitly illustrative. NASA DONKI is solar-observation context, not direct lunar surface dose or temperature data. Make the game playable offline.
- Keep original procedural audio and its preferences in `AudioService`; scene callbacks report actual actions but never alter survival resources. The six-Energy Chicken Hunt cost stays in shared mission config/domain rules.
- Check current Git status and branch before edits. Do not push or merge without explicit authorization.
- Update the four docs when implementation or verified repository state changes; do not claim planned or unrun work is complete.
