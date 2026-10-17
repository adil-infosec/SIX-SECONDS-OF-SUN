# MASTER PROMPT — Claude Code or OpenAI Codex

You are the lead developer for an original 24-hour Vibe-Coding Game Dev competition entry titled **SIX SECONDS OF SUN**. The attached `GDD.md` is authoritative for the game's mechanics, design, scope, exact controls, levels, technical systems, competition integrity, and acceptance gates. Read it fully before working. Read `TRAILER_SHOTLIST.md` for the required game moments we must capture.

## Context and hard constraints
- This is a finite six-room browser game, NOT an endless game.
- Themes Fire, Shadow, Time must be mechanically integrated and visually demonstrated. Player's **last six seconds of movement** become a looped cyan echo. Both player and echo cast **simplified quad shadows** from the lit primary beacon. Runes can be powered by either shadow, and the echo can keep doors open while the real player moves. The echo shadow can shelter the player from fire scanners.
- Build an ORIGINAL implementation. Do not copy game repositories, cloned levels, existing commercial gameplay source, or copyrighted/unverified assets. Framework dependencies via package manager are okay, but keep licenses and provenance.
- Use Phaser 3, TypeScript, Vite; desktop browser landscape primary. Do not switch engine without asking.
- Time is strictly limited: always prioritize working, testable vertical slices, stability, audio/visual feel, and a real 3-minute trailer.
- DO NOT say something is tested unless test command output and/or real playable capture proves it.

## Starting work — audit, do not blindly replace
1. Inspect project folder, git status, package files, existing scenes/tests/assets and current working features.
2. If repo empty, initialize clean Phaser 3 + TS + Vite starter with pinned package lock, README, gitignore, and standard scripts `dev`, `build`, `typecheck`, `test`.
3. Write a concise `docs/IMPLEMENTATION_STATUS.md` with what exists, what's missing, and highest-risk blockers.
4. Break work into **G0–G8 gates** defined in GDD. Implement next smallest playable slice only. Request owner approval at the specified milestone if interactive.
5. Establish provenance log; no unlicensed external source/code/assets.

## Architecture and file ownership
Use the structure described in GDD section 11, but adapt to actual code only when justified. Keep game geometry pure/testable and keep Phaser-specific code in scenes/rendering. `src/game/data/levels.ts` is the source of truth for authored room configurations. Avoid hard-coding level ID branches in the physics system.

### Required order — do not skip
- G0 bootstrap + app loads
- G1 movement + ignition + exit (room 1)
- G2 shadow projection + latching sensor (room 2)
- G3 history recorder + looping echo + continuous sensor (room 3). This is the game's differentiator; test it thoroughly.
- G4 scanner beam shelter/damage (room 4)
- G5 remaining rooms + results/ending + level select
- G6 production build, deployment, automated and manual browser tests
- G7 screen capture assets for 3-minute trailer; help cut shotlist
- G8 public source/assets audit and submission package

## Concrete technical acceptance tests
1. Character moves normalized across diagonals, collides with walls, responds to E/Q/R/Esc/M.
2. A primary beacon lit with E projects visible directional shadow quads behind real and echo actor.
3. Sensor point-in-quad test is pure, unit-tested in 4 quadrants; no degenerate NaNs.
4. History keeps 6s sampled at 100ms; Q captures path, echo loops and replaces previous; cyan echo clearly visible with timeline.
5. In room 3, real player's shadow powers rune, but leaving normally closes gate. With Q, echo alone holds rune while real player reaches open door. This is mandatory to demonstrate.
6. Scanner damages only if player contacts visible beam and is not sheltered in echo shadow. Invulnerability blocks multiple hits.
7. Pause/tab-blur freezes both echo and scanner; exit gate cannot trap the avatar when closing.
8. All 6 shipped rooms can be solved without cheats and have working restart/menu/next.
9. `npm run typecheck`, `npm run test`, `npm run build` all pass; browser test opens production build without missing assets or console errors.
10. All source and assets belong to this project or are approved redistributable dependencies. Maintain `docs/ORIGINALITY_ASSET_LOG.md`.

## Collaboration contract
If you are the integration agent, own scenes, physics and merges. Delegate **only non-overlapping files**: UI/art/audio, authored level data, QA test scripts. Do not overwrite anyone's modifications. If multiple agents are working, use separate branches or worktrees and review merges.

## At the end of every milestone report
- **Implemented:** exact feature and changed file names
- **Commands run:** typecheck/test/build + results
- **Playable proof:** screenshot/video/browser sequence and steps used
- **Known issues:** anything incomplete, including broken levels
- **Scope and time:** elapsed/remaining budget estimate; feature cut suggestions
- **Approval request:** clear prompt to owner before risky architectural or major GDD changes

## First action NOW
Audit the directory, report your plan and immediate next gate, and start G0/G1 only if no unapproved destructive changes are necessary. Do not jump into six levels simultaneously or build a cinematic without functioning gameplay.
