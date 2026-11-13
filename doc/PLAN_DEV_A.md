# PLAN — Developer A

**Owner:** Claude (Developer A)
**Branch:** `base-survival`
**Extra role:** Integration owner — only Developer A merges branches.
**Scope:** Foundation, Moon Base, astronaut, survival simulation, buildings, greenhouse, solar, shield, events, NASA DONKI, save/load, deployment, integration.

## Owned files

```
src/domain/**                          all models, rules, GameSessionStore
src/game/config/**                     gameConfig, balance, palette
src/game/scenes/MoonBaseScene.ts
src/game/scenes/BootScene.ts
src/game/entities/Astronaut.ts
src/app/**                             React shell, HUD, dialogs, ResultScreen
src/services/NASAWeatherService.ts
src/services/SaveService.ts
src/services/AudioService.ts           (shared, not arcade SFX)
Deployment configuration
```

Developer A must **not** build a second combat engine or edit Developer B's minigame internals.

---

## Task list

### A1 — Architecture ✅ (partially done)
- [x] `GameState`, `Resources`, `AstronautState`, `BuildingState`, `MissionResult`, `WeatherStatus` types
- [x] `GameAction` discriminated union
- [x] `palette.ts`, `balance.ts`, `gameConfig.ts`
- [x] `createInitialState`, `tickOutdoor`, notice system
- [ ] `GameSessionStore` with subscribe/dispatch
- [ ] Complete `survivalRules.ts`: `advanceDay`, `habitatInteract`, `greenhouseInteract`, solar, shield, repair, `applyMissionResult`
- [ ] `eventRules.ts`
- [ ] `SaveService` versioned save/load

### A2 — Scene foundation ⬜
- [ ] Phaser game config: WEBGL/CANVAS fallback, `pixelArt: true`, `roundPixels: true`, `scale: FIT` with logical 640×360
- [ ] `BootScene`: generates all procedural pixel textures, then starts MoonBaseScene
- [ ] Scene registration convention documented for Dev B
- [ ] React `GameContainer` mounting Phaser once, cleaning up on unmount

### A3 — Pixel-art Moon Base ⬜
- [ ] Lunar terrain texture: warm grey ground, purple-blue shadows, craters, rocks, scattered pebbles
- [ ] Paths connecting buildings
- [ ] Five distinct building sprites: Habitat dome, Greenhouse glass dome, Solar Array, Shield generator, Landing Pad
- [ ] Star-filled space backdrop, Earth-visible sky element
- [ ] Foreground details: flags, antenna, crates, lights

### A4 — Astronaut ⬜
- [ ] 4-direction movement (WASD + arrows), diagonal normalization
- [ ] Idle + walk animation, 2-frame minimum per direction, frame-based (not tween-only)
- [ ] Arcade Physics body, collision with buildings and world bounds
- [ ] Depth sorting so the astronaut walks behind/in front correctly
- [ ] Proximity detection → interaction prompt above building
- [ ] `E` key and pointer/tap interaction
- [ ] Real-time suit oxygen drain while outside habitat

### A5 — Buildings ⬜
- [ ] Each building has own hitbox, state visuals, and action
- [ ] Habitat: refill suit O₂, heal, rest → advance day
- [ ] Greenhouse: plant / harvest, growth stages visible
- [ ] Solar: collect power (once per day), repair
- [ ] Shield: activate/deactivate, shows protection ring, energy upkeep
- [ ] Landing Pad: mission menu; graceful "module pending" until Dev B lands scenes

### A6 — Survival ⬜
- [ ] Daily consumption on day advance
- [ ] Health penalties for food/water/oxygen/radiation
- [ ] Warning thresholds before failure
- [ ] Victory at day 5, defeat at health 0
- [ ] All values from `balance.ts` only

### A7 — Greenhouse ⬜
- [ ] Plant: water + energy cost, rejects with friendly message if short
- [ ] One-day growth per locked decision
- [ ] Harvest: food + small O₂ recycling
- [ ] Visual stages: seed → sprout → grown → harvest flash

### A8 — Solar & Shield ⬜
- [ ] Solar yields energy daily based on condition
- [ ] Manual collect interaction
- [ ] Shield costs activation energy, reduces radiation
- [ ] Visible shield ring around habitat when active
- [ ] Failure if energy is insufficient

### A9 — Events ⬜
- [ ] Solar Radiation Alert: shelter/shield within countdown (locked decision 5)
- [ ] Oxygen Leak: repair vs isolate vs ignore
- [ ] Outcomes affect real resources and XP
- [ ] Scene visibly responds (alarm lights, flashing HUD, audio cue)
- [ ] At least two meaningfully different outcomes each

### A10 — NASA DONKI ⬜
- [ ] `NASAWeatherService`: FLR / CME / SEP / notifications
- [ ] Env config, validation, normalization, TTL cache
- [ ] Live / Cached / Demo modes with explicit labeling
- [ ] Seeded fixture fallback; game never requires network
- [ ] Documented simplification rules (DONKI ≠ lunar surface measurement)

### A11 — Save ⬜
- [ ] Versioned schema, localStorage, new game / continue / restart
- [ ] Save core progression only (not mid-mission arcade state)

### A12 — Integration ⬜
- [ ] Merge Dev B scenes via frozen contract
- [ ] Verify mission rewards applied exactly once
- [ ] Verify no duplicate resource math
- [ ] Update scene registration

### A13 — QA ⬜
- [ ] Unit tests: consumption, greenhouse cost/yield, oxygen & health failure, shield reduction, duplicate rewards, XP, win condition, save schema, weather fallback
- [ ] Browser tests: new game, move, interact, mission loop, day advance, victory, defeat, restart, save/resume

### A14 — Deployment ⬜
- [ ] Static build verified
- [ ] Public URL live and playable

---

## Milestone gates

| Gate | Target | Status |
|---|---|---|
| Foundation commit builds | H0–1 | ⬜ |
| Canvas shows pixel-art base + walking astronaut | H1–4 | ⬜ |
| Full survival cycle works | H4–7 | ⬜ |
| Events + DONKI + save | H7–10 | ⬜ |
| Base visual polish | H10–13 | ⬜ |
| Merge + 5-day playthrough | H13–16 | ⬜ |
| Tests + deployed URL | H16–18 | ⬜ |
| Demo rehearsal | H18–20 | ⬜ |
