# LUNAQUEST — Survival Mission Master Plan

**Authority:** This is the single source of truth for game scope, rules, shared architecture, visual direction, science framing, testing and delivery. Developer task files sequence work but must not redefine these requirements.

**Audience:** ages 7–12; accessible core play with optional depth for older players.

**Target:** a playable, polished MVP in approximately 20 elapsed hours with two developers.

## Vision and story

LunaQuest is a playful, educational lunar survival adventure rendered entirely in consistent top-down 3/4-view pixel art. A young astronaut establishes a small outpost after a landing mishap. The player gathers limited supplies, operates life support, farms, generates and stores power, maintains the habitat, and protects the crew during solar hazards. The objective is to **survive as many lunar days as possible and beat a personal record**. This replaces the earlier five-day rescue objective; there is no automatic day-based victory.

Gameplay is action and consequence in a world, not a sequence of informational pages. Teach with visual state changes, short dialogue and one-sentence explanations at decisions. The Moon has vacuum, low gravity, abrasive dust, severe light/shadow thermal conditions and radiation exposure risk. Do not import Martian weather, atmosphere or terrain. Alien birds in Chicken Hunt are openly fictional arcade creatures, not lunar wildlife.

## Challenge learning goals

The project framing is the NASA Space Apps Challenge 2026 Junior Astronaut Mission Trainer (official link in [PROJECT_HISTORY.md](PROJECT_HISTORY.md)). The challenge context and prior repository plan call for an interactive outpost/survival simulation for children, with NASA-related concepts demonstrated through trade-offs, clear language, replayability and source attribution. The LunaQuest game expresses those goals as follows; numerical rules remain simplified and are not engineering guidance.

| Learning goal | Player action | Short feedback |
|---|---|---|
| Life support and oxygen | Manage base oxygen, portable suit O₂, leaks and habitat operation. | Show which system is draining and how repair/refill helps. |
| Food and water | Collect fictional arcade food, farm crops, collect scheduled Earth water cargo, and budget supplies across days. | Preview mission/planting costs and show each delivery's effect. |
| Energy generation/storage | Operate/repair solar and prioritize loads. | Show generation, stored power, and which system loses power. |
| Radiation protection | Respond to an alert, reach shelter or activate shield. | Explain that shielding reduces exposure; label game exposure as simulated. |
| Thermal safety | Limit EVA time and return/shelter when suit safety falls. | Show a simulated thermal indicator, not a live lunar temperature. |
| Communication delay (future) | A later scenario may ask the crew to plan before an Earth reply. | Label any delay as a game abstraction; this is not a required MVP mechanic. |
| Mission planning | Choose when to leave, what to gather, and when to return. | Compare reward with oxygen, time, energy and health risks. |

**Core loop:** `HOME BASE → GO ON A MISSION → RETURN WITH SUPPLIES → BUILD AND PROTECT → SURVIVE → REPEAT`.

## MVP scope and flow

The MVP has one explorable Moon Base Phaser scene, one Chicken Hunt Phaser scene, a lightweight React start/Continue gate, and React result/learning overlays. Radiation shelter response and Earth cargo collection happen in the Moon Base; Ice Collection is deferred. An early demo run should show multiple days, an emergency, a mission and a personal record within a few minutes; play itself has no planned end day. Avoid requiring perfect combat or punishing a child irrecoverably for one mistake.

### Core controls and child UX

- WASD or arrow keys move; diagonal speed is normalized. `E` interacts with the nearest highlighted object. Pointer/tap can move/interact where practical; prioritize desktop playability for MVP.
- `E` enters the Habitat, Greenhouse or Shelter when near its entrance; the outdoor astronaut sprite hides and suit oxygen stops draining. `Q` exits at a collision-safe entrance position. Arrow Up/Down move through enabled building actions; Enter or E confirms. `Space` fires in Chicken Hunt; `Esc` pauses or closes a learning panel. Touch players use an analog joystick and large contextual/arcade action buttons. Give an on-screen control reminder.
- Explain a single objective at a time with brief prompts (“Find food!”, “Oxygen is low!”, “Return to the airlock!”). Preview costs/results. Show a friendly reason when an action is unavailable.
- No accounts, long text dialogs, dashboard-like page navigation or hover-only actions. Pause and persistent music/SFX controls are available.

### Resources and survival

Main resources are bounded from 0–100 **illustrative game units**: food, water, stored base oxygen, and electrical energy. Astronaut state includes health, portable suit oxygen, thermal safety, radiation exposure, current indoor/outdoor location and world position. Base oxygen and suit oxygen are separate: base oxygen supports habitat life support; suit O₂ drains during EVA and refills at the habitat. Also track the current day, completed survival days, time, scene, buildings, crop progress, shield condition, last recycling day, active and queued event IDs, active mission, XP, weather provenance, notices and playing/defeat. A legacy `victory` status remains loadable for older terminal saves, but new gameplay never enters it.

Current starter tuning: Food 55, Water 40, base O₂ 80, Energy 75, Health 100, Suit O₂ 100, Radiation 0, Day 1. Daily food/water/base O₂/energy costs are 7/9/6/5. Solar generates up to 16 energy at each day advance when operational. Earth water pods arrive on Days 2 and 4, each granting 25 water exactly once when collected; uncollected pods persist. All values and formulas live in `src/game/config/balance.ts`; missions use shared mission config. Nothing increases without a visible source. Outdoor simulation drains suit O₂ and thermal safety; crew consumption and daily production apply only on day advance. Give visible threshold warnings before consequences.

At depletion, apply gradual understandable consequences: food shortage slowly harms health; water shortage more quickly harms health; suit O₂ exhaustion outdoors starts an emergency/rescue window; depleted base O₂ makes habitat unsafe; insufficient energy disables/reduces systems; high radiation can harm health. The currently implemented terminal defeat is health reaching 0. No survival day triggers victory or caps progression. Tune to allow recovery from mistakes. These quantities are not real NASA safety limits.

### Home base/buildings

| Building | Intended interaction |
|---|---|
| Habitat | Enter with E; refill suit oxygen from base supply, eat/rest if affordable, recycle base oxygen once per day, inspect forecast and advance day with a clear resource preview; exit with Q. |
| Greenhouse | Enter with E; plant for water + energy, grow over one in-game day, harvest food and a small oxygen-recycling benefit; exit with Q. Show seed → sprout → ready. |
| Solar array | Generate/store energy once on day advance based on condition and simplified daylight; show production and repair when damaged. |
| Shield/shelter | Enter with E and exit with Q; activate protection at an energy cost, show a visible protection ring/status and shelter during each radiation warning. |
| Landing pad | Show Chicken Hunt's energy cost, food purpose and safe-return reminder; launch only the available mission. Explain incoming Earth cargo. |
| Earth supply pod | Appear near the pad on Days 2 and 4; show a clear E/pointer prompt; award 25 stored water through one typed domain action, then disappear. |

Each building has an interactive target, name/icon, operating/damaged/broken feedback, cost preview and immediate visible consequence. All building costs/yields use centralized balance values. Construction/repair feedback must not imply hidden free resources.

Seven separate, non-blocking pixel-art learning signs cover Habitat, Greenhouse, Solar Array, Radiation Shelter, Landing Pad, Chicken Hunt and Earth Water Supply. E or a nearby pointer/tap opens a compact panel with **WHAT?**, **WHY?** and **YOUR MISSION**. The same guidance is reachable from relevant building controls. Opening is player-initiated and pauses the simulation until closed, so explanations never silently drain HP or interrupt movement. Chicken Hunt copy explicitly calls its alien birds fictional.

### XP and progression

XP rewards come from validated mission results and once-only survival actions/events; no skill tree is implemented. The **authoritative record metric** is completed days: Day 1 starts at 0, each accepted day advance increments `daysSurvived` once, and the displayed current day is `daysSurvived + 1`. The deterministic **score** is `daysSurvived × 1,000 + min(floor(XP), 999)`. A longer run therefore outranks any shorter run, even if the shorter one has more XP. No free repeated action awards score: the domain's mission run and reward ID ledgers prevent duplicate XP. Failed missions do not award XP. `HighScoreService` derives the current personal best from authoritative store snapshots and persists best days/score in a separate LocalStorage key; Phaser never sets score directly. When a run ends at 0 HP, the result shows days survived, final score, personal best and a new-record celebration if the run beats its saved run-start baseline. New Game/Restart reset the run but keep the personal record. Scores are illustrative game points, not NASA measurements.

### Endless survival roadmap and current balance boundary

**Feature 9 (implemented):** remove automatic five-day victory, show completed days/score and an independently saved personal record, and keep existing defeat mechanics. Day consumption, greenhouse, solar and once-only mission rewards remain unchanged. A save from the former five-day version stays valid through explicit v1/v2 migration; old terminal victories remain terminal results.

**Feature 10 (implemented):** make the configured Chicken Hunt launch charge unmistakable and add one shared retro audio system. The Landing Pad previews the exact six-Energy charge; a successful launch shows the before/after Energy values in a banner, notice and HUD. The existing reducer still charges once, with no flight/shooting drain or return/failure refund. `AudioService` coordinates React settings, domain transitions and Phaser cues; `WebAudioSynth` makes original base and arcade chiptunes plus short game effects without external recordings. Music/SFX on/off, separate volumes and Mute All persist independently from the survival save. Audio unlocks after a player gesture, pauses on game pause/hidden tab and gracefully degrades without Web Audio.

**Feature 11 (implemented):** E enters enclosed buildings and hides the outdoor astronaut; Q leaves at a safe entrance. Keyboard arrows and Enter/E operate menus. Habitat recycling spends exactly 8 Energy to recover up to 15 base O₂ once per in-game day, only when the Habitat works and has capacity. This models a finite abstract daily recovery reserve, **not oxygen created by electricity alone**; real systems recover/recycle air with equipment and other resources. Greenhouse oxygen remains separate and useful. Solar storms recur once per completed-day transition from Day 2 onward, with stable `solar-day-N` IDs; Day 3's one-time oxygen leak takes priority and queues that day's storm. Countdown, protection, damage and XP rules remain unchanged, and DONKI observations never schedule game storms. The mobile analog joystick supports base exploration and Chicken Hunt; short touch viewports crop the camera-following Moon Base to fill the available canvas while Chicken Hunt retains its full field. The game frame fills the viewport, responds to resize/orientation and offers an optional browser fullscreen toggle. No extra difficulty scaling was added.

**Feature 12 (planned):** Vercel deployment and hackathon demo. Verify the public build and offline mode, prepare the three-minute demonstration and five-slide presentation, and document limitations and asset provenance.

The Day 2/4 water pods remain the only scheduled deliveries. Post-Day-4 water sustainability is a known limitation of the current endless mode; no expanded supply economy is committed to Features 10–12.

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

### Earth water resupply (MVP base activity)

- **Entry requirements:** reach the separately rendered pod near the Landing Pad after its scheduled arrival; no mission fee or scene transition.
- **Controls/objective:** walk near a pod, press E or tap it, and collect 25 water. Each delivery has a stable ID and is collectible once.
- **Schedule:** Days 2 and 4 only in the current implementation. A missed pod remains available on later days; active missions cannot collect pods. New Game/Restart clears the delivery ledger; Save/Continue keeps it.
- **Balance:** starting water 40 and daily cost 9 create a shortfall without resupply. Two pods add 50 total, supporting early survival and optional greenhouse planting at 10 water per crop. Capacity 100 still applies; a full tank prevents collection until space is available. **There are currently no further deliveries after Day 4. Long-term water sustainability is a known limitation of endless play; it is not addressed by the current roadmap.**
- **Science:** cargo delivery is a game simplification. Sending water from Earth is difficult and expensive; recycling and possible local resources matter for real exploration. Do not imply an actual two-day lunar cargo schedule.

### Lunar Ice Collection (deferred enhancement)

The disabled `ice-collection` mission ID remains in the shared catalog for compatibility, but no Ice Collection scene, launch path or water reward is required for this MVP. A future version may use a safe-return sample mission with suit O₂ and thermal pressure, then credit water only through `MissionResult`. It must not replace or duplicate the current Earth pod ledger without an explicit design change.

### Radiation shelter drill

- **Entry requirements:** tutorial/configured base incident, no mission fee. Can be introduced from landing-pad briefing, but the required MVP response occurs in the base world.
- **Controls/objective:** read a concise alert, move to shelter/shield and interact before warning expires; a remote-shield choice may be offered if powered.
- **Costs/outcomes:** shelter spends time; remote shield spends energy; timely action preserves health and may earn emergency XP. Ignoring or arriving late increases simulated exposure and may damage health/equipment. Never guarantee instant death.
- **Return:** remain in base, visibly change shield/alarm state, show outcome and note that shielding/shelter reduce exposure; game risk is simulated, not a player-specific forecast.

## Events and decisions

Use typed event IDs/choice IDs and pure deterministic rules, with an injected seed for tests. Each event has a visible trigger, optional countdown/severity, two or more meaningfully different choices, costs shown before selection, immediate consequence and a short science takeaway.

| Event | Trigger | Choices and consequences | Learning point |
|---|---|---|---|
| Solar radiation alert | Every accepted day transition into Day 2 or later, once per day ID; queue behind any active incident. DONKI context is educational only. | Reach shelter or use a powered shield before the 24-second warning ends; the 12-second danger phase damages exposed players. Ignore: simulated exposure rises and health falls. | Planning and shielding matter on the Moon. DONKI does not measure the player's local dose. |
| Oxygen leak | One scripted Day 3 incident, before that day's queued storm. | Repair: spend 10 Energy to stop the leak. Isolate from inside Habitat: spend 4 Energy and 5 base O₂, stop loss but disable the Greenhouse until repaired. Ignore: continuing oxygen loss and possible HP damage. | Closed life-support loops require monitoring and repair. |
| Power shortage | Energy crosses configured threshold or array is damaged. | Save power by pausing optional greenhouse/shield load; repair/boost array at resource/time cost; ignore and suffer lower system efficiency. | Generation varies; storage and load priorities sustain equipment. |
| Thermal/suit warning | Outdoor thermal safety crosses warning threshold. | Return early for safety; spend energy on configured warming/shelter; push onward with damage risk. | Lunar light/shadow creates thermal-control challenges; temperature shown is illustrative. |
| Communication delay | Mission departure or scripted event. | Queue autonomous command and proceed; wait for reply while spending time/supplies. Show that help/advice is delayed, with distinct time/information trade-offs. | Signals take time; crews need onboard autonomy. Displayed delay is simplified, not live measurement. |

The current MVP implements only the recurring solar alert and one scripted oxygen leak. Power shortage, thermal and communication decision events are future concepts, not completed gameplay. No silent event resolution or cost-free “always safe” option. Feedback must be warm, specific, and recoverable.

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

Required original sprite sheets/assets: astronaut idle + walk in four directions (at least two frames/direction), interact/hurt; terrain tiles and props; five buildings/states; seven learning sign objects and Earth supply pod; spaceship idle/thrust/damage; alien birds idle/fly/hit (original design, no copied game IP); laser/projectiles/impact/explosion; food collectible; shield pulse; crop seed/sprout/grown/harvest; interaction/warning/reward icons. Provide source/editable sprites and a manifest of dimensions, frame bounds/count, frame rate, scale and attribution. Use own art or correctly licensed assets and record credits. Ice sprites are optional future art.

### Animation and sound

Frame-based idle/walk, footprints/dust puffs, solar glint, crop stages, habitat lights, shield pulse, alert flash, repair/build burst, pickup bounce/shine, floating resource/XP text and brief scene transitions. Arcade has ship thrust, readable enemy motion, laser, damage flash, small explosion and pickups. Animate resource meters only after domain updates; avoid per-frame React churn. Effects are short and interruptible.

Feature 10 uses original browser-synthesized retro audio: a gentle 32-step Moon Base loop, a faster 32-step Chicken Hunt loop, and square/triangle/sawtooth electronic cues for footsteps, buildings, food and water, laser/combat/pickup, launch/return, UI, success/defeat and both scripted emergencies. A single service changes tracks without overlap, lowers music during emergencies, stops hazard ambience when an incident resolves, and does not replay a restored warning alarm. React exposes separate Music and Sound Effects toggles/volumes plus Mute All; preferences are stored in `lunaquest.audio.v1`, apart from GameState and SaveService. The synthesizer unlocks only after a player gesture and tolerates blocked or unavailable Web Audio. No external audio files, copyrighted melodies or hotlinked samples are used; provenance is in `src/assets/manifest.json`. Every critical cue also has text/icon feedback. Avoid rapid flashing; reduced-motion disables repeated pulses, shake and nonessential particles.

### HUD and accessibility

Keep the game world dominant and fill the browser viewport. Compact HUD: large icon + label + number + meter for food, water, base O₂ and energy; health and suit O₂ during EVA; current day, completed days, current score and personal best; pause/help/fullscreen. There is no `/5` day limit. Color is never the only status signal. Context prompt sits by highlighted target. Enclosed building menus have a visible selected option and E/Enter/Q controls; outdoor Solar Array, Landing Pad, signs and supply pods do not hide the astronaut. Prominent base Rest/Advance Day action shows forecast before daily costs. Event overlay presents two/three large choices with costs and plain-language consequence. Game Over shows final score, best days, best score and Try Again.

Support keyboard and pointer/touch, visible focus, semantic labeled DOM controls, accessible status announcements without flooding, ≥44 CSS px targets where practical, readable type, zoom/reflow, contrast, pause and reduced motion. No hover-only information or timed decision without a clear warning/accessible alternative. Test at 320 CSS px width. Keep audio optional and independently adjustable; do not promise unavailable read-aloud features.

## Technology and architecture

- React 19 + TypeScript + Vite for one lightweight shell: title/options, accessible HUD/dialogs and Phaser lifecycle.
- Phaser 3 for scenes, input, timer, collision, Arcade Physics and rendering. Configure pixel art, round pixels and logical 640×360. Use responsive FIT generally; crop the camera-following Moon Base with ENVELOP on narrow portrait or short landscape viewports, while keeping the whole Chicken Hunt field visible. Test desktop/mobile resize and orientation.
- Pure TypeScript domain rules/store, no Phaser or React imports. Vitest unit tests.
- LocalStorage versioned persistence. Playwright browser gameplay tests. No backend/auth for MVP.

### Directory and ownership boundaries

```text
src/app/                     React entry, App, GameContainer, DOM overlays/HUD
src/domain/models/            GameState, GameAction, MissionResult, event/save types
src/domain/rules/             pure reducer, survival, mission rewards, event rules
src/domain/store/             GameSessionStore and subscriptions
src/game/scenes/              Boot, MoonBase and ChickenHunt (start/results are React overlays)
src/game/entities/            astronaut/buildings/signs/pods (A); ship/enemy/collectible (B)
src/game/config/              palette, balance, education, world and mission config (A)
src/game/art/pixelArt.ts      original procedural base sprites and terrain (A)
src/game/assets/              original procedural arcade sprites and manifest (B)
src/assets/                   base asset manifest and historical DONKI demo fixture
src/services/                 NASAWeatherService, SaveService and HighScoreService
src/**.test.ts                co-located domain/service/config unit tests
tests/unit/arcade/            Developer B arcade unit tests
tests/*.mjs                  Chromium gameplay/regression scripts; artifacts/ is ignored
```

React creates Phaser once, passes the shared store/coordinator, subscribes to safe state snapshots, and destroys game/listeners on unmount. Phaser handles render, input and collision; scenes dispatch typed actions and never edit resources. `GameSessionStore` exposes `getState`, `subscribe`, `dispatch`, cleanup. Pure functions own every cost, yield, day tick, health penalty, XP and reward. Centralize all balance numbers. Use immutable transitions and injected clock/RNG for deterministic tests. Limit tick frequency; keep high-frequency visual position scene-local and persist only meaningful progress.

Existing contract paths: `src/domain/models/types.ts` and `GameAction.ts`. Shared `GameState` covers current day, completed days, run-start record baseline, time/scene/resources/astronaut/buildings/mission/event queue/XP/weather/status/notices, `lastOxygenRecycleDay` and `collectedEarthSupplyIds`. Shared `GameAction` is the discriminated union for TICK, MOVE_PLAYER, INTERACT_BUILDING, ENTER/LEAVE_HABITAT/GREENHOUSE/SHELTER, `RECYCLE_OXYGEN`, START/COMPLETE_MISSION, `COLLECT_EARTH_SUPPLY`, ADVANCE_DAY, crop, shield, repair, event, restart/load and notice actions. Validate preconditions centrally; reject impossible spends without partial mutation and show a friendly notice.

`MissionResult` is the scene-to-domain boundary: `{ runId, missionType, success, returnedSafely, collectedResources, healthDamage, xpEarned, duration, educationalMessage }`. `START_MISSION` requires a unique `runId`; the same ID is returned in `MissionResult`. `GameState` holds the active run, provisional mission progress and completed-run ledger. Scene emits exactly once; store verifies active run/type and bounds, applies resources/XP once on safe success, applies damage, records the ID, clears the active mission and returns to base/results. Failed or unsafe returns award no resources or XP. Non-mission `ADD_XP` actions require a unique `rewardId`. A owns this contract; B consumes it without editing store rules. Never duplicate reward arithmetic in UI or scene.

Save envelope: `{ schemaVersion, savedAt, state }`, namespaced key. Current schema **v4** persists the Earth delivery ledger, run-start personal-record baseline, pending emergency IDs and last oxygen-recycling day. Valid v1/v2/v3 saves migrate explicitly, adding missing fields without erasing valid progress. Validate enums and numbers defensively; reject unsupported versions. Corrupted data starts a fresh game safely. Save after meaningful actions, day advance, event resolution, supply collection and mission return; coalesce frequent movement/ticks and flush on pagehide. The personal best uses a separate versioned LocalStorage key and survives New Game/Restart or clearing an active save. Do not save animation/projectile/enemy frame state or simulate elapsed closed-tab time. On interrupted mission recovery, return to base without reward and retire the run ID. On interrupted emergency recovery, restart its warning while retaining damage, event identity and queued incidents; no duplicate reward or old alarm replay. New Game confirms replacement; Continue uses only valid save; a terminal save can display its last result but cannot resume as active play; Restart creates fresh state.

## NASA DONKI and data integrity

NASA DONKI base: <https://api.nasa.gov/DONKI/>. Relevant endpoints: `/FLR` solar flares, `/CME` coronal mass ejections, `/SEP` solar energetic particle events, `/notifications` curated space-weather notifications. During implementation verify current NASA field/rate-limit/API guidance, select bounded recent dates, validate/normalize only supplied event type/date/source fields, and attribute records in game/about and presentation.

- Modes: `VITE_NASA_DATA_MODE=live|demo`, defaulting to demo. Direct browser requests may use `VITE_NASA_API_KEY`, but **every `VITE_` value is public in the production bundle**; never place a private key there. Without a configured key, explicit live mode uses public `DEMO_KEY` only for low-volume testing. NASA's [authentication guidance](https://api.nasa.gov/assets/html/authentication.html) currently documents 30 requests/IP/hour and 50 requests/IP/day for `DEMO_KEY`. A future private key would require a server-side proxy; no proxy is part of the current MVP.
- Cache normalized response (memory + LocalStorage) with timestamp and six-hour TTL; bound requests to seven recent UTC days, response/record size and six-second timeout. Treat valid empty results as calm. If one endpoint fails while others succeed, label live/cached data as **partial coverage**; on rate limit, total failure, timeout or offline use the labeled demo fixture. Do not freeze gameplay while fetching.
- Demo/offline uses deterministic fixture, labeled “Demo data”/“Simulated event.” Game works with no network or key; no event is a valid state.
- Real observation is not equivalent to a prediction, lunar surface sensor, local astronaut dose or temperature. No direct dose inference from DONKI, no misuse of geomagnetic indices, no invented NASA radiation forecast. Event danger, exposure, shielding efficacy, delays and thermal values are simplified simulations and labeled as such.

## Verification, deployment, hackathon delivery

### Unit tests (Vitest)

Test validation/clamp; outdoor suit/thermal tick; daily consumption/production; crop costs/growth/harvest; refill/heal and once-daily oxygen recycling; solar; shield; repair; each event choice/timeout and one queued solar storm per new day; mission preconditions/result bounds/idempotency; XP; progression beyond Days 5, 10 and 20; completed-day count; score ranking and record idempotency; defeat; save/load/v1–v4 migration/corruption; DONKI parsing/cache/fallback; analog input and edge cases.

### Browser tests (Playwright)

Load with no console errors; start/continue; move and interact with at least three buildings; open all seven learning signs; plant, advance one day and harvest; Chicken Hunt launch, shooting, pickup, return and reward; collect both scheduled Earth pods; emergency choice; survive beyond Day 5, end through a legitimate defeat path, show and retain the personal best after restart/refresh; save/resume and duplicate-ledger checks. Exercise keyboard and pointer/touch-sized controls, no horizontal overflow, focus/accessibility labels, offline demo mode, pause and reduced motion as built.

### Visual QA and performance

Capture start/Continue, base idle, building/learning interaction, Chicken Hunt, Earth pod arrival/collection, warning/event choices, endless-day HUD, Game Over/new record, and mobile. Inspect actual browser render at 1x and scaled sizes for pixel blur, framing, hierarchy, clipping, labels/contrast, modal bounds and player readability. Target stable 60 fps on modest device; cap particles/textures, avoid per-frame React updates, clean up scene listeners; test background pause and modest mobile dimensions.

### Deploy and present

Deploy static Vite build to Vercel (`npm run build`, output `dist`); configure demo fallback and secrets only when needed. Verify clean install/build, live desktop/mobile playthrough, offline mode and no secrets in bundle. Deliver public URL, source, concise run/test/science README, screenshots/video, asset/data credits, and a known-good seeded demo save plus video backup.

**Three-minute demo:** 0:00 premise/controls/science labels; 0:25 move/inspect habitat, greenhouse, solar; 0:55 plant/advance/harvest; 1:25 play a supply mission and return; 2:00 resolve solar/oxygen/power incident; 2:35 show survival/result, learning takeaway and NASA-vs-simulation distinction.

**Five slides:** (1) challenge/audience/problem, (2) loop and learning map, (3) NASA source/data interpretation/limitations, (4) implementation/art/tests/accessibility evidence, (5) impact, demo link, limitations and next steps.

**Out of MVP:** Lunar Ice Collection, accounts, multiplayer, database/backend, elaborate crafting/skill trees, open-world procedural generation, precise engineering-grade lunar simulation, direct lunar radiation dose prediction, and static content pages as the primary experience.
