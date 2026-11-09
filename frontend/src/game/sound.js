const IDLE_RPM = 850;
const GEAR_SHIFT_MPH = [9, 17, 40];

// LS firing order 1-8-7-2-6-5-4-3: odd cylinders on the left bank, even on the right.
// The cross-plane crank fires each bank unevenly, which gives the V8 its burble.
const FIRING_BANKS = ['L', 'R', 'L', 'R', 'R', 'L', 'R', 'L'];
// Per-cylinder combustion strength; uneven like a big cam at low RPM
const CYLINDER_STRENGTH = [1.0, 0.92, 0.84, 1.0, 0.9, 0.97, 0.8, 0.95];

// One engine cycle (720° of crank) of exhaust pressure, turned into a PeriodicWave
function buildV8CycleWave(ctx, harmonics = 128) {
  const N = 2048;
  const slot = N / 8; // 90° of crank between firings
  const cycle = new Float32Array(N);
  for (let i = 0; i < 8; i++) {
    const isRight = FIRING_BANKS[i] === 'R';
    const amp = (isRight ? 0.72 : 1.0) * CYLINDER_STRENGTH[i];
    const start = i * slot + (isRight ? 20 : 0); // Longer pipe run on the far bank
    for (let k = 0; k < 220; k++) {
      // Sharp pressure pulse followed by a softer rarefaction
      const p = (k / 28) * Math.exp(1 - k / 28);
      const r = k > 60 ? ((k - 60) / 50) * Math.exp(1 - (k - 60) / 50) : 0;
      cycle[(start + k) % N] += amp * (p - 0.35 * r);
    }
  }

  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let h = 1; h <= harmonics; h++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * h * n) / N;
      re += cycle[n] * Math.cos(angle);
      im += cycle[n] * Math.sin(angle);
    }
    real[h] = (2 / N) * re;
    imag[h] = (2 / N) * im;
  }
  return ctx.createPeriodicWave(real, imag);
}

function buildSoftClipCurve(k) {
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.tireNoise = null;
    this.tireGain = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Procedural cammed LS V8: one oscillator period = one engine cycle (720° of crank),
      // shaped as 8 uneven exhaust pulses in LS firing order. Frequency = RPM / 120.
      const now = this.ctx.currentTime;
      this.rpm = IDLE_RPM;
      this.lopePhase = 0;
      this.lastEngineUpdate = now;

      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.setPeriodicWave(buildV8CycleWave(this.ctx));
      this.engineOsc.frequency.setValueAtTime(IDLE_RPM / 120, now);

      // Drive into a soft clipper for exhaust grit; more drive under throttle
      this.engineDrive = this.ctx.createGain();
      this.engineDrive.gain.setValueAtTime(1.0, now);
      this.engineShaper = this.ctx.createWaveShaper();
      this.engineShaper.curve = buildSoftClipCurve(2.5);
      this.engineShaper.oversample = '2x';

      // Chest-thump low end
      this.engineThump = this.ctx.createBiquadFilter();
      this.engineThump.type = 'peaking';
      this.engineThump.frequency.setValueAtTime(65, now);
      this.engineThump.Q.setValueAtTime(0.9, now);
      this.engineThump.gain.setValueAtTime(12, now);

      // Exhaust tone; opens up as throttle engages
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(220, now);
      this.engineFilter.Q.setValueAtTime(0.9, now);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.09, now);

      this.engineOsc.connect(this.engineDrive);
      this.engineDrive.connect(this.engineShaper);
      this.engineShaper.connect(this.engineThump);
      this.engineThump.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      // Exhaust rasp: band-passed noise, amplitude-modulated by the same pulse train
      const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
      this.raspNoise = this.ctx.createBufferSource();
      this.raspNoise.buffer = noiseBuffer;
      this.raspNoise.loop = true;
      this.raspFilter = this.ctx.createBiquadFilter();
      this.raspFilter.type = 'bandpass';
      this.raspFilter.frequency.setValueAtTime(420, now);
      this.raspFilter.Q.setValueAtTime(0.8, now);
      this.raspGain = this.ctx.createGain();
      this.raspGain.gain.setValueAtTime(0, now);
      this.raspDepth = this.ctx.createGain();
      this.raspDepth.gain.setValueAtTime(0.025, now);

      this.raspNoise.connect(this.raspFilter);
      this.raspFilter.connect(this.raspGain);
      this.raspGain.connect(this.engineFilter);
      this.engineOsc.connect(this.raspDepth);
      this.raspDepth.connect(this.raspGain.gain);

      this.engineOsc.start();
      this.raspNoise.start();

      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext init failed:', e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.3, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  updateEngine(speedMph, throttle, isBraking) {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const dt = Math.min(0.1, Math.max(0, now - this.lastEngineUpdate));
    this.lastEngineUpdate = now;

    const absSpeed = Math.abs(speedMph);
    const load = Math.abs(throttle);

    // Simple automatic gearbox: RPM climbs through each gear, then drops on the shift
    let gearStart = 0;
    let gearEnd = GEAR_SHIFT_MPH[GEAR_SHIFT_MPH.length - 1];
    for (const shiftMph of GEAR_SHIFT_MPH) {
      gearEnd = shiftMph;
      if (absSpeed < shiftMph) break;
      gearStart = shiftMph;
    }
    const gearFrac = Math.min(1, (absSpeed - gearStart) / (gearEnd - gearStart));
    const speedRpm = absSpeed < 0.5 ? IDLE_RPM : 950 + gearFrac * 1650;
    // Throttle flares the revs, much more so when the tires aren't moving yet
    const targetRpm = Math.max(IDLE_RPM, speedRpm) + load * (absSpeed < 1 ? 900 : 450);
    const rate = targetRpm > this.rpm ? 6 : 3;
    this.rpm += (targetRpm - this.rpm) * (1 - Math.exp(-dt * rate));

    // Cam lope: choppy RPM hunt and stumble at idle, fading out with revs and throttle
    const lopeAmt = Math.min(1, Math.max(0, 1 - (this.rpm - 900) / 900)) * (1 - load * 0.8);
    this.lopePhase = (this.lopePhase + dt * (this.rpm / 120) / 4) % 1000;
    const phase = 2 * Math.PI * this.lopePhase;
    const wobble = 0.6 * Math.sin(phase) + 0.4 * Math.sin(2.03 * phase + 1.3);
    const stumble = Math.pow(Math.max(0, Math.sin(phase + 0.5)), 6);
    const rpmOut = this.rpm + lopeAmt * 70 * wobble;

    this.engineOsc.frequency.setTargetAtTime(rpmOut / 120, now, 0.03);
    this.engineDrive.gain.setTargetAtTime(1.0 + load * 0.8, now, 0.06);
    this.raspDepth.gain.setTargetAtTime(0.025 + load * 0.05, now, 0.06);

    // Exhaust tone opens up with throttle and revs
    const filterFreq = 220 + load * 380 + (this.rpm - IDLE_RPM) * 0.08;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.06);

    const rpmGain = Math.min(this.rpm, 4000) / 4000;
    const targetGain = (0.09 + load * 0.1 + rpmGain * 0.05) * (1 - lopeAmt * 0.4 * stumble);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.03);
  }

  stopEngine() {
    if (!this.isInitialized || !this.ctx || !this.engineGain) return;
    try {
      this.engineGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    } catch {
      // ignore
    }
  }

  playHorn() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(420, now);
    osc2.frequency.setValueAtTime(350, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  playStrikeBuzzer() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.3);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  playChime() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.setValueAtTime(1174.66, now + 0.1); // D6

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playVictoryFanfare() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = now + (i * 0.12);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.25, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.4);
    });
  }

  playTireScreech() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(850 + Math.random() * 200, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  playCurbThud() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.16);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  playTreeRustle() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(180, now);
    osc1.frequency.exponentialRampToValueAtTime(45, now + 0.25);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(90, now);
    osc2.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }
}

export const sounds = new SoundManager();
