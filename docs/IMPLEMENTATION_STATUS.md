# Implementation status

Updated at the end of every gate. Nothing below counts as done without command output or a browser capture behind it.

## Gates
| Gate | Meaning | Status |
|---|---|---|
| G0 | Game boots locally | Scaffold, typecheck, unit tests and production build pass. **Browser boot not yet verified.** |
| G1 | Ignition opens a gate (room 1) | Not started |
| G2 | Caster shadow powers rune (room 2) | Not started |
| G3 | 6 s echo alone holds the gate (room 3) | Not started |
| G4 | Scanner shelter and damage rules (room 4) | Not started |
| G5 | All shipped levels cleared, results, ending, level select | Not started |
| G6 | Production build and deployed link verified | Not started |
| G7 | 3-minute trailer, at least 120 s real gameplay | Not started |
| G8 | Public repo, Drive link, submission checklist | Not started |

## What exists
- Phaser 3.90.0 + TypeScript 5.9.3 + Vite 7.3.7 + Vitest 4.1.11, all pinned exactly in `package-lock.json`.
- Scripts: `dev`, `build`, `typecheck`, `test`, `preview`.
- `BootScene` generates procedural textures, then `TitleScene` shows the eclipse logo, a rotating clock ring and the title.
- `clampDelta` (GDD §11, 0.05 s max step) with unit tests.
- Docs: GDD, trailer shotlist, master prompt, QA checklist, competition rules summary, originality log.

## Decisions made
- **Engine stays on Phaser 3** (3.90.0, last 3.x) even though Phaser 4 is out, because the GDD and master prompt fix Phaser 3.
- **Naming:** the code uses `runes` (as in the GDD data contract). The GDD's "glyph" means the same thing.
- **Vite `base: './'`** so the same build works on GitHub Pages, Netlify or Vercel.

## Open items for the owner
- **LICENSE:** the public repo needs a license choice (for example MIT) and the copyright holder's name.
- **GitHub remote:** no remote yet. `gh` CLI is not installed. The repo has to be created on GitHub and set as `origin`.
- **Deadline date:** Day 3, 9:30 AM, with the calendar date still to confirm with organizers.

## Risks and blockers
- **C: drive has 0 bytes free.** npm's cache and temp files default to C:, so npm commands in this workspace set `npm_config_cache=D:/Adil/.cache/npm` and `TEMP/TMP=D:/Adil/.cache/tmp`. One `vite build` run crashed esbuild, and the next two passed. Freeing space on C: is recommended before long sessions and screen recording.
- **Stage 4 geometry is tight:** with a 240 px wedge, a caster at the GDD anchor (470,240) covers the rune at x=700 with only 10 px to spare. Retune when room 4 is built.
