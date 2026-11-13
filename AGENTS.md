# LunaQuest / Moonbound

## Project documentation

Use the four documents in `docs/` as the authoritative planning set:

- [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) — verified history and current repository state.
- [MASTER_PLAN.md](docs/MASTER_PLAN.md) — single source of truth for gameplay, science, art, architecture, QA and delivery.
- [DEVELOPER_A_TASKS.md](docs/DEVELOPER_A_TASKS.md) — base, survival and integration ownership.
- [DEVELOPER_B_TASKS.md](docs/DEVELOPER_B_TASKS.md) — arcade and mission ownership.

The [Developer A implementation steps](docs/IMPLEMENTATION_A_STEPS.md) provide an execution checklist; [ImplementedFeatureA.md](docs/ImplementedFeatureA.md) records verified A work. MASTER_PLAN remains authoritative.

## Current status

Features 1–4 provide a playable Phaser Moon Base, five interactive buildings, one shared `GameSessionStore`, and exactly-once mission rewards. The pre-Feature-5 HP/food audit added slow active-play HP decay and a typed pause control; existing eating, mission-food storage, starvation, oxygen damage and protected exposure behavior were verified. `npm run build`, 51 Vitest cases, and Feature 1/3/4 plus HP/food Chromium checks passed. A minimal TypeScript/`runId` compatibility correction made the merged Chicken Hunt scaffold compile; it is not registered or playable. Timed incidents, NASA integration and save/resume remain unimplemented. The old Mars Commander prototype is preserved on `backup/mars-commander-codex`; do not use it as the Moonbound source of truth. See [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) and [ImplementedFeatureA.md](docs/ImplementedFeatureA.md) for details. Next Developer A work is Feature 5 incidents.

## Project guardrails

- Keep the Moonbound game top-down 3/4-view pixel art and the lunar setting.
- Domain rules own all resources, costs, consequences and mission rewards; scenes dispatch typed actions and do not mutate shared resources.
- Keep one `GameState`, `GameAction` and `MissionResult` contract. Developer A owns shared contract/config and integration; Developer B consumes it and owns arcade scenes/assets.
- Keep all game numbers explicitly illustrative. NASA DONKI is solar-observation context, not direct lunar surface dose or temperature data. Make the game playable offline.
- Check current Git status and branch before edits. Do not push or merge without explicit authorization.
- Update the four docs when implementation or verified repository state changes; do not claim planned or unrun work is complete.
