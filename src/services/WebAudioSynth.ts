import type { AudioCue, AudioOutput, HazardSound, MusicTrack } from './AudioService';

type Wave = OscillatorType;
type Note = number | null;

/** Original 32-step melodies. Numbers are semitones above each track's tonic. */
const BASE_MELODY: Note[] = [0, null, 7, null, 10, 7, 5, null, 3, null, 7, null, 12, 10, 7, null,
  5, null, 10, null, 12, 10, 7, null, 3, null, 5, 7, 0, null, null, null];
const ARCADE_MELODY: Note[] = [0, 7, 12, 7, 10, 7, 5, 7, 3, 7, 10, 12, 15, 12, 10, 7,
  5, 12, 17, 12, 15, 12, 10, 7, 3, 7, 10, 7, 0, 3, 5, 7];

const midiHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Small browser-native synthesizer. No external audio files, URLs, or copyrighted samples. */
export class WebAudioSynth implements AudioOutput {
  private context: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextMusicAt = 0;
  private musicStep = 0;
  private track: MusicTrack = null;
  private requestedTrack: MusicTrack = null;
  private musicVolume = 0;
  private hazard: HazardSound = null;
  private hazardVolume = 0;
  private hazardBus: GainNode | null = null;
  private hazardOscillators: OscillatorNode[] = [];
  private suspended = false;
  private unlocked = false;
  private destroyed = false;
  private cleanupTimers = new Set<ReturnType<typeof setTimeout>>();
  private cueCounts: Record<string, number> = {};

  async unlock(): Promise<boolean> {
    if (this.destroyed) return false;
    if (!this.context) {
      const Constructor = globalThis.AudioContext;
      if (!Constructor) return false;
      try { this.context = new Constructor(); }
      catch { return false; }
    }
    try {
      await this.context.resume();
      this.unlocked = this.context.state === 'running';
      if (this.unlocked) {
        this.setMusic(this.requestedTrack, this.musicVolume);
        this.setHazard(this.hazard, this.hazardVolume);
        if (this.suspended) this.setSuspended(true);
      }
      return this.unlocked;
    } catch { return false; }
  }

  setMusic(track: MusicTrack, volume: number): void {
    this.requestedTrack = track;
    this.musicVolume = Math.max(0, Math.min(1, volume));
    const ctx = this.context;
    if (!ctx || !this.unlocked || this.destroyed) return;
    if (this.track === track && this.musicBus) {
      this.musicBus.gain.setTargetAtTime(this.musicVolume, ctx.currentTime, 0.08);
      return;
    }
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (this.musicBus) {
      const old = this.musicBus;
      old.gain.setTargetAtTime(0, ctx.currentTime, 0.07);
      this.after(500, () => { try { old.disconnect(); } catch { /* already disposed */ } });
    }
    this.musicBus = null;
    this.track = track;
    if (!track) return;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, ctx.currentTime);
    bus.gain.setTargetAtTime(this.musicVolume, ctx.currentTime, 0.1);
    bus.connect(ctx.destination);
    this.musicBus = bus;
    this.musicStep = 0;
    this.nextMusicAt = ctx.currentTime + 0.03;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 75);
    this.scheduleMusic();
  }

  setHazard(hazard: HazardSound, volume: number): void {
    const ctx = this.context;
    this.hazardVolume = Math.max(0, Math.min(1, volume));
    if (!ctx || !this.unlocked || this.destroyed) { this.hazard = hazard; return; }
    if (this.hazard === hazard && this.hazardBus) {
      this.hazardBus.gain.setTargetAtTime(this.hazardVolume, ctx.currentTime, 0.08);
      return;
    }
    if (this.hazardBus) {
      const old = this.hazardBus;
      const oldOscillators = this.hazardOscillators;
      old.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      this.after(320, () => { oldOscillators.forEach((osc) => { try { osc.stop(); } catch { /* stopped */ } }); old.disconnect(); });
    }
    this.hazard = hazard;
    this.hazardBus = null;
    this.hazardOscillators = [];
    if (!hazard) return;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, ctx.currentTime);
    bus.gain.setTargetAtTime(this.hazardVolume, ctx.currentTime, 0.1);
    bus.connect(ctx.destination);
    const drone = ctx.createOscillator();
    drone.type = hazard === 'storm' ? 'sawtooth' : 'triangle';
    drone.frequency.value = hazard === 'storm' ? 72 : 170;
    const voice = ctx.createGain();
    voice.gain.value = hazard === 'storm' ? 0.12 : 0.09;
    drone.connect(voice).connect(bus);
    const tremolo = ctx.createOscillator();
    tremolo.frequency.value = hazard === 'storm' ? 3 : 5;
    const depth = ctx.createGain();
    depth.gain.value = hazard === 'storm' ? 0.06 : 0.035;
    tremolo.connect(depth).connect(voice.gain);
    drone.start(); tremolo.start();
    this.hazardOscillators = [drone, tremolo];
    this.hazardBus = bus;
  }

  setSuspended(suspended: boolean): void {
    if (this.suspended === suspended && (!suspended || this.context?.state === 'suspended')) return;
    this.suspended = suspended;
    if (!this.context || !this.unlocked || this.destroyed) return;
    try {
      if (suspended) void this.context.suspend().catch(() => {});
      else void this.context.resume().catch(() => {});
    } catch { /* Audio errors never block gameplay. */ }
  }

  play(cue: AudioCue, volume: number): void {
    const ctx = this.context;
    if (!ctx || !this.unlocked || this.suspended || this.destroyed || volume <= 0) return;
    const at = ctx.currentTime + 0.003;
    const bus = ctx.createGain();
    bus.gain.value = Math.min(1, volume);
    bus.connect(ctx.destination);
    try {
      this.synthesizeCue(cue, bus, at);
      this.cueCounts[cue] = (this.cueCounts[cue] ?? 0) + 1;
      this.after(850, () => bus.disconnect());
    } catch { bus.disconnect(); /* Missing WebAudio capability is non-fatal. */ }
  }

  private scheduleMusic(): void {
    const ctx = this.context;
    const bus = this.musicBus;
    const track = this.track;
    if (!ctx || !bus || !track || this.destroyed) return;
    const arcade = track === 'arcade';
    const stepSeconds = 60 / (arcade ? 152 : 108) / 2;
    const melody = arcade ? ARCADE_MELODY : BASE_MELODY;
    while (this.nextMusicAt < ctx.currentTime + 0.26) {
      const step = this.musicStep % melody.length;
      const note = melody[step];
      if (note !== null) this.tone(bus, midiHz((arcade ? 69 : 62) + note), midiHz((arcade ? 69 : 62) + note),
        arcade ? stepSeconds * 0.72 : stepSeconds * 0.8, arcade ? 'square' : 'triangle', arcade ? 0.095 : 0.13, this.nextMusicAt);
      if (step % 4 === 0) {
        const bass = arcade ? [45, 43, 41, 43][Math.floor(step / 8) % 4] : [38, 36, 41, 36][Math.floor(step / 8) % 4];
        this.tone(bus, midiHz(bass), midiHz(bass), stepSeconds * (arcade ? 2.7 : 3.2), 'triangle', arcade ? 0.19 : 0.14, this.nextMusicAt);
      }
      if (arcade && step % 2 === 1) this.tone(bus, midiHz(81), midiHz(81), 0.035, 'square', 0.03, this.nextMusicAt);
      if (!arcade && step % 8 === 6) this.tone(bus, midiHz(86), midiHz(86), 0.1, 'sine', 0.055, this.nextMusicAt);
      this.musicStep++;
      this.nextMusicAt += stepSeconds;
    }
  }

  private tone(bus: AudioNode, start: number, end: number, duration: number, wave: Wave, level: number, at: number): void {
    const ctx = this.context!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(Math.max(20, start), at);
    if (start !== end) osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + duration);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(Math.max(0.0002, level), at + Math.min(0.018, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain).connect(bus);
    osc.start(at);
    osc.stop(at + duration + 0.005);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  private synthesizeCue(cue: AudioCue, bus: GainNode, at: number): void {
    const t = (a: number, b: number, d: number, w: Wave = 'square', v = 0.2, offset = 0) =>
      this.tone(bus, a, b, d, w, v, at + offset);
    switch (cue) {
      case 'footstep': t(110, 70, 0.055, 'triangle', 0.085); break;
      case 'thruster': t(80, 62, 0.16, 'sawtooth', 0.075); break;
      case 'laser': t(880, 260, 0.11, 'square', 0.16); break;
      case 'enemyHit': t(370, 180, 0.08, 'triangle', 0.16); break;
      case 'enemyDefeat': t(240, 90, 0.16, 'sawtooth', 0.16); break;
      case 'pickup': t(660, 990, 0.07, 'square', 0.18); t(990, 1320, 0.09, 'triangle', 0.12, 0.07); break;
      case 'damage': t(190, 65, 0.24, 'sawtooth', 0.22); break;
      case 'launch': t(220, 440, 0.2, 'sawtooth', 0.13); t(440, 660, 0.2, 'square', 0.11, 0.14); break;
      case 'return': t(660, 330, 0.18, 'triangle', 0.17); break;
      case 'missionSuccess': case 'newRecord':
        [523, 659, 784, 1047].forEach((f, i) => t(f, f, 0.18, i % 2 ? 'square' : 'triangle', 0.14, i * 0.09)); break;
      case 'missionFailure': case 'gameOver':
        [392, 330, 262].forEach((f, i) => t(f, f * 0.85, 0.22, 'triangle', 0.14, i * 0.12)); break;
      case 'stormAlarm': case 'leakAlarm':
        [0, 0.22, 0.44].forEach((offset) => t(cue === 'stormAlarm' ? 740 : 520,
          cue === 'stormAlarm' ? 530 : 380, 0.17, 'square', 0.16, offset)); break;
      case 'countdown': t(720, 620, 0.1, 'square', 0.12); break;
      case 'stormDanger': case 'leakDanger': t(280, 110, 0.3, 'sawtooth', 0.17); break;
      case 'emergencyClear': case 'repair': t(390, 560, 0.12, 'triangle', 0.15); t(560, 780, 0.13, 'square', 0.1, 0.12); break;
      case 'eat': t(260, 330, 0.08, 'triangle', 0.12); t(390, 430, 0.08, 'triangle', 0.11, 0.09); break;
      case 'refill': t(250, 720, 0.34, 'sine', 0.14); break;
      case 'recycle': t(220, 440, 0.16, 'triangle', 0.13); t(440, 660, 0.18, 'square', 0.11, 0.14); break;
      case 'rest': t(523, 392, 0.32, 'triangle', 0.12); break;
      case 'plant': t(270, 360, 0.1, 'triangle', 0.12); t(440, 510, 0.1, 'square', 0.09, 0.1); break;
      case 'harvest': case 'podCollect': t(440, 660, 0.11, 'square', 0.17); t(660, 880, 0.15, 'triangle', 0.13, 0.1); break;
      case 'solar': t(650, 880, 0.16, 'sine', 0.12); break;
      case 'shield': t(180, 440, 0.32, 'triangle', 0.15); break;
      case 'podArrive': t(600, 290, 0.35, 'triangle', 0.12); break;
      case 'enter': case 'exit': t(cue === 'enter' ? 430 : 320, cue === 'enter' ? 310 : 450, 0.13, 'square', 0.11); break;
      case 'invalid': t(300, 180, 0.13, 'square', 0.15); break;
      case 'uiClose': t(420, 320, 0.065, 'square', 0.09); break;
      case 'uiOpen': t(320, 460, 0.065, 'square', 0.09); break;
      case 'confirm': t(450, 650, 0.09, 'triangle', 0.12); break;
    }
  }

  private after(milliseconds: number, callback: () => void): void {
    const timer = setTimeout(() => { this.cleanupTimers.delete(timer); callback(); }, milliseconds);
    this.cleanupTimers.add(timer);
  }

  debug() { return { unlocked: this.unlocked, track: this.track, hazard: this.hazard,
    activeMusicTracks: this.musicBus ? 1 : 0, cueCounts: { ...this.cueCounts } }; }

  dispose(): void {
    this.destroyed = true;
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.cleanupTimers.forEach(clearTimeout);
    this.cleanupTimers.clear();
    this.hazardOscillators.forEach((osc) => { try { osc.stop(); } catch { /* stopped */ } });
    this.hazardOscillators = [];
    this.musicBus?.disconnect();
    this.hazardBus?.disconnect();
    this.musicBus = null;
    this.hazardBus = null;
    try { void this.context?.close().catch(() => {}); } catch { /* unavailable */ }
    this.context = null;
  }
}
