# Trailer recording guide

How to record and cut the 3:00 trailer described in [TRAILER_SHOTLIST.md](TRAILER_SHOTLIST.md). Gameplay segments must be **played by a person and screen-recorded**. Only the five cards below are edited graphics.

## 1. Before recording
- **Save recordings on D:**. C: has no free space, and a recording there will fail. Make a folder such as `D:\Adil\recordings`.
- Close other heavy programs. Plug the laptop in.
- Install OBS Studio (free) if it is not already installed.

### OBS settings
| Setting | Value |
|---|---|
| Settings → Output → Recording Path | `D:\Adil\recordings` |
| Recording Format | `mkv` (survives a crash; use File → Remux Recordings to get `mp4` afterwards) |
| Encoder | Hardware (NVENC/QuickSync/AMF) if listed, otherwise x264 |
| Settings → Video → Base and Output Resolution | `1920x1080` |
| FPS | `60` (use `30` if the game stutters while recording) |
| Audio → Desktop Audio | Default (records the game sound) |
| Mic | Disabled |
| Source | **Window Capture** of the browser window (or Display Capture) |

About 2–4 GB per 10 minutes at 1080p60. D: has about 9.7 GB free, so keep takes short and delete failed ones.

## 2. The two recording links
Use the live build; it is the stable production version.

| What | Link |
|---|---|
| Gameplay (all six chambers open, no cursor, shotlist captions) | https://adil-infosec.github.io/SIX-SECONDS-OF-SUN/?capture |
| Trailer cards (the edited segments) | https://adil-infosec.github.io/SIX-SECONDS-OF-SUN/?trailer |

Press **F11** for full screen before recording, so no browser bar shows. Sound starts on the first key press, which is the Enter on the title screen. `?capture` never saves progress, so recording takes do not touch normal play.

## 3. Gameplay takes
Start OBS, press Enter on the title, pick the chamber with the arrow keys and Enter, and play. Each chamber begins with its caption for about six seconds. Record **two or three takes** of each, and one **uninterrupted** room 3 solve. Press `R` to retry at once.

| Segment | Chamber | Length used | How to play it cleanly |
|---|---|---:|---|
| 00:08–00:28 | 01 A Spark in the Dark | 20 s | Walk right to the dark brazier and press `E`. Pause a moment for the light and pulses, then walk through the open gate into the portal |
| 00:38–01:03 | 02 Shape of Nothing | 25 s | Light the beacon. Walk right along the beacon's level until your shadow covers the rune. Hold still until the ring fills and `SHADOW LOCK` shows, then walk out |
| 01:13–01:48 | 03 The Other You | 35 s | Light the beacon. Stand on the line about halfway to the rune. Wait until the MEMORY ring (bottom left) is full and cyan, press `Q`, and walk to the gate while your echo holds it open |
| 01:48–02:13 | 04 Furnace Hour | 25 s | Light the beacon. Stand on the line left of the fire lane, wait six seconds and press `Q`. Walk right inside the echo's shadow to the rune. Let the fire pass over you, and when it moves away, dash to the gate |
| 02:28–02:53 | 06 Six Seconds of Sun | 25 s | Light the sun core and watch the rings. Cross the fire fence when the band is far away, light both relays, cross back, and stand just down-right of the sun on the line to the rune. Wait six seconds, press `Q`, follow the shadow line into the fire lane, wait for the band to move away and dash to the gate. Record the whole run and cut it down to 25 s |
| B-roll (optional) | 05 Ashes and Angles | — | Relay, timed fence crossing and the angled shadow. Useful if a cut needs extra gameplay |

Also record one **room 6 clear followed by Enter → SUNRISE** in case you want the real ending.

## 4. Card takes
Open the `?trailer` link, press F11, start OBS, then press the number key. Each card holds its last frame, so let it run a second past its length. Press `Esc` to return to the menu.

| Key | Segment | Length | Content |
|---|---|---:|---|
| 1 | 00:00–00:08 | 8 s | Eclipse opens, title and tagline |
| 2 | 00:28–00:38 | 10 s | FIRE / SHADOW / TIME, "One mechanism. Three powers." |
| 3 | 01:03–01:13 | 10 s | The six-second memory fills, rewinds and loops with the echo. "What if the past could stay?" |
| 4 | 02:13–02:28 | 15 s | Synergy chain: FIRE ignite the lens, SHADOW cover the rune, TIME replay six seconds, SYNERGY your echo's shadow opens the exit |
| 5 | 02:53–03:00 | 7 s | Sunrise, title and play link |

## 5. Editing
Any editor works: Clipchamp (built into Windows 11), DaVinci Resolve (free) or CapCut.

1. Put the clips on one timeline in the order of the table in [TRAILER_SHOTLIST.md](TRAILER_SHOTLIST.md).
2. Gameplay: 20 + 25 + 35 + 25 + 25 = **130 s**, more than the required 120 s. Trimming is fine, but do not speed up or alter gameplay footage.
3. Cards: 8 + 10 + 10 + 15 + 7 = **50 s**.
4. Keep the game's own sound. Add no outside music unless its license allows it.
5. Export as **MP4, H.264, AAC, 1920×1080**, exactly **3:00.000** long.

## 6. Delivery checklist
- [ ] Duration is exactly 3:00 (check the editor's export info).
- [ ] At least 120 s is real gameplay (the five gameplay segments above).
- [ ] All three themes are named on screen (captions and card 4).
- [ ] No browser bar, cursor, desktop, notifications or debug text in frame.
- [ ] The audio does not clip, and captions are readable at 1080p.
- [ ] Watched once from start to finish.
- [ ] Uploaded to Google Drive with sharing set to **Anyone with the link → Viewer**.
- [ ] Drive link opened in a private/incognito window to confirm it plays.
- [ ] Drive link added to the submission form and to the README.
