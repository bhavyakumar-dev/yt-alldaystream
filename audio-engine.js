// ==========================================================================
// StreamCraft 24/7 Audio Engine (Web Audio API)
// ==========================================================================
// Generates:
// 1. Silent Carrier Track: keeps RTMP/WebRTC encoders happy with zero audible sound
// 2. Generative Ambient Synth: royalty-free soothing procedural ambient pads
// 3. Microphone / Input Capture: passes through external audio

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.destination = null;
    this.masterGain = null;
    this.analyser = null;
    this.mode = 'silent'; // 'silent', 'lofi', 'mic'
    this.volume = 0.8;
    this.activeNodes = [];
    this.ambientInterval = null;
    this.micStream = null;
    this.micSourceNode = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.destination = this.ctx.createMediaStreamDestination();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;

    this.masterGain.connect(this.destination);
    this.masterGain.connect(this.analyser);
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  setVolume(fraction) {
    this.volume = Math.max(0, Math.min(1, fraction));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  getAudioTrack() {
    this.init();
    const tracks = this.destination.stream.getAudioTracks();
    return tracks[0] || null;
  }

  async setMode(mode) {
    this.init();
    await this.resume();
    this.stopCurrentGenerators();
    this.mode = mode;

    if (mode === 'silent') {
      this.startSilentCarrier();
    } else if (mode === 'lofi') {
      this.startAmbientSynth();
    } else if (mode === 'mic') {
      await this.startMicCapture();
    }
  }

  stopCurrentGenerators() {
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
    this.activeNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];

    if (this.micSourceNode) {
      try { this.micSourceNode.disconnect(); } catch (e) {}
      this.micSourceNode = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
  }

  // Silent carrier track (inaudible sine / buffer loop)
  startSilentCarrier() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    // Fill with virtually silent dither/white noise (1e-6) so encoders recognize active audio signal
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.00001;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const silentGain = this.ctx.createGain();
    silentGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    source.connect(silentGain);
    silentGain.connect(this.masterGain);
    source.start(0);

    this.activeNodes.push(source, silentGain);
  }

  // Generative procedural ambient chord synth
  startAmbientSynth() {
    if (!this.ctx) return;

    // Peaceful pentatonic scales: F minor / Ab major warm chords
    // F2, Ab2, C3, Eb3, F3, G3, Ab3, C4, Eb4
    const baseFreqs = [87.31, 103.83, 130.81, 155.56, 174.61, 196.0, 207.65, 261.63, 311.13];

    const playRandomChord = () => {
      if (this.mode !== 'lofi' || !this.ctx) return;
      const now = this.ctx.currentTime;
      const chordNotes = [
        baseFreqs[Math.floor(Math.random() * 3)],
        baseFreqs[2 + Math.floor(Math.random() * 3)],
        baseFreqs[4 + Math.floor(Math.random() * 4)]
      ];

      chordNotes.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450 + Math.random() * 300, now);

        // Soft attack, long sustain, gentle release (6-8 seconds)
        const duration = 7 + Math.random() * 3;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 2.5);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration + 0.5);
      });
    };

    playRandomChord();
    this.ambientInterval = setInterval(playRandomChord, 6000);
  }

  async startMicCapture() {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.micSourceNode = this.ctx.createMediaStreamSource(this.micStream);
      this.micSourceNode.connect(this.masterGain);
    } catch (err) {
      console.warn("Could not access microphone, falling back to silent carrier:", err);
      this.startSilentCarrier();
    }
  }

  getLevel() {
    if (!this.analyser) return 0;
    const array = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(array);
    let sum = 0;
    for (let i = 0; i < array.length; i++) {
      sum += array[i];
    }
    const avg = sum / array.length;
    return Math.min(100, Math.round((avg / 128) * 100));
  }
}

window.AudioEngine = AudioEngine;
