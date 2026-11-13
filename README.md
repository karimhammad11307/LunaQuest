# Moonbound: Survival Mission

Moonbound is a top-down 3/4 pixel-art lunar survival game for children, built with Phaser 3, TypeScript and a lightweight React shell for the NASA Space Apps Challenge 2026. The playable Moon Base has five interactive buildings, a five-day survival loop, greenhouse/solar/shield systems, a scripted solar storm and an oxygen leak. Chicken Hunt launches from the Landing Pad; food collected there enters storage on a safe return, then can be eaten at the Habitat to restore HP. Animated Earth water pods arrive on Days 2 and 4. Seven learning signs explain the base and mission. Browser-local save/resume is available; Lunar Ice Collection is deferred and deployment remains open.

- [Project history and verified status](docs/PROJECT_HISTORY.md)
- [Master game and engineering plan](docs/MASTER_PLAN.md)
- [Developer A tasks](docs/DEVELOPER_A_TASKS.md) · [Developer B tasks](docs/DEVELOPER_B_TASKS.md)
- [Developer A implementation order](docs/IMPLEMENTATION_A_STEPS.md) · [Verified feature log](docs/ImplementedFeatureA.md)

## Run and verify

```sh
npm install
npm run dev
```

Open the local Vite URL. Move with **WASD or arrow keys**, approach a building, learning sign or Earth pod, and press **E**. Click or tap a nearby object to interact. At the Landing Pad, launch **Chicken Hunt**; use WASD/arrows to fly, Space to fire and the in-scene button to return. Collect the Earth pods near the pad on Days 2 and 4 to add 25 water each. Each sign opens short **What / Why / Your Mission** guidance and pauses survival until closed. Open **Space Weather** in the bottom status strip to inspect NASA observation context; the default is a clearly labeled historical demo example. The two-day delivery schedule and all game resource, HP and hazard values are illustrative.

Progress saves automatically in this browser, including collected Earth delivery IDs. On a later visit, choose **Continue Game** or **New Game**. New Game asks before replacing the save. The version-2 save format migrates valid version-1 saves. Refreshing during Chicken Hunt returns to the Moon Base without that run's rewards; an interrupted emergency restarts its warning without undoing damage. No offline time is simulated. If browser storage is blocked or full, play continues but progress cannot be retained.

```sh
npm run build
npm test
```

With the dev server running on port 5173, browser checks are `node tests/feature1.mjs`, `node tests/feature3.mjs`, `node tests/feature4.mjs`, `node tests/healthFoodAudit.mjs`, `node tests/feature5.mjs`, `node tests/feature6.mjs`, `node tests/feature7.mjs`, `node tests/merge-chicken-hunt.mjs`, and `node tests/feature8.mjs`. Use `MOONBOUND_URL` if Vite runs on another port. Screenshots go to ignored `artifacts/`.

## NASA DONKI configuration

Copy `.env.example` to `.env.local` to change the optional weather mode. `VITE_NASA_DATA_MODE=demo` is the offline-safe default; `live` fetches the last seven UTC days from `/DONKI/FLR`, `/DONKI/CME`, `/DONKI/SEP` and `/DONKI/notifications` in the background. The in-game **Try NASA live** button also requests live data. Successful observations are cached locally for six hours. Empty results show a calm status; failures and rate limits use a labeled historical demo example and never stop gameplay.

`VITE_NASA_API_KEY` is supported for browser requests, but **every `VITE_` value is public in the production bundle**. Do not put a private API key there. Without a configured key, explicit live mode uses NASA's public `DEMO_KEY`, which has a low shared rate limit; the startup default avoids consuming it. This project does not include a private-key proxy. NASA DONKI reports solar activity, not radiation dose at the fictional lunar base. The storm's timing and damage remain scripted game mechanics, independent of NASA availability.

The art is original procedural pixel art described in `src/assets/manifest.json`. The earlier Mars Commander prototype is preserved on `backup/mars-commander-codex`.
