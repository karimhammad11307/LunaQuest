# LunaQuest

## Project documentation

Use the four documents in `docs/` as the authoritative planning set:

- [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) — verified history and current repository state.
- [MASTER_PLAN.md](docs/MASTER_PLAN.md) — single source of truth for gameplay, science, art, architecture, QA and delivery.
- [DEVELOPER_A_TASKS.md](docs/DEVELOPER_A_TASKS.md) — base, survival and integration ownership.
- [DEVELOPER_B_TASKS.md](docs/DEVELOPER_B_TASKS.md) — arcade and mission ownership.

The [Developer A implementation steps](docs/IMPLEMENTATION_A_STEPS.md) provide an execution checklist; [ImplementedFeatureA.md](docs/ImplementedFeatureA.md) records verified A work. MASTER_PLAN remains authoritative.

## Current status

On user-managed `Feature-11-—-Final-Gameplay-Polish-&-QA`, Features 1–11 provide the playable endless Phaser Moon Base, one `GameSessionStore`, verified Chicken Hunt food-to-Habitat loop, NASA DONKI context, browser-local save/records, visible six-Energy mission charge and original procedural retro audio. Feature 11 implementation `d798f21` added E/Q indoor entry/exit, keyboard building menus, once-daily 8-Energy → up to 15-base-O₂ Habitat recycling, a queued solar storm on each day transition from Day 2, touch analog movement for base/arcade, responsive viewport play and optional fullscreen. Save schema v4 migrates valid v1–v3 progress. `npm run build`, 156 Vitest cases and Chromium Feature 8/10/11 flows passed; desktop/mobile screenshots were inspected. Day 2/4 water pods remain the only deliveries; post-Day-4 balance is a known limit. Ice Collection is deferred. The old Mars Commander prototype is preserved on `backup/mars-commander-codex`. See [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) for verified details.

## Current handoff

Feature 11 implementation is committed locally at `d798f21` on the current user-managed branch. No push or merge was performed. **Next: Feature 12 = A14 Vercel deployment and hackathon demo.** Daily solar storms are scripted game events; DONKI is educational context only. No additional difficulty scaling is planned. `SaveService` owns the active run and new queue/recycling cooldown; `HighScoreService` owns the independent record; `AudioService` owns audio preferences and playback. Phaser and React continue to use the single domain store. Check [PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md) before changing progression or save flow.

## Project guardrails

- Keep the LunaQuest game top-down 3/4-view pixel art and the lunar setting.
- Domain rules own all resources, costs, consequences and mission rewards; scenes dispatch typed actions and do not mutate shared resources.
- Keep one `GameState`, `GameAction` and `MissionResult` contract. Developer A owns shared contract/config and integration; Developer B consumes it and owns arcade scenes/assets.
- Keep all game numbers explicitly illustrative. NASA DONKI is solar-observation context, not direct lunar surface dose or temperature data. Make the game playable offline.
- Keep original procedural audio and its preferences in `AudioService`; scene callbacks report actual actions but never alter survival resources. The six-Energy Chicken Hunt cost stays in shared mission config/domain rules.
- Check current Git status and branch before edits. Do not push or merge without explicit authorization.
- Update the four docs when implementation or verified repository state changes; do not claim planned or unrun work is complete.
