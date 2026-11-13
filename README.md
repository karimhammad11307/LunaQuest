# Moonbound: Survival Mission

Moonbound is planned as a playable, child-friendly lunar survival game for the NASA Space Apps Challenge 2026. The current repository is a partial foundation; the Moon Base and mission gameplay are not implemented yet. See the authoritative documentation:

- [Project history and verified status](docs/PROJECT_HISTORY.md)
- [Master game and engineering plan](docs/MASTER_PLAN.md)
- [Developer A: base and survival tasks](docs/DEVELOPER_A_TASKS.md)
- [Developer B: arcade and mission tasks](docs/DEVELOPER_B_TASKS.md)

## Run the current bootstrap

```sh
npm install
npm run dev
```

## Verify the current foundation

```sh
npm run build
npm test
```

Phaser is configured as a dependency but no Phaser scene is implemented at this stage. The earlier Mars Commander prototype is preserved on `backup/mars-commander-codex`.
