# SIX SECONDS OF SUN
### Master Game Overview · Story Synopsis · Design Summary

*Light the fire. Shape the shadow. Borrow six seconds.*

---

## 1. Game Identity & Pitch

| | |
|---|---|
| **Title** | SIX SECONDS OF SUN |
| **Platform & Genre** | Desktop browser (Chrome / Edge / Firefox) · 2D top-down puzzle-action adventure |
| **Target Playtime** | 10–15 minutes · 6 authored campaign chambers (+ 6 bonus chambers unlocked after the finale) |
| **Play Now** | adil-infosec.github.io/SIX-SECONDS-OF-SUN |

**Hook:** Replay your own past movements as a living shadow to bend ancient seals, and escape the present.

---

## 2. Story & World Synopsis

**Premise.** At the edge of a dying world, an endless eclipse has frozen the great solar observatory. You are the last **Lightkeeper**, bound to a clockwork brace that captures and replays the movement of the past.

**Objective.** Cross six ancient chambers, reignite their solar beacons, and restart the clockwork solar engine before the darkness becomes permanent.

| Act | Chambers | Arc |
|---|---|---|
| **I · Kindling** | 1–2 | Rekindle the first lens, and learn that darkness itself awakens hidden runes. |
| **II · The Brace** | 3–5 | Master the brace: summon time-echoes, hold doors from two places at once, survive sweeping fire. |
| **III · Dawn** | 6 | Synchronise the sun core and its relay beacons in the heart of the engine, and lift the eclipse at sunrise. |

---

## 3. Core Theme Synergy: Fire → Shadow → Time

The three competition themes are not separate features; they are **one physical chain**:

- **FIRE**: lighting a beacon floods the chamber with light. Without fire, no shadows exist.
- **SHADOW**: the Lightkeeper's body blocks that light and projects a directional shadow. Hold it over a dark floor rune and the rune powers a gate.
- **TIME**: press **Q** and the last six seconds of movement crystallise into an endlessly looping **cyan echo**. The echo casts its *own* moving shadow, so you can hold a rune open, or shelter in its shade from fire, while you act somewhere else.

*Light makes shadow; time multiplies it.* Every chamber recombines these three in a new configuration.

---

## 4. Controls & Core Mechanics

| Input | Action |
|---|---|
| **WASD / Arrow keys** | 8-directional movement |
| **E** | Ignite a nearby brazier or beacon |
| **Q** | Manifest the 6-second cyan echo |
| **R** | Instant chamber restart |
| **Esc** | Pause (Resume · Restart · Chambers) |
| **M** | Sound on / off |

**Mechanics at a glance:** latching and continuous shadow runes · relay beacons · sweeping fire scanners with telegraphed paths · echo shelter · checkpoints · 3-star rating per chamber (time and hits).

---

## 5. Judge Evaluation Highlights

- **Authored campaign:** six handcrafted chambers with rising puzzle density, then six bonus chambers that introduce new mechanics (twin seals, moving pillars, a rotating fire lamp, sequence runes, a prism relay, an echo-guarded gauntlet). No procedural filler.
- **Visual & audio polish:** dark observatory aesthetic with neon-cyan against amber, animated chibi Lightkeeper and echo, particle feedback on every key action, and a fully procedural WebAudio soundscape (no audio files).
- **Stability & quality:** deterministic shadow-projection and room simulation; **220 automated tests**, including playthroughs that prove every chamber solvable; frame-rate-independent timing; validated, fault-tolerant local progress saving; automatic Canvas fallback when WebGL fails.
