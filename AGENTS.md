# LunaQuest / Moonbound

## Project documentation

Use the four documents in `docs/` as the authoritative planning set:

- [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) — verified history and current repository state.
- [MASTER_PLAN.md](docs/MASTER_PLAN.md) — single source of truth for gameplay, science, art, architecture, QA and delivery.
- [DEVELOPER_A_TASKS.md](docs/DEVELOPER_A_TASKS.md) — base, survival and integration ownership.
- [DEVELOPER_B_TASKS.md](docs/DEVELOPER_B_TASKS.md) — arcade and mission ownership.

The [Developer A implementation steps](docs/IMPLEMENTATION_A_STEPS.md) provide an execution checklist; [ImplementedFeatureA.md](docs/ImplementedFeatureA.md) records verified A work. MASTER_PLAN remains authoritative.

## Current status

Features 1–5 now provide a playable Phaser Moon Base, five interactive buildings, one shared `GameSessionStore`, exactly-once mission rewards, active-play HP decay, and two scripted emergencies. Feature 5 added a solar warning/storm with shelter or paid-shield protection and an oxygen leak with paid repair or section isolation. Its implementation is `5e8ee0c` on the user-managed current branch. `npm run build`, 64 Vitest cases, and Feature 1/3/4/HP/Feature 5 Chromium checks passed; screenshots of both incidents were inspected. The Chicken Hunt scaffold compiles but is not registered or playable. NASA DONKI, save/resume, mission integration and the optional power incident remain unimplemented. The old Mars Commander prototype is preserved on `backup/mars-commander-codex`; do not use it as the Moonbound source of truth. See [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) and [ImplementedFeatureA.md](docs/ImplementedFeatureA.md) for details. Next Developer A work is A10 NASA data and A11 persistence, subject to the user's direction.

## Project guardrails

- Keep the Moonbound game top-down 3/4-view pixel art and the lunar setting.
- Domain rules own all resources, costs, consequences and mission rewards; scenes dispatch typed actions and do not mutate shared resources.
- Keep one `GameState`, `GameAction` and `MissionResult` contract. Developer A owns shared contract/config and integration; Developer B consumes it and owns arcade scenes/assets.
- Keep all game numbers explicitly illustrative. NASA DONKI is solar-observation context, not direct lunar surface dose or temperature data. Make the game playable offline.
- Check current Git status and branch before edits. Do not push or merge without explicit authorization.
- Update the four docs when implementation or verified repository state changes; do not claim planned or unrun work is complete.
