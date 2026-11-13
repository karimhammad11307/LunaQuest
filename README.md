# Moonbound: Survival Mission

Moonbound is a child-friendly lunar survival game for the NASA Space Apps Challenge 2026. **Feature 1 is playable:** explore the Moon Base, walk around five buildings, inspect them, and see the initial shared game state in the HUD. Survival systems and supply missions are upcoming work. See the project documentation:

- [Project history and verified status](docs/PROJECT_HISTORY.md)
- [Master game and engineering plan](docs/MASTER_PLAN.md)
- [Developer A: base and survival tasks](docs/DEVELOPER_A_TASKS.md)
- [Developer B: arcade and mission tasks](docs/DEVELOPER_B_TASKS.md)
- [Developer A implementation order](docs/IMPLEMENTATION_A_STEPS.md)

## Play Feature 1

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Move with **WASD or arrow keys**, approach a building and press **E**. You can also click a building when nearby. Small touch screens show directional and Interact buttons. The five buildings currently give contextual messages; their resource actions are not active yet.

## Verify the current foundation

```sh
npm run build
npm test
```

For a browser check, start the dev server and run `node tests/feature1.mjs`. It defaults to port 5173; set `MOONBOUND_URL` to the URL Vite prints if it chooses another port. The script checks animation, five interactions/collision zones, HUD values, and mobile layout, and writes screenshots to ignored `artifacts/`.

The art is original procedural pixel art described in `src/assets/manifest.json`. The earlier Mars Commander prototype is preserved on `backup/mars-commander-codex`.
