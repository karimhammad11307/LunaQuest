# MOONBOUND — Survival Mission Master Plan

**Authority:** This is the single source of truth for game scope, rules, shared architecture, visual direction, science framing, testing and delivery. Developer task files sequence work but must not redefine these requirements.

**Audience:** ages 7–12; accessible core play with optional depth for older players.

**Target:** a playable, polished MVP in approximately 20 elapsed hours with two developers.

## Vision and story

Moonbound is a playful, educational lunar survival adventure rendered entirely in consistent top-down 3/4-view pixel art. A young astronaut establishes a small outpost after a landing mishap. The player must gather limited supplies, operate life support, farm, generate and store power, maintain the habitat, protect the crew during solar hazards and survive five lunar days until rescue arrives.

Gameplay is action and consequence in a world, not a sequence of informational pages. Teach with visual state changes, short dialogue and one-sentence explanations at decisions. The Moon has vacuum, low gravity, abrasive dust, severe light/shadow thermal conditions and radiation exposure risk. Do not import Martian weather, atmosphere or terrain. Alien birds in Chicken Hunt are openly fictional arcade creatures, not lunar wildlife.

## Challenge learning goals

The project framing is the NASA Space Apps Challenge 2026 Junior Astronaut Mission Trainer (official link in [PROJECT_HISTORY.md](PROJECT_HISTORY.md)). The challenge context and prior repository plan call for an interactive outpost/survival simulation for children, with NASA-related concepts demonstrated through trade-offs, clear language, replayability and source attribution. The Moonbound game expresses those goals as follows; numerical rules remain simplified and are not engineering guidance.

| Learning goal | Player action | Short feedback |
|---|---|---|
| Life support and oxygen | Manage base oxygen, portable suit O₂, leaks and habitat operation. | Show which system is draining and how repair/refill helps. |
| Food and water | Farm crops, gather ice, budget supplies across days. | Preview water/energy planting costs and harvest timing. |
| Energy generation/storage | Operate/repair solar and prioritize loads. | Show generation, stored power, and which system loses power. |
| Radiation protection | Respond to an alert, reach shelter or activate shield. | Explain that shielding reduces exposure; label game exposure as simulated. |
| Thermal safety | Limit EVA time and return/shelter when suit safety falls. | Show a simulated thermal indicator, not a live lunar temperature. |
| Communication delay | Queue autonomous actions or wait for a reply. | Make time/supply trade-off visible; label any delay as a game abstraction. |
| Mission planning | Choose when to leave, what to gather, and when to return. | Compare reward with oxygen, time, energy and health risks. |

**Core loop:** `HOME BASE → GO ON A MISSION → RETURN WITH SUPPLIES → BUILD AND PROTECT → SURVIVE → REPEAT`.

## MVP scope and flow

Five scene roles: Title, Moon Base, Chicken Hunt, Ice Collection and Results. A radiation shelter drill is an event/activity within the base, not a required sixth scene. Successful run target is 5–8 minutes. The five-day objective is a game abstraction. Ensure staying idle cannot reliably win, but avoid requiring perfect combat or punishing a child irrecoverably for one mistake.

### Core controls and child UX

- WASD or arrow keys move; diagonal speed is normalized. `E` interacts with the nearest highlighted object. Pointer/tap can move/interact where practical; prioritize desktop playability for MVP.
- `Space` fires in Chicken Hunt; `Esc` pauses. Give an on-screen control reminder and large contextual action.
- Explain a single objective at a time with brief prompts (“Find food!”, “Oxygen is low!”, “Return to the airlock!”). Preview costs/results. Show a friendly reason when an action is unavailable.
- No accounts, long text dialogs, dashboard-like page navigation or hover-only actions. Pause and mute are available.

### Resources and survival

Main resources are bounded from 0–100 **illustrative game units**: food, water, stored base oxygen, and electrical energy. Astronaut state includes health, portable suit oxygen, thermal safety, radiation exposure and world position. Base oxygen and suit oxygen are separate: base oxygen supports habitat life support; suit O₂ drains during EVA and refills at the habitat. Also track day (1–5), time, scene, buildings, crop progress, shield condition, active mission/event, XP, weather provenance, notices and playing/victory/defeat.

Starter tuning in the current balance draft: Food 55, Water 65, base O₂ 80, Energy 75, Health 100, Suit O₂ 100, Radiation 0, Day 1. All final values and formulas live in `src/game/config/balance.ts`; missions use shared mission config. Nothing increases without a visible source. Outdoor simulation drains suit O₂ and thermal safety; crew consumption and daily production apply only on day advance. Give visible threshold warnings before consequences.

At depletion, apply gradual understandable consequences: food shortage slowly harms health; water shortage more quickly harms health; suit O₂ exhaustion outdoors starts an emergency/rescue window; depleted base O₂ makes habitat unsafe; insufficient energy disables/reduces systems; high radiation can harm health. Health 0 or unrecoverable critical life-support failure is defeat. Survive through the fifth day with crew and life support operational for victory. Tune to allow recovery from mistakes. These quantities are not real NASA safety limits.

### Home base/buildings

| Building | Intended interaction |
|---|---|
| Habitat | Refill suit oxygen from base supply; rest/heal if affordable; inspect forecast; advance day with a clear resource preview. |
| Greenhouse | Plant for water + energy; grow over one in-game day; harvest food and a small oxygen-recycling benefit. Show seed → sprout → ready. |
| Solar array | Generate/store energy based on condition and configured daylight/weather rules; optional once-a-day collection; repair when damaged. |
| Shield/shelter | Activate protection at an energy cost; show a visible protection ring/status; shelter during a radiation warning. |
| Landing pad | Show entry costs, reward and safety reminder; launch available Chicken Hunt or Ice Collection. During development, unavailable scenes stay safely disabled. |

Each building has an interactive target, name/icon, operating/damaged/broken feedback, cost preview and immediate visible consequence. All building costs/yields use centralized balance values. Construction/repair feedback must not imply hidden free resources.

### XP and progression

XP is score/celebration only; no skill tree. Starter reward proposal from existing plan: mission +20 XP, emergency response +15, optional supply objective +5, day survived +10. Tune centrally. Apply each reward once, show the earned amount and a concise learning takeaway, and make retry a new experiment rather than a punishment.

## Missions

Mission scenes own moment-to-moment input/timing/collision only. Before launch, the store validates conditions and spends configured launch energy once. On completion, the mission emits one `MissionResult`; only the domain layer applies resources/damage/XP.

### Chicken Hunt (fictional food arcade)

- **Entry requirements:** landing pad and configured launch energy; show cost and confirm before spending.
- **Controls:** WASD/arrows pilot original pixel-art spaceship; Space fires; optional pointer/touch fire; large early-return control.
- **Objective/steps:** survive a 30–45 second countdown, dodge readable formations of original alien birds, shoot to create food drops, collect food, then return early or automatically when timer ends.
- **Resource costs:** energy to launch; possible ship/astronaut damage. Firing costs no base resource.
- **Outcomes:** safe return banks collected food. Ship health zero/failure loses unbanked rewards and applies configured damage, usually returning to base rather than ending the campaign. Do not make perfect aim necessary.
- **XP:** configured mission reward on success plus optional supply bonus; survival XP remains separate.
- **Return:** return to Moon Base, apply result once, animate food/XP changes, explain that the arcade encounter is fantasy and real space food requires controlled systems.

### Lunar Ice Collection

- **Entry requirements:** landing pad, configured energy/module availability, enough health and suit O₂ for a safe attempt.
- **Controls:** WASD/arrows travel; `E`/tap collects highlighted ice; move/interact at return airlock before the suit meter expires.
- **Objective/steps:** depart base, navigate a small crater/ice patch, collect target samples, avoid one clear hazard, choose whether to gather more or return, enter airlock.
- **Resource costs:** suit O₂ and thermal safety drain during EVA; possible small hazard damage. Convert samples into stored water only after safe return.
- **Outcomes:** return safely banks water and XP. Low O₂/hazard loses some or all cargo and causes damage/rescue; campaign loss only when shared defeat conditions are reached.
- **XP:** configured success and optional collection rewards.
- **Return:** apply one result, show water gained and suit O₂ spent, note that lunar polar ice is a research interest and extraction/use requires substantial equipment.

### Radiation shelter drill

- **Entry requirements:** tutorial/configured base incident, no mission fee. Can be introduced from landing-pad briefing, but the required MVP response occurs in the base world.
- **Controls/objective:** read a concise alert, move to shelter/shield and interact before warning expires; a remote-shield choice may be offered if powered.
- **Costs/outcomes:** shelter spends time; remote shield spends energy; timely action preserves health and may earn emergency XP. Ignoring or arriving late increases simulated exposure and may damage health/equipment. Never guarantee instant death.
- **Return:** remain in base, visibly change shield/alarm state, show outcome and note that shielding/shelter reduce exposure; game risk is simulated, not a player-specific forecast.

## Events and decisions

Use typed event IDs/choice IDs and pure deterministic rules, with an injected seed for tests. Each event has a visible trigger, optional countdown/severity, two or more meaningfully different choices, costs shown before selection, immediate consequence and a short science takeaway.

| Event | Trigger | Choices and consequences | Learning point |
|---|---|---|---|
| Solar radiation alert | Tutorial day or configured risk window; DONKI context can affect flavor/category only by documented mapping. | Reach shelter before countdown: time cost, protect health. Remote shield: energy cost, works if powered/healthy. Ignore: simulated exposure rises, health/equipment risk. | Planning and shielding matter on the Moon. DONKI does not measure the player's local dose. |
| Oxygen leak | Curated/random configured incident while base O₂ is available. | Repair: spend energy/materials, stop leak. Isolate section: slow loss but disable a service/lose power. Ignore: continuing drain/escalation. | Closed life-support loops require monitoring and repair. |
| Power shortage | Energy crosses configured threshold or array is damaged. | Save power by pausing optional greenhouse/shield load; repair/boost array at resource/time cost; ignore and suffer lower system efficiency. | Generation varies; storage and load priorities sustain equipment. |
| Thermal/suit warning | Outdoor thermal safety crosses warning threshold. | Return early for safety; spend energy on configured warming/shelter; push onward with damage risk. | Lunar light/shadow creates thermal-control challenges; temperature shown is illustrative. |
| Communication delay | Mission departure or scripted event. | Queue autonomous command and proceed; wait for reply while spending time/supplies. Show that help/advice is delayed, with distinct time/information trade-offs. | Signals take time; crews need onboard autonomy. Displayed delay is simplified, not live measurement. |

No silent event resolution or cost-free “always safe” option. Feedback must be warm, specific, and recoverable.

## Visual, animation, audio, accessibility

### Strict art direction

Use a consistent top-down 3/4 view, fixed pixel grid, nearest-neighbor/integer scaling where possible, pixel-snapped movement, unified light direction, coherent outlines and limited palette. Keep scene readable at logical 640×360. No photorealistic, 3D, stock or incompatible art. Distinguish hazards, interactables and terrain by silhouette and labels in addition to color.

| Color token | HEX | Role |
|---|---|---|
| Space navy | `#12172F` | sky, deep shadows |
| Lunar terrain | `#9995B2` | ground |
| Lunar highlight | `#D6D1E6` | lit ground, bright UI surfaces |
| Outline ink | `#292740` | sprite/UI outlines |
| Bright cyan | `#4EDCE5` | suit oxygen, focus/interaction |
| Mission purple | `#8067DA` | energy and shields |
| Playful yellow | `#FFD75E` | food, objective and rewards |
| Warm orange | `#FFAD62` | action and warm accent |
| Alert coral | `#FF6B81` | danger, always paired with icon/text |
| Life green | `#80E5A0` | crop growth/safe feedback |
| Suit blue | `#7CBCEB` | astronaut suit accent |
| Metal grey | `#68718D` | equipment/disabled states |

### Characters, structures, assets

Astronaut is cute, child-proportioned with a large expressive helmet, readable backpack/suit-O₂ cue and clear four-direction silhouette. Base art: habitat dome/airlock, glass greenhouse/crop beds, angled solar array, shield generator, landing pad/ship. Each building has interaction, operational, damaged and broken states. Include flags, antenna, crates, footprints, rocks, craters, paths, star field and Earth accent; separate collision data from art.

Required original sprite sheets/assets: astronaut idle + walk in four directions (at least two frames/direction), interact/hurt; terrain tiles and props; five buildings/states; spaceship idle/thrust/damage; alien birds idle/fly/hit (original design, no copied game IP); laser/projectiles/impact/explosion; food and ice collectibles; shield pulse; crop seed/sprout/grown/harvest; interaction/warning/reward icons. Provide source/editable sprites and a manifest of dimensions, frame bounds/count, frame rate, scale and attribution. Use own art or correctly licensed assets and record credits.

### Animation and sound

Frame-based idle/walk, footprints/dust puffs, solar glint, crop stages, habitat lights, shield pulse, alert flash, repair/build burst, pickup bounce/shine, floating resource/XP text and brief scene transitions. Arcade has ship thrust, readable enemy motion, laser, damage flash, small explosion and pickups. Animate resource meters only after domain updates; avoid per-frame React churn. Effects are short and interruptible.

Original lightweight cues: UI tick, footsteps, pickup, plant/growth, repair, alarm, shield hum, low oxygen, launch/return, success/failure. Mute control; all critical cues also have text/icon feedback. No copyrighted music. Avoid rapid flashing; reduced-motion disables repeated pulses, shake and nonessential particles.

### HUD and accessibility

Keep the game world dominant. Compact HUD: large icon + label + number + meter for food, water, base O₂ and energy; health and suit O₂ during EVA; day `n / 5`; objective/progress; pause/help/mute. Color is never the only status signal. Context prompt sits by highlighted target. Prominent base Rest/Next Day action shows forecast and clear confirmation before daily costs. Event overlay presents two/three large choices with costs and plain-language consequence. Results show art, delta, XP and one science takeaway.

Support keyboard and pointer/touch, visible focus, semantic labeled DOM controls, accessible status announcements without flooding, ≥44 CSS px targets where practical, readable type, zoom/reflow, contrast, mute, pause and reduced motion. No hover-only information or timed decision without a clear warning/accessible alternative. Test at 320 CSS px width. Sound/read-aloud options only if implemented; do not promise unavailable features.

## Technology and architecture

- React 19 + TypeScript + Vite for one lightweight shell: title/options, accessible HUD/dialogs and Phaser lifecycle.
- Phaser 3 for scenes, input, timer, collision, Arcade Physics and rendering. Configure pixel art, round pixels, logical 640×360 and responsive FIT scaling; test integer scaling and mobile fit.
- Pure TypeScript domain rules/store, no Phaser or React imports. Vitest unit tests.
- LocalStorage versioned persistence. Playwright browser gameplay tests. No backend/auth for MVP.

### Directory and ownership boundaries

```text
src/app/                     React entry, App, GameContainer, DOM overlays/HUD
src/domain/models/            GameState, GameAction, MissionResult, event/save types
src/domain/rules/             pure reducer, survival, mission rewards, event rules
src/domain/store/             GameSessionStore and subscriptions
src/game/scenes/              Boot, Title, MoonBase, ChickenHunt, IceCollection, Results
src/game/entities/            astronaut/buildings (A); ship/enemy/collectible (B)
src/game/config/              palette, balance, world, mission and scene config (A)
src/services/                 NASAWeatherService, SaveService, audio preferences
src/assets/sprites/            source sheets/manifest, separated base and arcade paths
src/assets/tiles/              lunar terrain tiles
tests/unit/                    domain and service tests
tests/e2e/                     Playwright flows and screenshots
```

React creates Phaser once, passes the shared store/coordinator, subscribes to safe state snapshots, and destroys game/listeners on unmount. Phaser handles render, input and collision; scenes dispatch typed actions and never edit resources. `GameSessionStore` exposes `getState`, `subscribe`, `dispatch`, cleanup. Pure functions own every cost, yield, day tick, health penalty, XP and reward. Centralize all balance numbers. Use immutable transitions and injected clock/RNG for deterministic tests. Limit tick frequency; keep high-frequency visual position scene-local and persist only meaningful progress.

Existing contract paths: `src/domain/models/types.ts` and `GameAction.ts`. Shared `GameState` covers day/time/scene/resources/astronaut/buildings/mission/event/XP/weather/status/notices. Shared `GameAction` is the discriminated union for TICK, MOVE_PLAYER, INTERACT_BUILDING, START/COMPLETE_MISSION, ADVANCE_DAY, crop, shield, repair, event, restart/load and notice actions. Validate preconditions centrally; reject impossible spends without partial mutation and show a friendly notice.

`MissionResult` is the scene-to-domain boundary: `{ runId, missionType, success, returnedSafely, collectedResources, healthDamage, xpEarned, duration, educationalMessage }`. `START_MISSION` requires a unique `runId`; the same ID is returned in `MissionResult`. `GameState` holds the active run, provisional mission progress and completed-run ledger. Scene emits exactly once; store verifies active run/type and bounds, applies resources/XP once on safe success, applies damage, records the ID, clears the active mission and returns to base/results. Failed or unsafe returns award no resources or XP. Non-mission `ADD_XP` actions require a unique `rewardId`. A owns this contract; B consumes it without editing store rules. Never duplicate reward arithmetic in UI or scene.

Save envelope: `{ schemaVersion, savedAt, state }`, namespaced key. Validate enums and numbers defensively; reject an unsupported version until an explicit migration exists. Corrupted data starts a fresh game safely. Save after meaningful actions, day advance, event resolution and mission return; coalesce frequent movement/ticks and flush on pagehide. Do not save animation/projectile/enemy frame state or simulate elapsed closed-tab time. On interrupted mission recovery, return to base without reward and retire the run ID. On interrupted emergency recovery, restart its warning while retaining damage and event identity. New Game confirms replacement; Continue uses only valid save; Restart creates fresh state.

## NASA DONKI and data integrity

NASA DONKI base: <https://api.nasa.gov/DONKI/>. Relevant endpoints: `/FLR` solar flares, `/CME` coronal mass ejections, `/SEP` solar energetic particle events, `/notifications` curated space-weather notifications. During implementation verify current NASA field/rate-limit/API guidance, select bounded recent dates, validate/normalize only supplied event type/date/source fields, and attribute records in game/about and presentation.

- Modes: `VITE_NASA_DATA_MODE=live|demo`, defaulting to demo. Direct browser requests may use `VITE_NASA_API_KEY`, but **every `VITE_` value is public in the production bundle**; never place a private key there. Without a configured key, explicit live mode uses public `DEMO_KEY` only for low-volume testing. NASA's [authentication guidance](https://api.nasa.gov/assets/html/authentication.html) currently documents 30 requests/IP/hour and 50 requests/IP/day for `DEMO_KEY`. A future private key would require a server-side proxy; no proxy is part of the current MVP.
- Cache normalized response (memory + LocalStorage) with timestamp and six-hour TTL; bound requests to seven recent UTC days, response/record size and six-second timeout. Treat valid empty results as calm. If one endpoint fails while others succeed, label live/cached data as **partial coverage**; on rate limit, total failure, timeout or offline use the labeled demo fixture. Do not freeze gameplay while fetching.
- Demo/offline uses deterministic fixture, labeled “Demo data”/“Simulated event.” Game works with no network or key; no event is a valid state.
- Real observation is not equivalent to a prediction, lunar surface sensor, local astronaut dose or temperature. No direct dose inference from DONKI, no misuse of geomagnetic indices, no invented NASA radiation forecast. Event danger, exposure, shielding efficacy, delays and thermal values are simplified simulations and labeled as such.

## Verification, deployment, hackathon delivery

### Unit tests (Vitest)

Test validation/clamp; outdoor suit/thermal tick; daily consumption/production; crop costs/growth/harvest; refill/heal; solar; shield; repair; each event choice/timeout; mission preconditions/result bounds/idempotency; XP; defeat/victory; save/load/migration/corruption; DONKI parsing/cache/fallback; deterministic seeded outcomes and edge cases.

### Browser tests (Playwright)

Load with no console errors; start/continue; move and interact with at least three buildings; plant, advance one day and harvest; mission launch, pickup, return and reward; emergency choice; progress to victory and separately defeat/restart; save/resume. Exercise keyboard and touch-sized controls, no horizontal overflow, focus/accessibility labels, offline demo mode, pause/mute/reduced motion as built.

### Visual QA and performance

Capture title, base idle, interaction, both missions, warning/event choices, victory/loss, and mobile. Inspect actual browser render at 1x and scaled sizes for pixel blur, framing, hierarchy, clipping, labels/contrast, modal bounds and player readability. Target stable 60 fps on modest device; cap particles/textures, avoid per-frame React updates, clean up scene listeners; test background pause and modest mobile dimensions.

### Deploy and present

Deploy static Vite build to Vercel (`npm run build`, output `dist`); configure demo fallback and secrets only when needed. Verify clean install/build, live desktop/mobile playthrough, offline mode and no secrets in bundle. Deliver public URL, source, concise run/test/science README, screenshots/video, asset/data credits, and a known-good seeded demo save plus video backup.

**Three-minute demo:** 0:00 premise/controls/science labels; 0:25 move/inspect habitat, greenhouse, solar; 0:55 plant/advance/harvest; 1:25 play a supply mission and return; 2:00 resolve solar/oxygen/power incident; 2:35 show survival/result, learning takeaway and NASA-vs-simulation distinction.

**Five slides:** (1) challenge/audience/problem, (2) loop and learning map, (3) NASA source/data interpretation/limitations, (4) implementation/art/tests/accessibility evidence, (5) impact, demo link, limitations and next steps.

**Out of MVP:** accounts, multiplayer, database/backend, elaborate crafting/skill trees, open-world procedural generation, precise engineering-grade lunar simulation, direct lunar radiation dose prediction, and static content pages as the primary experience.
