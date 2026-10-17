# SIX SECONDS OF SUN
## Complete Game Design Document — Competition Build v1.0

**Project codename:** SSOS  
**Tagline:** *Light the fire. Shape the shadow. Borrow six seconds.*  
**Format:** Original, finite, handcrafted 2D top-down puzzle-action game  
**Target platform:** Desktop web (Chrome/Edge/Firefox), landscape, 16:9  
**Target development time:** 24 focused hours, including testing, trailer, and publishing  
**Recommended framework:** Phaser 3.x, TypeScript, Vite  
**Build priority:** Playable, stable six-stage campaign; no endless gameplay  
**Design status:** Proposed design. All mechanics, art, levels, and names below are design instructions, not completed work.

---

## 1. Governing competition rules versus project recommendations

### Rules directly stated in the provided organizer documents
- Any engine, coding agents, tools, CLIs and MCPs may be used.
- Blatant plagiarism can cause disqualification, including direct copying of assets/source code and copying mechanics wholesale without uniqueness.
- Theme choices given in the orientation: **Fire, Shadow, Time**. At least one theme is required, all three are optional.
- Themes should be integrated into **gameplay, storyline, and atmosphere**, not treated simply as genres.
- **30%** is allocated to theme adherence: **core integration 15, multi-theme synergy 10, atmospheric framing 5**.
- The other criteria are gameplay feel, visuals, audio, innovation, technical stability, scope/completeness, and trailer quality. Their internal weights are not specified.
- Exactly **3-minute evaluation trailer**; **at least 2 minutes of actual, directly screen-recorded gameplay**; up to 1 minute stylized editing/graphics may be distributed through trailer. Trailer must explain theme integration.
- Deliver: **Google Drive link of trailer**, **public GitHub repository with source and assets**; a **deployed playable URL is optional**.
- The top five trailers are shortlisted for judges to play. Handbook schedule gives **Day 3, 9:30 AM** as submission deadline but no calendar dates.

### Team-imposed boundaries (not additional organizer rules)
- Ship one desktop-browser game built from original project code, procedural art, and original/verified audio.
- Avoid a copied game concept, ripped sprites/music, copied level designs, and third-party gameplay source.
- Reserve a substantial block for a clean gameplay recording and trailer. A live URL is worth pursuing even though optional.
- Use **all three themes** to pursue the multi-theme score, without sacrificing quality.

---

## 2. Executive pitch

In a clockwork observatory at the edge of a dying world, the last lightkeeper needs to restart the solar engine before the eternal eclipse. The beacon's flame projects shadows that can unlock ancient runes. The player can crystallize **their last six seconds of movement** into an endlessly repeating, spectral **afterimage**. That echo casts its own moving shadow from the burning beacon, allowing the real player to leave a shadow in one place while moving elsewhere. Fire can also become a sweeping hazard, forcing the player to seek shelter in the echo's shadow.

**Player-facing one-sentence hook:** *Replay the past as a living shadow so you can escape the present.*

**Trailer moment that must exist:** The player ignites an enormous beacon; their shadow sweeps across a wall rune; the player creates a cyan afterimage; it keeps the rune dark while the real character runs through an illuminated door just before a burning scanner passes.

**Emotional fantasy:** A clever tiny figure overcoming enormous machinery by manipulating light and memory.

**Genre:** Short, authored environmental puzzle-action adventure with light timing challenges. NOT a platformer clone, endless runner, survival arena, or procedural dungeon.

**Target audience:** Judges and players who can learn a mechanic in under 30 seconds; players who enjoy short, elegant puzzles and striking audiovisual effects.

---

## 3. Design pillars, in priority order

1. **Three themes, one physical interaction:** Fire creates illumination; a body or time-echo obstructs the light and casts a shadow; shadows activate runes and protect against fire; recording of movement lets a shadow persist independently of the player.
2. **Understand it by watching:** A glowing flame, a directional visible shadow, a matching black rune, and an opening gate. Every action should have readable feedback.
3. **A complete finite adventure:** Six handcrafted rooms, progression, a proper ending, replay from a level-select screen. The sixth level is a climax.
4. **Instant response and forgiveness:** Responsive movement, near-instant retry, crisp interactions, predictable collision rules, generous timing.
5. **Trailer-quality visual identity:** Fire-orange versus cyan-echo against indigo obsidian. Every important action produces a dramatic yet efficient visual reaction.

**Non-goals:** Online play; accounts; monetization; complicated combat trees; loot; a 3D engine; generated endless maps; a full dynamic ray-tracing engine; controller or mobile support before the desktop build is fully stable.

---

## 4. Story and world

### Premise
At the sixth hour of an endless eclipse, a solar observatory has gone silent. The keeper wears a clockwork brace that remembers the previous six seconds of movement. Each chamber must restore a part of the light engine. A departing recorded self becomes a temporary-looking but endlessly looping afterimage; it has no consciousness, cannot collect items, and cannot complete levels. It **can cast a shadow** and thus change which mechanical seals are powered.

### Narrative structure
- **Opening, 8–12 seconds:** One line: “When the sun stopped, our shadows remembered how to move.” The visual shows a dead beacon and the keeper entering the first room.
- **Act 1 (rooms 1–2):** Rekindle the lens and learn that darkness can open doors.
- **Act 2 (rooms 3–5):** Learn how to leave a shadow behind; master beams and fire sweeps.
- **Act 3 (room 6):** Restart the heart of the observatory; a sunrise reveals the word “DAWN” inside a moving circular shadow.
- **Ending, 12–18 seconds:** The great mechanism turns, the eclipse lifts, ambient color warms, completion stats shown, and level select/replay enabled. Do not imply the whole world has been simulated; this is an authored ending.

No voice acting required. Story delivered in small, optional overlays and background machinery.

---

## 5. Art direction

**Style:** Premium 2D vector-like geometry and hand-shaped procedural sprites; crisp silhouettes rather than detailed pixel art. Top-down small arena chambers with strong border frames, carved circular clock designs, orbiting rings, warm particles and smoky shadows. All art can be created in code, with custom SVGs authored by AI when helpful. Art must be original, checked before use, committed to the repository with provenance.

**Palette:**
- Night: `#0A1023`, slate `#17233B`, wall `#24314D`
- Flame: gold `#FFC857`, amber `#FF9736`, fire `#F65B3E`
- Echo: cyan `#51D8ED`, ice `#B1FAFF`
- Dark sensor: violet `#6E52B7`, activated `#2AE9C6`
- UI typography: off-white `#F5F2E9`, muted `#9AAFC7`

**Visual hierarchy:** Brightest = live fire; second = player; cyan silhouette = historical echo; unlit inactive nodes = dim purple; dark door barrier has metallic bars. No text over visually complex light effects. Keep high contrast and accessible labels for critical states.

**Particle vocabulary:** 6–12 embers near beacon; brief radial fire pulse on ignition; curved cyan trails behind echo; 4–8 sparks when rune charges; restrained screen shake (80 ms ignition / 120 ms exit). No heavy blur or shader dependency. Use alpha-blended shapes and cached textures; target 60 FPS.

**Audio style:** Clockwork ambient ticks, low droning synth, crackling braziers, bass ignition, sharp glassy resonance for sensors, soft reverse chime when afterimage is invoked, danger pulse for fire scanners, warm harmonic sunrise payoff. Generate original procedural WebAudio tones if licensing is unclear. Mute toggle required. Browsers unlock audio only after interaction; fail gracefully on autoplay restriction.

---

## 6. Controls, camera, accessibility

**Desktop keyboard primary:**
- `WASD` / arrows — move (8 directions, normalized diagonals)
- `E` — ignite nearby dark brazier / use nearby interaction
- `Q` — manifest the echo of the previous six seconds, replacing the existing echo
- `R` — restart current room immediately
- `Esc` — pause / continue
- `M` — sound mute toggle
- `Enter` — confirm menu / proceed after win

No mouse aiming required, no complicated combo, no precision jump. Mouse is used for menu clicks. Optional touch controls are a post-stability stretch goal, not an initial requirement.

Camera: fixed 960×540 world-space view, scaled letterbox to available viewport. No zoom needed for gameplay; optional slight ignition camera pulse. All 6 rooms visible without scrolling. Draw UI in screen coordinates. Support browser refresh and resume via saved progress.

Accessibility minimum: text instructions in addition to colors; obvious shape/pattern on glyphs; pulsing warning line before scanner hits; no essential sound-only information; optional reduced-shake preference (default subtle); no hard instant-death challenge in the first three rooms.

---

## 7. Main gameplay loop

1. Enter a dark observatory chamber; examine the torch, shadow glyph, sealed door, and safe walking route.
2. Move to a dark brazier and press `E` to **ignite** it (Fire).
3. Position the keeper between the primary beacon and a shadow rune, projecting a dark shape onto the target (Shadow).
4. Hold/move as needed to fill the six-second history; press `Q` to create a **looping afterimage of the last 6 seconds** (Time).
5. Let the echo's shadow keep the rune covered while moving independently through the gate; later stages add fire-scanner timing and secondary flame relays.
6. Reach the exit, see a satisfying transition, obtain 1–3 stars, unlock the next chamber.

**Important logic:** All three themes are gameplay mechanics. The echo is not a cosmetic ghost; it affects geometric shadow sensors and grants shelter during scanner attacks.

---

## 8. Exact gameplay system contracts

### 8.1 Movement
- Player: circle collision radius **12 px**, move speed **175 px/sec**, simultaneous axes normalized to speed 175. Responsiveness immediate (no acceleration simulation).
- World boundaries prevent leaving chamber. Solid wall/obstacle axis-aligned boxes with circle-vs-AABB or Phaser Arcade collision.
- Player spawn at data-defined `spawn` per stage. Echo path is visual and nonblocking to player/walls; it replays a previously legal trajectory.
- Exiting occurs when player overlaps unlocked goal portal radius 25px.

### 8.2 Fire
- A dark brazier activates via `E` if player center is within **58 px**.
- One **primary** brazier is assigned per stage. After ignition, it is the origin of the interactive shadow system. Its lighting is radial aesthetic, but interactive shadow geometry is a simplified single-source projection.
- Other braziers are **relay** braziers: their ignition is a condition of unlocking exit but does not create additional competing physics shadows. Clearly draw them with a smaller ornament and explanatory hint where introduced.
- Ignition persists through that room attempt; resets when room restarted. Echo never ignites braziers; only real player input does.
- 0.25s bloom, clear sound, text `BEACON LIT`, instant mechanic effect on activation.

### 8.3 Time and echo
- Maintain a rolling **6.0-second** world-position history, sampled every **100 ms**, around 60 samples. The player can create an echo after at least **1 second** of valid history; if shorter than 6 seconds, pad the early segment with the earliest recorded position so total playback remains 6 seconds. Draw a circular `MEMORY` meter and `Q` ready state.
- Pressing `Q` creates a **single** cyan echo replaying the captured **last 6 seconds** of movement, looping every 6 seconds indefinitely until replaced or room completion. The player **does not rewind/teleport**; the clone is an afterimage of past movements, not time travel.
- On `Q`, replace any previous echo, fade old one out in 0.2 seconds, spawn new one at the oldest recorded point, lerp each pair of samples for smooth motion. At loop boundaries, 0.15s fade-out/fade-in prevents apparent teleport snapping.
- `Q` cooldown **0.65 seconds**. No limit to total invocations per room. The recording continues to gather positions after manifestation.
- Echo cannot collide, ignite, collect, press normal switches, trigger completion, or die. It can cast the same geometric shadow as the player and can protect the player from scanner light if its projected shadow covers them.
- Stationary recordings are **allowed**, making the system learnable; later puzzles challenge correct positioning and routes rather than punish stillness.
- A small **6-second timeline strip** animates echo progress; echoes use cyan outline and transparent fill.

### 8.4 Shadow — simplified, testable projection
- Shadow exists only while the **primary brazier is lit**.
- For each shadow caster (real player and echo), let `L` = brazier position; `C` = caster position. Compute `u = normalize(C - L)` and perpendicular `n = (-u.y, u.x)`. If separation less than 25px, skip the shadow (caster inside flame).
- Draw quad vertices: `C ± 11*n` and `C + u*240 ± 48*n` (wider at far end). This is a **stylized projected shadow wedge**; it is intentionally not physically perfect ray tracing.
- Clamp drawing to chamber interior; level designers should avoid placing glyphs behind solid walls. In the 24h build, walls stop movement but **do not** alter shadow projection. Do not implement generalized line-of-sight/raycast until core game is stable.
- A shadow glyph is covered if its **center point is inside either caster's shadow polygon**. Evaluate every frame using deterministic point-in-convex-quad (or triangle split) function.
- Upon coverage for **0.45 cumulative uninterrupted seconds**, the rune is powered. If coverage stops, reset charge. State `inactive -> charging -> powered`. For **latching** tutorial runes, `powered` stays true until room reset. For **continuous** runes, door stays powered only while shadow is on target, with **0.2s release hysteresis** to prevent flicker.
- Show a ring filling from 0→100% and pulse `SHADOW LOCK` when charged. Audio and UI do not replace the geometry logic.

### 8.5 Doors and exits
- Door opens if `all required relays are lit` AND `all required glyphs are powered`, as configured by level data. Room 1 needs only primary fire; room 2 uses a **latching** glyph; rooms 3–6 use a **continuous** glyph.
- The door **must not trap a player inside its collision box** if conditions stop holding: while player overlaps gate trigger volume, defer re-closing and maintain collision disabled until clear. When condition returns, close with animation.
- Visuals: closed bright lattice with bright lock; opened bars retract into frame; doorway sound.
- Exiting `goal` only enabled when door has opened; player crossing it starts win state. If a continuous rune loses power after player safely passes door, do not rollback the crossing.

### 8.6 Fire scanner hazard (rooms 4–6)
- A scanner is a narrow, telegraphed fiery band swept along a rectangular hazard lane: x-position `minX + (maxX-minX)*(0.5 + 0.5*sin(2πt/period))` for vertical scanners; mirrored version for horizontal. Period ~4.8s on room 4 and ~4.0s on room 6.
- Show a **warning glow 0.35s** before collision on a region (bright pulsing edge). Touching a beam with player center within **16px** and inside scanner lane is damaging unless player's center lies inside the **echo's** shadow polygon. Player cannot shelter inside their own shadow.
- On hit: freeze 120ms, shake, decrement 1 heart, teleport to last safe point (start or stage checkpoint). Set **1.0s invulnerability**. Initial hearts: 3 per room. At 0 hearts, fail overlay and immediate retry. No global permadeath.
- Scanner audio syncs with visible pass; no surprise damage outside scanner geometry.

### 8.7 Checkpoints and resources
- Checkpoint in room 5–6 optional as data-defined point reached by real player. On hit, preserve lit braziers and current echo; if this creates unfair interactions, safely reset scanner time, as documented.
- No ammunition, mana, countdown failure for basic puzzle; `MEMORY` is a recording ability, never consumed.
- Finite authored campaign (6 rooms), replayable with local best times and 1–3 stars.

### 8.8 Score and persistence
- Stopwatch starts when player first moves in a level. On finish record `clearTime`, `hits`, and `stars`.
- 3 stars = clearTime <= stage `parTime` AND hits == 0. 2 stars = clearTime <= 1.5*parTime AND hits <= 1. Else 1 star for any clear.
- `localStorage` `ssos-progress-v1` tracks unlocked stage (max 6), best time/stars, mute setting, reduced shake. Guard parse and storage errors; game works in private/incognito mode without persistence.
- Title screen -> level select -> room -> results -> next room; repeat after ending.

---

## 9. Authored level campaign (six rooms)

**All stage coordinates are in 960×540 pixels.** Leave a ~40px wall border. Geometry must be validated visually; positions below are **design anchors**, not immutable spawn-perfect coordinates. The actual level file and visual test determine final safe placements. Each puzzle must be manually solved by agent test harness/player before being called done.

| # | Name | Par | Features | Intended lesson and trailer clip |
|---|---|---:|---|---|
| 1 | A Spark in the Dark | 35s | 1 primary brazier, direct door, small obstacles | `E` ignition unlocks gate; 1st fire bloom shot |
| 2 | Shape of Nothing | 60s | Primary beacon + 1 latching shadow glyph | Put body between flame and rune; darkness charges; shadow reveal |
| 3 | The Other You | 80s | Continuous glyph across door, echo required | Stand in right place, record, `Q`, leave echo behind to open gate |
| 4 | Furnace Hour | 95s | Continuous glyph, echo + slow fire scanner | Park echo so its shade keeps door powered, avoid sweeping flame |
| 5 | Ashes and Angles | 110s | 1 primary beacon, 1 relay, offset shadow glyph, scanner | Plan route, ignite two objects, place a shadow correctly |
| 6 | Six Seconds of Sun | 145s | 1 primary, 2 relays, continuous glyph, two telegraphed scanner lanes, scripted ending | A multi-step finale with clean audiovisual payoff |

### Stage 1: A Spark in the Dark
- Spawn left `(145,300)`, primary brazier `(425,260)`, exit gate `(805,260)`; two low rectangular obstacles along top/bottom create visual geometry, no maze.
- Start unlit, `E` hint by brazier, dark gate red. Igniting instantly opens gate, player reaches exit. The warm lens turns on and sends visible radial pulses through the chamber.
- **Acceptance:** first-time player completes under 60s, no more than two on-screen instructions, obvious completion.

### Stage 2: Shape of Nothing
- Spawn `(160,350)`, primary `(260,260)`, glyph `(660,260)`, gate `(815,260)`, playable path below/around glyph.
- Player stands between the beacon and rune to cast a shadow, holds 0.45s. This **specific rune is latching**: door remains open after player moves away.
- **Acceptance:** obvious near/far relationship between torch, player and wedge; label `KEEP THE RUNE IN SHADOW`; shows shape matching visually.

### Stage 3: The Other You
- Spawn `(160,400)`, primary `(230,270)`, glyph `(675,270)`, door `(830,270)`.
- Player ignites, walks to `(450,270)` to cover glyph and waits or walks a repeating segment. `Q` clones this past motion; while echo covers rune, player leaves to the exit.
- **Acceptance:** doorway impossible to pass while only real player maintains glyph; echo route can be set stationary so average player gets a clear window.

### Stage 4: Furnace Hour
- Beacon `(200,240)`, shadow rune `(700,240)`, shadow-casting position around `(470,240)`. Scanner lane crosses the center corridor near `(550,250)` horizontally or vertically; keep a 2.5-sec telegraphable safe window.
- Echo keeps gate on and can give brief shade from the scanner. The player must time crossing into goal.
- **Acceptance:** zero-hit completion possible by a non-expert without pixel-perfect timing; hit feedback safe, restart quick.

### Stage 5: Ashes and Angles
- Primary brazier at `(240,200)` and auxiliary relay `(640,410)`, glyph `(700,185)`, gate `(840,260)`. Obstacles funnel a U-shaped route, but no occlusion walls through glyph line.
- Player must ignite beacon, ignite relay, line up shadow on off-axis rune (not directly horizontal), and spawn echo while traversing to exit. One scanner patrols the middle corridor.
- **Acceptance:** player can see both active conditions in compact top HUD; no unfair blind navigation.

### Stage 6: Six Seconds of Sun
- Orbital “sun core” primary `(470,170)`, two relays `(240,370)` and `(720,365)`; final glyph `(725,295)` with reachable casting position selected during testing. Goal `(860,260)`. Two scanners cover distinct lanes; stagger their periods.
- Phase A: ignite primary and show eclipse engine slowly rotating. Phase B: energize two side relays. Phase C: put glyph in echo shadow, cross a scanner-patrolled corridor, touch final portal; when player reaches exit play 10–15s sunrise animation with skip.
- **Acceptance:** 0-hit run is possible; finale lasts under 4 minutes for practiced player, clear 3-theme payoff captured in trailer.

### Level design rule
Each stage stores named entries (`spawn`, `primaryBeacon`, `relayBeacons`, `glyphs`, `gate`, `goal`, `obstacles`, `scanners`, `parTime`) in TypeScript/JSON; it should **never rely on runtime-generated random layouts**. An agent must not claim a stage is solvable merely because it compiles. Run browser tests and manual/autonomous playthrough checks.

---

## 10. UI and UX flows

### Title screen
Animated radial clock + glowing eclipse logo, menu `[PLAY]`, `[LEVEL SELECT]`, `[HOW TO PLAY]`, `[MUTE]`. A single line of pitch beneath title. No sign-in.

### In-game HUD
- Top left: `CHAMBER 03 / 06` and room title.
- Top center: **Memory ring** `06.0s` and cyan `Q: ECHO READY` indicator; while echo active a looping progress bar.
- Top right: `♥ ♥ ♥` lives, timer `01:12`, pause icon.
- Near braziers: `E IGNITE`; near unavailable actions show concise hints, not walls of text.
- Along bottom (small): keyboard hint `WASD MOVE · E IGNITE · Q AFTERIMAGE · R RETRY` optionally fades after room 3.
- Door conditions: 2-3 small icons beside gate (flame lit, shadow rune powered, relays lit), never rely solely on color.

### State machine
`BOOT -> PRELOAD -> TITLE -> SELECT -> INTRO -> PLAYING -> PAUSED / FAILED / WON -> NEXT/SELECT -> FINAL_ENDING`.
- Load failure: show recover/retry option.
- Pause stops scanner time, player physics, echo replay and level timer.
- Lost focus auto-pause; visibility resumes only on click/key to avoid unfair damage.
- Audio unlocked on player gesture, quiet fallback if blocked.
- Safe transitions: every stage teardown removes old timers, key listeners, audio and particles.

### First-time onboarding
Stage 1: one-line prompt at unlit brazier: `Press E to light the beacon`. Stage 2: `Stand between fire and rune: the shadow is the key`. Stage 3: `Press Q to replay your last six seconds. Your echo casts a shadow too`. Context icon pulses to show intended target; no 60-second video tutorial.

---

## 11. Technical architecture

### Recommended stack
- **Phaser 3** (stable 2D browser stack) + **TypeScript** + **Vite** + Node/npm.
- Rendered with Phaser Graphics and cached procedural textures; WebGL with Canvas fallback where supported; use `Phaser.Scale.FIT` and auto-center.
- Physics: Phaser Arcade or lightweight deterministic circle/AABB tests for movement and hazards. Shadow geometry is a pure TypeScript module with unit tests.
- State: Phaser Scene system; a `RunState` object per room; strict data configuration.
- Storage: defensive `localStorage` wrapper.
- QA: `npm run build`, TypeScript check, unit tests via Vitest, browser smoke tests/screenshots via Playwright if browser automation available.
- Deployment: Vercel/Netlify/static GitHub Pages, setting Vite base path correctly; local dev with `npm run dev`.

### Suggested file structure
```text
six-seconds-of-sun/
  index.html
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
  public/
    favicon.svg
    assets/                  # only original or verified-licensed final assets
  src/
    main.ts
    game/
      config.ts
      scenes/BootScene.ts
      scenes/TitleScene.ts
      scenes/LevelSelectScene.ts
      scenes/GameScene.ts
      scenes/ResultsScene.ts
      scenes/EndingScene.ts
      systems/MovementSystem.ts
      systems/HistoryEchoSystem.ts
      systems/ShadowGeometry.ts
      systems/BeaconSystem.ts
      systems/GlyphDoorSystem.ts
      systems/ScannerSystem.ts
      systems/ProgressStore.ts
      systems/AudioManager.ts
      systems/Effects.ts
      ui/HUD.ts
      data/levelTypes.ts
      data/levels.ts
      art/ProceduralTextures.ts
  tests/
    shadowGeometry.test.ts
    doorConditions.test.ts
    historyEcho.test.ts
    progressStore.test.ts
    smoke.spec.ts
  docs/
    GDD.md
    TRAILER_SHOTLIST.md
    ORIGINALITY_ASSET_LOG.md
  README.md
  LICENSE
```

### Data contract sketch
```ts
type Vec2 = { x: number; y: number };
type Rune = { id: string; position: Vec2; mode: 'latching' | 'continuous' };
type Scanner = { axis: 'horizontal' | 'vertical'; min: number; max: number; fixed: number; period: number; width: number; phase: number };
type Level = {
  id: number; title: string; parTime: number; spawn: Vec2;
  primaryBeacon: Vec2; relayBeacons: Vec2[]; runes: Rune[];
  gate: { x: number; y: number; w: number; h: number };
  goal: Vec2; obstacles: Array<{ x:number; y:number; w:number; h:number }>;
  scanners: Scanner[]; hints: string[];
};
```

### Determinism and frame rate
- Use seconds-based `delta` clamped to `<= 0.05` for simple mechanics so tab switch does not teleport scanners/echo.
- Use history timestamps or fixed 100ms accumulator independent of render frame rate.
- Use normalized movement, collision tests, and pure polygon membership. Ensure scanner hazard tests and rune tests share player-center world coordinates.
- Keep particle allocations low; preload or generate textures once. Never allocate large sprite sets every update tick.
- Test target 60 FPS on typical laptop; browser memory leak checks while replaying rooms.

### Testing contracts (unit + acceptance)
- Point inside/outside shadow wedge (including boundary) works for beacons in all four quadrants; 0-length input protected.
- History samples 6s max, creation works after 1s, path interpolates, 6s loop resets cleanly, replacing echo removes former collision/sensor contribution.
- Normalized diagonal movement travels same length as cardinal movement.
- Runes correctly latch/stay continuous, 0.2s release grace avoids flicker, door cannot crush/trap player.
- Scanner damages outside echo shade, does not damage inside it, invulnerability blocks immediate multi-hit.
- Pause freezes score clock, scanner, echo, input; blurred tab pauses automatically.
- Best stars never regress; corrupted storage does not crash game.
- All six levels completable; refresh persists unlocked stages; any stage can restart without stale listeners.
- `npm run build` no errors, no missing asset requests, no uncaught console errors, public deployment loads directly.

---

## 12. Balance, delight, and polish budget

**Learning curve:** Mechanics introduced gradually; fire (level 1), self shadow (2), recorded echo (3), hazard safety (4), mixed spatial design (5), epic finale (6).

**Target first-time campaign:** 10–18 minutes, practiced run 5–9 minutes. Not an endless game.

**Fun after mastery:** optional stars based on speed/hits and level replay; not new complex content.

**Juice checklist (implement only after core stable):** ember particles, procedural bloom, heat distortion alternative via wobbling rings (not shader), echo ribbon, sound on step/ignite/power, brief freeze on dramatic ignition, miniature screen shake, portal spiral, sunrise color-grade overlay, clean menu transitions.

**Player frustration blockers:** no accidental auto-fail from timers on puzzle rooms; generous `E` range, no one-pixel positioning, quick restart, obvious goal, no noisy text, hazards telegraphed, invulnerability frames.

---

## 13. Minimum shippable build / fallback plan

### Must ship (P0)
- Start/menu, desktop controls, functional world, collision, one primary beacon, shadow wedge and rune, live memory recorder/afterimage replay, gate, game state transitions, levels 1–3, win/retry, music/mute, trailer-ready visual style.

### Should ship (P1)
- Levels 4–6, scanner hazard, relay braziers, level select, star system, ending sequence, local progress, visual/audio polish, deployed playable URL.

### Nice to have (P2)
- Full gamepad/touch support, additional 2 bonus levels, accessibility toggles beyond minimal, cinematic transitions between rooms, alternative echo visual skins.

**Mandatory cut rule:** At the 12-hour mark, if shadow geometry + echo interaction cannot be fully demonstrated in a playable room, stop adding levels. Fix the core. At 16h, lock mechanics. At 18h, lock feature scope and prioritize stability, playable verification, and trailer. At 20h, start recording trailer assets regardless of content count. A stable complete 3–4-level version is safer than an unplayable 6-level version.

---

## 14. 24-hour execution plan (one clock)

| Window | Workstream | End-of-window gate |
|---|---|---|
| 00:00–01:00 | Confirm GDD, workspace, git, starter, live dev server, tools | Empty running Phaser project and first commit |
| 01:00–03:00 | Player movement, collision, camera, first chamber, beacon, procedural style | Interactive room 1 passes |
| 03:00–06:00 | Projection geometry, rune detector, gate/state machine, all core visual cues | Room 2 solvable with correct shadow geometry |
| 06:00–09:00 | Six-second recorder, echo replay/replace, first echo puzzle | Room 3 demo independently verified |
| 09:00–12:00 | Levels 4–5, scanner, safe damage, spatial tuning | Mechanically complete 5-room build |
| 12:00–15:00 | Level 6 and ending, title/select/results, local progress | All rooms linked and campaign beatable |
| 15:00–18:00 | Original audio, FX, tutorial readability, unit/browser tests | Full end-to-end clear with no blocker |
| 18:00–20:00 | Polish and deployment, cross-browser, repo asset audit | Build and URL working, feature freeze |
| 20:00–22:30 | Record multiple **actual gameplay** clips and edit exactly 3-minute trailer | Verified footage >= 2:00 and trailer playable |
| 22:30–24:00 | Upload Drive trailer, public GitHub, deployed link, verify access/submission | Submission links recorded, backups preserved |

**Critical path:** Working shadow + echo (hours 3–9), campaign (hours 9–15), stable trailer (hours 20–22:30). Get a 30-second proof-of-concept video as soon as room 3 works, not at the very end.

---

## 15. AI agent execution model

**One integrating agent owns the repo and final `main` merges.** The other agent gets bounded non-overlapping tasks. Two agents editing the same scene concurrently is prohibited.

### Roles
- **Codex (integrator / gameplay):** project setup, core data contracts, Phaser scenes, echo history, geometry integration, git/build/tests, merges.
- **Claude Code (design/polish in isolated worktree):** visual assets generation, HUD, menu treatment, audio design, level configuration and acceptance suggestions. Can own distinct files or branch.
- **QA agent / browser harness:** click/play/record, screenshot states, report reproducible failures and verification evidence; may create test files but does not silently rewrite gameplay.
- **Human owner:** approves mechanics, resolves ambiguous design, tests at least one full room and reviews actual footage, publishes and verifies links. Do not assume agents' claims are true without evidence.

### Agent workflow contract
1. Before editing, inspect repo current state and applicable GDD section; state exact files owned.
2. Write a mini implementation plan, targeted tests, acceptance criteria. Do not start with high-volume asset generation.
3. Implement original code using standard installed framework APIs. Do not copy public game source, existing game mechanics wholesale, or unverified assets.
4. Run typecheck, tests, build. Launch playable scene, inspect actual browser screenshot/video, test controls.
5. Report changed files, feature demo, test commands/results, known defects, next dependencies.
6. Checkpoint commits with concise messages; no force pushes; integrate only on explicit approval after tests if using concurrent agents.
7. At scope deadlines, respect cut rules; never sacrifice packaging/trailer for unapproved extra features.

### Required evidence gates
- G0: game boots locally
- G1: ignition opens a gate
- G2: caster shadow accurately powers rune
- G3: past 6s echo **alone** keeps gate open while player moves
- G4: scanner respects shelter and damage rules
- G5: all shipped levels independently cleared
- G6: production build and deployed link verified
- G7: a 3-minute video with >=120 seconds direct gameplay and explicit theme explanations
- G8: public repo, Drive video link, and submission checklist verified

---

## 16. Originality and rights policy

Every source file of the **game's authored logic** is new. Installing open-source **libraries/framework dependencies** is not the same as copying an existing game's source: use a standard package manager and include licenses as required. The interpretation of any particular third-party asset should be confirmed with organizer if uncertain.

**Prohibited without organizer clearance:** directly copying open-source complete game examples/tutorial projects into submission, ripped game art/music, YouTube audio without rights, unlicensed textures, logos/titles resembling commercial games, imitating layouts or mechanics exactly from a single inspiration title, copy-pasted public game repository implementations.

**Preferred:** Procedural Phaser Graphics, newly authored SVGs and generated textures, newly authored procedural soundtrack or licensed sound with documentation. AI-generated assets are permitted per briefing as relayed by participant, but confirm provenance and commercial/public redistribution terms. Keep `docs/ORIGINALITY_ASSET_LOG.md` entries with file, source/method, author/tool, rights, and changes. Verify `package-lock.json`, any font/image/audio licenses and attribution.

**Distinctive combination:** The key appeal is NOT generic shadow stealth or time clone alone; it is using the replayed trajectory as a **dynamic occluder of a fire beacon**, mechanically powering darkness-sensitive seals and protecting the present player from fiery scanners in the same scene. Original code, authored puzzles, original silhouette identity, and narrative framing should demonstrate this combination clearly.

**Title check:** The working title “Six Seconds of Sun” should still receive a final storefront/trademark/name check before public commercial release. No web search guarantees uniqueness.

---

## 17. Trailer and submission handoff

See `TRAILER_SHOTLIST.md`. The footage plan guarantees **130 seconds of plainly screen-recorded gameplay** across the 180-second trailer and 50 seconds of title, overlays, and cinematic treatment. Editing cannot turn animations/renders into 'real gameplay'; label only true player-controlled captured sequences as gameplay. Avoid adding non-game scenes that misrepresent features. Show explicit words **FIRE: ignite the lens**, **SHADOW: cover the rune**, **TIME: replay six seconds**, **SYNERGY: your echo's shadow opens the exit** in tasteful caption cards. Do not make these captions obscure gameplay.

Final handoff: public GitHub repository (source + assets), Google Drive video with link sharing verified, optional deployed URL, copy of GDD and originality log in repo, clean README with how to play and local run commands, functional screenshot/video proof, submission receipts if provided.

---

## 18. Final definition of done

**A released competition candidate is DONE only when:**
- Player can start from title, learn, clear every advertised level, fail and retry, and see ending.
- Fire changes the world; player/echo geometry changes shadows; echo changes puzzle outcomes; none are purely cosmetic.
- Browser console has no blocking errors; build passes; sounds can be muted; menu works; no level softlock.
- The first 20 seconds of footage shows a compelling, easily understood mechanism.
- At least 120 of 180 video seconds are real recorded gameplay.
- The trailer clearly explains theme integration, is exactly three minutes, and is accessible via Drive.
- GitHub is public and includes all source and distributable assets with provenance.
- Submitted on time and links tested in a private/incognito browser window.

**One measure of success:** A judge who watches for 15 seconds can describe the game as “you create a clone of the last six seconds to use its shadow to open doors and avoid fire.”
