# PLAN — Developer B

**Owner:** Codex (Developer B)
**Branch:** `feat/arcade-missions` (from Dev A's foundation commit)
**Scope:** Chicken Hunt minigame, Ice Collection activity, spaceship, enemy AI, projectiles, collisions, pickups, arcade effects and audio.

## Owned files

```
src/game/scenes/ChickenHuntScene.ts
src/game/scenes/IceCollectionScene.ts
src/game/entities/Spaceship.ts
src/game/entities/AlienBird.ts
src/game/entities/Collectible.ts
src/assets/sprites/combat/**
src/assets/sprites/missions/**
Combat-related tests
```

Developer B must **not** create a separate GameState or resource reducer, and must not modify Dev A's owned files. If the shared contract needs a change, propose it to Dev A first — Dev A applies it in shared files.

---

## Task list

### B1 — Asset pipeline
- [ ] Original pixel-art sprites: spaceship, alien chicken (original design — no Chicken Invaders IP), laser, enemy projectile, food pickup, ice crystal, explosion frames
- [ ] Asset manifest: sizes, animation frames, states
- [ ] Same palette as base game (`src/game/config/palette.ts`)
- [ ] Attribution in CREDITS.md if any third-party assets

### B2 — Chicken Hunt scene
- [ ] Animated starfield background
- [ ] Scene class conforming to Dev A's scene registration convention
- [ ] Start via launch config, run independently, no store access for resource mutation

### B3 — Ship controls
- [ ] Arrow keys / WASD movement (both axes)
- [ ] Space to fire; boundaries enforced
- [ ] Optional pointer/touch support

### B4 — Alien chickens
- [ ] Formation spawning, patterned movement (sine / swooping)
- [ ] Enemy variations using same sprite family

### B5 — Combat
- [ ] Projectile spawning, cooldown, collision, hit detection, damage, despawn
- [ ] Phaser Arcade Physics groups only (no custom engine)

### B6 — Pickups
- [ ] Food drops from defeated enemies
- [ ] Pickup magnet effect, collection animation, floating XP text

### B7 — Mission timer
- [ ] 30–45 second countdown
- [ ] Early escape (return early with collected supplies)
- [ ] Auto-return on timer end
- [ ] Fail state: ship health reaches zero → lost rewards + damage (not instant Game Over, per locked decision 3)

### B8 — MissionResult output
- [ ] Emit typed `MissionResult` exactly once on scene end
- [ ] Never apply rewards directly — store does that
- [ ] Include `educationalMessage`

### B9 — Ice Collection
- [ ] Short outdoor activity: walk/fly, pick up ice crystals, one simple hazard
- [ ] Suit oxygen pressure (drain during mission)
- [ ] Return before oxygen out → water reward

### B10 — Effects
- [ ] Ship thrust, laser flashes, damage flashes, small explosions, collection particles

### B11 — Audio
- [ ] Lightweight original SFX, mute toggle
- [ ] No copyrighted music

### B12 — Tests
- [ ] Controls, collisions, reward emission (exactly once), return flow, failure path, restart

### B13 — Integration support
- [ ] Test scenes within Dev A's app shell
- [ ] Fix defects in B-owned files

### B14 — Visual polish
- [ ] Combat quality matches the base scene standard

---

## The contract Dev B codes against (frozen)

**Types** — `src/domain/models/types.ts`:
- `MissionResult { missionType, success, returnedSafely, collectedResources, healthDamage, xpEarned, duration, educationalMessage }`
- `MissionType = 'chicken-hunt' | 'ice-collection' | 'shield-drill'`

**Actions** — `src/domain/models/GameAction.ts`:
- Launch: `{ type: 'START_MISSION'; mission: MissionType }`
- Completion: `{ type: 'COMPLETE_MISSION'; result: MissionResult }`

**Scene registration** — `src/game/config/gameConfig.ts`:
- Scene keys: `'ChickenHuntScene'`, `'IceCollectionScene'`
- `MISSION_CONFIG[m].sceneKey` and `MISSION_CONFIG[m].energyCost` defined there
- Mission availability: Dev A flips `available: true` at integration

**Integration flow (Dev A applies):**
```
Store validates launch cost → spends energy → scene starts →
mission runs (B's code) → emits MissionResult →
store applies rewards exactly ONCE → return to MoonBase →
UI updates → SaveService persists
```

**Palette:** use `PALETTE` from `src/game/config/palette.ts` only.
**Balance:** mission costs/rewards live in `MISSION_CONFIG` + `balance.ts` (owned by A; propose changes, don't edit).

## Milestone gates

| Gate | Target | Status |
|---|---|---|
| Assets + shooter design | H0–1 | ⬜ |
| Playable Chicken Hunt (move, shoot, timer) | H1–4 | ⬜ |
| Pickups + MissionResult + Ice Collection | H4–7 | ⬜ |
| Combat polish + effects | H7–13 | ⬜ |
| Playtest + integration support | H13–16 | ⬜ |
| Browser tests + screenshots | H16–18 | ⬜ |
| Final media + presentation prep | H18–20 | ⬜ |
