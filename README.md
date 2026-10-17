# Six Seconds of Sun

*Light the fire. Shape the shadow. Borrow six seconds.*

A short, handcrafted 2D puzzle-action game for desktop browsers, built for a 24-hour vibe-coding game jam with the themes **Fire, Shadow and Time**.

Light a beacon and your body casts a shadow. Shadows power dark runes that open doors. Press `Q` and your last six seconds of movement become a looping cyan echo. The echo casts a shadow too, so it can hold a door open while you walk through it, or shelter you from sweeping fire.

> **Status:** early development. See [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).

## Controls
| Key | Action |
|---|---|
| `WASD` / arrows | Move |
| `E` | Ignite a nearby brazier |
| `Q` | Replay your last six seconds as an echo |
| `R` | Restart the room |
| `Esc` | Pause |
| `M` | Mute |
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

## Project layout
- `src/game/scenes/`: Phaser scenes (boot, title, and the game scenes as they arrive)
- `src/game/systems/`: pure, unit-tested game logic
- `src/game/art/`: procedural textures, all generated in code
- `tests/`: Vitest unit tests
- `docs/`: design document, trailer plan, rules summary, asset log

## Originality
All game code and art are authored for this project. Dependencies are installed through npm and listed with their licenses in [docs/ORIGINALITY_ASSET_LOG.md](docs/ORIGINALITY_ASSET_LOG.md).
