// Native Web Audio API Synthesizer for offline ambient soundscapes

export type AmbientTrackId = "rain" | "cafe" | "forest" | "white_noise" | "keyboard" | "ocean";

export interface AmbientSoundConfig {
  id: AmbientTrackId;
  name: string;
  icon: string;
  description: string;
}

export const AMBIENT_SOUNDS: AmbientSoundConfig[] = [
  { id: "rain", name: "Rain", icon: "CloudRain", description: "Gentle steady rainfall on window" },
  { id: "cafe", name: "Cafe", icon: "Coffee", description: "Subtle coffeehouse murmur & atmosphere" },
  { id: "forest", name: "Forest", icon: "Trees", description: "Calm breeze through tree leaves" },
  { id: "white_noise", name: "White Noise", icon: "Radio", description: "Deep focus broadband noise mask" },
  { id: "keyboard", name: "Keyboard", icon: "Keyboard", description: "Mechanical keystrokes rhythm" },
  { id: "ocean", name: "Ocean", icon: "Waves", description: "Slow rolling shoreline ocean waves" },
];

class WebAudioSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private currentTrack: AmbientTrackId = "rain";
  private activeNodes: (AudioNode | number)[] = [];
  private volume: number = 0.5;

  private initContext() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTrack(): AmbientTrackId {
    return this.currentTrack;
  }

  public stop() {
    this.cleanupNodes();
    this.isPlaying = false;
  }

  private cleanupNodes() {
    this.activeNodes.forEach((node) => {
      if (typeof node === "number") {
        clearInterval(node);
      } else {
        try {
          if ("stop" in node && typeof (node as AudioScheduledSourceNode).stop === "function") {
            (node as AudioScheduledSourceNode).stop();
          }
          node.disconnect();
        } catch {
          // ignore disconnect errors
        }
      }
    });
    this.activeNodes = [];
  }

  public play(track: AmbientTrackId = this.currentTrack) {
    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;

    this.stop();
    this.currentTrack = track;
    this.isPlaying = true;

    switch (track) {
      case "rain":
        this.synthesizeRain(ctx, this.masterGain);
        break;
      case "ocean":
        this.synthesizeOcean(ctx, this.masterGain);
        break;
      case "forest":
        this.synthesizeForest(ctx, this.masterGain);
        break;
      case "white_noise":
        this.synthesizeNoise(ctx, this.masterGain, "white");
        break;
      case "cafe":
        this.synthesizeCafe(ctx, this.masterGain);
        break;
      case "keyboard":
        this.synthesizeKeyboard(ctx, this.masterGain);
        break;
    }
  }

  private createNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink / brown noise smoothing
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain compensation
    }
    return buffer;
  }

  private synthesizeRain(ctx: AudioContext, dest: GainNode) {
    const noiseBuffer = this.createNoiseBuffer(ctx, 4);
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, ctx.currentTime);

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(250, ctx.currentTime);

    source.connect(filter);
    filter.connect(highpass);
    highpass.connect(dest);

    source.start(0);
    this.activeNodes.push(source, filter, highpass);
  }

  private synthesizeOcean(ctx: AudioContext, dest: GainNode) {
    const noiseBuffer = this.createNoiseBuffer(ctx, 5);
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.setValueAtTime(1.5, ctx.currentTime);

    // LFO for wave motion
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // Wave every ~8 seconds

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(400, ctx.currentTime);

    filter.frequency.setValueAtTime(500, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(dest);

    source.start(0);
    lfo.start(0);
    this.activeNodes.push(source, filter, lfo, lfoGain);
  }

  private synthesizeForest(ctx: AudioContext, dest: GainNode) {
    const noiseBuffer = this.createNoiseBuffer(ctx, 4);
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.2, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(180, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(dest);

    source.start(0);
    lfo.start(0);
    this.activeNodes.push(source, filter, lfo, lfoGain);
  }

  private synthesizeNoise(ctx: AudioContext, dest: GainNode, type: "white" | "pink") {
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, ctx.currentTime);

    source.connect(filter);
    filter.connect(dest);
    source.start(0);
    this.activeNodes.push(source, filter);
  }

  private synthesizeCafe(ctx: AudioContext, dest: GainNode) {
    // Murmur noise
    const noiseBuffer = this.createNoiseBuffer(ctx, 4);
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(450, ctx.currentTime);
    filter.Q.setValueAtTime(0.8, ctx.currentTime);

    source.connect(filter);
    filter.connect(dest);
    source.start(0);
    this.activeNodes.push(source, filter);
  }

  private synthesizeKeyboard(ctx: AudioContext, dest: GainNode) {
    // Keystroke clicks triggered periodically
    const intervalId = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      const freq = 120 + Math.random() * 280;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    }, 280);

    this.activeNodes.push(intervalId as unknown as number);
  }
}

export const audioSynth = new WebAudioSynth();
