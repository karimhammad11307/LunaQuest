# Moonbound — Progress Report

**Project:** Moonbound: Survival Mission (NASA Space Apps Challenge 2026)
**Repository:** /Users/macbookpro/Desktop/NaSA/LunaQuest
**Active branch:** `base-survival`
**Date:** 2026-11-13
**Developer A:** Claude (foundation, Moon Base, survival systems, integration owner)
**Developer B:** Codex (pending — Chicken Hunt & Ice Collection; unavailable until usage limit resets)

---

## 1. Approved locked decisions

1. Five scenes: Title, Moon Base, Chicken Hunt, Ice Collection, Results.
2. Real-time exploration drains suit oxygen / affects suit safety; daily resource consumption applies on day advance.
3. Mission failure = lost rewards + damage, not instant Game Over.
4. Greenhouse crops take one in-game day to grow.
5. Radiation emergencies require reaching the shelter/shield and interacting before the warning expires.
6. NASA DONKI provides real solar observations for educational context; danger levels and temperature are clearly labeled simulations.
7. All assets and UI share a cohesive top-down 3/4 pixel-art style with frame-based animation.
8. Developer B owns Chicken Hunt and Ice Collection — Developer A must not implement those scenes.
9. Balancing constants centralized, with enough supplies for children to recover from mistakes.
10. Use the existing Git branch; no project recreation or repeated setup.

## 2. What has actually been completed (verified)

### Repository / Git
- Old Mars Commander implementation preserved in branch `backup/mars-commander-codex` (commit `cf01cb4`). Git history untouched.
- Active work branch: `base-survival` (created by the user).
- Old website-style app files removed from the working tree: `src/main.tsx`, `src/World.tsx`, `src/game.ts`, `src/game.test.ts`, `src/style.css`.

### Project configuration
- `package.json` — renamed to `moonbound`; scripts: `dev`, `build` (tsc --noEmit && vite build), `preview`, `test` (vitest). Dependencies installed: **phaser 3.90.0**, react 19, react-dom 19, vitest, @vitejs/plugin-react, typescript, vite, playwright, tsx, types.
- `index.html` — Moonbound title, dark space background (#12172F), no scrollbars, pixelated canvas CSS, entry point `/src/app/main.tsx`.
- `tsconfig.json` — strict TypeScript, react-jsx, includes `src` + `vite.config.ts`.
- `vite.config.ts` — Vite 6 + React plugin, relative base for static hosting.
- `.env.example` — NOT yet recreated on this branch (planned; contents defined for NASA API key + weather mode).

### Shared domain contract (frozen for Developer B)
- `src/domain/models/types.ts` — `Resources`, `AstronautState`, `BuildingType`, `BuildingCondition`, `BuildingState` (incl. `lastCollectedDay`), `MissionType`, `GameSceneId`, `MissionResult`, `GameStatus`, `WeatherStatus`, `GameState`.
- `src/domain/models/GameAction.ts` — discriminated union: TICK, MOVE_PLAYER, INTERACT_BUILDING, START_MISSION, COMPLETE_MISSION, ADVANCE_DAY, PLANT_CROP, HARVEST_CROP, ACTIVATE_SHIELD, REPAIR_BUILDING, RESOLVE_EVENT, RESTART_GAME, LOAD_GAME, DISMISS_NOTICE.

### Game configuration (Developer A owned)
- `src/game/config/palette.ts` — full shared pixel palette (space, terrain, outline, cyan, purple, yellow, orange, coral, green, suit, metal).
- `src/game/config/balance.ts` — ALL balancing constants: start values, daily costs, suit oxygen/thermal drains, radiation rules, greenhouse economy, shield costs, habitat refill/heal, repair, health penalties, day limit 5, XP awards, warning thresholds.
- `src/game/config/gameConfig.ts` — logical view 640×360, world 800×480, player speed, interact/habitat radii, building layout (5 buildings with positions), spawn point, mission config (Chicken Hunt / Ice Run / Shield Drill — `available: false` until Dev B integrates), texture key registry.

### Domain rules (in progress)
- `src/domain/rules/survivalRules.ts` — implemented: `clamp`, notice system, `trimNotices`, `createInitialBuildings`, `createInitialState`, `tickOutdoor` (real-time suit oxygen + thermal drain, low-oxygen warning, health drain at zero suit oxygen).
- **Not yet implemented in this file:** `advanceDay`, `habitatInteract`, `greenhouseInteract`, solar/shield interactions, repair, mission result application.

### Other
- `abdo/` folder created (user request).

## 3. What is NOT yet done (honest status)

- `GameSessionStore` (typed event/subscription store) — not started.
- React shell (`src/app/main.tsx`, `App.tsx`, `GameContainer.tsx`, HUD) — not started.
- Phaser `BootScene` and `MoonBaseScene` — not started.
- Astronaut entity, sprites, movement, animation — not started.
- Pixel-art rendering pipeline (procedural texture generation) — not started.
- Events (radiation alert, oxygen leak), NASA DONKI service, SaveService — not started.
- Vitest unit tests — not started.
- `npm run build` has NOT been run yet on the new code — no production build verification so far.
- No browser gameplay verification yet — nothing is playable in a browser yet.
- Developer B scenes (Chicken Hunt, Ice Collection) — intentionally not implemented; interfaces reserved.

## 4. Current blockers / notes

- Developer B (Codex) unavailable until usage limit resets — Dev A continues foundation in the meantime.
- One large file edit failed earlier due to size limits (survival rules part 2); it will be re-written in smaller chunks. No corrupted files remain — `balance.ts` was re-read and verified intact.
- The domain contract deliberately leaves `MISSION_CONFIG.available = false` so the landing pad degrades gracefully instead of crashing before Dev B's scenes exist.
