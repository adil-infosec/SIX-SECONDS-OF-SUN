import type { Vec2 } from '../game/systems/math';
import type { QaHarness } from './qaHarness';

/**
 * Dev-only trailer recorder (`__qa.recordTrailer()`), opened on `?capture`.
 *
 * Records the game canvas and the game's own audio with MediaRecorder,
 * following docs/TRAILER_SHOTLIST.md: the five trailer cards plus real
 * gameplay in the running game, driven through real key events. Each shot
 * records for an exact number of seconds; anything outside a shot (walking
 * between highlights) happens while the recorder is paused, like a trim in
 * an editor. The finished MP4 is uploaded to the dev server, which saves it
 * in D:\Adil\recordings.
 */

type Status = {
  phase: 'idle' | 'recording' | 'saving' | 'done' | 'failed';
  shot: string;
  recordedMs: number;
  saved?: string;
  bytes?: number;
  error?: string;
};

const MIME = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2';

export function installTrailerDirector(qa: QaHarness): void {
  const status: Status = { phase: 'idle', shot: '', recordedMs: 0 };
  (window as unknown as { __trailerStatus: Status }).__trailerStatus = status;

  const sim = () => qa.sim();
  const sleep = qa.sleep;
  const wait = (s: number) => sleep(s * 1000);

  /** Band position of scanner `i` at room time `t`, mirroring ScannerSystem. */
  const band = (i: number, t: number): number => {
    const sc = sim().level.scanners[i];
    return sc.min + (sc.max - sc.min) * (0.5 + 0.5 * Math.sin((2 * Math.PI * (t + sc.phase)) / sc.period));
  };
  /** Waits until scanner `i` stays 30 px clear of `at` for the next `secs`. */
  const waitClear = async (i: number, at: number, secs: number) => {
    for (let k = 0; k < 800; k++) {
      const now = sim().state.time;
      let ok = true;
      for (let t = 0; t <= secs; t += 1 / 60) {
        if (Math.abs(band(i, now + t) - at) <= 30) {
          ok = false;
          break;
        }
      }
      if (ok) return;
      await sleep(15);
    }
  };
  /** Waits until scanner `i` has just passed `x` heading left. */
  const waitPassLeft = async (i: number, x: number) => {
    for (let k = 0; k < 800; k++) {
      const t = sim().state.time;
      if (band(i, t) < x - 30 && band(i, t + 0.05) < band(i, t)) return;
      await sleep(10);
    }
  };
  /** Waits until the band will next pass `x` heading left in about `lead` seconds. */
  const waitForPassIn = async (i: number, x: number, lead: number) => {
    for (let k = 0; k < 1500; k++) {
      const t0 = sim().state.time;
      let eta = -1;
      for (let t = 0; t < 6; t += 1 / 60) {
        if (band(i, t0 + t) < x - 30 && band(i, t0 + t + 0.05) < band(i, t0 + t)) {
          eta = t;
          break;
        }
      }
      if (eta >= lead - 0.15 && eta <= lead + 0.15) return;
      await sleep(10);
    }
  };
  const go = async (p: Vec2, ms = 8000) => {
    await qa.drive(p, ms);
  };
  const ignite = async () => {
    await qa.tap('e');
    await sleep(60);
  };

  async function record(name: string, smoke: boolean): Promise<Status> {
    if (status.phase === 'recording' || status.phase === 'saving') return status;
    Object.assign(status, { phase: 'recording', shot: 'setup', recordedMs: 0, saved: undefined, bytes: undefined, error: undefined });
    try {
      if (qa.audio.state !== 'running') throw new Error('Audio is not running: press a key or click the game first.');
      qa.audio.setMuted(false);
      const canvas = document.querySelector('canvas');
      if (!canvas) throw new Error('No game canvas.');
      const stream = canvas.captureStream(60);
      const sound = qa.audio.captureStream();
      sound?.getAudioTracks().forEach((t) => stream.addTrack(t));
      const recorder = new MediaRecorder(stream, { mimeType: MIME, videoBitsPerSecond: 10_000_000, audioBitsPerSecond: 192_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      let started = false;
      /** Records exactly `seconds` while `action` runs; the action may finish off camera. */
      const shot = async (label: string, seconds: number, action: () => Promise<void>) => {
        if (document.hidden) throw new Error('The browser window was hidden; recording needs it on screen.');
        status.shot = label;
        if (!started) {
          recorder.start(1000);
          started = true;
        } else {
          recorder.resume();
        }
        const t0 = performance.now();
        const run = action();
        await sleep(seconds * 1000);
        recorder.pause();
        status.recordedMs += performance.now() - t0;
        await run;
        if (document.hidden) throw new Error('The browser window was hidden during a shot.');
      };
      /** Off-camera work between shots. */
      const offscreen = async (label: string, action: () => Promise<void>) => {
        status.shot = `${label} (off camera)`;
        await action();
      };
      const card = async (n: 1 | 2 | 3 | 4 | 5) => {
        if (!qa.active().includes('TrailerScene')) {
          const from = qa.active()[0];
          if (from) qa.game.scene.getScene(from)!.scene.start('TrailerScene');
          await sleep(400);
        }
        const key = String(n) as '1';
        qa.key(key, 'keydown');
        qa.key(key, 'keyup');
        await sleep(50);
      };
      const room = async (id: number) => {
        await qa.goto(id);
        await sleep(250);
      };
      /** Stops the recorder and uploads the MP4 to the dev server. */
      const finish = async (): Promise<Status> => {
        status.phase = 'saving';
        status.shot = 'saving';
        const done = new Promise<void>((r) => {
          recorder.onstop = () => r();
        });
        recorder.stop();
        await done;
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const res = await fetch(`/__qa/recordings/${encodeURIComponent(name)}`, { method: 'POST', body: blob });
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        const saved = (await res.json()) as { saved: string; bytes: number };
        Object.assign(status, { phase: 'done', shot: 'done', saved: saved.saved, bytes: saved.bytes });
        return status;
      };

      // Shot lengths: cards 8 + 10 + 10 + 15 + 7 = 50 s; gameplay
      // 14 + 18 + 24 + 19 + 23 + 32 = 130 s; total 180 s.

      // ---- Card 1 (8 s) --------------------------------------------------
      await offscreen('card 1', () => card(1));
      await shot('card 1: opening', 8, async () => undefined);
      if (smoke) return await finish();

      // ---- Room 1 (14 s): FIRE gives the world light ----------------------
      await offscreen('room 1', () => room(1));
      await shot('room 1', 14, async () => {
        await wait(1.6);
        await go({ x: 425, y: 310 });
        await wait(0.6);
        await ignite();
        await wait(1.6);
        // Circle the flame so the new shadow swings around the keeper.
        await go({ x: 520, y: 330 });
        await go({ x: 520, y: 200 });
        await go({ x: 760, y: 260 });
        await go({ x: 868, y: 260 });
      });

      // ---- Card 2 (10 s) -------------------------------------------------
      await offscreen('card 2', () => card(2));
      await shot('card 2: fire / shadow / time', 10, async () => undefined);

      // ---- Room 2 (18 s): SHADOW is the key ------------------------------
      await offscreen('room 2', () => room(2));
      await shot('room 2', 18, async () => {
        await wait(1.4);
        await go({ x: 260, y: 315 });
        await wait(0.4);
        await ignite();
        await wait(1);
        // Too close to the flame: the shadow falls short of the rune.
        await go({ x: 350, y: 262 });
        await wait(1.6);
        // Step back along the line until the wedge reaches it and holds.
        await go({ x: 470, y: 262 });
        await wait(1.8);
        // Latching: walk off the line and the gate stays open.
        await go({ x: 470, y: 340 });
        await go({ x: 620, y: 340 });
        await wait(0.6);
        await go({ x: 760, y: 260 });
        await go({ x: 873, y: 260 });
      });

      // ---- Card 3 (10 s) -------------------------------------------------
      await offscreen('card 3', () => card(3));
      await shot('card 3: the six-second memory', 10, async () => undefined);

      // ---- Room 3 (24 s): TIME repeats your last six seconds ---------------
      await offscreen('room 3', () => room(3));
      await shot('room 3', 24, async () => {
        await wait(1.2);
        await go({ x: 230, y: 325 });
        await ignite();
        await wait(0.8);
        await go({ x: 450, y: 270 });
        await wait(1.2);
        // Leave the line: a continuous rune lets go and the gate shuts.
        await go({ x: 450, y: 380 });
        await wait(1.4);
        // Back on the line. Pace along it for over six seconds, so the whole
        // recorded memory stays on the line and the echo retraces the walk.
        await go({ x: 450, y: 270 });
        for (let i = 0; i < 5; i++) {
          await go({ x: 520, y: 270 });
          await go({ x: 440, y: 270 });
        }
        await wait(2);
        await qa.tap('q');
        await wait(0.8);
        await go({ x: 600, y: 360 });
        await go({ x: 790, y: 270 });
        await wait(1.6);
        await go({ x: 880, y: 270 });
      });

      // ---- Room 4 (19 s in two shots): Your past protects your future -------
      await offscreen('room 4', () => room(4));
      await shot('room 4: echo', 11, async () => {
        await wait(0.8);
        await go({ x: 200, y: 295 });
        await ignite();
        await go({ x: 480, y: 240 });
        await wait(6.2);
        await qa.tap('q');
        await wait(0.3);
        await go({ x: 700, y: 240 });
      });
      await offscreen('room 4: shelter', async () => {
        await go({ x: 700, y: 240 });
        await waitForPassIn(0, 700, 2.2);
      });
      await shot('room 4: fire passes over the shade', 8, async () => {
        await waitPassLeft(0, 700);
        await go({ x: 795, y: 240 });
        await go({ x: 880, y: 240 });
      });

      // ---- Card 4 (15 s) -------------------------------------------------
      await offscreen('card 4', () => card(4));
      await shot('card 4: synergy', 15, async () => undefined);

      // ---- Room 5 (23 s in four shots): two flames, one angle ---------------
      await offscreen('room 5', () => room(5));
      await shot('room 5: relay', 8, async () => {
        await wait(1);
        await go({ x: 640, y: 475 });
        await ignite();
        await go({ x: 420, y: 380 });
      });
      await offscreen('room 5: fence', async () => {
        await go({ x: 420, y: 380 });
        await waitClear(0, 420, 1.4);
      });
      await shot('room 5: fence', 3, async () => {
        await go({ x: 420, y: 240 });
        await go({ x: 220, y: 225 });
      });
      await offscreen('room 5: beacon', () => go({ x: 220, y: 225 }));
      await shot('room 5: angled shadow', 6, async () => {
        await ignite();
        await wait(0.4);
        await go({ x: 492, y: 136 });
      });
      await offscreen('room 5: memory', async () => {
        await go({ x: 492, y: 136 });
        await wait(4.8);
      });
      await shot('room 5: echo and exit', 6, async () => {
        await wait(1.5);
        await qa.tap('q');
        await wait(0.2);
        await go({ x: 800, y: 170 });
        await go({ x: 885, y: 170 });
      });

      // ---- Room 6 (32 s in six shots): the finale -------------------------
      await offscreen('room 6', () => room(6));
      await shot('room 6: sun core', 6, async () => {
        await wait(1.2);
        await go({ x: 470, y: 225 });
        await ignite();
      });
      await offscreen('room 6: to the fence', async () => {
        await go({ x: 320, y: 300 });
        await waitClear(0, 320, 1.6);
      });
      await shot('room 6: fence', 4, async () => {
        await go({ x: 320, y: 420 });
        await go({ x: 240, y: 485 });
      });
      await offscreen('room 6: left relay', () => go({ x: 240, y: 485 }));
      await shot('room 6: left relay', 3, async () => {
        await ignite();
        await wait(0.6);
        await go({ x: 420, y: 485 });
      });
      await offscreen('room 6: to right relay', () => go({ x: 620, y: 485 }));
      await shot('room 6: right relay', 3, async () => {
        await ignite();
      });
      await offscreen('room 6: back up and cast', async () => {
        await go({ x: 560, y: 420 });
        await waitClear(0, 560, 1.4);
        await go({ x: 560, y: 300 });
        await go({ x: 545, y: 207 });
        await wait(3.8);
      });
      await shot('room 6: echo', 6, async () => {
        await wait(2.5);
        await qa.tap('q');
        await wait(0.4);
        await go({ x: 740, y: 302 });
      });
      await offscreen('room 6: shelter', async () => {
        await go({ x: 740, y: 302 });
        await waitForPassIn(1, 740, 2.2);
      });
      await shot('room 6: shelter and escape', 10, async () => {
        await waitPassLeft(1, 740);
        await go({ x: 797, y: 260 });
        await go({ x: 870, y: 260 });
      });

      // ---- Card 5 (7 s) --------------------------------------------------
      await offscreen('card 5', () => card(5));
      await shot('card 5: outro', 7, async () => undefined);

      return await finish();
    } catch (e) {
      Object.assign(status, { phase: 'failed', error: e instanceof Error ? e.message : String(e) });
    }
    return status;
  }

  type Recorder = { recordTrailer: (name?: string, opts?: { smoke?: boolean }) => Promise<Status> };
  /** `smoke: true` records only the first card, to check the save path quickly. */
  (qa as unknown as Recorder).recordTrailer = (name = 'six-seconds-of-sun-trailer.mp4', opts = {}) => record(name, !!opts.smoke);
}
