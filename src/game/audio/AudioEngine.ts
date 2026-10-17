/**
 * All game audio, synthesized at runtime with WebAudio (GDD §5): no sound
 * files, so nothing to license. Every method is a safe no-op until the
 * browser allows audio (first key press or click) and wherever WebAudio is
 * missing, so audio can never stop the game.
 */

export type SfxName =
  | 'ignite'
  | 'relay'
  | 'rune'
  | 'runeOff'
  | 'echo'
  | 'deny'
  | 'gateOpen'
  | 'gateClose'
  | 'hit'
  | 'danger'
  | 'respawn'
  | 'checkpoint'
  | 'win'
  | 'fail'
  | 'uiMove'
  | 'uiConfirm'
  | 'uiLocked';

export type Ambience = 'title' | 'chamber' | 'ending' | 'none';

type Ctx = AudioContext;

const MASTER_LEVEL = 0.8;
const AMBIENT_LEVEL = 0.5;
const SFX_LEVEL = 0.9;
const TICK_SECONDS = 0.5;
const SCHEDULE_AHEAD = 0.12;
const DANGER_COOLDOWN = 0.6;

function audioContextCtor(): (new () => AudioContext) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: new () => AudioContext; webkitAudioContext?: new () => AudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export class AudioEngine {
  private ctx: Ctx | null = null;
  private master!: GainNode;
  private ambientBus!: GainNode;
  private sfxBus!: GainNode;
  private analyser!: AnalyserNode;
  private noise!: AudioBuffer;
  private droneGain!: GainNode;
  private warmGain!: GainNode;
  private humGain!: GainNode;
  private muted = false;
  private paused = false;
  private ambience: Ambience = 'none';
  private crackleSources = 0;
  private nextTick = 0;
  private tock = false;
  private lastDanger = -Infinity;

  /** Creates or resumes the audio context on the first user gesture. */
  installUnlock(target: Window): void {
    const unlock = () => {
      this.ensureContext();
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    };
    for (const type of ['keydown', 'pointerdown', 'touchstart']) {
      target.addEventListener(type, unlock, { capture: true, passive: true });
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMaster();
  }

  /** Ducks ambience and silences hazard loops while the game is paused. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.ambientBus.gain.setTargetAtTime(paused ? AMBIENT_LEVEL * 0.3 : AMBIENT_LEVEL, t, 0.1);
    if (paused) this.humGain.gain.setTargetAtTime(0, t, 0.05);
  }

  startAmbience(kind: Ambience): void {
    this.ambience = kind;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const level = kind === 'none' ? 0 : kind === 'ending' ? 0.35 : kind === 'title' ? 0.6 : 1;
    this.droneGain.gain.setTargetAtTime(level * 0.22, t, 0.8);
    this.setWarmth(kind === 'ending' ? 1 : 0);
    this.setCrackle(0);
    this.setScannerProximity(0);
  }

  /** 0 = cold dark chamber, 1 = beacon lit: adds a warm major third and fifth to the drone. */
  setWarmth(level: number): void {
    if (!this.ctx) return;
    this.warmGain.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * 0.12, this.ctx.currentTime, 0.6);
  }

  /** Number of burning braziers; each adds to the crackle density. */
  setCrackle(sources: number): void {
    this.crackleSources = Math.max(0, sources);
  }

  /** 0..1, how close the nearest scanner band is to the keeper; drives the fire hum. */
  setScannerProximity(p: number): void {
    if (!this.ctx) return;
    const level = this.paused ? 0 : Math.max(0, Math.min(1, p));
    // Squared so a passing band swells sharply out of a quiet background hum.
    const gain = level === 0 ? 0 : 0.05 + 0.6 * level * level;
    this.humGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.04);
  }

  /** Root-mean-square level of the master output, for browser QA. */
  debugLevel(): number {
    if (!this.ctx) return 0;
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (const v of data) sum += v * v;
    return Math.sqrt(sum / data.length);
  }

  get state(): string {
    return this.ctx?.state ?? 'none';
  }

  /** The final mix as a MediaStream, for recording the trailer; null without audio. */
  captureStream(): MediaStream | null {
    if (!this.ctx) return null;
    const tap = this.ctx.createMediaStreamDestination();
    this.analyser.connect(tap);
    return tap.stream;
  }

  sfx(name: SfxName): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.005;
    switch (name) {
      case 'ignite':
        this.tone(110, 'sine', t, 0.9, 0.9, { attack: 0.005, freqEnd: 42 });
        this.noiseHit(t, 0.7, 0.35, 'lowpass', 300, 1, { freqEnd: 3200 });
        this.tone(220, 'triangle', t + 0.04, 1.6, 0.12, { attack: 0.06 });
        this.tone(330, 'triangle', t + 0.04, 1.6, 0.09, { attack: 0.06 });
        break;
      case 'relay':
        this.tone(165, 'sine', t, 0.6, 0.55, { attack: 0.005, freqEnd: 70 });
        this.noiseHit(t, 0.45, 0.22, 'lowpass', 500, 1, { freqEnd: 4000 });
        this.tone(330, 'triangle', t + 0.03, 1.1, 0.08, { attack: 0.04 });
        break;
      case 'rune':
        this.bell(1046.5, t, 0.5);
        this.bell(1568, t + 0.07, 0.22);
        break;
      case 'runeOff':
        this.tone(660, 'triangle', t, 0.4, 0.3, { attack: 0.01, freqEnd: 420 });
        this.tone(1320, 'sine', t, 0.25, 0.08, { attack: 0.01, freqEnd: 840 });
        break;
      case 'echo':
        // A "reverse" chime: swells in and cuts off, as if played backwards.
        for (const [f, g] of [
          [392, 0.22],
          [784, 0.34],
          [1175, 0.22],
          [1568, 0.14],
        ] as const) {
          this.reverse(f, t, 0.38, g);
        }
        this.bell(2349, t + 0.4, 0.12);
        break;
      case 'deny':
        this.tone(140, 'square', t, 0.14, 0.26, { attack: 0.003, filter: 700 });
        break;
      case 'gateOpen':
        this.noiseHit(t, 0.4, 0.22, 'bandpass', 1800, 4, { freqEnd: 600 });
        this.tone(90, 'sine', t + 0.3, 0.2, 0.45, { attack: 0.003 });
        this.tone(400, 'sine', t + 0.3, 0.6, 0.06);
        this.tone(960, 'sine', t + 0.3, 0.45, 0.035);
        break;
      case 'gateClose':
        this.noiseHit(t, 0.35, 0.18, 'bandpass', 600, 4, { freqEnd: 1800 });
        this.tone(80, 'sine', t + 0.28, 0.22, 0.5, { attack: 0.003 });
        break;
      case 'hit':
        this.noiseHit(t, 0.3, 0.55, 'highpass', 800, 0.7);
        this.tone(170, 'sine', t, 0.35, 0.8, { attack: 0.002, freqEnd: 48 });
        this.tone(240, 'sawtooth', t, 0.22, 0.18, { attack: 0.002, freqEnd: 110, filter: 1800 });
        break;
      case 'danger':
        if (t - this.lastDanger < DANGER_COOLDOWN) return;
        this.lastDanger = t;
        this.tone(880, 'square', t, 0.06, 0.08, { attack: 0.002, filter: 2400 });
        this.tone(880, 'square', t + 0.11, 0.06, 0.08, { attack: 0.002, filter: 2400 });
        break;
      case 'respawn':
        this.tone(330, 'sine', t, 0.3, 0.12, { attack: 0.02, freqEnd: 660 });
        break;
      case 'checkpoint':
        this.bell(880, t, 0.18);
        this.bell(1320, t + 0.12, 0.14);
        break;
      case 'win':
        [440, 554.37, 659.25, 880].forEach((f, i) => {
          this.tone(f, 'triangle', t + i * 0.09, 1.1, 0.34, { attack: 0.01 });
          this.tone(f * 2, 'sine', t + i * 0.09, 0.8, 0.1, { attack: 0.01 });
        });
        this.pad([220, 277.18, 329.63], t + 0.36, 0.4, 1.4, 0.12);
        break;
      case 'fail':
        [440, 349.23, 293.66].forEach((f, i) => {
          this.tone(f, 'sawtooth', t + i * 0.18, 0.6, 0.3, { attack: 0.01, filter: 1600 });
        });
        break;
      case 'uiMove':
        this.tone(1200, 'sine', t, 0.06, 0.1, { attack: 0.002 });
        break;
      case 'uiConfirm':
        this.tone(660, 'sine', t, 0.14, 0.22, { attack: 0.003 });
        this.tone(990, 'sine', t + 0.07, 0.2, 0.22, { attack: 0.003 });
        break;
      case 'uiLocked':
        this.tone(110, 'square', t, 0.16, 0.18, { attack: 0.003, filter: 500 });
        break;
    }
  }

  /** The ending's warm swell (A major) with bells on the three story beats. */
  sunrise(beats: readonly number[], finalBeat: number): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.05;
    this.pad([110, 164.81, 220, 277.18, 329.63], t, 4, 9, 0.07);
    const notes = [880, 1108.73, 1318.51];
    beats.forEach((b, i) => this.bell(notes[i % notes.length]!, t + b, 0.2));
    [880, 1108.73, 1318.51, 1760].forEach((f, i) => this.bell(f, t + finalBeat + i * 0.08, 0.14));
  }

  // ---- graph setup ----------------------------------------------------

  private ensureContext(): void {
    if (this.ctx) return;
    const Ctor = audioContextCtor();
    if (!Ctor) return;
    try {
      const ctx = new Ctor();
      this.ctx = ctx;
      this.build(ctx);
    } catch {
      this.ctx = null;
    }
  }

  private build(ctx: Ctx): void {
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 4;
    this.master = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.master.connect(compressor).connect(this.analyser).connect(ctx.destination);
    this.ambientBus = ctx.createGain();
    this.ambientBus.gain.value = AMBIENT_LEVEL;
    this.ambientBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = SFX_LEVEL;
    this.sfxBus.connect(this.master);
    this.applyMaster();

    // Shared two-second white-noise buffer for crackles, whooshes and the fire hum.
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // Low drone: two detuned saws and a fifth through a slowly breathing lowpass.
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 260;
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoDepth.gain.value = 90;
    lfo.connect(lfoDepth).connect(droneFilter.frequency);
    lfo.start();
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0;
    for (const [f, type] of [
      [55, 'sawtooth'],
      [55.35, 'sawtooth'],
      [82.41, 'triangle'],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.connect(droneFilter);
      o.start();
    }
    droneFilter.connect(this.droneGain).connect(this.ambientBus);

    // Warmth: a major third and fifth that fade in once a beacon burns.
    this.warmGain = ctx.createGain();
    this.warmGain.gain.value = 0;
    for (const f of [138.59, 164.81, 220]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.connect(this.warmGain);
      o.start();
    }
    this.warmGain.connect(this.droneGain);

    // Fire hum for scanners: band-passed noise plus a low saw, gain set by proximity.
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0;
    const hum = ctx.createBufferSource();
    hum.buffer = this.noise;
    hum.loop = true;
    const humBand = ctx.createBiquadFilter();
    humBand.type = 'bandpass';
    humBand.frequency.value = 520;
    humBand.Q.value = 1.4;
    hum.connect(humBand).connect(this.humGain);
    hum.start();
    const roar = ctx.createOscillator();
    roar.type = 'sawtooth';
    roar.frequency.value = 73;
    const roarFilter = ctx.createBiquadFilter();
    roarFilter.type = 'lowpass';
    roarFilter.frequency.value = 380;
    const roarGain = ctx.createGain();
    roarGain.gain.value = 0.5;
    roar.connect(roarFilter).connect(roarGain).connect(this.humGain);
    roar.start();
    this.humGain.connect(this.sfxBus);

    this.nextTick = ctx.currentTime + 0.1;
    setInterval(() => this.schedule(), 50);
    this.startAmbience(this.ambience);
  }

  private applyMaster(): void {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : MASTER_LEVEL, this.ctx.currentTime, 0.03);
  }

  /** Look-ahead scheduler for the clockwork ticks and brazier crackle. */
  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const horizon = ctx.currentTime + SCHEDULE_AHEAD;
    while (this.nextTick < horizon) {
      if (this.ambience !== 'none' && this.ambience !== 'ending') {
        const level = this.paused ? 0.02 : this.ambience === 'title' ? 0.035 : 0.05;
        this.noiseHit(this.nextTick, 0.03, level, 'bandpass', this.tock ? 2100 : 3200, 8, { bus: 'ambient' });
        this.tock = !this.tock;
      }
      this.nextTick += TICK_SECONDS;
    }
    if (!this.paused && this.crackleSources > 0 && this.ambience === 'chamber') {
      // About 6 pops a second per burning brazier, randomly spaced.
      const chance = Math.min(0.9, 0.3 * this.crackleSources);
      if (Math.random() < chance) {
        const at = ctx.currentTime + Math.random() * 0.05;
        this.noiseHit(at, 0.02 + Math.random() * 0.03, 0.05 + Math.random() * 0.06, 'highpass', 1500 + Math.random() * 2500, 0.8, {
          bus: 'ambient',
        });
      }
    }
  }

  // ---- voices -----------------------------------------------------------

  private tone(
    freq: number,
    type: OscillatorType,
    t: number,
    dur: number,
    peak: number,
    opts: { attack?: number; freqEnd?: number; filter?: number } = {},
  ): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opts.freqEnd) o.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + dur);
    envelope(g.gain, t, opts.attack ?? 0.01, peak, dur);
    let out: AudioNode = o;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      out = out.connect(f);
    }
    out.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseHit(
    t: number,
    dur: number,
    peak: number,
    filterType: BiquadFilterType,
    freq: number,
    q: number,
    opts: { freqEnd?: number; bus?: 'ambient' | 'sfx' } = {},
  ): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(freq, t);
    if (opts.freqEnd) f.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    envelope(g.gain, t, 0.003, peak, dur);
    src.connect(f).connect(g).connect(opts.bus === 'ambient' ? this.ambientBus : this.sfxBus);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  /** Glassy bell: inharmonic sine partials with staggered decays. */
  private bell(freq: number, t: number, peak: number): void {
    const partials: [number, number, number][] = [
      [1, 1, 1.6],
      [2.76, 0.45, 1],
      [5.4, 0.22, 0.6],
      [8.93, 0.1, 0.35],
    ];
    for (const [ratio, gain, decay] of partials) this.tone(freq * ratio, 'sine', t, decay, peak * gain, { attack: 0.003 });
  }

  /** Swells in exponentially over `dur` and stops abruptly: a tone played backwards. */
  private reverse(freq: number, t: number, dur: number, peak: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.03, t);
    o.frequency.linearRampToValueAtTime(freq, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.04);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.08);
  }

  /** Slow chord: `attack` seconds in, held, then released over `release` seconds. */
  private pad(freqs: readonly number[], t: number, attack: number, release: number, peak: number): void {
    const ctx = this.ctx!;
    for (const f of freqs) {
      for (const detune of [-6, 6]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        o.detune.value = detune;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak / 2, t + attack);
        g.gain.setTargetAtTime(0, t + attack, release / 3);
        o.connect(g).connect(this.sfxBus);
        o.start(t);
        o.stop(t + attack + release * 2);
      }
    }
  }
}

/** Fast attack to `peak`, then an exponential fall to silence over `dur`. */
function envelope(param: AudioParam, t: number, attack: number, peak: number, dur: number): void {
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  param.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.01));
}

/** The one engine shared by every scene. */
export const audio = new AudioEngine();
