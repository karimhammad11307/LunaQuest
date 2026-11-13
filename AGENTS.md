# LunaQuest / Moonbound

## Project documentation

Use the four documents in `docs/` as the authoritative planning set:

- [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) — verified history and current repository state.
- [MASTER_PLAN.md](docs/MASTER_PLAN.md) — single source of truth for gameplay, science, art, architecture, QA and delivery.
- [DEVELOPER_A_TASKS.md](docs/DEVELOPER_A_TASKS.md) — base, survival and integration ownership.
- [DEVELOPER_B_TASKS.md](docs/DEVELOPER_B_TASKS.md) — arcade and mission ownership.

The [Developer A implementation steps](docs/IMPLEMENTATION_A_STEPS.md) provide an execution checklist; [ImplementedFeatureA.md](docs/ImplementedFeatureA.md) records verified A work. MASTER_PLAN remains authoritative.

## Current status

Features 1–3 now provide a playable Phaser Moon Base, animated movement/collisions, five contextual buildings, the shared `GameSessionStore` and exactly-once mission rewards. Feature 3 adds habitat eating/refill/rest, shelter entry, outdoor suit oxygen drain, daily resource/HP simulation, five-day victory, defeat and restart. `npm run build`, 25 Vitest cases, and both Feature 1 and Feature 3 Chromium gameplay checks passed at the Feature 3 checkpoint. Mission scenes, greenhouse/solar production, incidents, NASA integration and save/resume remain unimplemented. The old Mars Commander prototype is preserved on `backup/mars-commander-codex`; do not use it as the Moonbound source of truth. See [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) and [ImplementedFeatureA.md](docs/ImplementedFeatureA.md) for verified details. Next Developer A work is Feature 4 production/solar mechanics; Developer B owns separate mission scenes.

## Project guardrails

- Keep the Moonbound game top-down 3/4-view pixel art and the lunar setting.
- Domain rules own all resources, costs, consequences and mission rewards; scenes dispatch typed actions and do not mutate shared resources.
- Keep one `GameState`, `GameAction` and `MissionResult` contract. Developer A owns shared contract/config and integration; Developer B consumes it and owns arcade scenes/assets.
- Keep all game numbers explicitly illustrative. NASA DONKI is solar-observation context, not direct lunar surface dose or temperature data. Make the game playable offline.
- Check current Git status and branch before edits. Do not push or merge without explicit authorization.
- Update the four docs when implementation or verified repository state changes; do not claim planned or unrun work is complete.
