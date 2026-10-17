# Six Seconds of Sun

*Light the fire. Shape the shadow. Borrow six seconds.*

A short, handcrafted 2D puzzle-action game for desktop browsers, built for a 24-hour vibe-coding game jam with the themes **Fire, Shadow and Time**.

Light a beacon and your body casts a shadow. Shadows power dark runes that open doors. Press `Q` and your last six seconds of movement become a looping cyan echo. The echo casts a shadow too, so it can hold a door open while you walk through it, or shelter you from sweeping fire.

**Play in the browser:** https://adil-infosec.github.io/SIX-SECONDS-OF-SUN/ (desktop, keyboard)

Six handcrafted chambers, about 10 to 15 minutes for a first clear. Progress is saved in your browser. Status: [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).

## Controls
| Key | Action |
|---|---|
| `WASD` / arrows | Move |
| `E` | Ignite a nearby brazier |
| `Q` | Replay your last six seconds as an echo |
| `R` | Restart the room |
| `Esc` | Pause / back |
| `M` | Mute |
| `V` | Screen shake on/off (chamber list) |
| `Enter` | Confirm |

## Run locally
Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run typecheck  # TypeScript check
npm test           # unit tests
npm run build      # production build in dist/
npm run preview    # serve the production build
```

## Deployment
`.github/workflows/deploy.yml` runs the tests, builds and publishes `dist/` to GitHub Pages on every push to `main`. One-time setup: repository **Settings → Pages → Source: GitHub Actions**. The build uses relative paths (`base: './'`), so the same `dist/` also works on any static host.

## Project layout
- `src/game/scenes/`: Phaser scenes (boot, title, chamber list, chamber, ending)
- `src/game/systems/`: pure, unit-tested game logic (`RoomSim` runs one chamber attempt)
- `src/game/data/levels.ts`: the six authored chambers
- `src/game/art/`: views drawn in code (beacons, shadows, runes, echo, scanners)
- `src/game/audio/`: the WebAudio synthesizer for all sound
- `src/dev/`: browser QA helpers, loaded only by `npm run dev`
- `tests/`: Vitest unit tests
- `docs/`: design document, trailer plan, rules summary, asset log

## Originality
All game code, art and sound are authored for this project. Art is drawn in code and every sound is synthesized at runtime, so apart from a small hand-written SVG favicon the game ships no image or audio files. Dependencies are installed through npm and listed with their licenses in [docs/ORIGINALITY_ASSET_LOG.md](docs/ORIGINALITY_ASSET_LOG.md).
