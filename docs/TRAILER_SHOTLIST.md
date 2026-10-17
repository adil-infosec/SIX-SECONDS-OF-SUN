# Six Seconds of Sun — Three-Minute Trailer Shotlist

**Hard requirement (organizers):** Exactly 3:00 total. At least 2:00 of directly screen-recorded gameplay. The trailer must explain the themes and their interactions. Initial shortlisting is trailer-only.

## Edit decision list (180 seconds)

| Timecode | Duration | Type | Shot / narration or caption |
|---|---:|---|---|
| 00:00–00:08 | 8s | Edited/title | Black eclipse opens into glowing observatory; title "SIX SECONDS OF SUN" |
| 00:08–00:28 | 20s | **REAL GAMEPLAY** | Room 1, avatar approaches dark brazier and ignites it, door opens. Caption: "FIRE gives the world light." |
| 00:28–00:38 | 10s | Edited graphic | Three symbols: FIRE / SHADOW / TIME, subtitle "One mechanism. Three powers." |
| 00:38–01:03 | 25s | **REAL GAMEPLAY** | Room 2, move physically between beacon and rune; projected wedge covers glyph, gauge fills. Caption: "SHADOW is the key." |
| 01:03–01:13 | 10s | Edited graphic | Stylized close-up six-second history ring rewinds; caption "What if the past could stay?" |
| 01:13–01:48 | 35s | **REAL GAMEPLAY** | Room 3, stand to cast shadow, tap Q, cyan echo retraces; real avatar leaves, gate stays open. Caption: "TIME repeats your last six seconds." |
| 01:48–02:13 | 25s | **REAL GAMEPLAY** | Room 4, fire scanner approaches, avatar ducks into echo's projected shade; rune stays powered, escape. Caption: "Your past protects your future." |
| 02:13–02:28 | 15s | Edited graphic | Split-screen explanatory overlay using authentic captured frame: orange flame → cyan echo → dark glyph → opening door. Explain all three themes together. |
| 02:28–02:53 | 25s | **REAL GAMEPLAY** | Room 6 final; ignite relays, echo projected shadow on glyph, sprint through fiery scanner to portal. Keep UI visible. |
| 02:53–03:00 | 7s | Edited outro | Sun rises, simple title and tagline; no fabricated gameplay claim. |

**Accounting:** 20+25+35+25+25 = **130 seconds genuine gameplay**. Other 50 seconds edited/cinematic. Ensure all five gameplay sections are screen captured in the running game, and no gameplay clip is replaced with AI-generated rendered mock footage.

## Capture specification
- Landscape 1920×1080 preferred, 60fps capture if device permits; output H.264 MP4 with AAC audio.
- Use OBS or native screen recorder. Record from a **fresh stable production build**, not live editor overlays.
- Turn off mouse cursor in game region if not needed; keep legible HUD and 16:9 frame.
- Capture multiple takes of every gameplay section, including one entire uninterrupted room 3 solve to validate authenticity.
- Use music only when copyright/redistribution rights are verified. Avoid dropping in copyrighted commercial soundtrack.
- During edit count direct gameplay by timecode: at least 120 seconds. Target 130 for margin. Captions and modest trims do not make a real clip fake, but do not rely on time spent on menu/title as gameplay.
- Include an explicit explanatory caption for all three themes, not only mood shots.

## Delivery QA
- Timeline export exactly `00:03:00.000` (duration verify with ffprobe or editor metadata).
- Audio levels without clipping; clear transitions; readable captions at 1080p.
- Verify no browser URL overlay, errors, debug UI, placeholder assets, or watermark.
- Replay file locally from start to finish and open uploaded Drive link in incognito mode.
- Put the Drive link in submission and GitHub README; game URL recommended but optional by rules.
