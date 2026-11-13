# Mars Commander

A locally playable 2D Mars colony survival game for ages 7–12, inspired by NASA Space Apps 2026.

## Run

Requires Node 22+.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. Click **Start mission**, select buildings in the world and upgrade them. Watch the daily supply changes before advancing time. Keep your crew alive until day 30. The lab and greenhouse need energy, so expand the solar field too.

## Check

```sh
npm run build
npm test
npx playwright install chromium
# With the dev server running:
node tests/browser.mjs
```

The game has five interactive buildings, construction feedback, animated astronauts, four types of mission event, delayed deliveries, local save/resume, a mission journal and win/loss/restart states. Keyboard users can Tab to buildings and press Enter. Event dialogs pause time and contain focus. Reduced motion follows the browser preference.

All resource points, times and events are simplified for learning. No live NASA data is connected. [Official challenge](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/?tab=details).

See [architecture and science scope](design/GAME_ARCHITECTURE.md). Earlier Figma exploration is retained for project history; the implemented world is the current direction.
