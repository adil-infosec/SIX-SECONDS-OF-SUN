# Originality and asset log

Every file that ships to players is listed here with where it came from and what rights apply (GDD §16). Add a row in the same commit as any new asset.

## Project-authored files
| Path | Origin / creation method | Usage rights | Attribution needed? | Checked by |
|---|---|---|---|---|
| `public/favicon.svg` | Hand-written SVG, authored in this repo (Claude Code) | Project file | No | Team |
| `src/game/art/ProceduralTextures.ts` | Canvas gradients generated at runtime by project code | Project code | No | Team |
| `src/**/*.ts` | Original game code written for this project | Project code | No | Team |

## Fonts
| Font | Source | Notes |
|---|---|---|
| Segoe UI / Helvetica Neue / Arial, Consolas / Courier New | Viewer's operating system | Not bundled or redistributed |

## Runtime and build dependencies (installed via npm, not copied)
| Package | Version | License | Role |
|---|---|---|---|
| `phaser` | 3.90.0 | MIT | Game framework (runtime) |
| `vite` | 7.3.7 | MIT | Dev server and bundler (build only) |
| `typescript` | 5.9.3 | Apache-2.0 | Type checking (build only) |
| `vitest` | 4.1.11 | MIT | Unit tests (dev only) |

The minified bundle drops license comments, so Phaser's MIT notice ships separately as `public/licenses/phaser-LICENSE.md` (copied unchanged from `node_modules/phaser/LICENSE.md`). The build-only tools are not shipped to players.

## Audio
Every sound is synthesized at runtime by `src/game/audio/AudioEngine.ts` from oscillators, a generated white-noise buffer, filters and envelopes. No recordings, samples or sound files are used or shipped.

| Sound | How it is made |
|---|---|
| Ambient drone | Two detuned sawtooths (55 Hz) and a triangle fifth through a slowly breathing low-pass. A warm major third and fifth fade in once a beacon is lit |
| Clockwork ticks | Short band-passed noise clicks every 0.5 s, alternating tick and tock |
| Brazier crackle | Random high-passed noise pops, denser with each lit brazier |
| Ignition | Sine bass drop (110 to 42 Hz), a low-pass noise whoosh and a fifth tail |
| Rune powered | Glassy bell: four inharmonic sine partials |
| Echo | Reverse chime: sine tones that swell and cut off, then a high bell |
| Scanner | Band-passed noise and a low sawtooth hum whose loudness follows the band's distance from the keeper, plus a two-beep danger warning |
| Hit, gate, checkpoint, win, fail, UI | Short oscillator and noise envelopes |
| Sunrise | Slow A-major pad with bells on the three story lines |

