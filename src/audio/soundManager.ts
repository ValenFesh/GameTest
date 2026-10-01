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
  private customTrackUrls: Record<'city' | 'space' | 'boss', string | null> = {
    city: null,
    space: null,
    boss: null,
  };
  private customTrackNames: Record<'city' | 'space' | 'boss', string> = {
    city: 'Tema Oficial Nivel 1 (Funk Disco)',
    space: 'Tema Oficial Nivel 2 (Cosmos Synth)',
    boss: 'Tema Oficial Nanovalen (Dark Phrygian)',
  };
  private customAudioElements: Record<'city' | 'space' | 'boss', HTMLAudioElement | null> = {
    city: null,
    space: null,
    boss: null,
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
    (['city', 'space', 'boss'] as const).forEach(track => {
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

  // --- Dynamic Procedural Music & Custom Audio ---

  public setCustomTrack(track: 'city' | 'space' | 'boss', fileOrUrl: File | string, fileName?: string) {
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
      this.playMusic(prev);
    }
  }

  public resetDefaultTrack(track: 'city' | 'space' | 'boss') {
    const existing = this.customAudioElements[track];
    if (existing) {
      existing.pause();
      this.customAudioElements[track] = null;
    }
    this.customTrackUrls[track] = null;
    const defaults: Record<'city' | 'space' | 'boss', string> = {
      city: 'Tema Oficial Nivel 1 (Funk Disco)',
      space: 'Tema Oficial Nivel 2 (Cosmos Synth)',
      boss: 'Tema Oficial Nanovalen (Dark Phrygian)',
    };
    this.customTrackNames[track] = defaults[track];

    if (this.currentTrack === track) {
      this.stopMusic();
      const prev = this.currentTrack;
      this.currentTrack = null;
      this.playMusic(prev);
    }
  }

  public getTrackName(track: 'city' | 'space' | 'boss'): string {
    return this.customTrackNames[track];
  }

  public hasCustomTrack(track: 'city' | 'space' | 'boss'): boolean {
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

  public playMusic(track: 'city' | 'space' | 'boss' | 'none') {
    if (this.currentTrack === track) return;
    this.currentTrack = track;
    this.stopMusic();

    if (track === 'none' || this.isMuted) return;

    // Check if current stage track has a custom audio track configured
    if (track === 'city' || track === 'space' || track === 'boss') {
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
          elem.play().catch(e => {
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
    // City Level 1 is set to 118 BPM with 16th-note funky disco steps matching the user's uploaded track
    const bpm = track === 'city' ? 118 : track === 'boss' ? 140 : 100;
    const intervalMs = track === 'city' ? (60 / bpm) * 1000 * 0.25 : (60 / bpm) * 1000 * 0.5;

    // Scales for other tracks
    const scales = {
      space: [174.61, 220, 261.63, 329.63, 392, 523.25], // F major / Lydian
      boss: [110, 116.54, 130.81, 146.83, 164.81, 220], // Dark Phrygian
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

      } else {
        // Space & Boss tracks
        const notes = scales[track as 'space' | 'boss'];

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
    (['city', 'space', 'boss'] as const).forEach(t => {
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

  public stopAll() {
    this.stopMusic();
    this.stopGammaSound();
  }
}

export const soundManager = new SoundManager();
