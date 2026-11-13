# LunaQuest / Moonbound

## Project documentation

Use the four documents in `docs/` as the authoritative planning set:

- [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) — verified history and current repository state.
- [MASTER_PLAN.md](docs/MASTER_PLAN.md) — single source of truth for gameplay, science, art, architecture, QA and delivery.
- [DEVELOPER_A_TASKS.md](docs/DEVELOPER_A_TASKS.md) — base, survival and integration ownership.
- [DEVELOPER_B_TASKS.md](docs/DEVELOPER_B_TASKS.md) — arcade and mission ownership.

The [Developer A implementation steps](docs/IMPLEMENTATION_A_STEPS.md) provide an execution checklist; [ImplementedFeatureA.md](docs/ImplementedFeatureA.md) records verified A work. MASTER_PLAN remains authoritative.

## Current status

On user-managed `Feature-8--Mission-Integration-(A12)`, Features 1–8 provide the playable Phaser Moon Base, one `GameSessionStore`, Chicken Hunt's verified food-to-Habitat loop, scripted emergencies, NASA DONKI context and browser-local save/resume. Feature 8 implementation `9d7aa26` added Day 2/4 Earth water pods (+25 each), seven learning signs, save schema v2 and v1 migration. Build, 129 Vitest cases, eight prior Chromium regressions and a complete Feature 8 Chromium five-day victory passed. Ice Collection is deferred outside the MVP; arcade touch flight, sound, final accessibility polish and deployment remain open. The old Mars Commander prototype is preserved on `backup/mars-commander-codex`. See [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) for verified details.

## Current handoff

Feature 8 implementation is committed locally at `9d7aa26` on the current user-managed branch; the documentation checkpoint records the final scope and verification. No push or merge was performed. Next work is the separate A13 accessibility/QA polish and A14 deployment/demo gate, plus any Developer B arcade polish the user prioritizes. SaveService owns persistence only; Phaser and React continue to use the single store. Check [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) before changing scene flow.

## Project guardrails

- Keep the Moonbound game top-down 3/4-view pixel art and the lunar setting.
- Domain rules own all resources, costs, consequences and mission rewards; scenes dispatch typed actions and do not mutate shared resources.
- Keep one `GameState`, `GameAction` and `MissionResult` contract. Developer A owns shared contract/config and integration; Developer B consumes it and owns arcade scenes/assets.
- Keep all game numbers explicitly illustrative. NASA DONKI is solar-observation context, not direct lunar surface dose or temperature data. Make the game playable offline.
- Check current Git status and branch before edits. Do not push or merge without explicit authorization.
- Update the four docs when implementation or verified repository state changes; do not claim planned or unrun work is complete.
