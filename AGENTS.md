# LunaQuest / Moonbound

## Project documentation

Use the four documents in `docs/` as the authoritative planning set:

- [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) — verified history and current repository state.
- [MASTER_PLAN.md](docs/MASTER_PLAN.md) — single source of truth for gameplay, science, art, architecture, QA and delivery.
- [DEVELOPER_A_TASKS.md](docs/DEVELOPER_A_TASKS.md) — base, survival and integration ownership.
- [DEVELOPER_B_TASKS.md](docs/DEVELOPER_B_TASKS.md) — arcade and mission ownership.

The [Developer A implementation steps](docs/IMPLEMENTATION_A_STEPS.md) provide an execution checklist; [ImplementedFeatureA.md](docs/ImplementedFeatureA.md) records verified A work. MASTER_PLAN remains authoritative.

## Current status

On local `main`, Features 1–6 provide the playable Phaser Moon Base, five interactive buildings, one `GameSessionStore`, active-play HP decay, two scripted emergencies and NASA DONKI context. Merge `cc857d9` integrated Chicken Hunt from the Landing Pad into the existing `main.tsx` shell; the shared reducer applies mission results once. Build, 113 Vitest cases, Feature 1/3/4/HP/5/6 Chromium regressions and a Chicken Hunt launch/pause/return browser check passed. Ice Collection, save/resume, arcade touch controls and deployment remain open. The old Mars Commander prototype is preserved on `backup/mars-commander-codex`. See [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) for the verified merge record.

## Current handoff

The local merge conflicts are resolved and `main` contains `cc857d9`; no push was performed. Next work is A11 save/resume and the remaining Developer B mission scope, as directed by the user. Keep `main.tsx` connected to the single domain store and check [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) before changing scene flow.

## Project guardrails

- Keep the Moonbound game top-down 3/4-view pixel art and the lunar setting.
- Domain rules own all resources, costs, consequences and mission rewards; scenes dispatch typed actions and do not mutate shared resources.
- Keep one `GameState`, `GameAction` and `MissionResult` contract. Developer A owns shared contract/config and integration; Developer B consumes it and owns arcade scenes/assets.
- Keep all game numbers explicitly illustrative. NASA DONKI is solar-observation context, not direct lunar surface dose or temperature data. Make the game playable offline.
- Check current Git status and branch before edits. Do not push or merge without explicit authorization.
- Update the four docs when implementation or verified repository state changes; do not claim planned or unrun work is complete.
