# Competition submission and QA checklist

## Rule audit
- [ ] Any game inspiration is acknowledged where appropriate; visual assets, music, source code, and level arrangements are original or documented permissively licensed.
- [ ] No third-party entire-game source/template copied into the project.
- [ ] Fire, Shadow, Time change game logic and are explained in trailer.
- [ ] Public GitHub repository contains ALL source files and redistributable runtime assets.
- [ ] Google Drive trailer link works without owner sign-in.
- [ ] Trailer = EXACTLY 180 seconds; genuine gameplay capture >=120 seconds.
- [ ] Optional deployed URL loads in incognito; include it if stable.
- [ ] Official Day 3 submission time = 9:30 AM; confirm actual calendar date/time with organizers.

## Functional release gate
- [ ] Menu → level select → all published levels → ending → replay.
- [ ] New player understands E at beacon, shadow alignment, and Q afterimage.
- [ ] Q shadow actually powers rune while player leaves; tested visibly.
- [ ] No game-breaking softlocks, no ghost collision errors, no invisible damaging beam.
- [ ] Keyboard works; R restarts; Esc pause; M mute; switching tabs auto-pauses.
- [ ] No console errors, missing font/image/audio assets or unhandled exception.
- [ ] Browser typecheck/test/build pass and are documented.
- [ ] At least one real person or automated browser physically completes each submitted room.
- [ ] UI usable at 1366×768 and 1920×1080, no clipped captions.
- [ ] Opening 15 seconds of trailer communicates an exciting premise.

## Originality asset log template
| Path | Origin/creation tool | Usage rights | Attribution needed? | Checked by |
|---|---|---|---|---|
| `src/game/art/ProceduralTextures.ts` | Authored TS/Phaser vector geometry | Project code | No external media attribution | Team |
| `public/assets/...` | ADD ACTUAL SOURCE | ADD LICENSE | ADD DETAILS | Team |

## Public release handoff (must fill)
**GitHub URL:** ____________________
**Google Drive trailer URL:** ____________________
**Deployed live game URL (optional):** ____________________
**Deadline confirmed:** ____________________
**Final video run-time:** ____________________
**Direct gameplay seconds:** ____________________
**Feature-freeze commit SHA:** ____________________
**Submission confirmed at:** ____________________
