# LunaQuest / Moonbound

## Project documentation

Use the four documents in `docs/` as the authoritative planning set:

- [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) — verified history and current repository state.
- [MASTER_PLAN.md](docs/MASTER_PLAN.md) — single source of truth for gameplay, science, art, architecture, QA and delivery.
- [DEVELOPER_A_TASKS.md](docs/DEVELOPER_A_TASKS.md) — base, survival and integration ownership.
- [DEVELOPER_B_TASKS.md](docs/DEVELOPER_B_TASKS.md) — arcade and mission ownership.

The [Developer A implementation steps](docs/IMPLEMENTATION_A_STEPS.md) provide an execution checklist; [ImplementedFeatureA.md](docs/ImplementedFeatureA.md) records verified A work. MASTER_PLAN remains authoritative.

## Current status

On user-managed `Feature-10-—-Audio-System-&-Chicken-Hunt-Energy-Fix`, Features 1–10 provide the playable endless Phaser Moon Base, one `GameSessionStore`, Chicken Hunt's verified food-to-Habitat loop, scripted emergencies, NASA DONKI context, browser-local save/records, visible six-Energy mission charge and original procedural retro audio. Feature 10 implementation `9dc6ca2` added a centralized AudioService, base/arcade music, action/combat/emergency cues and independent persistent settings. `npm run build`, 149 Vitest cases and 11 Chromium scripts passed; browser audio state/cues were checked, but subjective listening was not performed. Day 2/4 water pods remain the only deliveries; post-Day-4 water balance is a known limit. Ice Collection is deferred. The old Mars Commander prototype is preserved on `backup/mars-commander-codex`. See [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) for verified details.

## Current handoff

Feature 10 implementation is committed locally at `9dc6ca2` on the current user-managed branch; this documentation checkpoint records the audio/launch feedback and the revised roadmap. No push or merge was performed. **Feature 11 = A13 final gameplay polish/QA; Feature 12 = A14 Vercel deployment and hackathon demo.** No recurring emergencies or difficulty scaling are planned. `SaveService` owns the active run; `HighScoreService` owns the independent record; `AudioService` owns audio preferences and playback. Phaser and React continue to use the single domain store. Check [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) before changing progression or save flow.

## Project guardrails

- Keep the Moonbound game top-down 3/4-view pixel art and the lunar setting.
- Domain rules own all resources, costs, consequences and mission rewards; scenes dispatch typed actions and do not mutate shared resources.
- Keep one `GameState`, `GameAction` and `MissionResult` contract. Developer A owns shared contract/config and integration; Developer B consumes it and owns arcade scenes/assets.
- Keep all game numbers explicitly illustrative. NASA DONKI is solar-observation context, not direct lunar surface dose or temperature data. Make the game playable offline.
- Keep original procedural audio and its preferences in `AudioService`; scene callbacks report actual actions but never alter survival resources. The six-Energy Chicken Hunt cost stays in shared mission config/domain rules.
- Check current Git status and branch before edits. Do not push or merge without explicit authorization.
- Update the four docs when implementation or verified repository state changes; do not claim planned or unrun work is complete.
