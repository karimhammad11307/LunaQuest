# LunaQuest / Moonbound

## Project documentation

Use the four documents in `docs/` as the authoritative planning set:

- [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) — verified history and current repository state.
- [MASTER_PLAN.md](docs/MASTER_PLAN.md) — single source of truth for gameplay, science, art, architecture, QA and delivery.
- [DEVELOPER_A_TASKS.md](docs/DEVELOPER_A_TASKS.md) — base, survival and integration ownership.
- [DEVELOPER_B_TASKS.md](docs/DEVELOPER_B_TASKS.md) — arcade and mission ownership.

The [Developer A implementation steps](docs/IMPLEMENTATION_A_STEPS.md) provide an execution checklist; [ImplementedFeatureA.md](docs/ImplementedFeatureA.md) records verified A work. MASTER_PLAN remains authoritative.

## Current status

Feature 1 has a playable Phaser Moon Base: original procedural pixel terrain and separate buildings, animated four-direction astronaut movement, Arcade Physics collisions, five contextual building interactions, React HUD backed by the shared `GameSessionStore`, and touch controls. Feature 2 adds a pure action reducer, validated resource and XP changes, provisional mission progress, and exactly-once run-ID mission rewards. Resource economy at buildings, daily survival, mission scenes, events, NASA integration and save/resume remain unimplemented. The old Mars Commander prototype is preserved on `backup/mars-commander-codex`; do not use it as the Moonbound source of truth.

## Project guardrails

- Keep the Moonbound game top-down 3/4-view pixel art and the lunar setting.
- Domain rules own all resources, costs, consequences and mission rewards; scenes dispatch typed actions and do not mutate shared resources.
- Keep one `GameState`, `GameAction` and `MissionResult` contract. Developer A owns shared contract/config and integration; Developer B consumes it and owns arcade scenes/assets.
- Keep all game numbers explicitly illustrative. NASA DONKI is solar-observation context, not direct lunar surface dose or temperature data. Make the game playable offline.
- Check current Git status and branch before edits. Do not push or merge without explicit authorization.
- Update the four docs when implementation or verified repository state changes; do not claim planned or unrun work is complete.
