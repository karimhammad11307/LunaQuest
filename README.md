# LunaQuest: Survival Mission

LunaQuest is a top-down 3/4 pixel-art lunar survival game for children, built with Phaser 3, TypeScript and a lightweight React shell for the NASA Space Apps Challenge 2026. Survive as many lunar days as possible and beat your personal record. The playable Moon Base has five interactive buildings, greenhouse/solar/shield systems, a solar storm on each day transition from Day 2, and one Day 3 oxygen leak. Chicken Hunt launches from the Landing Pad for six Energy; food collected there enters storage on a safe return, then can be eaten at the Habitat to restore HP. Animated Earth water pods arrive on Days 2 and 4. Seven learning signs explain the base and mission. Original procedural chiptune music and game effects have persistent audio settings. Browser-local save/resume and a separate high-score record are available; Lunar Ice Collection is deferred and deployment remains open.

- [Project history and verified status](docs/PROJECT_HISTORY.md)
- [Master game and engineering plan](docs/MASTER_PLAN.md)
- [Developer A tasks](docs/DEVELOPER_A_TASKS.md) · [Developer B tasks](docs/DEVELOPER_B_TASKS.md)
- [Developer A implementation order](docs/IMPLEMENTATION_A_STEPS.md) · [Verified feature log](docs/ImplementedFeatureA.md)

## Run and verify

```sh
npm install
npm run dev
```

Open the local Vite URL. Move with **WASD or arrow keys** or the mobile joystick. Approach the Habitat, Greenhouse or Shelter and press **E** to enter; the astronaut hides outdoors while inside. Use Arrow Up/Down and Enter/E for menu actions, then **Q** to leave. The Habitat can recycle up to 15 base O₂ for eight Energy once per day. Click or tap nearby outdoor objects to interact. At the Landing Pad, launch **Chicken Hunt** for six Energy; use WASD/arrows or the mobile joystick to fly, Space or the touch Fire button to shoot, and Return to leave early. The Landing Pad and launch banner show the Energy change immediately. Collect Earth pods near the pad on Days 2 and 4 to add 25 water each. Each sign opens short **What / Why / Your Mission** guidance and pauses survival until closed. Open **Space Weather** in the bottom status strip to inspect NASA observation context; the default is a clearly labeled historical demo example. The two-day delivery schedule and all game resource, HP and hazard values are illustrative.

Progress saves automatically in this browser, including collected Earth delivery IDs, the oxygen-recycling cooldown and queued emergencies. On a later visit, choose **Continue Game** or **New Game**. New Game asks before replacing the save; personal bests remain in a separate browser record. The version-4 save format migrates valid version-1, version-2 and version-3 saves. A terminal run can show its last result but cannot resume as active play. Refreshing during Chicken Hunt returns to the Moon Base without that run's rewards; an interrupted emergency restarts its warning without undoing damage or losing the next queued event. No offline time is simulated. If browser storage is blocked or full, play continues but progress and records cannot be retained across visits.

The displayed current day starts at 1; completed days start at 0. Score = `completed days × 1,000 + min(XP, 999)`, so a longer run always outranks a shorter one. The existing Earth water schedule stops after Day 4, so the current endless mode is not yet sustainably balanced. The remaining roadmap is Feature 12 Vercel/demo; additional difficulty scaling is not planned.

Use **♫ Audio** in the top bar to toggle Music, Sound Effects and Mute All or adjust the two volumes separately. Preferences survive refresh, New Game and Restart independently of the survival save. Browsers unlock sound after the first player click or key press. Music and effects are synthesized locally at runtime from original waveforms; no external audio files are loaded. Asset provenance is recorded in `src/assets/manifest.json`.

```sh
npm run build
npm test
```

With the dev server running on port 5173, browser checks include `node tests/feature8.mjs`, `node tests/feature10.mjs` and `node tests/feature11.mjs`. Earlier scripts remain available, but some predate E/Q entry or daily storms and may need their old assertions updated before rerunning. Use `LUNAQUEST_URL` if Vite runs on another port. Screenshots go to ignored `artifacts/`.

## NASA DONKI configuration

Copy `.env.example` to `.env.local` to change the optional weather mode. `VITE_NASA_DATA_MODE=demo` is the offline-safe default; `live` fetches the last seven UTC days from `/DONKI/FLR`, `/DONKI/CME`, `/DONKI/SEP` and `/DONKI/notifications` in the background. The in-game **Try NASA live** button also requests live data. Successful observations are cached locally for six hours. Empty results show a calm status; failures and rate limits use a labeled historical demo example and never stop gameplay.

`VITE_NASA_API_KEY` is supported for browser requests, but **every `VITE_` value is public in the production bundle**. Do not put a private API key there. Without a configured key, explicit live mode uses NASA's public `DEMO_KEY`, which has a low shared rate limit; the startup default avoids consuming it. This project does not include a private-key proxy. NASA DONKI reports solar activity, not radiation dose at the fictional lunar base. The storm's timing and damage remain scripted game mechanics, independent of NASA availability.

The art and audio are original procedural work described in `src/assets/manifest.json`. The earlier Mars Commander prototype is preserved on `backup/mars-commander-codex`.
