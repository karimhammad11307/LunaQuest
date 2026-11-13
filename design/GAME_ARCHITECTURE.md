# Mars Commander playable prototype

The earlier Figma design had navigation and illustrative states but no persistent simulation. This implementation replaces that interaction model with a single colony world.

## Rendering choice

React + TypeScript with a responsive SVG scene and CSS animation. Phaser was evaluated: its scenes, input, physics and cameras are useful for real-time games, but this colony simulation needs discrete turns and five world targets. SVG keeps original artwork sharp and directly keyboard accessible while avoiding a second state system. Physics and pathfinding are out of scope.

## State and loop

`src/game.ts` contains a pure deterministic reducer. State tracks day, oxygen/water/food/power (0–100 game points), five building levels, crew safety, storm duration, delayed delivery, event, log and mission status. React renders state; production formulas are shared by the HUD and day simulation. Each Next day applies production/consumption, safety changes, deliveries, then scripted events. Unresolved events block time and upgrades. Supply exhaustion reduces safety; zero safety loses. Reaching day 30 with safety remaining wins.

Buildings: habitat shielding; solar generation and battery artwork; greenhouse food; oxygen/water recovery; communications delivery delay. Level changes add visible equipment and a construction animation. A selectable crystal deposit offers a science observation. Astronauts move through the world using decorative CSS paths. Reduced-motion preferences stop animation.

## Science scope

All quantities, event dates, compressed delivery times and production formulas are illustrative game values, not NASA measurements. Four resource groups teach interdependence: water and food production use power; dust reduces solar yield; protection has a resource cost; Earth replies and supplies are delayed. DONKI is a source of solar-event context, not a direct Mars radiation measurement. No live NASA API is connected.

Official source: https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/?tab=details
Framework evaluation: https://docs.phaser.io/phaser/getting-started/set-up-dev-environment
React state approach: https://react.dev/learn/scaling-up-with-reducer-and-context

## Verification

`npm test`: deterministic simulation tests including upgrades, overspending protection, event pauses, both event choices, delayed delivery, a winning 30-day strategy, loss and restart.
`node tests/browser.mjs`: real Chromium interaction and screenshot checks. Screenshots are written to `artifacts/`. No backend or account is required. Save data is browser-local. Prototype artwork is original SVG geometry in `src/World.tsx`; fonts have local fallback faces.
