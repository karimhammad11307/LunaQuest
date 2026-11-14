# LunaQuest / Moonbound

## Project documentation

Use the four documents in `docs/` as the authoritative planning set:

- [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) — verified history and current repository state.
- [MASTER_PLAN.md](docs/MASTER_PLAN.md) — single source of truth for gameplay, science, art, architecture, QA and delivery.
- [DEVELOPER_A_TASKS.md](docs/DEVELOPER_A_TASKS.md) — base, survival and integration ownership.
- [DEVELOPER_B_TASKS.md](docs/DEVELOPER_B_TASKS.md) — arcade and mission ownership.

The [Developer A implementation steps](docs/IMPLEMENTATION_A_STEPS.md) provide an execution checklist; [ImplementedFeatureA.md](docs/ImplementedFeatureA.md) records verified A work. MASTER_PLAN remains authoritative.

## Current status

On user-managed `Feature-9-—-Endless-Survival-&-High-Score`, Features 1–9 provide the playable Phaser Moon Base, one `GameSessionStore`, Chicken Hunt's verified food-to-Habitat loop, scripted emergencies, NASA DONKI context and browser-local save/resume. Feature 9 implementation `faacbe4` removed five-day victory, added score and a separate personal record, and migrated valid v1/v2 saves to schema v3. `npm run build`, 139 Vitest cases and ten Chromium regressions passed. Day 2/4 water pods remain; long-term water balance (Feature 10), recurring incidents (Feature 11), arcade touch/sound, final accessibility polish and deployment remain open. Ice Collection is deferred. The old Mars Commander prototype is preserved on `backup/mars-commander-codex`. See [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) for verified details.

## Current handoff

Feature 9 implementation is committed locally at `faacbe4` on the current user-managed branch; this documentation checkpoint records the endless design and verification. No push or merge was performed. The next economy work is Feature 10 long-term water/resupply; Feature 11 recurring incidents/difficulty, A13 accessibility/QA and A14 deployment remain separate. `SaveService` owns the active run; `HighScoreService` owns the independent record; Phaser and React continue to use the single domain store. Check [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) before changing progression or save flow.

## Project guardrails

- Keep the Moonbound game top-down 3/4-view pixel art and the lunar setting.
- Domain rules own all resources, costs, consequences and mission rewards; scenes dispatch typed actions and do not mutate shared resources.
- Keep one `GameState`, `GameAction` and `MissionResult` contract. Developer A owns shared contract/config and integration; Developer B consumes it and owns arcade scenes/assets.
- Keep all game numbers explicitly illustrative. NASA DONKI is solar-observation context, not direct lunar surface dose or temperature data. Make the game playable offline.
- Check current Git status and branch before edits. Do not push or merge without explicit authorization.
- Update the four docs when implementation or verified repository state changes; do not claim planned or unrun work is complete.
