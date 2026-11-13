# MOONBOUND — COMPLETE PLAN (What We Will Do)

Master reference for the whole project. Derived from Part 1 (Design & Engineering
Specification) and Part 2 (Implementation & Hackathon Delivery).

- **Project:** Moonbound: Survival Mission
- **Event:** NASA Space Apps Challenge 2026
- **Audience:** Ages 7–12 (enjoyable for teens/adults)
- **Genre:** Top-down 3/4-view pixel-art survival adventure
- **Deadline:** Working, polished MVP within 20 elapsed hours
- **Team:** 2 developers, each with an AI coding agent
- **Role of this agent:** Developer A (foundation, Moon Base, survival) + integration owner

> This is a GAME, not a website. No dashboards, no resource cards, no Figma prototype,
> no static illustration with buttons over it.

---

## 1. Concept

A young astronaut lands on the Moon to establish a small research and survival outpost.
The lander is damaged, supplies are limited, solar activity threatens the habitat, and
survival depends on managing resources intelligently.

The player maintains the base, collects food through arcade missions, extracts water from
lunar ice, grows crops in a greenhouse, generates and stores energy, maintains oxygen and
life support, monitors temperature, builds and repairs radiation shielding, reacts to solar
weather warnings, returns safely from expeditions, and keeps the base operational until the
rescue ship arrives.

Extraterrestrial chickens are deliberately fictional, humorous arcade creatures — a fantasy
mechanic, not a scientific claim. The Moon is the setting: no Martian dust storms,
atmosphere or terrain.

**Educational goal:** teach air/oxygen conservation, controlled-environment agriculture,
water extraction and recycling, solar energy and battery storage, temperature management,
radiation protection, space-weather monitoring, and communications delays through actions
and short feedback — not paragraphs.

---

## 2. Core loop

```
HOME BASE → IDENTIFY RESOURCE NEED → GO ON A MISSION → PLAY AN INTERACTIVE ACTIVITY
→ RETURN WITH SUPPLIES OR FACE CONSEQUENCES → BUILD, REPAIR, FARM, PROTECT
→ SURVIVE A NEW DAY → REPEAT UNTIL VICTORY OR GAME OVER
```

- Victory: survive **5 in-game days** with astronaut and life support operational.
- Session length: **5–8 minutes** for a successful run.
- Each day must pressure the player to leave the base; storage, oxygen refills, repairs
  and habitat protection bring them back.
- Winning by idling at the base must be impossible. Perfect shooting must not be required.

### Day-by-day teaching curve

---

## 3. Locked decisions (approved)

1. Five scenes: **Title, Moon Base, Chicken Hunt, Ice Collection, Results**.
2. Real-time exploration drains **suit oxygen** and affects **suit safety**; daily resource consumption happens **when advancing the in-game day**.
3. Mission failure normally causes **lost rewards and damage** rather than instant Game Over.
4. Greenhouse crops take **one in-game day** to grow.
5. Radiation emergencies require the player to **move to the shelter/shield and interact before the warning expires**.
6. NASA DONKI provides **real solar observations for educational context**; gameplay danger levels and temperature are **clearly labeled simulations**.
7. All assets and UI share a **cohesive top-down 3/4 pixel-art style with visible frame-based animation**.
8. Developer B owns Chicken Hunt and Ice Collection; Developer A does not implement those scenes.
9. Balancing constants are **centralized**, with enough supplies for children to recover from mistakes.
10. Work on the **existing Git branch** — no project recreation or repeated setup.

---

## 4. Scenes

| Scene | Content |
|---|---|
| Title | Animated astronaut + Moon, New Game, Continue (if save), How to Play, sound toggle |
| Moon Base | Playable hub: WASD/arrows, `E` interact or click/tap, five buildings |
| Chicken Hunt | Real-time vertical shooter, 30–45 s, movement, lasers, formations, food drops, health, timer, early escape |
| Ice Collection | Short outdoor activity: collect ice crystals, avoid one hazard, return before suit O₂ runs out |
| Results | Victory/failure, days survived, XP, resources, key decision, science takeaway, retry/new game |

---

## 5. Buildings

| Building | Interaction |
|---|---|
| Habitat | Refill portable suit O₂ from base storage, rest/heal, advance day |
| Greenhouse | Plant (water + energy), one-day growth, harvest food, small O₂ recycling |
| Solar Array | Generate/store energy, collect power, repair |
| Shield / Shelter | Activate radiation protection (energy cost), repair, shelter during warnings |
| Landing Pad | Launch Chicken Hunt / Ice Collection, view costs and rewards |

Base oxygen and portable suit oxygen are **separate systems**: suit O₂ drains outdoors,
refills only at the habitat.

---

## 6. Resources and survival

**Main (0–100):** food, water, base oxygen, energy.
**Astronaut:** health, suit oxygen, thermal safety, radiation exposure.
**Other:** day, time of day, scene, XP, mission state, greenhouse growth, shield status, generator condition, weather status.

Start: Food 55 · Water 65 · Base O₂ 80 · Energy 75 · Health 100 · Suit O₂ 100 · Radiation 0 · Day 1.

- Nothing increases without a visible, logical source.
- Warnings before critical failures; no instant unexplained death.
- Food 0 → slow health drain · Water 0 → faster drain · Suit O₂ 0 outdoors → emergency
  damage with rescue window · Base O₂ 0 → habitat unsafe · Energy 0 → life support + shield
  fail · High radiation → health damage · Health 0 → Game Over.

**Temperature (two concepts):** outside temperature in °C labeled SIMULATED (varies with lunar

---

## 7. Events (≥2 fully implemented)

- **Solar Radiation Alert** — shelter + shield / remote shield (extra energy) / ignore. Protected survival + XP · bonus XP for fast action · shield fails without energy · radiation damage if ignored · Game Over on extreme exposure. **Scene must visibly respond** (alarm lights, flashing HUD, audio).
- **Oxygen Leak** — repair with energy · isolate section (sacrifice power) · ignore. O₂ saved + XP · smaller loss · continuing drain.
- Optional if time: Power Shortage, Emergency Supply Pod.

Every event needs at least two meaningfully different outcomes.

---

## 8. Missions & XP

| Mission | Win | Fail | Reward |
|---|---|---|---|
| Galactic Chicken Hunt | Survive timer, collect food, return | Ship health 0 | Food per pickup, XP |
| Lunar Ice Collection | Gather ice, dodge hazard, return in time | Suit O₂ exhausted | Water, XP |
| Shield the Base | Reach shelter/shield during warning | — | Preserved resources, XP |

XP: mission +20 · emergency +15 · optional supplies +5 · day survived +10. Score only, no skill tree.

---

## 9. NASA DONKI integration

Official API: `https://api.nasa.gov/`
Endpoints: `/DONKI/FLR`, `/DONKI/CME`, `/DONKI/SEP`, `/DONKI/notifications`.

**Scientific honesty rules:**
- DONKI events are **not** direct measurements at the lunar outpost.
- No conflating geomagnetic storm indices with lunar surface radiation.
- No invented NASA radiation predictions, and no presenting DONKI as a temperature API.

**`NASAWeatherService`:** env config → fetch recent events → validate/normalize → TTL cache
→ documented mapping to game hazard categories → display type, date, attribution, **real vs demo**.

Seeded local fixture when offline, no suitable events, or rate limited. Game must be **fully
playable offline**. `DEMO_KEY` for prototype; never commit secrets. Serverless proxy only if
truly forced.

---

## 10. Visual direction (strict pixel art)

Top-down 3/4 pixel art everywhere. No realistic assets, 3D models, stock photos, or modern SaaS
components. Fixed logical resolution (640×360), integer scaling, nearest-neighbour filtering,
shared limited palette, consistent outlines, spritesheets.

**Palette:** space `#12172F` · terrain `#9995B2` · highlight `#D6D1E6` · outline `#292740` ·
cyan `#4EDCE5` · purple `#8067DA` · yellow `#FFD75E` · orange `#FFAD62` · coral `#FF6B81` ·
green `#80E5A0`.

Moon: warm grey terrain, purple-blue shadows, craters, rocks, cyan tech lights, orange/yellow
warnings, cartoon domes, glowing greenhouse glass, star-filled space.

**Required assets:** astronaut (idle / walk 4-dir / interact / hurt) · terrain tiles · craters
· rocks · paths · 5 buildings (habitat, greenhouse, solar, shield, landing pad) · ship · alien
bird · lasers · enemy projectile · food pickup · explosion · starfield · HUD · floating text ·
shield pulse · repair · warnings.

**Asset sourcing:** local generator tools → licensed packs → procedural pixel sprites.
Attribution in CREDITS.md. Never use unlicensed copyrighted game artwork.

---

## 11. Animations & game feel

**Moon Base:** idle breathing · walking · crop growth · solar glow · shield pulse · interaction
highlight · supply crate appearance · pickup particles · warning lights · repair animation.

**Shooter:** thrust · smooth movement · enemy motion · lasers · hit flashes · explosions ·
floating pickups · magnet effect · score feedback.

**UI:** animated resource changes · pulsing critical indicators · floating XP · toasts · scene
transitions · pause/resume.

Small original/licensed SFX where practical. Mute toggle. Respect reduced-motion preferences.

---

## 12. Child-friendly UX

Short, imperative prompts ("Find food!", "Your oxygen is low!", "Go back to base!", "A solar
storm is coming!", "Turn on the shield!", "Great job! +20 XP"). Large targets, icon + label,
one objective at a time, visual arrows, optional tutorial, positive reinforcement, no surprise
punishments.

Controls: WASD / arrows (movement) · `E` (interact) · `Space` (fire) · `Esc` (pause) · mouse
click · basic touch support. Desktop playability is the MVP priority.

No account registration, no long text dialogs.

lighting phase), and suit thermal safety % (drains outdoors, recovers in habitat). Never claim
live NASA temperature data.

| Day | Teaches |
|---|---|
| 1 | Movement, first food hunt (forgiving) |
| 2 | Greenhouse and oxygen management |
| 3 | First radiation alert and shielding |
| 4 | Oxygen leak / energy challenge |
| 5 | Final survival and rescue arrival |

A winning run requires at least: one food hunt, one ice collection, one greenhouse
interaction, one successful emergency response.
