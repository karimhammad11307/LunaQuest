# Moonbound: Survival Mission

Moonbound is a top-down 3/4 pixel-art lunar survival game for children, built with Phaser 3, TypeScript and a lightweight React shell for the NASA Space Apps Challenge 2026. Survive as many lunar days as possible and beat your personal record. The playable Moon Base has five interactive buildings, greenhouse/solar/shield systems, a scripted solar storm and an oxygen leak. Chicken Hunt launches from the Landing Pad for six Energy; food collected there enters storage on a safe return, then can be eaten at the Habitat to restore HP. Animated Earth water pods arrive on Days 2 and 4. Seven learning signs explain the base and mission. Original procedural chiptune music and game effects have persistent audio settings. Browser-local save/resume and a separate high-score record are available; Lunar Ice Collection is deferred and deployment remains open.

- [Project history and verified status](docs/PROJECT_HISTORY.md)
- [Master game and engineering plan](docs/MASTER_PLAN.md)
- [Developer A tasks](docs/DEVELOPER_A_TASKS.md) · [Developer B tasks](docs/DEVELOPER_B_TASKS.md)
- [Developer A implementation order](docs/IMPLEMENTATION_A_STEPS.md) · [Verified feature log](docs/ImplementedFeatureA.md)

## Run and verify

```sh
npm install
npm run dev
```

Open the local Vite URL. Move with **WASD or arrow keys**, approach a building, learning sign or Earth pod, and press **E**. Click or tap a nearby object to interact. At the Landing Pad, launch **Chicken Hunt** for six Energy; use WASD/arrows to fly, Space to fire and the in-scene button to return. The Landing Pad and launch banner show the Energy change immediately. Collect the Earth pods near the pad on Days 2 and 4 to add 25 water each. Each sign opens short **What / Why / Your Mission** guidance and pauses survival until closed. Open **Space Weather** in the bottom status strip to inspect NASA observation context; the default is a clearly labeled historical demo example. The two-day delivery schedule and all game resource, HP and hazard values are illustrative.

Progress saves automatically in this browser, including collected Earth delivery IDs. On a later visit, choose **Continue Game** or **New Game**. New Game asks before replacing the save; personal bests remain in a separate browser record. The version-3 save format migrates valid version-1 and version-2 saves. A terminal run can show its last result but cannot resume as active play. Refreshing during Chicken Hunt returns to the Moon Base without that run's rewards; an interrupted emergency restarts its warning without undoing damage. No offline time is simulated. If browser storage is blocked or full, play continues but progress and records cannot be retained across visits.

The displayed current day starts at 1; completed days start at 0. Score = `completed days × 1,000 + min(XP, 999)`, so a longer run always outranks a shorter one. The existing Earth water schedule stops after Day 4, so the current endless mode is not yet sustainably balanced. The active roadmap is Feature 11 gameplay polish/QA and Feature 12 Vercel/demo; recurring emergencies and difficulty scaling are not planned.

Use **♫ Audio** in the top bar to toggle Music, Sound Effects and Mute All or adjust the two volumes separately. Preferences survive refresh, New Game and Restart independently of the survival save. Browsers unlock sound after the first player click or key press. Music and effects are synthesized locally at runtime from original waveforms; no external audio files are loaded. Asset provenance is recorded in `src/assets/manifest.json`.

```sh
npm run build
npm test
```

With the dev server running on port 5173, browser checks are `node tests/feature1.mjs`, `node tests/feature3.mjs`, `node tests/feature4.mjs`, `node tests/healthFoodAudit.mjs`, `node tests/feature5.mjs`, `node tests/feature6.mjs`, `node tests/feature7.mjs`, `node tests/merge-chicken-hunt.mjs`, `node tests/feature8.mjs`, `node tests/feature9.mjs`, and `node tests/feature10.mjs`. Use `MOONBOUND_URL` if Vite runs on another port. Screenshots go to ignored `artifacts/`.

## NASA DONKI configuration

Copy `.env.example` to `.env.local` to change the optional weather mode. `VITE_NASA_DATA_MODE=demo` is the offline-safe default; `live` fetches the last seven UTC days from `/DONKI/FLR`, `/DONKI/CME`, `/DONKI/SEP` and `/DONKI/notifications` in the background. The in-game **Try NASA live** button also requests live data. Successful observations are cached locally for six hours. Empty results show a calm status; failures and rate limits use a labeled historical demo example and never stop gameplay.

`VITE_NASA_API_KEY` is supported for browser requests, but **every `VITE_` value is public in the production bundle**. Do not put a private API key there. Without a configured key, explicit live mode uses NASA's public `DEMO_KEY`, which has a low shared rate limit; the startup default avoids consuming it. This project does not include a private-key proxy. NASA DONKI reports solar activity, not radiation dose at the fictional lunar base. The storm's timing and damage remain scripted game mechanics, independent of NASA availability.

The art and audio are original procedural work described in `src/assets/manifest.json`. The earlier Mars Commander prototype is preserved on `backup/mars-commander-codex`.
