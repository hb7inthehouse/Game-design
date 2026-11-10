// All sound is synthesized with WebAudio: cab hum, motor, bells, doors, drones and stingers.
import { Save } from './save';

type Bus = 'sfx' | 'amb';

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  private noiseBuf!: AudioBuffer;
  private motorGain!: GainNode;
  private motorOsc!: OscillatorNode;
  private motorNoiseGain!: GainNode;
  private motorFilter!: BiquadFilterNode;
  private buzzGain!: GainNode;
  private humGain!: GainNode;
  private droneGains: GainNode[] = [];
  private droneOscs: OscillatorNode[] = [];
  private rainGain!: GainNode;
  private ringTimer: number | null = null;
  private musicTimer: number | null = null;
  private musicGain!: GainNode;
  muted = false;

  init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    this.sfxBus.connect(comp);
    this.ambBus.connect(comp);
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.ambBus);

    // Noise buffer shared by many sounds.
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // Small-room / shaft reverb from a generated impulse.
    this.reverb = ctx.createConvolver();
    const irLen = Math.floor(ctx.sampleRate * 2.6);
    const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c);
      for (let i = 0; i < irLen; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3.2);
    }
    this.reverb.buffer = ir;
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.35;
    this.reverbSend.connect(this.reverb);
    this.reverb.connect(comp);

    this.buildAmbience();
    this.applyVolumes();
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    const s = Save.settings;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : s.master, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfx, t, 0.05);
    this.ambBus.gain.setTargetAtTime(s.ambience, t, 0.05);
  }

  private noise(): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    src.loopStart = Math.random();
    return src;
  }

  private buildAmbience(): void {
    const ctx = this.ctx!;
    // Mains hum of the car.
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0;
    this.humGain.connect(this.ambBus);
    for (const [f, g] of [[55, 0.05], [110, 0.025], [165, 0.008]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const gg = ctx.createGain();
      gg.gain.value = g;
      o.connect(gg).connect(this.humGain);
      o.start();
    }
    // Ventilation fan hiss.
    const fan = this.noise();
    const fanF = ctx.createBiquadFilter();
    fanF.type = 'bandpass';
    fanF.frequency.value = 500;
    fanF.Q.value = 0.6;
    const fanG = ctx.createGain();
    fanG.gain.value = 0.02;
    fan.connect(fanF).connect(fanG).connect(this.humGain);
    fan.start();
    // Light fixture buzz.
    this.buzzGain = ctx.createGain();
    this.buzzGain.gain.value = 0.004;
    const buzz = ctx.createOscillator();
    buzz.type = 'square';
    buzz.frequency.value = 120;
    const buzzF = ctx.createBiquadFilter();
    buzzF.type = 'bandpass';
    buzzF.frequency.value = 2400;
    buzzF.Q.value = 3;
    buzz.connect(buzzF).connect(this.buzzGain).connect(this.humGain);
    buzz.start();

    // Motor: saw + rumble noise, gain follows car speed.
    this.motorGain = ctx.createGain();
    this.motorGain.gain.value = 0;
    this.motorFilter = ctx.createBiquadFilter();
    this.motorFilter.type = 'lowpass';
    this.motorFilter.frequency.value = 260;
    this.motorOsc = ctx.createOscillator();
    this.motorOsc.type = 'sawtooth';
    this.motorOsc.frequency.value = 46;
    this.motorOsc.connect(this.motorFilter);
    const rumble = this.noise();
    const rumbleF = ctx.createBiquadFilter();
    rumbleF.type = 'lowpass';
    rumbleF.frequency.value = 180;
    this.motorNoiseGain = ctx.createGain();
    this.motorNoiseGain.gain.value = 0;
    rumble.connect(rumbleF).connect(this.motorNoiseGain).connect(this.ambBus);
    this.motorFilter.connect(this.motorGain).connect(this.ambBus);
    this.motorOsc.start();
    rumble.start();

    // Rain heard through the lobby doors (only when they're visible).
    const rain = this.noise();
    const rainF = ctx.createBiquadFilter();
    rainF.type = 'highpass';
    rainF.frequency.value = 1800;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    rain.connect(rainF).connect(this.rainGain).connect(this.ambBus);
    rain.start();

    // Unease drones, faded in per act.
    const drones: [number, number][] = [[73.4, 77.8], [49, 51.9], [36.7, 38.9]];
    for (const [a, b] of drones) {
      const g = ctx.createGain();
      g.gain.value = 0;
      for (const f of [a, b]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.05 + Math.random() * 0.08;
        const lfoG = ctx.createGain();
        lfoG.gain.value = 1.5;
        lfo.connect(lfoG).connect(o.frequency);
        lfo.start();
        o.connect(g);
        o.start();
        this.droneOscs.push(o);
      }
      g.connect(this.ambBus);
      g.connect(this.reverbSend);
      this.droneGains.push(g);
    }
  }

  setAmbience(on: boolean): void {
    if (!this.ctx) return;
    this.humGain.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.6);
  }

  setDrone(level: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.droneGains.forEach((g, i) => {
      const v = level > i ? Math.min(1, level - i) * 0.05 : 0;
      g.gain.setTargetAtTime(v, t, 2.5);
    });
  }

  setRain(v: number): void {
    if (!this.ctx) return;
    this.rainGain.gain.setTargetAtTime(v * 0.03, this.ctx.currentTime, 0.4);
  }

  setMotor(speed: number, corrupt = 0): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = Math.min(1, Math.abs(speed));
    this.motorGain.gain.setTargetAtTime(s * 0.11, t, 0.15);
    this.motorNoiseGain.gain.setTargetAtTime(s * 0.08, t, 0.15);
    this.motorOsc.frequency.setTargetAtTime(38 + s * 22 - corrupt * 10, t, 0.3);
    this.motorFilter.frequency.setTargetAtTime(160 + s * 220, t, 0.3);
  }

  setBuzz(level: number): void {
    if (!this.ctx) return;
    this.buzzGain.gain.setTargetAtTime(0.002 + level * 0.012, this.ctx.currentTime, 0.02);
  }

  private env(g: GainNode, t: number, a: number, peak: number, d: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  private out(bus: Bus, wet = 0): AudioNode {
    const g = this.ctx!.createGain();
    g.connect(bus === 'sfx' ? this.sfxBus : this.ambBus);
    if (wet > 0) {
      const w = this.ctx!.createGain();
      w.gain.value = wet;
      g.connect(w).connect(this.reverbSend);
    }
    return g;
  }

  ding(corrupt = 0): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const base = 1046 * Math.pow(2, -corrupt * 0.12);
    const o = this.out('sfx', 0.8);
    for (const [r, a] of [[1, 0.18], [2.76, 0.06], [5.4, 0.025], [1.003 + corrupt * 0.04, 0.1]] as const) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = base * r;
      const g = this.ctx.createGain();
      this.env(g, t, 0.004, a, 1.8);
      osc.connect(g).connect(o);
      osc.start(t);
      osc.stop(t + 2);
    }
  }

  click(pitch = 1): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);
    const g = this.ctx.createGain();
    this.env(g, t, 0.001, 0.05, 0.04);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 3000;
    osc.connect(f).connect(g).connect(this.out('sfx', 0.1));
    osc.start(t);
    osc.stop(t + 0.08);
    this.thump(0.03, 140);
  }

  thump(vol = 0.2, freq = 70, dur = 0.25, wet = 0.2): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(freq * 1.6, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
    const g = this.ctx.createGain();
    this.env(g, t, 0.003, vol, dur);
    osc.connect(g).connect(this.out('sfx', wet));
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  noiseBurst(dur: number, freq: number, vol: number, type: BiquadFilterType = 'bandpass', q = 1, wet = 0.2, attack = 0.01): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const n = this.noise();
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    this.env(g, t, attack, vol, dur);
    n.connect(f).connect(g).connect(this.out('sfx', wet));
    n.start(t);
    n.stop(t + attack + dur + 0.05);
  }

  door(opening: boolean): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const n = this.noise();
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2;
    f.frequency.setValueAtTime(opening ? 220 : 320, t);
    f.frequency.linearRampToValueAtTime(opening ? 340 : 200, t + 0.9);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.12);
    g.gain.setValueAtTime(0.12, t + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    n.connect(f).connect(g).connect(this.out('sfx', 0.15));
    n.start(t);
    n.stop(t + 1);
    window.setTimeout(() => this.thump(opening ? 0.08 : 0.16, opening ? 90 : 60, 0.18), 880);
  }

  step(vol = 0.05): void {
    this.noiseBurst(0.06, 900 + Math.random() * 400, vol, 'bandpass', 1.4, 0.15, 0.002);
    this.thump(vol * 0.8, 90, 0.08, 0.1);
  }

  blip(pitch: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = pitch * (0.97 + Math.random() * 0.06);
    const g = this.ctx.createGain();
    this.env(g, t, 0.002, 0.025, 0.05);
    osc.connect(g).connect(this.out('sfx'));
    osc.start(t);
    osc.stop(t + 0.07);
  }

  knock(n = 3, vol = 0.3): void {
    for (let i = 0; i < n; i++) {
      window.setTimeout(() => {
        this.thump(vol, 85, 0.22, 0.5);
        this.noiseBurst(0.05, 400, vol * 0.4, 'lowpass', 1, 0.4, 0.002);
      }, i * 260 + Math.random() * 40);
    }
  }

  creak(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    const base = 180 + Math.random() * 120;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.linearRampToValueAtTime(base * (0.7 + Math.random() * 0.6), t + 0.8);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(f).connect(g).connect(this.out('amb', 0.6));
    osc.start(t);
    osc.stop(t + 1);
  }

  buzzer(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 220;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.04, t + 0.01);
    g.gain.setValueAtTime(0.04, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    osc.connect(f).connect(g).connect(this.out('sfx', 0.2));
    osc.start(t);
    osc.stop(t + 0.45);
  }

  alarm(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 14; i++) {
      const tt = t + i * 0.07;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 1400;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.06, tt + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.06);
      osc.connect(g).connect(this.out('sfx', 0.5));
      osc.start(tt);
      osc.stop(tt + 0.08);
    }
  }

  startRing(): void {
    this.stopRing();
    const ring = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 20; i++) {
        const tt = t + i * 0.05;
        for (const f of [440, 480]) {
          const osc = this.ctx.createOscillator();
          osc.frequency.value = f * 2;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.0001, tt);
          g.gain.exponentialRampToValueAtTime(0.025, tt + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.045);
          osc.connect(g).connect(this.out('sfx', 0.3));
          osc.start(tt);
          osc.stop(tt + 0.05);
        }
      }
    };
    ring();
    this.ringTimer = window.setInterval(ring, 3000);
  }

  stopRing(): void {
    if (this.ringTimer !== null) window.clearInterval(this.ringTimer);
    this.ringTimer = null;
  }

  whisper(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const n = this.noise();
    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.Q.value = 9;
    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.Q.value = 7;
    const formants = [[700, 1200], [400, 2300], [600, 900], [300, 2600], [500, 1500]];
    let tt = t;
    for (let i = 0; i < 6; i++) {
      const [a, b] = formants[Math.floor(Math.random() * formants.length)];
      f1.frequency.setTargetAtTime(a, tt, 0.04);
      f2.frequency.setTargetAtTime(b, tt, 0.04);
      tt += 0.12 + Math.random() * 0.12;
    }
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.2);
    g.gain.setValueAtTime(0.09, tt - 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, tt);
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = Math.random() < 0.5 ? -0.7 : 0.7;
    n.connect(f1);
    n.connect(f2);
    f1.connect(g);
    f2.connect(g);
    g.connect(pan).connect(this.out('sfx', 0.7));
    n.start(t);
    n.stop(tt + 0.1);
  }

  stinger(big = false): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.out('sfx', 0.6);
    const freqs = big ? [92, 97.5, 138, 146, 196, 207.6, 293] : [110, 116.5, 164.8];
    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * (big ? 0.92 : 0.97), t + 1.4);
      const g = this.ctx.createGain();
      this.env(g, t, big ? 0.005 : 0.3, big ? 0.07 : 0.03, big ? 1.4 : 2.2);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = big ? 2400 : 900;
      osc.connect(lp).connect(g).connect(o);
      osc.start(t);
      osc.stop(t + 2.6);
    }
    if (big) {
      this.noiseBurst(0.6, 1500, 0.35, 'bandpass', 0.5, 0.6, 0.002);
      this.thump(0.5, 50, 0.8, 0.5);
    }
  }

  swell(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const n = this.noise();
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 3;
    f.frequency.setValueAtTime(200, t);
    f.frequency.exponentialRampToValueAtTime(2200, t + 2.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 2.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    n.connect(f).connect(g).connect(this.out('sfx', 0.5));
    n.start(t);
    n.stop(t + 2.7);
  }

  water(): void {
    this.noiseBurst(0.5, 700, 0.06, 'bandpass', 4, 0.6, 0.05);
    window.setTimeout(() => this.noiseBurst(0.3, 1100, 0.04, 'bandpass', 6, 0.6, 0.02), 300);
  }

  /** Sparse, reverberant piano-like notes for the title and endings. */
  startMusic(mood: 'title' | 'dawn' | 'dark' = 'title'): void {
    this.stopMusic();
    if (!this.ctx) return;
    this.musicGain.gain.setTargetAtTime(1, this.ctx.currentTime, 1);
    const scales: Record<string, number[]> = {
      title: [220, 261.6, 293.7, 329.6, 349.2, 440, 523.3, 196],
      dawn: [261.6, 329.6, 392, 440, 523.3, 587.3, 659.3],
      dark: [110, 116.5, 146.8, 155.6, 220, 233.1],
    };
    const notes = scales[mood];
    let i = 0;
    const play = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const f = notes[(i * 5 + (i % 3) * 2) % notes.length] * (Math.random() < 0.2 ? 0.5 : 1);
      i++;
      for (const [r, a] of [[1, 0.06], [2, 0.02], [3, 0.008]] as const) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f * r;
        const g = this.ctx.createGain();
        this.env(g, t, 0.006, a, 3.2);
        osc.connect(g);
        g.connect(this.musicGain);
        g.connect(this.reverbSend);
        osc.start(t);
        osc.stop(t + 3.4);
      }
      this.musicTimer = window.setTimeout(play, 1100 + Math.random() * 1900);
    };
    play();
  }

  stopMusic(): void {
    if (this.musicTimer !== null) window.clearTimeout(this.musicTimer);
    this.musicTimer = null;
    if (this.ctx) this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.8);
  }

  stopAll(): void {
    this.stopRing();
    this.setMotor(0);
    this.setDrone(0);
    this.setRain(0);
  }
}

export const Sound = new AudioEngine();
