# Moonbound repository handoff

## Repository state

Active preparation branch: `feat/base-survival`. The old Mars Commander React/SVG implementation remains preserved on `backup/mars-commander-codex` at commit `cf01cb4`; it is not the Moonbound application.

## Architecture and stack

Vite 6 + TypeScript + React 19 form the application shell. Phaser 3.90 is installed for the planned game renderer. The domain layer is framework independent: `src/domain/models` defines game state and actions, `src/domain/rules/survivalRules.ts` contains pure starter rules, `src/game/config` holds palette, world/building layout and balance constants. `index.html` loads `src/app/main.tsx`.

## What Cline implemented

Cline renamed/configured the project for Moonbound, added Phaser/React/Vite/Vitest dependencies, defined the game state/action contracts, centralized balance and scene/layout configuration, and started outdoor suit oxygen and thermal drain rules. The latest `main` commit adds design/implementation plans and a progress report. This handoff commit adds only a bootstrap entry point, tests for existing rules, ignore rules, and repository documentation.

## What works now

- `npm install` resolves the lockfile.
- The React/Vite bootstrap mounts and the configured production build completes.
- `clamp`, initial state/building construction, and outdoor suit oxygen/thermal drain are implemented and covered by tests.
- Old Mars Commander implementation remains recoverable from its backup branch.

## Missing or incomplete

The bootstrap is intentionally not gameplay. There is no Phaser game instance or scene, movement, Moon Base world, player entity/art, interaction store/reducer, daily survival rules, building actions, event implementation, NASA service, save/load, Chicken Hunt, Ice Collection, results flow, or browser gameplay test. Missions remain unavailable in config. No live NASA data or secrets are configured.

## Remaining Moonbound MVP work

1. Implement and test a typed game session/store and complete survival rules, including day advance, resource failure/warnings, habitat, greenhouse, solar, shield, repairs, and one-use mission results.
2. Add Phaser boot and Moon Base scenes, responsive/pixel-art rendering, astronaut input and building interactions.
3. Add radiation/oxygen emergencies with distinct outcomes and clear simulated-vs-real data labels.
4. Add versioned local save/continue, title/results flows, accessibility and reduced motion.
5. Integrate the separately owned Chicken Hunt and Ice Collection scenes through the existing contract; keep all missions disabled until scenes exist.
6. Add a focused browser playthrough test and verify build, tests, mobile sizing and offline behavior.

Keep simulated lunar/game values separate from attributed NASA observations. Do not present DONKI solar events as direct lunar surface radiation measurements.
