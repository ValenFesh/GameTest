/**
 * Web Audio procedural synthesizer for Catvalen vs Nanovalen.
 * Generates all sound effects and background music dynamically.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private currentTrack: string | null = null;
  private musicOscillators: OscillatorNode[] = [];
  private musicInterval: number | null = null;
  private customTrackUrls: Record<'city' | 'space' | 'boss' | 'distorted' | 'santiscat', string | null> = {
    city: null,
    space: null,
    boss: null,
    distorted: null,
    santiscat: null,
  };
  private customTrackNames: Record<'city' | 'space' | 'boss' | 'distorted' | 'santiscat', string> = {
    city: 'Tema Oficial Nivel 1 (Funk Disco)',
    space: 'Tema Oficial Nivel 2 (Cosmos Synth)',
    boss: 'Tema Oficial Nanovalen (Dark Phrygian)',
    distorted: 'Tema Realidad Distorsionada (Ambient Glitch)',
    santiscat: 'Tema Oficial Santiscat (Dark Cosmic Synth)',
  };
  private customAudioElements: Record<'city' | 'space' | 'boss' | 'distorted' | 'santiscat', HTMLAudioElement | null> = {
    city: null,
    space: null,
    boss: null,
    distorted: null,
    santiscat: null,
  };
  private customGammaSoundUrl: string | null = null;
  private customGammaSoundName: string = 'Estallido Gamma Cósmico Oficial (8s)';
  private customGammaAudioElement: HTMLAudioElement | null = null;
  private gammaAudioNodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private gammaGainNodes: GainNode[] = [];

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.25;
      this.musicGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.4;
      this.sfxGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.musicGain && this.sfxGain) {
      this.musicGain.gain.value = this.isMuted ? 0 : 0.25;
      this.sfxGain.gain.value = this.isMuted ? 0 : 0.4;
    }
    (['city', 'space', 'boss', 'distorted', 'santiscat'] as const).forEach(track => {
      const el = this.customAudioElements[track];
      if (el) el.volume = this.isMuted ? 0 : 0.45;
    });
    if (this.customGammaAudioElement) {
      this.customGammaAudioElement.volume = this.isMuted ? 0 : 0.95;
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // --- Sound Effects ---

  public playPunch() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playFireball() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Noise + tone sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.2);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playExplosion() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Low rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playLightning() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.exponentialRampToValueAtTime(120, now + 0.25);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1200, now);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.28);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  public playPowerBurst() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.1);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playShield() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(680, now + 0.2);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playShieldAbsorb() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(330, now + 0.15);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  /**
   * BLACK FLASH - Heavy distorted impact with sub-bass drop and high crackle!
   */
  public playBlackFlash() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Sub-bass heavy impact
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(150, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.6);
    subGain.gain.setValueAtTime(0.95, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.62);

    // Distorted crackle
    const crackle = this.ctx.createOscillator();
    const crackleGain = this.ctx.createGain();
    crackle.type = 'sawtooth';
    crackle.frequency.setValueAtTime(950, now);
    crackle.frequency.setValueAtTime(1400, now + 0.05);
    crackle.frequency.exponentialRampToValueAtTime(80, now + 0.4);
    crackleGain.gain.setValueAtTime(0.7, now);
    crackleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    crackle.connect(crackleGain);
    crackleGain.connect(this.sfxGain);
    crackle.start(now);
    crackle.stop(now + 0.46);
  }

  public playLaserWarning() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(900, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playLaserFire() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.5);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.56);
  }

  public playGammaCharge() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(800, now + 1.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.8, now + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 1.41);
  }

  public playGammaBurst() {
    this.stopGammaSound();
    if (this.isMuted) return;

    // 1. If user loaded a custom audio file for the Gamma Ray Burst, trigger it!
    if (this.customGammaSoundUrl) {
      try {
        if (!this.customGammaAudioElement) {
          this.customGammaAudioElement = new Audio(this.customGammaSoundUrl);
        }
        this.customGammaAudioElement.volume = this.isMuted ? 0 : 0.95;
        this.customGammaAudioElement.currentTime = 0;
        this.customGammaAudioElement.play().catch(e => console.warn('Gamma custom audio play:', e));
        return;
      } catch (err) {
        console.error('Error playing custom gamma sound:', err);
      }
    }

    // 2. Synthesize massive 8-second multi-stage cosmic explosion matching the user's sound effect
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Sub-bass detonation drop (0s - 2.5s)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + 2.0);
    subGain.gain.setValueAtTime(1.0, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 2.5);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 2.55);

    this.gammaAudioNodes.push(subOsc);
    this.gammaGainNodes.push(subGain);

    // Blinding plasma noise shockwave (0s - 4.5s)
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 4.5);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.025 * white) / 1.025;
        lastOut = output[i];
        output[i] *= 3.5;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(4500, now);
      filter.frequency.exponentialRampToValueAtTime(90, now + 3.8);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.85, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 4.2);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noiseSource.start(now);
      noiseSource.stop(now + 4.3);

      this.gammaAudioNodes.push(noiseSource);
      this.gammaGainNodes.push(noiseGain);
    } catch {
      // fallback if buffer creation fails
    }

    // Metallic tearing resonance (0s - 3.0s)
    const tearOsc = this.ctx.createOscillator();
    const tearGain = this.ctx.createGain();
    tearOsc.type = 'square';
    tearOsc.frequency.setValueAtTime(320, now);
    tearOsc.frequency.exponentialRampToValueAtTime(45, now + 2.2);
    tearGain.gain.setValueAtTime(0.55, now);
    tearGain.gain.exponentialRampToValueAtTime(0.01, now + 3.0);
    tearOsc.connect(tearGain);
    tearGain.connect(this.sfxGain);
    tearOsc.start(now);
    tearOsc.stop(now + 3.05);

    this.gammaAudioNodes.push(tearOsc);
    this.gammaGainNodes.push(tearGain);

    // Long planetary aftershock reverberation rumble (1.0s - 8.0s)
    const rumbleOsc = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumbleOsc.type = 'sine';
    rumbleOsc.frequency.setValueAtTime(32, now + 0.5);
    rumbleOsc.frequency.linearRampToValueAtTime(18, now + 7.5);

    rumbleGain.gain.setValueAtTime(0.01, now);
    rumbleGain.gain.linearRampToValueAtTime(0.5, now + 1.2);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 7.8);

    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(this.sfxGain);
    rumbleOsc.start(now);
    rumbleOsc.stop(now + 7.9);

    this.gammaAudioNodes.push(rumbleOsc);
    this.gammaGainNodes.push(rumbleGain);
  }

  /**
   * Cuts off all sound related to the Gamma Ray Burst immediately.
   * Called when player dies/loses to the burst or returns to menu.
   */
  public stopGammaSound() {
    if (this.customGammaAudioElement) {
      try {
        this.customGammaAudioElement.pause();
        this.customGammaAudioElement.currentTime = 0;
      } catch {
        // ignore
      }
    }
    this.gammaAudioNodes.forEach(node => {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // ignore
      }
    });
    this.gammaAudioNodes = [];

    this.gammaGainNodes.forEach(gain => {
      try {
        if (this.ctx) {
          gain.gain.setValueAtTime(0, this.ctx.currentTime);
        }
        gain.disconnect();
      } catch {
        // ignore
      }
    });
    this.gammaGainNodes = [];
  }

  public playBossBlackFlash() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Dark ominous sub rumble
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(200, now);
    subOsc.frequency.exponentialRampToValueAtTime(18, now + 0.8);
    subGain.gain.setValueAtTime(0.95, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.82);

    // Malevolent robotic screech
    const robotOsc = this.ctx.createOscillator();
    const robotGain = this.ctx.createGain();
    robotOsc.type = 'square';
    robotOsc.frequency.setValueAtTime(1600, now);
    robotOsc.frequency.exponentialRampToValueAtTime(120, now + 0.5);
    robotGain.gain.setValueAtTime(0.7, now);
    robotGain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
    robotOsc.connect(robotGain);
    robotGain.connect(this.sfxGain);
    robotOsc.start(now);
    robotOsc.stop(now + 0.56);
  }

  public playEarthDestruction() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Planetary cataclysm explosion
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'sawtooth';
    boomOsc.frequency.setValueAtTime(90, now);
    boomOsc.frequency.exponentialRampToValueAtTime(15, now + 2.5);
    boomGain.gain.setValueAtTime(1.0, now);
    boomGain.gain.exponentialRampToValueAtTime(0.01, now + 2.8);
    boomOsc.connect(boomGain);
    boomGain.connect(this.sfxGain);
    boomOsc.start(now);
    boomOsc.stop(now + 2.85);

    // High energy cosmic ray searing
    const hissOsc = this.ctx.createOscillator();
    const hissGain = this.ctx.createGain();
    hissOsc.type = 'triangle';
    hissOsc.frequency.setValueAtTime(2400, now);
    hissOsc.frequency.exponentialRampToValueAtTime(300, now + 1.8);
    hissGain.gain.setValueAtTime(0.6, now);
    hissGain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
    hissOsc.connect(hissGain);
    hissGain.connect(this.sfxGain);
    hissOsc.start(now);
    hissOsc.stop(now + 2.05);
  }

  public playHeal() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Magical sparkle chime arpeggio: C5 -> E5 -> G5 -> C6 with warm tone
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.055);

      gain.gain.setValueAtTime(0.35, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.055 + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.35);
    });
  }

  public playVictory() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C E G C E G
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const now = this.ctx.currentTime + i * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.36);
    });
  }

  // --- Santiscat Phase 2 & 2.5 Sound Effects ---

  public playSoulAbsorption() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // 12 ascending soul chimes representing the 12 human souls
    const soulFreqs = [
      261.63, 293.66, 329.63, 369.99, 392.00, 440.00, 
      493.88, 523.25, 587.33, 659.25, 739.99, 880.00
    ];
    soulFreqs.forEach((freq, i) => {
      const chimeOsc = this.ctx!.createOscillator();
      const chimeGain = this.ctx!.createGain();
      const startTime = now + i * 0.09;
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(freq, startTime);
      chimeOsc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 0.3);

      chimeGain.gain.setValueAtTime(0.28, startTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.005, startTime + 0.32);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.sfxGain!);
      chimeOsc.start(startTime);
      chimeOsc.stop(startTime + 0.35);
    });

    // Dark shadowy vortex hum + final absorption implosion
    const vortexOsc = this.ctx.createOscillator();
    const vortexGain = this.ctx.createGain();
    vortexOsc.type = 'sawtooth';
    vortexOsc.frequency.setValueAtTime(65, now);
    vortexOsc.frequency.linearRampToValueAtTime(220, now + 1.2);
    vortexOsc.frequency.exponentialRampToValueAtTime(30, now + 1.6);

    vortexGain.gain.setValueAtTime(0.1, now);
    vortexGain.gain.linearRampToValueAtTime(0.5, now + 1.2);
    vortexGain.gain.exponentialRampToValueAtTime(0.01, now + 1.7);

    vortexOsc.connect(vortexGain);
    vortexGain.connect(this.sfxGain);
    vortexOsc.start(now);
    vortexOsc.stop(now + 1.75);
  }

  public playRainbowBlastCharge() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(3200, now + 1.2);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.55, now + 1.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.26);
  }

  public playRainbowBlastFire() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Sub bass beam roar
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(120, now);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + 2.0);

    subGain.gain.setValueAtTime(0.9, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 2.1);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 2.15);

    // Laser sizzle
    const sizzleOsc = this.ctx.createOscillator();
    const sizzleGain = this.ctx.createGain();
    sizzleOsc.type = 'square';
    sizzleOsc.frequency.setValueAtTime(1400, now);
    sizzleOsc.frequency.exponentialRampToValueAtTime(180, now + 1.5);

    sizzleGain.gain.setValueAtTime(0.5, now);
    sizzleGain.gain.exponentialRampToValueAtTime(0.01, now + 1.6);

    sizzleOsc.connect(sizzleGain);
    sizzleGain.connect(this.sfxGain);
    sizzleOsc.start(now);
    sizzleOsc.stop(now + 1.65);
  }

  public playOmegaSave() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Undertale File Saved double chime: high crisp bell
    [987.77, 1318.51].forEach((freq, i) => {
      const bellOsc = this.ctx!.createOscillator();
      const bellGain = this.ctx!.createGain();
      const st = now + i * 0.11;
      bellOsc.type = 'triangle';
      bellOsc.frequency.setValueAtTime(freq, st);

      bellGain.gain.setValueAtTime(0.5, st);
      bellGain.gain.exponentialRampToValueAtTime(0.005, st + 0.35);

      bellOsc.connect(bellGain);
      bellGain.connect(this.sfxGain!);
      bellOsc.start(st);
      bellOsc.stop(st + 0.38);
    });
  }

  public playOmegaLoad() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Glitched rewind tape sound
    const rewindOsc = this.ctx.createOscillator();
    const rewindGain = this.ctx.createGain();
    rewindOsc.type = 'sawtooth';
    rewindOsc.frequency.setValueAtTime(1600, now);
    rewindOsc.frequency.exponentialRampToValueAtTime(80, now + 0.45);

    rewindGain.gain.setValueAtTime(0.65, now);
    rewindGain.gain.exponentialRampToValueAtTime(0.01, now + 0.48);

    rewindOsc.connect(rewindGain);
    rewindGain.connect(this.sfxGain);
    rewindOsc.start(now);
    rewindOsc.stop(now + 0.5);

    // Static click
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(3200, now);
    clickGain.gain.setValueAtTime(0.4, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    clickOsc.connect(clickGain);
    clickGain.connect(this.sfxGain);
    clickOsc.start(now);
    clickOsc.stop(now + 0.09);
  }

  public playRefuseToDie() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // 1. Heart crack sound (glass / heart shatter)
    const crackOsc = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crackOsc.type = 'sawtooth';
    crackOsc.frequency.setValueAtTime(2400, now);
    crackOsc.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    crackGain.gain.setValueAtTime(0.8, now);
    crackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    crackOsc.connect(crackGain);
    crackGain.connect(this.sfxGain);
    crackOsc.start(now);
    crackOsc.stop(now + 0.19);

    // 2. Powerful deep determination heartbeat at +0.35s
    const thumpOsc = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(95, now + 0.35);
    thumpOsc.frequency.exponentialRampToValueAtTime(28, now + 0.35 + 0.4);

    thumpGain.gain.setValueAtTime(1.0, now + 0.35);
    thumpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35 + 0.45);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.sfxGain);
    thumpOsc.start(now + 0.35);
    thumpOsc.stop(now + 0.35 + 0.46);

    // 3. Triumphant soul mending chime arpeggio: "But it refused."
    const mendNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C E G C E
    mendNotes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const st = now + 0.5 + idx * 0.1;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, st);

      gain.gain.setValueAtTime(0.45, st);
      gain.gain.exponentialRampToValueAtTime(0.005, st + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(st);
      osc.stop(st + 0.48);
    });
  }

  public playSupernova() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Stellar explosion
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'sawtooth';
    boomOsc.frequency.setValueAtTime(180, now);
    boomOsc.frequency.exponentialRampToValueAtTime(20, now + 1.8);

    boomGain.gain.setValueAtTime(0.9, now);
    boomGain.gain.exponentialRampToValueAtTime(0.01, now + 1.9);

    boomOsc.connect(boomGain);
    boomGain.connect(this.sfxGain);
    boomOsc.start(now);
    boomOsc.stop(now + 1.95);

    // Crystalline high sparkle shimmer
    const chimeOsc = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(2200, now);
    chimeOsc.frequency.exponentialRampToValueAtTime(800, now + 1.2);

    chimeGain.gain.setValueAtTime(0.45, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.005, now + 1.3);

    chimeOsc.connect(chimeGain);
    chimeGain.connect(this.sfxGain);
    chimeOsc.start(now);
    chimeOsc.stop(now + 1.35);
  }

  // --- Dynamic Procedural Music & Custom Audio ---

  public setCustomTrack(track: 'city' | 'space' | 'boss' | 'distorted' | 'santiscat', fileOrUrl: File | string, fileName?: string) {
    const existing = this.customAudioElements[track];
    if (existing) {
      existing.pause();
      this.customAudioElements[track] = null;
    }

    if (typeof fileOrUrl === 'string') {
      this.customTrackUrls[track] = fileOrUrl;
      this.customTrackNames[track] = fileName || `Audio Personalizado (${track.toUpperCase()})`;
    } else {
      this.customTrackUrls[track] = URL.createObjectURL(fileOrUrl);
      this.customTrackNames[track] = fileName || fileOrUrl.name;
    }

    if (this.currentTrack === track) {
      this.stopMusic();
      const prev = this.currentTrack;
      this.currentTrack = null;
      this.playMusic(prev as 'city' | 'space' | 'boss' | 'distorted' | 'santiscat');
    }
  }

  public resetDefaultTrack(track: 'city' | 'space' | 'boss' | 'distorted' | 'santiscat') {
    const existing = this.customAudioElements[track];
    if (existing) {
      existing.pause();
      this.customAudioElements[track] = null;
    }
    this.customTrackUrls[track] = null;
    const defaults: Record<'city' | 'space' | 'boss' | 'distorted' | 'santiscat', string> = {
      city: 'Tema Oficial Nivel 1 (Funk Disco)',
      space: 'Tema Oficial Nivel 2 (Cosmos Synth)',
      boss: 'Tema Oficial Nanovalen (Dark Phrygian)',
      distorted: 'Tema Realidad Distorsionada (Ambient Glitch)',
      santiscat: 'Tema Oficial Santiscat (Dark Cosmic Synth)',
    };
    this.customTrackNames[track] = defaults[track];

    if (this.currentTrack === track) {
      this.stopMusic();
      const prev = this.currentTrack;
      this.currentTrack = null;
      this.playMusic(prev as 'city' | 'space' | 'boss' | 'distorted' | 'santiscat');
    }
  }

  public getTrackName(track: 'city' | 'space' | 'boss' | 'distorted' | 'santiscat'): string {
    return this.customTrackNames[track];
  }

  public hasCustomTrack(track: 'city' | 'space' | 'boss' | 'distorted' | 'santiscat'): boolean {
    return this.customTrackUrls[track] !== null;
  }

  // Gamma Ray Burst sound customization
  public setCustomGammaSound(fileOrUrl: File | string, fileName?: string) {
    this.stopGammaSound();
    if (typeof fileOrUrl === 'string') {
      this.customGammaSoundUrl = fileOrUrl;
      this.customGammaSoundName = fileName || 'Estallido Gamma Personalizado';
    } else {
      this.customGammaSoundUrl = URL.createObjectURL(fileOrUrl);
      this.customGammaSoundName = fileName || fileOrUrl.name;
    }
    try {
      this.customGammaAudioElement = new Audio(this.customGammaSoundUrl);
      this.customGammaAudioElement.preload = 'auto';
    } catch {
      // ignore
    }
  }

  public resetDefaultGammaSound() {
    this.stopGammaSound();
    this.customGammaSoundUrl = null;
    this.customGammaAudioElement = null;
    this.customGammaSoundName = 'Estallido Gamma Cósmico Oficial (8s)';
  }

  public getCustomGammaName(): string {
    return this.customGammaSoundName;
  }

  public hasCustomGammaSound(): boolean {
    return this.customGammaSoundUrl !== null;
  }

  // Aliases for Level 1 compatibility
  public setCustomLevel1Audio(fileOrUrl: File | string, fileName?: string) {
    this.setCustomTrack('city', fileOrUrl, fileName);
  }

  public resetDefaultLevel1Audio() {
    this.resetDefaultTrack('city');
  }

  public getCustomLevel1Name(): string {
    return this.getTrackName('city');
  }

  public hasCustomLevel1Audio(): boolean {
    return this.hasCustomTrack('city');
  }

  public playMusic(track: 'city' | 'space' | 'boss' | 'distorted' | 'santiscat' | 'santiscat_phase2' | 'santiscat_phase25' | 'domain_expansion' | 'cosmic_escape' | 'none') {
    if (this.currentTrack === track) return;
    this.currentTrack = track;
    this.stopMusic();

    if (track === 'none' || this.isMuted) return;

    // Check if current stage track has a custom audio track configured
    if (track === 'city' || track === 'space' || track === 'boss' || track === 'distorted' || track === 'santiscat') {
      const customUrl = this.customTrackUrls[track];
      if (customUrl) {
        try {
          let elem = this.customAudioElements[track];
          if (!elem) {
            elem = new Audio(customUrl);
            elem.loop = true;
            this.customAudioElements[track] = elem;
          }
          elem.volume = this.isMuted ? 0 : 0.45;
          elem.currentTime = 0;
          elem.play().catch((e: unknown) => {
            console.warn(`Custom audio playback for ${track} postponed:`, e);
          });
          return;
        } catch (err) {
          console.error(`Error starting custom audio for ${track}, falling back to synth:`, err);
        }
      }
    }

    this.initContext();
    if (!this.ctx || !this.musicGain) return;

    let step = 0;
    // City Level 1 (118 BPM), Santiscat Boss (146 BPM), Domain Expansion (152 BPM), Santiscat Phase 2 Wormhole (166 BPM), Phase 2.5 Another Universe (178 BPM), Cosmic Escape (176 BPM)
    const bpm = track === 'city' ? 118 : track === 'santiscat' ? 146 : track === 'santiscat_phase25' ? 178 : track === 'cosmic_escape' ? 176 : track === 'santiscat_phase2' ? 166 : track === 'domain_expansion' ? 152 : track === 'boss' ? 140 : 100;
    const intervalMs = (track === 'city' || track === 'santiscat' || track === 'domain_expansion' || track === 'santiscat_phase2' || track === 'santiscat_phase25' || track === 'cosmic_escape') ? (60 / bpm) * 1000 * 0.25 : (60 / bpm) * 1000 * 0.5;

    // Scales for other tracks
    const scales = {
      space: [174.61, 220, 261.63, 329.63, 392, 523.25], // F major / Lydian
      boss: [110, 116.54, 130.81, 146.83, 164.81, 220], // Dark Phrygian
      distorted: [130.81, 138.59, 164.81, 185.00, 207.65, 261.63], // Glitched Whole-Tone
    };

    // Slap bass sequence for Level 1 City (D minor Funk Disco Groove)
    const cityBassNotes = [
      73.42, 0, 146.83, 0, 73.42, 0, 87.31, 0,
      98.00, 0, 98.00, 103.83, 110.00, 0, 130.81, 146.83,
    ];

    // Disco melodic synth hook notes for City
    const cityMelodyNotes = [
      293.66, 0, 349.23, 0, 392.00, 440.00, 0, 349.23,
      293.66, 0, 261.63, 293.66, 0, 349.23, 392.00, 0,
    ];

    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.isMuted) return;
      const now = this.ctx.currentTime;
      step++;

      if (track === 'city') {
        // --- LEVEL 1: FUNK DISCO CITY SOUNDTRACK (Matching user uploaded track) ---
        const step16 = step % 16;

        // 1. Four-on-the-floor Punchy Kick Drum (on steps 0, 4, 8, 12)
        if (step16 % 4 === 0) {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(145, now);
          kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.12);

          kickGain.gain.setValueAtTime(0.42, now);
          kickGain.gain.exponentialRampToValueAtTime(0.005, now + 0.13);

          kickOsc.connect(kickGain);
          kickGain.connect(this.musicGain);
          kickOsc.start(now);
          kickOsc.stop(now + 0.14);
        }

        // 2. Disco Snare / Handclap (on beats 2 & 4: steps 4, 12)
        if (step16 === 4 || step16 === 12) {
          const snareOsc = this.ctx.createOscillator();
          const snareGain = this.ctx.createGain();
          snareOsc.type = 'triangle';
          snareOsc.frequency.setValueAtTime(220, now);
          snareOsc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

          snareGain.gain.setValueAtTime(0.28, now);
          snareGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

          snareOsc.connect(snareGain);
          snareGain.connect(this.musicGain);
          snareOsc.start(now);
          snareOsc.stop(now + 0.16);
        }

        // 3. Hi-Hat Sizzle (every even 16th, open sizzle on offbeats 2, 6, 10, 14)
        if (step16 % 2 === 0) {
          const hatOsc = this.ctx.createOscillator();
          const hatGain = this.ctx.createGain();
          hatOsc.type = 'square';
          hatOsc.frequency.setValueAtTime(8000, now);

          const isOpen = step16 % 4 === 2;
          hatGain.gain.setValueAtTime(isOpen ? 0.09 : 0.04, now);
          hatGain.gain.exponentialRampToValueAtTime(0.002, now + (isOpen ? 0.12 : 0.04));

          hatOsc.connect(hatGain);
          hatGain.connect(this.musicGain);
          hatOsc.start(now);
          hatOsc.stop(now + (isOpen ? 0.13 : 0.05));
        }

        // 4. Slap Bass Line (Groovy syncopated octave pops)
        const bassFreq = cityBassNotes[step16];
        if (bassFreq > 0) {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(bassFreq, now);

          bassGain.gain.setValueAtTime(0.25, now);
          bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

          bassOsc.connect(bassGain);
          bassGain.connect(this.musicGain);
          bassOsc.start(now);
          bassOsc.stop(now + 0.17);
        }

        // 5. Disco Electric Synth / Clavinet Stabs (on offbeat 16ths: 2, 6, 10, 14)
        if (step16 % 4 === 2) {
          [440, 523.25, 659.25].forEach(chordFreq => {
            const chordOsc = this.ctx!.createOscillator();
            const chordGain = this.ctx!.createGain();
            chordOsc.type = 'triangle';
            chordOsc.frequency.setValueAtTime(chordFreq, now);

            chordGain.gain.setValueAtTime(0.12, now);
            chordGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

            chordOsc.connect(chordGain);
            chordGain.connect(this.musicGain!);
            chordOsc.start(now);
            chordOsc.stop(now + 0.19);
          });
        }

        // 6. Upbeat Melodic Hook (alternating phrases)
        const melFreq = cityMelodyNotes[step16];
        if (melFreq > 0 && Math.floor(step / 16) % 2 === 1) {
          const melOsc = this.ctx.createOscillator();
          const melGain = this.ctx.createGain();
          melOsc.type = 'sine';
          melOsc.frequency.setValueAtTime(melFreq, now);

          melGain.gain.setValueAtTime(0.16, now);
          melGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

          melOsc.connect(melGain);
          melGain.connect(this.musicGain);
          melOsc.start(now);
          melOsc.stop(now + 0.23);
        }

      } else if (track === 'santiscat') {
        // --- SANTISCAT BOSS: EPIC DRIVING COSMIC SYNTH BATTLE THEME ---
        const s16 = step % 16;

        // 1. Heavy Cyber Kick Drum (Steps 0, 4, 8, 12, plus syncopated hit at step 14)
        if (s16 % 4 === 0 || s16 === 14) {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(160, now);
          kickOsc.frequency.exponentialRampToValueAtTime(32, now + 0.12);

          kickGain.gain.setValueAtTime(0.48, now);
          kickGain.gain.exponentialRampToValueAtTime(0.005, now + 0.13);

          kickOsc.connect(kickGain);
          kickGain.connect(this.musicGain);
          kickOsc.start(now);
          kickOsc.stop(now + 0.14);
        }

        // 2. Cosmic Industrial Snare / Clap (Beats 2 & 4: steps 4 and 12)
        if (s16 === 4 || s16 === 12) {
          const snareOsc = this.ctx.createOscillator();
          const snareGain = this.ctx.createGain();
          snareOsc.type = 'triangle';
          snareOsc.frequency.setValueAtTime(340, now);
          snareOsc.frequency.exponentialRampToValueAtTime(90, now + 0.16);

          snareGain.gain.setValueAtTime(0.35, now);
          snareGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

          snareOsc.connect(snareGain);
          snareGain.connect(this.musicGain);
          snareOsc.start(now);
          snareOsc.stop(now + 0.17);
        }

        // 3. Fast Cyber Hi-Hats on every 16th step
        const hatOsc = this.ctx.createOscillator();
        const hatGain = this.ctx.createGain();
        hatOsc.type = 'square';
        hatOsc.frequency.setValueAtTime(s16 % 2 === 0 ? 3400 : 5200, now);
        hatGain.gain.setValueAtTime(s16 % 2 === 0 ? 0.08 : 0.04, now);
        hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        hatOsc.connect(hatGain);
        hatGain.connect(this.musicGain);
        hatOsc.start(now);
        hatOsc.stop(now + 0.05);

        // 4. Distorted Cosmic Reese Sub-Bass (Every 8th note)
        const santisBassNotes = [
          73.42, 73.42, 77.78, 73.42, 87.31, 73.42, 92.50, 77.78,
          73.42, 73.42, 110.00, 92.50, 87.31, 77.78, 73.42, 65.41,
        ];
        if (s16 % 2 === 0) {
          const bFreq = santisBassNotes[s16];
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(bFreq, now);

          bassGain.gain.setValueAtTime(0.26, now);
          bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

          bassOsc.connect(bassGain);
          bassGain.connect(this.musicGain);
          bassOsc.start(now);
          bassOsc.stop(now + 0.23);
        }

        // 5. Epic Dark Cosmic Arpeggiator Lead Melody (Santiscat's Theme)
        const santisLeadNotes = [
          293.66, 369.99, 440.00, 587.33, 622.25, 587.33, 440.00, 369.99,
          311.13, 369.99, 440.00, 587.33, 554.37, 440.00, 369.99, 311.13,
        ];
        const leadFreq = santisLeadNotes[s16];
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'sawtooth';
        leadOsc.frequency.setValueAtTime(leadFreq, now);

        leadGain.gain.setValueAtTime(0.18, now);
        leadGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

        leadOsc.connect(leadGain);
        leadGain.connect(this.musicGain);
        leadOsc.start(now);
        leadOsc.stop(now + 0.17);

      } else if (track === 'domain_expansion') {
        // --- JUJUTSU KAISEN: SUKUNA DOMAIN EXPANSION (FUKUMA MIZUSHI) BATTLE THEME ---
        const d16 = step % 16;

        // 1. Ominous War Taiko Drum (Rhythmic syncopated battle hits: 0, 3, 6, 8, 10, 14)
        if ([0, 3, 6, 8, 10, 14].includes(d16)) {
          const taikoOsc = this.ctx.createOscillator();
          const taikoGain = this.ctx.createGain();
          taikoOsc.type = 'sine';
          const isHeavy = d16 === 0 || d16 === 8;
          taikoOsc.frequency.setValueAtTime(isHeavy ? 110 : 145, now);
          taikoOsc.frequency.exponentialRampToValueAtTime(isHeavy ? 28 : 42, now + (isHeavy ? 0.22 : 0.14));

          taikoGain.gain.setValueAtTime(isHeavy ? 0.65 : 0.45, now);
          taikoGain.gain.exponentialRampToValueAtTime(0.005, now + (isHeavy ? 0.24 : 0.15));

          taikoOsc.connect(taikoGain);
          taikoGain.connect(this.musicGain);
          taikoOsc.start(now);
          taikoOsc.stop(now + (isHeavy ? 0.25 : 0.16));
        }

        // 2. Temple Bell / Demonic Chime Resonance (Steps 0 and 8)
        if (d16 === 0 || d16 === 8) {
          [587.33, 880.00, 1174.66].forEach((bellFreq, i) => {
            const bellOsc = this.ctx!.createOscillator();
            const bellGain = this.ctx!.createGain();
            bellOsc.type = 'triangle';
            bellOsc.frequency.setValueAtTime(bellFreq * (d16 === 8 ? 0.94 : 1.0), now);

            bellGain.gain.setValueAtTime(0.12 / (i + 1), now);
            bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

            bellOsc.connect(bellGain);
            bellGain.connect(this.musicGain!);
            bellOsc.start(now);
            bellOsc.stop(now + 0.6);
          });
        }

        // 3. Demonic Slicing Hi-Hat Tremolo (Every 16th step with nervous rapid intensity)
        const cutHatOsc = this.ctx.createOscillator();
        const cutHatGain = this.ctx.createGain();
        cutHatOsc.type = 'sawtooth';
        cutHatOsc.frequency.setValueAtTime(d16 % 4 === 2 ? 6500 : 4200, now);
        cutHatGain.gain.setValueAtTime(d16 % 2 === 0 ? 0.07 : 0.035, now);
        cutHatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        cutHatOsc.connect(cutHatGain);
        cutHatGain.connect(this.musicGain);
        cutHatOsc.start(now);
        cutHatOsc.stop(now + 0.045);

        // 4. Low Malevolent Phrygian Sub-Drone Bass (Reese bass: D, Eb, F, G, C)
        const domainBassNotes = [
          55.00, 55.00, 58.27, 55.00, 65.41, 55.00, 58.27, 51.91,
          55.00, 55.00, 77.78, 65.41, 58.27, 55.00, 51.91, 49.00,
        ];
        if (d16 % 2 === 0) {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(domainBassNotes[d16], now);

          bassGain.gain.setValueAtTime(0.32, now);
          bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

          bassOsc.connect(bassGain);
          bassGain.connect(this.musicGain);
          bassOsc.start(now);
          bassOsc.stop(now + 0.23);
        }

        // 5. Sinister Cleave / Chant Lead Ostinato (Fast eerie minor 2nd trills)
        const domainLeadNotes = [
          220.00, 233.08, 220.00, 196.00, 220.00, 261.63, 246.94, 233.08,
          220.00, 293.66, 277.18, 233.08, 220.00, 207.65, 220.00, 233.08,
        ];
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'sawtooth';
        leadOsc.frequency.setValueAtTime(domainLeadNotes[d16], now);

        leadGain.gain.setValueAtTime(0.2, now);
        leadGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        leadOsc.connect(leadGain);
        leadGain.connect(this.musicGain);
        leadOsc.start(now);
        leadOsc.stop(now + 0.16);

      } else if (track === 'santiscat_phase2') {
        // --- SANTISCAT PHASE 2: OMEGA COSMIC / FINALE / WORMHOLE THEME (166 BPM) ---
        const p16 = step % 16;
        const bar = Math.floor(step / 16) % 4;

        // 1. Relentless Double-Kick & Snare Pattern
        if (p16 % 4 === 0 || p16 === 10 || p16 === 14) {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(140, now);
          kickOsc.frequency.exponentialRampToValueAtTime(32, now + 0.11);
          kickGain.gain.setValueAtTime(0.55, now);
          kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          kickOsc.connect(kickGain);
          kickGain.connect(this.musicGain);
          kickOsc.start(now);
          kickOsc.stop(now + 0.13);
        }

        if (p16 === 4 || p16 === 12) {
          const snareOsc = this.ctx.createOscillator();
          const snareGain = this.ctx.createGain();
          snareOsc.type = 'triangle';
          snareOsc.frequency.setValueAtTime(260, now);
          snareOsc.frequency.exponentialRampToValueAtTime(90, now + 0.13);
          snareGain.gain.setValueAtTime(0.35, now);
          snareGain.gain.exponentialRampToValueAtTime(0.01, now + 0.13);
          snareOsc.connect(snareGain);
          snareGain.connect(this.musicGain);
          snareOsc.start(now);
          snareOsc.stop(now + 0.14);
        }

        // 2. High-speed 16th Hi-Hat sizzle
        const hatOsc = this.ctx.createOscillator();
        const hatGain = this.ctx.createGain();
        hatOsc.type = 'square';
        hatOsc.frequency.setValueAtTime(p16 % 2 === 0 ? 8200 : 7000, now);
        hatGain.gain.setValueAtTime(p16 % 4 === 2 ? 0.08 : 0.035, now);
        hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        hatOsc.connect(hatGain);
        hatGain.connect(this.musicGain);
        hatOsc.start(now);
        hatOsc.stop(now + 0.05);

        // 3. Driving 16th-note Dark Synth Bass (Undertale Finale / Megalovania style arpeggiated drive)
        const bassProgression = [
          [65.41, 77.78, 65.41, 87.31, 65.41, 98.00, 87.31, 77.78, 65.41, 110.00, 98.00, 87.31, 77.78, 65.41, 58.27, 61.74], // C bass
          [58.27, 69.30, 58.27, 77.78, 58.27, 87.31, 77.78, 69.30, 58.27, 98.00, 87.31, 77.78, 69.30, 58.27, 51.91, 55.00],   // Bb bass
          [51.91, 61.74, 51.91, 69.30, 51.91, 77.78, 69.30, 61.74, 51.91, 87.31, 77.78, 69.30, 61.74, 51.91, 49.00, 46.25],   // Ab bass
          [61.74, 73.42, 61.74, 82.41, 61.74, 92.50, 82.41, 73.42, 61.74, 103.83, 92.50, 82.41, 73.42, 61.74, 55.00, 58.27],  // B bass
        ];
        const bassRow = bassProgression[bar];
        const bFreq = bassRow[p16];
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bFreq, now);
        bassGain.gain.setValueAtTime(0.24, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain);
        bassOsc.start(now);
        bassOsc.stop(now + 0.13);

        // 4. Soaring Determination / Cosmic Saw Lead Melody
        const melodyPhrases = [
          [261.63, 0, 311.13, 0, 349.23, 392.00, 0, 466.16, 523.25, 0, 466.16, 0, 392.00, 349.23, 311.13, 261.63],
          [233.08, 0, 277.18, 0, 311.13, 349.23, 0, 415.30, 466.16, 0, 415.30, 0, 349.23, 311.13, 277.18, 233.08],
          [207.65, 0, 246.94, 0, 277.18, 311.13, 0, 369.99, 415.30, 0, 369.99, 0, 311.13, 277.18, 246.94, 207.65],
          [246.94, 0, 293.66, 0, 329.63, 369.99, 0, 440.00, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 1046.50],
        ];
        const mFreq = melodyPhrases[bar][p16];
        if (mFreq > 0) {
          const leadOsc = this.ctx.createOscillator();
          const leadGain = this.ctx.createGain();
          leadOsc.type = 'sawtooth';
          leadOsc.frequency.setValueAtTime(mFreq, now);
          leadGain.gain.setValueAtTime(0.22, now);
          leadGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
          leadOsc.connect(leadGain);
          leadGain.connect(this.musicGain);
          leadOsc.start(now);
          leadOsc.stop(now + 0.17);
        }

      } else if (track === 'santiscat_phase25') {
        // --- SANTISCAT PHASE 2.5: ANOTHER UNIVERSE TRANSCENDENTAL CLIMAX (178 BPM) ---
        const p16 = step % 16;
        const bar = Math.floor(step / 16) % 4;

        // 1. Double-Kick High Energy Hardstyle / Trance Pulse
        if (p16 % 4 === 0 || p16 === 7 || p16 === 11 || p16 === 15) {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(155, now);
          kickOsc.frequency.exponentialRampToValueAtTime(36, now + 0.095);
          kickGain.gain.setValueAtTime(0.58, now);
          kickGain.gain.exponentialRampToValueAtTime(0.008, now + 0.1);
          kickOsc.connect(kickGain);
          kickGain.connect(this.musicGain);
          kickOsc.start(now);
          kickOsc.stop(now + 0.11);
        }

        // Snare / Laser Clap on 4 and 12 with syncopated ghost hit on 14
        if (p16 === 4 || p16 === 12 || p16 === 14) {
          const snareOsc = this.ctx.createOscillator();
          const snareGain = this.ctx.createGain();
          snareOsc.type = 'triangle';
          snareOsc.frequency.setValueAtTime(320, now);
          snareOsc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
          snareGain.gain.setValueAtTime(p16 === 14 ? 0.2 : 0.4, now);
          snareGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          snareOsc.connect(snareGain);
          snareGain.connect(this.musicGain);
          snareOsc.start(now);
          snareOsc.stop(now + 0.13);
        }

        // 2. Rapid 16th Hi-Hat shimmer
        const hatOsc = this.ctx.createOscillator();
        const hatGain = this.ctx.createGain();
        hatOsc.type = 'square';
        hatOsc.frequency.setValueAtTime(p16 % 2 === 0 ? 9400 : 8000, now);
        hatGain.gain.setValueAtTime(p16 % 4 === 2 ? 0.09 : 0.04, now);
        hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        hatOsc.connect(hatGain);
        hatGain.connect(this.musicGain);
        hatOsc.start(now);
        hatOsc.stop(now + 0.045);

        // 3. Fast Trance Rolling Reese Synth Bass (Eb -> F -> Gm -> Bb/D)
        const bassNotesP25 = [
          // Bar 0: Eb Major
          [77.78, 155.56, 116.54, 155.56, 77.78, 155.56, 116.54, 155.56, 77.78, 155.56, 116.54, 155.56, 196.00, 155.56, 116.54, 77.78],
          // Bar 1: F Major
          [87.31, 174.61, 130.81, 174.61, 87.31, 174.61, 130.81, 174.61, 87.31, 174.61, 130.81, 174.61, 220.00, 174.61, 130.81, 87.31],
          // Bar 2: G Minor
          [98.00, 196.00, 146.83, 196.00, 98.00, 196.00, 146.83, 196.00, 98.00, 196.00, 146.83, 196.00, 233.08, 196.00, 146.83, 98.00],
          // Bar 3: Bb/Dm
          [116.54, 233.08, 174.61, 233.08, 116.54, 233.08, 174.61, 233.08, 146.83, 293.66, 220.00, 293.66, 349.23, 293.66, 220.00, 146.83],
        ];
        const bFreq25 = bassNotesP25[bar][p16];
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bFreq25, now);
        bassGain.gain.setValueAtTime(0.26, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain);
        bassOsc.start(now);
        bassOsc.stop(now + 0.12);

        // 4. Transcendental Cosmic Saw Lead (Heroic determination soaring across another universe)
        const melodyPhrasesP25 = [
          [311.13, 392.00, 466.16, 622.25, 0, 587.33, 466.16, 392.00, 311.13, 0, 392.00, 466.16, 622.25, 0, 698.46, 783.99],
          [349.23, 440.00, 523.25, 698.46, 0, 659.25, 523.25, 440.00, 349.23, 0, 440.00, 523.25, 698.46, 0, 783.99, 880.00],
          [392.00, 466.16, 587.33, 783.99, 0, 698.46, 587.33, 466.16, 392.00, 466.16, 587.33, 783.99, 880.00, 932.33, 987.77, 1046.50],
          [587.33, 0, 698.46, 0, 783.99, 880.00, 0, 932.33, 1046.50, 1174.66, 0, 1046.50, 932.33, 880.00, 783.99, 698.46],
        ];
        const mFreq25 = melodyPhrasesP25[bar][p16];
        if (mFreq25 > 0) {
          const leadOsc = this.ctx.createOscillator();
          const leadGain = this.ctx.createGain();
          leadOsc.type = 'sawtooth';
          leadOsc.frequency.setValueAtTime(mFreq25, now);
          // Rich resonant harmonic layer
          leadGain.gain.setValueAtTime(0.24, now);
          leadGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          leadOsc.connect(leadGain);
          leadGain.connect(this.musicGain);
          leadOsc.start(now);
          leadOsc.stop(now + 0.16);

          // Sub-octave sparkle on strong beats
          if (p16 % 4 === 0) {
            const subLead = this.ctx.createOscillator();
            const subLeadGain = this.ctx.createGain();
            subLead.type = 'triangle';
            subLead.frequency.setValueAtTime(mFreq25 * 0.5, now);
            subLeadGain.gain.setValueAtTime(0.15, now);
            subLeadGain.gain.exponentialRampToValueAtTime(0.005, now + 0.18);
            subLead.connect(subLeadGain);
            subLeadGain.connect(this.musicGain);
            subLead.start(now);
            subLead.stop(now + 0.19);
          }
        }

      } else if (track === 'cosmic_escape') {
        // --- COSMIC ESCAPE: EPIC FINAL HIGH-STAKES RUN (176 BPM, D MINOR) ---
        const e16 = step % 16;
        const bar = Math.floor(step / 16) % 4;

        // 1. Heavy Driving Kick Drum (Four-on-the-floor + urgent syncopated gallop)
        if (e16 % 4 === 0 || e16 === 6 || e16 === 10 || e16 === 14) {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(155, now);
          kickOsc.frequency.exponentialRampToValueAtTime(28, now + 0.11);
          kickGain.gain.setValueAtTime(0.55, now);
          kickGain.gain.exponentialRampToValueAtTime(0.005, now + 0.12);
          kickOsc.connect(kickGain);
          kickGain.connect(this.musicGain);
          kickOsc.start(now);
          kickOsc.stop(now + 0.125);
        }

        // 2. High-energy Gated Snare on beats 2 & 4
        if (e16 === 4 || e16 === 12) {
          const snareOsc = this.ctx.createOscillator();
          const snareGain = this.ctx.createGain();
          snareOsc.type = 'triangle';
          snareOsc.frequency.setValueAtTime(280, now);
          snareOsc.frequency.exponentialRampToValueAtTime(80, now + 0.14);
          snareGain.gain.setValueAtTime(0.38, now);
          snareGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          snareOsc.connect(snareGain);
          snareGain.connect(this.musicGain);
          snareOsc.start(now);
          snareOsc.stop(now + 0.155);
        }

        // 3. Relentless Hi-Hat Rush
        const hatOsc = this.ctx.createOscillator();
        const hatGain = this.ctx.createGain();
        hatOsc.type = 'square';
        hatOsc.frequency.setValueAtTime(e16 % 2 === 0 ? 9200 : 7600, now);
        hatGain.gain.setValueAtTime(e16 % 4 === 2 ? 0.08 : 0.03, now);
        hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        hatOsc.connect(hatGain);
        hatGain.connect(this.musicGain);
        hatOsc.start(now);
        hatOsc.stop(now + 0.045);

        // 4. Fast Driving Synth Bass (D minor -> Bb -> C -> A)
        const escapeBass = [
          // D minor
          [73.42, 146.83, 110.00, 146.83, 73.42, 146.83, 110.00, 146.83, 73.42, 146.83, 110.00, 146.83, 87.31, 146.83, 110.00, 73.42],
          // Bb Major
          [58.27, 116.54, 87.31, 116.54, 58.27, 116.54, 87.31, 116.54, 58.27, 116.54, 87.31, 116.54, 69.30, 116.54, 87.31, 58.27],
          // C Major
          [65.41, 130.81, 98.00, 130.81, 65.41, 130.81, 98.00, 130.81, 65.41, 130.81, 98.00, 130.81, 77.78, 130.81, 98.00, 65.41],
          // A minor / A7
          [55.00, 110.00, 82.41, 110.00, 55.00, 110.00, 82.41, 110.00, 55.00, 110.00, 82.41, 110.00, 65.41, 110.00, 82.41, 55.00],
        ];
        const bFreq = escapeBass[bar][e16];
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bFreq, now);
        bassGain.gain.setValueAtTime(0.25, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain);
        bassOsc.start(now);
        bassOsc.stop(now + 0.12);

        // 5. Epic Heroic Brass/Synth Lead (High Octane Finale Melodic Progression)
        const escapeMelody = [
          // Bar 0: D minor heroic rise (D4 - F4 - A4 - D5)
          [293.66, 0, 349.23, 0, 440.00, 0, 523.25, 587.33, 0, 587.33, 523.25, 0, 440.00, 349.23, 293.66, 0],
          // Bar 1: Bb surge (Bb4 - D5 - F5)
          [466.16, 0, 523.25, 0, 587.33, 0, 698.46, 698.46, 0, 659.25, 587.33, 0, 523.25, 466.16, 440.00, 0],
          // Bar 2: C resolution (C5 - E5 - G5)
          [523.25, 0, 587.33, 0, 659.25, 0, 783.99, 783.99, 0, 698.46, 659.25, 0, 587.33, 523.25, 466.16, 0],
          // Bar 3: Dramatic climax (A5 - G5 - F5 - E5 -> High D6!)
          [880.00, 0, 783.99, 0, 698.46, 659.25, 587.33, 659.25, 698.46, 783.99, 880.00, 1046.50, 1174.66, 0, 1046.50, 880.00],
        ];
        const mFreq = escapeMelody[bar][e16];
        if (mFreq > 0) {
          const leadOsc = this.ctx.createOscillator();
          const leadGain = this.ctx.createGain();
          leadOsc.type = 'sawtooth';
          leadOsc.frequency.setValueAtTime(mFreq, now);
          leadGain.gain.setValueAtTime(0.24, now);
          leadGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          leadOsc.connect(leadGain);
          leadGain.connect(this.musicGain);
          leadOsc.start(now);
          leadOsc.stop(now + 0.16);

          // Sub-octave warm body
          if (e16 % 2 === 0) {
            const subL = this.ctx.createOscillator();
            const subLGain = this.ctx.createGain();
            subL.type = 'triangle';
            subL.frequency.setValueAtTime(mFreq * 0.5, now);
            subLGain.gain.setValueAtTime(0.12, now);
            subLGain.gain.exponentialRampToValueAtTime(0.005, now + 0.16);
            subL.connect(subLGain);
            subLGain.connect(this.musicGain);
            subL.start(now);
            subL.stop(now + 0.17);
          }
        }

      } else {
        // Space, Distorted & Boss tracks
        const notes = scales[(track as 'space' | 'boss' | 'distorted')] || scales.space;

        // Bass note every 2 steps
        if (step % 2 === 0) {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = track === 'boss' ? 'sawtooth' : 'triangle';
          const bassFreq = notes[step % notes.length] * (track === 'boss' ? 0.5 : 0.75);
          bassOsc.frequency.setValueAtTime(bassFreq, now);

          bassGain.gain.setValueAtTime(0.2, now);
          bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

          bassOsc.connect(bassGain);
          bassGain.connect(this.musicGain);

          bassOsc.start(now);
          bassOsc.stop(now + 0.26);
        }

        // Arp melody every step
        if (track === 'boss' || step % 2 === 1) {
          const leadOsc = this.ctx.createOscillator();
          const leadGain = this.ctx.createGain();
          leadOsc.type = 'sine';
          const leadFreq = notes[(step * 3) % notes.length] * 1.5;
          leadOsc.frequency.setValueAtTime(leadFreq, now);

          leadGain.gain.setValueAtTime(0.12, now);
          leadGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

          leadOsc.connect(leadGain);
          leadGain.connect(this.musicGain);

          leadOsc.start(now);
          leadOsc.stop(now + 0.19);
        }
      }
    }, intervalMs);
  }

  public stopMusic() {
    (['city', 'space', 'boss', 'distorted', 'santiscat'] as const).forEach(t => {
      const el = this.customAudioElements[t];
      if (el) {
        try {
          el.pause();
          el.currentTime = 0;
        } catch {
          // ignore
        }
      }
    });
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.musicOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore already stopped
      }
    });
    this.musicOscillators = [];
  }

  public playGreenBeamCharge() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 3.9);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 3.8);
    gain.gain.linearRampToValueAtTime(0.01, now + 4.0);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 4.0);
  }

  public playGreenBeamFire() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(320, now);
    osc1.frequency.exponentialRampToValueAtTime(95, now + 1.8);
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(160, now);
    osc2.frequency.exponentialRampToValueAtTime(45, now + 1.8);
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 1.85);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.85);
    osc2.stop(now + 1.85);
  }

  public playMindControl() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.15);
    osc.frequency.linearRampToValueAtTime(1100, now + 0.3);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playShieldBreak() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.26);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.27);
  }

  public playLightLaser() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.2);
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playMagicOrb() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.linearRampToValueAtTime(784, now + 0.12);
    osc.frequency.linearRampToValueAtTime(1046, now + 0.25);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playEnergyAnvil() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Heavy metallic clang + rumble
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(740, now);
    osc1.frequency.exponentialRampToValueAtTime(60, now + 0.4);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(1100, now);
    osc2.frequency.exponentialRampToValueAtTime(110, now + 0.35);
    gain.gain.setValueAtTime(0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  public playEnergyBlades() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.19);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playTimeStop() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Dramatic clock tick then deep sonic freeze
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, now);
    osc1.frequency.exponentialRampToValueAtTime(60, now + 0.6);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(300, now);
    osc2.frequency.linearRampToValueAtTime(40, now + 0.7);
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.75);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.75);
    osc2.stop(now + 0.75);
  }

  public playTeleport() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.18);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playGravityPull() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(180, now + 1.2);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(45, now);
    osc2.frequency.exponentialRampToValueAtTime(120, now + 1.2);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.3);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 1.35);
    osc2.stop(now + 1.35);
  }

  public playDroneLaser() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.13);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  // --- Level 4: Rhythm Minigame & Santiscat SFX ---

  public playRhythmBeat(type: 'kick' | 'snare' | 'hihat') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    if (type === 'kick') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.15);
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.17);
    } else if (type === 'snare') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.13);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.14);
    } else {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(9000, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  }

  public playRhythmHit(rating: 'perfect' | 'great' | 'miss' = 'great') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (rating === 'perfect') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.0, now + 0.06); // A5
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    } else if (rating === 'great') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.14);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + (rating === 'perfect' ? 0.24 : 0.16));
  }

  public playSantiscatSummon() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Colossal dimension-shattering shockwave
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(60, now);
    osc1.frequency.exponentialRampToValueAtTime(600, now + 0.4);
    osc1.frequency.exponentialRampToValueAtTime(40, now + 1.6);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(120, now);
    osc2.frequency.linearRampToValueAtTime(30, now + 1.8);

    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.0);
    osc2.stop(now + 2.0);
  }

  public playSunBlast() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.18);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playBlackHoleCollapse() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscSub = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.8);

    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(55, now);
    oscSub.frequency.linearRampToValueAtTime(25, now + 1.1);

    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    osc.connect(gain);
    oscSub.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    oscSub.start(now);
    osc.stop(now + 1.2);
    oscSub.stop(now + 1.2);
  }

  public playOneShotFireball() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // High pitched whistle of impending instant doom
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(3200, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.4);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  public playRealitySlash() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.22);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  // --- JUJUTSU KAISEN (SUKUNACAT & GOJOCAT) SFX ---

  public playDomainChant() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Resonant Japanese temple gong / deep bell strike
    const bellOsc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(329.63, now); // E4
    bellOsc.frequency.exponentialRampToValueAtTime(164.81, now + 1.2);

    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(82.41, now); // E2
    subOsc.frequency.exponentialRampToValueAtTime(41.2, now + 1.4);

    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 1.5);

    bellOsc.connect(gain);
    subOsc.connect(gain);
    gain.connect(this.sfxGain);

    bellOsc.start(now);
    subOsc.start(now);
    bellOsc.stop(now + 1.55);
    subOsc.stop(now + 1.55);
  }

  public playDomainExpansion() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Colossal dimension-ripping Malevolent Shrine impact
    const ripOsc = this.ctx.createOscillator();
    const roarOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    ripOsc.type = 'sawtooth';
    ripOsc.frequency.setValueAtTime(2400, now);
    ripOsc.frequency.exponentialRampToValueAtTime(80, now + 0.6);

    roarOsc.type = 'triangle';
    roarOsc.frequency.setValueAtTime(140, now);
    roarOsc.frequency.exponentialRampToValueAtTime(25, now + 1.8);

    gain.gain.setValueAtTime(0.95, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.85);

    ripOsc.connect(gain);
    roarOsc.connect(gain);
    gain.connect(this.sfxGain);

    ripOsc.start(now);
    roarOsc.start(now);
    ripOsc.stop(now + 0.7);
    roarOsc.stop(now + 1.9);
  }

  public playSukunaSlash() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Razor-sharp metallic cleave slice
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2800, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.13);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playSukunaDash() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Demonic high-speed whoosh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(850, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.28);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  public playLapseBlue() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Gravitational suction vortex whine + spatial pull
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.exponentialRampToValueAtTime(1400, now + 0.7);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.linearRampToValueAtTime(880, now + 0.7);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.75);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.75);
    osc2.stop(now + 0.75);
  }

  public playReversalRed() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Violent explosive shockwave detonation
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.45);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.9);

    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.95);

    osc.connect(gain);
    subOsc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 0.5);
    subOsc.stop(now + 1.0);
  }

  public playHollowPurple() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Imaginary mass hollow singularity detonation & harmonic resonance
    const oscCore = this.ctx.createOscillator();
    const oscScream = this.ctx.createOscillator();
    const oscBass = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    oscCore.type = 'sine';
    oscCore.frequency.setValueAtTime(987.77, now); // B5
    oscCore.frequency.exponentialRampToValueAtTime(246.94, now + 0.8);

    oscScream.type = 'sawtooth';
    oscScream.frequency.setValueAtTime(3200, now);
    oscScream.frequency.exponentialRampToValueAtTime(120, now + 1.2);

    oscBass.type = 'triangle';
    oscBass.frequency.setValueAtTime(70, now);
    oscBass.frequency.linearRampToValueAtTime(20, now + 2.0);

    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 2.1);

    oscCore.connect(gain);
    oscScream.connect(gain);
    oscBass.connect(gain);
    gain.connect(this.sfxGain);

    oscCore.start(now);
    oscScream.start(now);
    oscBass.start(now);
    oscCore.stop(now + 1.0);
    oscScream.stop(now + 1.3);
    oscBass.stop(now + 2.1);
  }

  public playShieldDeflect() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Metallic shield clash deflection chime
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(550, now + 0.1);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // --- Santiscat Defeat Cinematic SFX ---

  public playSoulRelease() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Ascending arpeggio of radiant heavenly soul bells releasing from corruption
    const freqs = [329.63, 392.00, 493.88, 587.33, 659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98, 1760.00, 2093.00];
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const st = now + i * 0.12;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, st);
      osc.frequency.exponentialRampToValueAtTime(f * 1.25, st + 0.6);

      gain.gain.setValueAtTime(0.35, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.65);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(st);
      osc.stop(st + 0.7);
    });
  }

  public playShieldWarning() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Pulsating high-urgency cosmic klaxon / hazard alarm
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(960, now);
    osc1.frequency.linearRampToValueAtTime(480, now + 0.28);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1440, now);
    osc2.frequency.linearRampToValueAtTime(720, now + 0.28);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.33);
    osc2.stop(now + 0.33);
  }

  public playCosmicImplosion() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Spacetime sucking inward into a gravitational singularity
    const suctionOsc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    suctionOsc.type = 'sawtooth';
    suctionOsc.frequency.setValueAtTime(80, now);
    suctionOsc.frequency.exponentialRampToValueAtTime(2400, now + 2.0);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.linearRampToValueAtTime(35, now + 2.0);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.95, now + 1.95);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.1);

    suctionOsc.connect(gain);
    subOsc.connect(gain);
    gain.connect(this.sfxGain);

    suctionOsc.start(now);
    subOsc.start(now);
    suctionOsc.stop(now + 2.15);
    subOsc.stop(now + 2.15);
  }

  public playCosmicSupernovaDefeat() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Colossal detonating blast
    const boomOsc = this.ctx.createOscillator();
    const roarOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    boomOsc.type = 'sawtooth';
    boomOsc.frequency.setValueAtTime(220, now);
    boomOsc.frequency.exponentialRampToValueAtTime(18, now + 3.2);

    roarOsc.type = 'triangle';
    roarOsc.frequency.setValueAtTime(110, now);
    roarOsc.frequency.exponentialRampToValueAtTime(22, now + 2.5);

    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 3.3);

    boomOsc.connect(gain);
    roarOsc.connect(gain);
    gain.connect(this.sfxGain);

    boomOsc.start(now);
    roarOsc.start(now);
    boomOsc.stop(now + 3.35);
    roarOsc.stop(now + 3.35);

    // Triumphant crystalline aftermath chords (C - E - G - B - D - G)
    const chord = [261.63, 329.63, 392.00, 493.88, 587.33, 783.99, 1046.5];
    chord.forEach((f, i) => {
      const cOsc = this.ctx!.createOscillator();
      const cGain = this.ctx!.createGain();
      const st = now + 0.35 + i * 0.08;
      cOsc.type = 'sine';
      cOsc.frequency.setValueAtTime(f, st);

      cGain.gain.setValueAtTime(0.45, st);
      cGain.gain.exponentialRampToValueAtTime(0.005, st + 2.8);

      cOsc.connect(cGain);
      cGain.connect(this.sfxGain!);

      cOsc.start(st);
      cOsc.stop(st + 2.9);
    });
  }

  public playQuestComplete() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Triumphant power-up chime arpeggio: C5 - E5 - G5 - B5 - C6 (523Hz - 659Hz - 784Hz - 987Hz - 1046Hz)
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const noteTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.35, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.005, noteTime + 0.65);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.7);
    });

    // Sub-bass warm confirmation swell
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(130.81, now);
    sub.frequency.exponentialRampToValueAtTime(261.63, now + 0.35);

    subGain.gain.setValueAtTime(0.3, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);

    sub.start(now);
    sub.stop(now + 0.65);
  }

  public playEscapeWarningAlarm() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Dual-tone urgent alert klaxon (880Hz / 1320Hz oscillating alarm)
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + i * 0.32;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.linearRampToValueAtTime(1320, t + 0.16);
      osc.frequency.linearRampToValueAtTime(740, t + 0.30);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.30);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.31);
    }
  }

  public playPlanetCollapse() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Deep seismic sub rumble
    const rumble = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(70, now);
    rumble.frequency.exponentialRampToValueAtTime(18, now + 1.8);
    rumbleGain.gain.setValueAtTime(0.8, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.01, now + 1.9);

    rumble.connect(rumbleGain);
    rumbleGain.connect(this.sfxGain);
    rumble.start(now);
    rumble.stop(now + 1.95);

    // Planetary cracking crust noise
    const crack = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crack.type = 'square';
    crack.frequency.setValueAtTime(450, now);
    crack.frequency.exponentialRampToValueAtTime(60, now + 0.8);
    crackGain.gain.setValueAtTime(0.5, now);
    crackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

    crack.connect(crackGain);
    crackGain.connect(this.sfxGain);
    crack.start(now);
    crack.stop(now + 0.9);
  }

  public playSupernovaExplosion() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Stellar implosion-to-explosion blast
    const blast = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    blast.type = 'triangle';
    blast.frequency.setValueAtTime(280, now);
    blast.frequency.exponentialRampToValueAtTime(25, now + 2.2);

    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 2.3);

    blast.connect(gain);
    gain.connect(this.sfxGain);
    blast.start(now);
    blast.stop(now + 2.35);

    // Sizzling plasma shockwave hiss
    const hiss = this.ctx.createOscillator();
    const hissGain = this.ctx.createGain();
    hiss.type = 'sawtooth';
    hiss.frequency.setValueAtTime(3200, now);
    hiss.frequency.exponentialRampToValueAtTime(140, now + 1.2);
    hissGain.gain.setValueAtTime(0.4, now);
    hissGain.gain.exponentialRampToValueAtTime(0.01, now + 1.25);

    hiss.connect(hissGain);
    hissGain.connect(this.sfxGain);
    hiss.start(now);
    hiss.stop(now + 1.3);
  }

  public playWormholeWarp() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Ascending hyperspace dimensional warp chords
    const warpChords = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51];
    warpChords.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.4);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.7);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.75);
    });

    // Sub whoosh
    const whoosh = this.ctx.createOscillator();
    const whooshGain = this.ctx.createGain();
    whoosh.type = 'sawtooth';
    whoosh.frequency.setValueAtTime(80, now);
    whoosh.frequency.exponentialRampToValueAtTime(1200, now + 0.9);
    whooshGain.gain.setValueAtTime(0.6, now);
    whooshGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

    whoosh.connect(whooshGain);
    whooshGain.connect(this.sfxGain);
    whoosh.start(now);
    whoosh.stop(now + 1.05);
  }

  public stopAll() {
    this.stopMusic();
    this.stopGammaSound();
  }
}

export const soundManager = new SoundManager();
