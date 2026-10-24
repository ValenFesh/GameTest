import { soundManager } from '../audio/soundManager';
import {
  AttackType,
  BlackFlashStrike,
  Boss,
  BossAttack,
  BossDrone,
  Camera,
  CharacterSkinId,
  CinematicState,
  DamageNumber,
  GameStage,
  GameStats,
  Obstacle,
  Particle,
  Player,
  Projectile,
  RealityGlitch,
  RhythmBeat,
  RhythmGameState,
  SantiscatAttack,
  SantiscatBoss,
} from '../types/game';
import {
  CHARACTER_SKINS,
  getSavedNanovalenWins,
  saveNanovalenWins,
  getSavedSelectedSkin,
  saveSelectedSkin,
  isSkinUnlocked,
  getAdminUnlockAll,
  saveAdminUnlockAll,
} from './skins';

export class GameEngine {
  public width: number = 960;
  public height: number = 600;

  public currentSkin: CharacterSkinId = 'catvalen';
  public nanovalenWins: number = 0;
  public santiscatWins: number = 0;
  public adminUnlockAll: boolean = false;
  public godMode: boolean = false;
  public infiniteHeals: boolean = false;
  public noCooldowns: boolean = false;

  public stage: GameStage = 'start';
  public stageProgress: number = 0; // 0 to 100
  public stageTarget: number = 100;
  public screenShake: number = 0;

  public player: Player;
  public boss: Boss | null = null;
  public drones: BossDrone[] = [];
  public cinematic: CinematicState | null = null;
  public obstacles: Obstacle[] = [];
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public blackFlashStrikes: BlackFlashStrike[] = [];
  public damageNumbers: DamageNumber[] = [];

  // Level 4: Distorted Reality, Rhythm Summoning, and Santiscat Boss
  public camera: Camera;
  public santiscat: SantiscatBoss | null = null;
  public rhythmGame: RhythmGameState | null = null;
  public glitches: RealityGlitch[] = [];

  public stats: GameStats = {
    score: 0,
    buildingsDestroyed: 0,
    asteroidsDestroyed: 0,
    nanovalenDamageDealt: 0,
    blackFlashesCount: 0,
    bossBlackFlashesCount: 0,
    totalAttacksLanded: 0,
    timeElapsed: 0,
    deathReason: 'standard',
  };

  private keys: Record<string, boolean> = {};
  private obstacleSpawnTimer: number = 0;
  private transitionTimer: number = 0;
  private bossIntroTimer: number = 0;
  private punchHandToggle: boolean = false;
  private onGameOverCallback?: () => void;
  private onVictoryCallback?: () => void;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.camera = {
      x: 0,
      y: 0,
      viewportWidth: width,
      viewportHeight: height,
      worldWidth: width,
      worldHeight: height,
    };
    this.nanovalenWins = getSavedNanovalenWins();
    this.adminUnlockAll = getAdminUnlockAll();
    this.currentSkin = getSavedSelectedSkin();
    this.player = this.createInitialPlayer(this.currentSkin);
  }

  public setCallbacks(onGameOver: () => void, onVictory: () => void) {
    this.onGameOverCallback = onGameOver;
    this.onVictoryCallback = onVictory;
  }

  public setAdminUnlockAll(val: boolean) {
    this.adminUnlockAll = val;
    saveAdminUnlockAll(val);
  }

  public setGodMode(val: boolean) {
    this.godMode = val;
  }

  public setInfiniteHeals(val: boolean) {
    this.infiniteHeals = val;
    if (val && this.player) {
      this.player.healsRemaining = this.player.maxHeals;
    }
  }

  public setNoCooldowns(val: boolean) {
    this.noCooldowns = val;
  }

  public instaKillBoss() {
    if (this.boss && (this.stage === 'boss' || this.stage === 'boss_intro')) {
      this.applyDamageToBoss(99999, 'punch', this.boss.x, this.boss.y, true);
    }
  }

  public instaKillSantiscat() {
    if (this.santiscat && this.stage === 'santiscat_boss') {
      this.applyDamageToSantiscat(99999, 'punch', this.santiscat.x, this.santiscat.y);
    }
  }

  public jumpToStage(targetStage: GameStage) {
    if (targetStage === 'start') {
      this.resetToMenu();
    } else {
      this.startStage(targetStage);
    }
  }

  public selectSkin(skinId: CharacterSkinId): boolean {
    if (!CHARACTER_SKINS[skinId]) return false;
    this.currentSkin = skinId;
    saveSelectedSkin(skinId);
    this.player = this.createInitialPlayer(skinId);
    return true;
  }

  public setNanovalenWins(wins: number) {
    this.nanovalenWins = Math.max(0, wins);
    saveNanovalenWins(this.nanovalenWins);
    this.stats.nanovalenWins = this.nanovalenWins;
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.camera.viewportWidth = width;
    this.camera.viewportHeight = height;
    if (this.stage !== 'distorted' && this.stage !== 'rhythm_summon' && this.stage !== 'santiscat_boss') {
      this.camera.worldWidth = width;
      this.camera.worldHeight = height;
      if (this.player.x > width - 100) this.player.x = width - 100;
      if (this.player.y > height - 80) this.player.y = height - 80;
    }
  }

  public createInitialPlayer(skinId: CharacterSkinId = this.currentSkin): Player {
    const skinConfig = CHARACTER_SKINS[skinId] || CHARACTER_SKINS.catvalen;
    const maxHeals = skinId === 'gata_azul_manchas' ? 15 : 10;

    return {
      x: 120,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      width: 58,
      height: 58,
      hp: skinConfig.maxHp,
      maxHp: skinConfig.maxHp,
      shieldActive: false,
      shieldTimer: 0,
      shieldMaxDuration: 2.8,
      shieldCooldown: 0,
      shieldMaxCooldown: 7.5,
      shieldColor: skinConfig.shieldColor,
      leftHand: { x: -32, y: 14, punchProgress: 0 },
      rightHand: { x: 32, y: 14, punchProgress: 0 },
      punchCooldown: 0,
      punchMaxCooldown: 0.75,
      fireballCooldown: 0,
      fireballMaxCooldown: 2.2,
      lightningCooldown: 0,
      lightningMaxCooldown: 3.4,
      powerBurstCooldown: 0,
      powerBurstMaxCooldown: 2.6,
      healsRemaining: maxHeals,
      maxHeals: maxHeals,
      healCooldown: 0,
      isInvulnerable: false,
      invulnerableTimer: 0,
      facing: 1,
      eyeState: 'normal',
      animationTime: 0,

      skin: skinId,

      special1Cooldown: 0,
      special1MaxCooldown: 6.0,
      special2Cooldown: 0,
      special2MaxCooldown: 4.0,

      greenBeamCharging: false,
      greenBeamChargeTimer: 0,
      greenBeamChargeMax: 4.0,
      greenBeamFiring: false,
      greenBeamFiringTimer: 0,

      mindControlActive: false,
      mindControlTimer: 0,

      timeStopActive: false,
      timeStopTimer: 0,
      timeStopMaxDuration: 4.5,

      healRegenAccumulator: 0,
    };
  }

  public startStage(stage: GameStage) {
    this.stage = stage;
    this.stageProgress = 0;
    this.obstacles = [];
    this.projectiles = [];
    this.drones = [];
    this.blackFlashStrikes = [];

    if (stage === 'city') {
      this.camera.worldWidth = this.width;
      this.camera.worldHeight = this.height;
      this.stageTarget = 100;
      soundManager.playMusic('city');
    } else if (stage === 'space') {
      this.camera.worldWidth = this.width;
      this.camera.worldHeight = this.height;
      this.stageTarget = 100;
      soundManager.playMusic('space');
    } else if (stage === 'boss') {
      this.camera.worldWidth = this.width;
      this.camera.worldHeight = this.height;
      soundManager.playMusic('boss');
      this.initBoss();
    } else if (stage === 'distorted') {
      soundManager.playMusic('distorted');
      this.initDistortedWorld();
    } else if (stage === 'rhythm_summon') {
      soundManager.playMusic('distorted');
      this.initRhythmSummon();
    } else if (stage === 'santiscat_boss') {
      soundManager.playMusic('santiscat');
      this.initSantiscatBoss();
    }
  }

  public resetGame() {
    soundManager.stopGammaSound();
    this.player = this.createInitialPlayer();
    this.cinematic = null;
    this.drones = [];
    this.santiscat = null;
    this.rhythmGame = null;
    this.glitches = [];
    this.stats = {
      score: 0,
      buildingsDestroyed: 0,
      asteroidsDestroyed: 0,
      nanovalenDamageDealt: 0,
      blackFlashesCount: 0,
      bossBlackFlashesCount: 0,
      totalAttacksLanded: 0,
      timeElapsed: 0,
      deathReason: 'standard',
    };
    this.startStage('city');
  }

  public resetToMenu() {
    soundManager.stopMusic();
    soundManager.stopGammaSound();
    this.stage = 'start';
    this.stageProgress = 0;
    this.obstacles = [];
    this.projectiles = [];
    this.drones = [];
    this.particles = [];
    this.blackFlashStrikes = [];
    this.damageNumbers = [];
    this.cinematic = null;
    this.boss = null;
    this.santiscat = null;
    this.rhythmGame = null;
    this.glitches = [];
    this.camera.x = 0;
    this.camera.y = 0;
    this.player = this.createInitialPlayer();
    this.stats = {
      score: 0,
      buildingsDestroyed: 0,
      asteroidsDestroyed: 0,
      nanovalenDamageDealt: 0,
      blackFlashesCount: 0,
      bossBlackFlashesCount: 0,
      totalAttacksLanded: 0,
      timeElapsed: 0,
      deathReason: 'standard',
    };
  }

  // --- Input Handlers ---

  public handleKeyDown(code: string) {
    this.keys[code.toLowerCase()] = true;

    // Skip cinematic on any key or Space
    if (this.stage === 'cinematic_earth_destruction') {
      this.skipCinematic();
      return;
    }

    // In Distorted reality: interact with Ancient Altar
    if (this.stage === 'distorted' && (code === 'Space' || code === 'KeyE')) {
      const distToAltar = Math.hypot(this.player.x - 1600, this.player.y - 1200);
      if (distToAltar < 140) {
        this.startStage('rhythm_summon');
        return;
      }
    }

    // In Rhythm Summon Minigame: tap the beat!
    if (this.stage === 'rhythm_summon') {
      if (code === 'Space' || code === 'KeyE' || code === 'KeyJ' || code === 'KeyF') {
        this.hitRhythmBeat();
        return;
      }
    }

    // Direct action hotkeys
    if (code === 'KeyF' || code === 'KeyH') {
      this.performHeal();
    } else if (code === 'Space' || code === 'KeyJ') {
      this.performPunch();
    } else if (code === 'Digit1' || code === 'KeyQ' || code === 'KeyK') {
      this.performFireball();
    } else if (code === 'Digit2' || code === 'KeyE' || code === 'KeyL') {
      this.performLightning();
    } else if (code === 'Digit3' || code === 'KeyR' || code === 'KeyU') {
      this.performPowerBurst();
    } else if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyC') {
      this.activateShield();
    } else if (code === 'Digit4' || code === 'KeyG') {
      this.performSpecial1();
    } else if (code === 'Digit5' || code === 'KeyT' || code === 'KeyV') {
      this.performSpecial2();
    }
  }

  public handleKeyUp(code: string) {
    this.keys[code.toLowerCase()] = false;
  }

  public setTouchDirection(dx: number, dy: number) {
    if (this.stage === 'gameover' || this.stage === 'victory' || this.stage === 'cinematic_earth_destruction') return;
    const speed = 7.5;
    this.player.vx = dx * speed;
    this.player.vy = dy * speed;
  }

  // --- Catvalen Actions with Cooldowns ---

  /**
   * 1. Melee punch with circular floating hands (Cooldown: 0.75s)
   */
  public performPunch(): boolean {
    if (this.player.punchCooldown > 0 || this.stage === 'start' || this.stage === 'gameover' || this.stage === 'victory' || this.stage === 'cinematic_earth_destruction') {
      return false;
    }

    this.player.punchCooldown = this.player.punchMaxCooldown;
    this.punchHandToggle = !this.punchHandToggle;

    if (this.punchHandToggle) {
      this.player.rightHand.punchProgress = 1.0;
    } else {
      this.player.leftHand.punchProgress = 1.0;
    }

    soundManager.playPunch();

    // Melee hitbox in front of player
    const punchX = this.player.x + 40;
    const punchY = this.player.y;
    const punchRange = 65;

    // Check hit on obstacles
    this.obstacles.forEach(obs => {
      if (Math.abs(punchX - (obs.x + obs.width / 2)) < punchRange + obs.width / 2 &&
          Math.abs(punchY - (obs.y + obs.height / 2)) < punchRange + obs.height / 2) {
        this.applyDamageToObstacle(obs, 50, 'punch', punchX, punchY);
      }
    });

    // Check hit on Drones
    this.drones.forEach(d => {
      if (Math.hypot(punchX - d.x, punchY - d.y) < punchRange + d.size) {
        this.damageDrone(d, 55, punchX, punchY);
      }
    });

    // Check hit on Boss (Punch can penetrate Nanovalen even with energy shield!)
    if (this.boss && (this.stage === 'boss')) {
      const bossDist = Math.hypot(punchX - this.boss.x, punchY - this.boss.y);
      if (bossDist < 100) {
        this.applyDamageToBoss(45, 'punch', punchX, punchY, true);
      }
    }

    // Check hit on Santiscat Boss in Level 4
    if (this.santiscat && this.stage === 'santiscat_boss') {
      const sDist = Math.hypot(punchX - this.santiscat.x, punchY - this.santiscat.y);
      if (sDist < 120) {
        this.applyDamageToSantiscat(55, 'punch', punchX, punchY);
      }
    }

    return true;
  }

  /**
   * 2. Bola de fuego (Cooldown: 2.2s)
   */
  public performFireball(): boolean {
    if (this.player.fireballCooldown > 0 || this.stage === 'start' || this.stage === 'gameover' || this.stage === 'victory' || this.stage === 'cinematic_earth_destruction') {
      return false;
    }

    this.player.fireballCooldown = this.player.fireballMaxCooldown;
    this.player.eyeState = 'squint';
    setTimeout(() => {
      if (this.player.eyeState === 'squint') this.player.eyeState = 'normal';
    }, 200);

    soundManager.playFireball();

    this.projectiles.push({
      id: Math.random().toString(),
      type: 'player_fireball',
      x: this.player.x + 35,
      y: this.player.y,
      vx: 13,
      vy: (Math.random() - 0.5) * 1.2,
      radius: 14,
      damage: 85,
      duration: 0,
      maxDuration: 2.2,
      color: '#f97316',
      glowColor: '#ea580c',
      trail: [],
    });

    return true;
  }

  /**
   * 3. Rayo (Cooldown: 3.4s)
   */
  public performLightning(): boolean {
    if (this.player.lightningCooldown > 0 || this.stage === 'start' || this.stage === 'gameover' || this.stage === 'victory' || this.stage === 'cinematic_earth_destruction') {
      return false;
    }

    this.player.lightningCooldown = this.player.lightningMaxCooldown;
    this.player.eyeState = 'fierce';
    setTimeout(() => {
      if (this.player.eyeState === 'fierce') this.player.eyeState = 'normal';
    }, 250);

    soundManager.playLightning();

    // High velocity piercing lightning spear
    this.projectiles.push({
      id: Math.random().toString(),
      type: 'player_lightning',
      x: this.player.x + 40,
      y: this.player.y,
      vx: 24,
      vy: 0,
      radius: 12,
      damage: 160,
      duration: 0,
      maxDuration: 1.5,
      color: '#38bdf8',
      glowColor: '#0284c7',
      trail: [],
    });

    return true;
  }

  /**
   * 4. Ráfagas de poder (Cooldown: 2.6s)
   */
  public performPowerBurst(): boolean {
    if (this.player.powerBurstCooldown > 0 || this.stage === 'start' || this.stage === 'gameover' || this.stage === 'victory' || this.stage === 'cinematic_earth_destruction') {
      return false;
    }

    this.player.powerBurstCooldown = this.player.powerBurstMaxCooldown;

    // Fire 3 staggered energy bursts
    [-6, 0, 6].forEach((angleDeg, i) => {
      setTimeout(() => {
        if (this.stage === 'gameover' || this.stage === 'victory' || this.stage === 'cinematic_earth_destruction') return;
        soundManager.playPowerBurst();
        const rad = (angleDeg * Math.PI) / 180;
        this.projectiles.push({
          id: Math.random().toString(),
          type: 'player_burst',
          x: this.player.x + 35,
          y: this.player.y + (i - 1) * 7,
          vx: Math.cos(rad) * 16,
          vy: Math.sin(rad) * 16,
          radius: 8,
          damage: 35,
          duration: 0,
          maxDuration: 1.8,
          color: '#06b6d4',
          glowColor: '#0891b2',
          trail: [],
        });
      }, i * 65);
    });

    return true;
  }

  /**
   * 5. Escudo (Cooldown: 7.5s, Duración: 2.8s) - Color depende de la skin
   */
  public activateShield(): boolean {
    if (this.player.shieldCooldown > 0 || this.player.shieldActive || this.stage === 'start' || this.stage === 'gameover' || this.stage === 'cinematic_earth_destruction') {
      return false;
    }

    const skinConfig = CHARACTER_SKINS[this.player.skin] || CHARACTER_SKINS.catvalen;
    this.player.shieldActive = true;
    this.player.shieldTimer = this.player.shieldMaxDuration;
    this.player.shieldCooldown = this.player.shieldMaxCooldown;
    this.player.shieldColor = skinConfig.shieldColor;
    soundManager.playShield();

    // Spawn shield activation particles with character's shield color
    for (let i = 0; i < 16; i++) {
      const ang = (i * Math.PI * 2) / 16;
      this.particles.push({
        x: this.player.x + Math.cos(ang) * 45,
        y: this.player.y + Math.sin(ang) * 45,
        vx: Math.cos(ang) * 2.5,
        vy: Math.sin(ang) * 2.5,
        size: 4,
        color: skinConfig.shieldColor,
        life: 0.5,
        maxLife: 0.5,
        alpha: 1,
        shape: 'spark',
      });
    }

    return true;
  }

  /**
   * 6. Curación (Presionando F)
   * Para Gata Azul: restaura +50 HP (hasta 15 usos) y disuelve proyectiles enemigos cercanos.
   * Para otros: restaura +35 HP (hasta 10 usos).
   */
  public performHeal(): boolean {
    const p = this.player;

    if (
      this.stage === 'start' ||
      this.stage === 'gameover' ||
      this.stage === 'victory' ||
      this.stage === 'cinematic_earth_destruction'
    ) {
      return false;
    }

    if (p.healsRemaining <= 0) {
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: `¡SIN CURAS (0/${p.maxHeals})!`,
        x: p.x,
        y: p.y - 35,
        vy: -1.2,
        color: '#f87171',
        isBlackFlash: false,
        life: 0.9,
        maxLife: 0.9,
        scale: 1.15,
      });
      return false;
    }

    if (p.healCooldown > 0) {
      return false;
    }

    if (p.hp >= p.maxHp) {
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: '¡VIDA AL MÁXIMO!',
        x: p.x,
        y: p.y - 35,
        vy: -1.0,
        color: '#4ade80',
        isBlackFlash: false,
        life: 0.8,
        maxLife: 0.8,
        scale: 1.1,
      });
      return false;
    }

    // Deduct one heal
    p.healsRemaining--;
    p.healCooldown = 0.85;

    const healAmount = p.skin === 'gata_azul_manchas' ? 50 : 35;
    const oldHp = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + healAmount);
    const actualHealed = Math.round(p.hp - oldHp);

    soundManager.playHeal();

    // If Gata Azul, also clear nearby enemy projectiles!
    if (p.skin === 'gata_azul_manchas') {
      this.projectiles = this.projectiles.filter(proj => {
        if (!proj.type.startsWith('boss_')) return true;
        const dist = Math.hypot(proj.x - p.x, proj.y - p.y);
        return dist > 170;
      });
    }

    // Floating green healing number
    this.damageNumbers.push({
      id: Math.random().toString(),
      text: `+${actualHealed} HP (${p.healsRemaining}/${p.maxHeals})`,
      x: p.x,
      y: p.y - 35,
      vy: -1.8,
      color: '#4ade80',
      isBlackFlash: false,
      life: 1.3,
      maxLife: 1.3,
      scale: 1.45,
    });

    // Emerald sparkles and radiant healing particles
    for (let i = 0; i < 22; i++) {
      const ang = (i * Math.PI * 2) / 22;
      const speed = 1.6 + Math.random() * 2.4;
      this.particles.push({
        x: p.x + (Math.random() - 0.5) * 24,
        y: p.y + (Math.random() - 0.5) * 24,
        vx: Math.cos(ang) * speed * 0.7,
        vy: -Math.abs(Math.sin(ang) * speed) - 1.4,
        size: 3 + Math.random() * 3.5,
        color: i % 2 === 0 ? '#4ade80' : '#86efac',
        life: 0.75 + Math.random() * 0.35,
        maxLife: 1.1,
        alpha: 1,
        shape: i % 3 === 0 ? 'star' : 'spark',
      });
    }

    return true;
  }

  // --- Habilidades Especiales Específicas de cada Skin ---

  /**
   * Habilidad Especial 1 (Tecla [4] / [G] o botón HUD)
   */
  public performSpecial1(): boolean {
    const p = this.player;
    if (
      p.special1Cooldown > 0 ||
      this.stage === 'start' ||
      this.stage === 'gameover' ||
      this.stage === 'victory' ||
      this.stage === 'cinematic_earth_destruction'
    ) {
      return false;
    }

    switch (p.skin) {
      case 'gata_gris': {
        // Rayo verde que tarda 4 segundos en cargarse y no te puedes mover durante la carga
        if (p.greenBeamCharging || p.greenBeamFiring) return false;
        p.greenBeamCharging = true;
        p.greenBeamChargeTimer = 0;
        p.greenBeamChargeMax = 4.0;
        p.special1Cooldown = 9.0;
        p.special1MaxCooldown = 9.0;
        soundManager.playGreenBeamCharge();
        this.damageNumbers.push({
          id: Math.random().toString(),
          text: '⚡ CARGANDO RAYO VERDE (4s)...',
          x: p.x,
          y: p.y - 35,
          vy: -1.2,
          color: '#22c55e',
          isBlackFlash: false,
          life: 1.8,
          maxLife: 1.8,
          scale: 1.25,
        });
        return true;
      }

      case 'gato_negro_blanco': {
        // Manipulación / Control mental: Nanovalen se pega solo
        p.special1Cooldown = 8.0;
        p.special1MaxCooldown = 8.0;
        soundManager.playMindControl();
        if (this.boss && this.stage === 'boss') {
          this.boss.mindControlTimer = 2.5;
          this.boss.mindControlSelfPunchCount = 0;
          this.boss.currentAttack = 'idle';
          this.damageNumbers.push({
            id: Math.random().toString(),
            text: '🧠 ¡CONTROL MENTAL: AUTO-GOLPES!',
            x: this.boss.x,
            y: this.boss.y - 35,
            vy: -1.6,
            color: '#d946ef',
            isBlackFlash: false,
            life: 1.5,
            maxLife: 1.5,
            scale: 1.35,
          });
        } else {
          // In city/space: telekinetic shockwave destroys closest 3 obstacles
          let crushed = 0;
          this.obstacles.forEach(obs => {
            if (crushed < 3 && obs.x > p.x) {
              this.applyDamageToObstacle(obs, 220, 'mind_control', obs.x + 20, obs.y + 20);
              crushed++;
            }
          });
        }
        return true;
      }

      case 'gato_blanco_manchas': {
        // Láser lumínico amarillo de impacto instantáneo
        p.special1Cooldown = 4.0;
        p.special1MaxCooldown = 4.0;
        soundManager.playLightLaser();
        this.screenShake = 12;

        this.projectiles.push({
          id: Math.random().toString(),
          type: 'player_light_laser',
          x: p.x + 40,
          y: p.y,
          vx: 36,
          vy: 0,
          radius: 16,
          damage: 220,
          duration: 0,
          maxDuration: 0.85,
          color: '#facc15',
          glowColor: '#eab308',
          trail: [],
        });

        // Instant pierce damage to all obstacles in line
        this.obstacles.forEach(obs => {
          if (Math.abs(p.y - (obs.y + obs.height / 2)) < obs.height / 2 + 25 && obs.x > p.x) {
            this.applyDamageToObstacle(obs, 220, 'light_laser', obs.x + 20, p.y);
          }
        });

        // Instant pierce damage to all drones in line
        this.drones.forEach(d => {
          if (Math.abs(p.y - d.y) < d.size + 25 && d.x > p.x) {
            this.damageDrone(d, 220, d.x, p.y);
          }
        });

        if (this.boss && this.stage === 'boss' && Math.abs(p.y - this.boss.y) < 70 && this.boss.x > p.x) {
          this.applyDamageToBoss(240, 'light_laser', this.boss.x, p.y, false);
        }
        return true;
      }

      case 'gata_azul_manchas': {
        // Bolas de poder mágico verde/celeste (teledirigidas)
        p.special1Cooldown = 3.5;
        p.special1MaxCooldown = 3.5;
        soundManager.playMagicOrb();

        [-18, 0, 18].forEach((angleDeg, i) => {
          const rad = (angleDeg * Math.PI) / 180;
          this.projectiles.push({
            id: Math.random().toString(),
            type: 'player_magic_orb',
            x: p.x + 35,
            y: p.y + (i - 1) * 10,
            vx: Math.cos(rad) * 14,
            vy: Math.sin(rad) * 14,
            radius: 12,
            damage: 85,
            duration: 0,
            maxDuration: 3.2,
            color: '#10b981',
            glowColor: '#38bdf8',
            trail: [],
          });
        });
        return true;
      }

      case 'perro_rubio': {
        // Creación de objetos de la nada: Yunque masivo de energía cósmica
        p.special1Cooldown = 5.5;
        p.special1MaxCooldown = 5.5;
        soundManager.playEnergyAnvil();

        const targetX = this.boss && this.stage === 'boss' ? this.boss.x : p.x + 220;
        this.projectiles.push({
          id: Math.random().toString(),
          type: 'player_energy_anvil',
          x: targetX,
          y: -80,
          vx: 0,
          vy: 16,
          radius: 32,
          damage: 320,
          duration: 0,
          maxDuration: 2.5,
          color: '#facc15',
          glowColor: '#ca8a04',
          trail: [],
        });
        return true;
      }

      case 'perro_marron': {
        // Detener el tiempo: se pausa todo menos el jugador y puede atacar a Nanovalen
        p.special1Cooldown = 12.0;
        p.special1MaxCooldown = 12.0;
        p.timeStopActive = true;
        p.timeStopTimer = 4.5;
        p.timeStopMaxDuration = 4.5;
        soundManager.playTimeStop();
        this.screenShake = 16;
        this.damageNumbers.push({
          id: Math.random().toString(),
          text: '⏳ ¡TIEMPO DETENIDO (4.5s)!',
          x: p.x,
          y: p.y - 35,
          vy: -1.6,
          color: '#f59e0b',
          isBlackFlash: false,
          life: 1.8,
          maxLife: 1.8,
          scale: 1.4,
        });
        return true;
      }

      default:
        return this.performPowerBurst();
    }
  }

  /**
   * Habilidad Especial 2 (Tecla [5] / [T] / [V] o botón HUD)
   */
  public performSpecial2(): boolean {
    const p = this.player;
    if (
      p.special2Cooldown > 0 ||
      this.stage === 'start' ||
      this.stage === 'gameover' ||
      this.stage === 'victory' ||
      this.stage === 'cinematic_earth_destruction'
    ) {
      return false;
    }

    switch (p.skin) {
      case 'gato_negro_blanco': {
        // Desactivar escudo de Nanovalen
        p.special2Cooldown = 7.0;
        p.special2MaxCooldown = 7.0;
        soundManager.playShieldBreak();
        if (this.boss) {
          this.boss.shieldActive = false;
          this.boss.shieldTimer = 0;
          this.boss.shieldDisabledTimer = 5.0;
          this.damageNumbers.push({
            id: Math.random().toString(),
            text: '💥 ¡ESCUDO DESACTIVADO!',
            x: this.boss.x,
            y: this.boss.y - 30,
            vy: -1.5,
            color: '#c084fc',
            isBlackFlash: false,
            life: 1.4,
            maxLife: 1.4,
            scale: 1.35,
          });
          this.spawnHitParticles(this.boss.x, this.boss.y, '#c084fc', 22);
        } else {
          // Repel obstacles
          this.obstacles.forEach(o => {
            o.x += 120;
            o.hp -= 80;
          });
        }
        return true;
      }

      case 'gato_blanco_manchas': {
        // Destello fotónico (aceleración lumínica extrema)
        p.special2Cooldown = 3.5;
        p.special2MaxCooldown = 3.5;
        soundManager.playLightLaser();
        p.x = Math.min(this.width - 50, p.x + 220);
        p.isInvulnerable = true;
        p.invulnerableTimer = 1.2;
        this.spawnHitParticles(p.x, p.y, '#facc15', 18);
        return true;
      }

      case 'perro_rubio': {
        // Crear 4 espadas de energía materializadas que buscan enemigos
        p.special2Cooldown = 3.8;
        p.special2MaxCooldown = 3.8;
        soundManager.playEnergyBlades();
        [-30, -10, 10, 30].forEach((angDeg, i) => {
          const rad = (angDeg * Math.PI) / 180;
          this.projectiles.push({
            id: Math.random().toString(),
            type: 'player_energy_blade',
            x: p.x + 30,
            y: p.y + (i - 1.5) * 14,
            vx: Math.cos(rad) * 18,
            vy: Math.sin(rad) * 18,
            radius: 14,
            damage: 65,
            duration: 0,
            maxDuration: 2.8,
            color: '#f59e0b',
            glowColor: '#d97706',
            trail: [],
          });
        });
        return true;
      }

      case 'perro_marron': {
        // Teletransporte crono
        p.special2Cooldown = 3.2;
        p.special2MaxCooldown = 3.2;
        soundManager.playTeleport();
        if (this.boss && this.stage === 'boss') {
          // Teletransporte directamente a la espalda de Nanovalen para atacarlo
          p.x = Math.min(this.width - 45, this.boss.x + 85);
          p.y = this.boss.y;
        } else {
          p.x = Math.min(this.width - 55, p.x + 230);
        }
        p.isInvulnerable = true;
        p.invulnerableTimer = 0.6;
        this.spawnHitParticles(p.x, p.y, '#f59e0b', 16);
        return true;
      }

      default:
        return false;
    }
  }

  // --- Black Flash Critical Hit System (2% Chance) ---
  // Prompt: "una probabilidad de un 2% de que cualquiera de sus ataques sea un black flash (golpe critico)
  // duplicando el daño por 2.5 y haciendo un efecto de rayos de color negro con delineado rojo al golpear"

  private rollBlackFlash(baseDamage: number, hitX: number, hitY: number): { damage: number; isBlackFlash: boolean } {
    const isBlackFlash = Math.random() < 0.02;

    if (isBlackFlash) {
      const critDamage = Math.round(baseDamage * 2.5);
      this.stats.blackFlashesCount++;
      soundManager.playBlackFlash();

      // Screen shake distortion
      this.screenShake = 16;

      // Generate dramatic Black Lightning with Red Outlines
      const branches: { x1: number; y1: number; x2: number; y2: number }[] = [];
      const branchCount = 8;
      for (let i = 0; i < branchCount; i++) {
        let curX = 0;
        let curY = 0;
        const mainAngle = (i * Math.PI * 2) / branchCount + (Math.random() - 0.5) * 0.4;
        const segments = 4;
        const segLen = 16 + Math.random() * 12;

        for (let s = 0; s < segments; s++) {
          const nextAngle = mainAngle + (Math.random() - 0.5) * 0.9;
          const nextX = curX + Math.cos(nextAngle) * segLen;
          const nextY = curY + Math.sin(nextAngle) * segLen;
          branches.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });
          curX = nextX;
          curY = nextY;
        }
      }

      this.blackFlashStrikes.push({
        id: Math.random().toString(),
        x: hitX,
        y: hitY,
        timer: 0.65,
        maxTimer: 0.65,
        lightningBranches: branches,
        damage: critDamage,
      });

      // Floating Critical Text
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: `★ BLACK FLASH! -${critDamage} ★`,
        x: hitX,
        y: hitY - 25,
        vy: -1.8,
        color: '#ff003b',
        isBlackFlash: true,
        life: 1.4,
        maxLife: 1.4,
        scale: 1.35,
      });

      return { damage: critDamage, isBlackFlash: true };
    }

    return { damage: baseDamage, isBlackFlash: false };
  }

  // --- Obstacle Damage & Destruction ---

  private applyDamageToObstacle(obs: Obstacle, baseDmg: number, _attackType: AttackType, hitX: number, hitY: number) {
    const { damage, isBlackFlash } = this.rollBlackFlash(baseDmg, hitX, hitY);
    obs.hp -= damage;
    this.stats.totalAttacksLanded++;
    this.stats.score += damage;

    if (!isBlackFlash) {
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: `-${damage}`,
        x: hitX,
        y: hitY - 10,
        vy: -1.2,
        color: '#fed7aa',
        isBlackFlash: false,
        life: 0.8,
        maxLife: 0.8,
        scale: 1.0,
      });
    }

    // Impact sparks
    this.spawnHitParticles(hitX, hitY, isBlackFlash ? '#ff1a3c' : '#fb923c', 8);

    if (obs.hp <= 0) {
      this.destroyObstacle(obs);
    }
  }

  private destroyObstacle(obs: Obstacle) {
    soundManager.playExplosion();
    this.screenShake = Math.max(this.screenShake, 7);

    // Large rubble explosion
    const rubbleColor = obs.type === 'building' ? '#475569' : '#78716c';
    this.spawnRubble(obs.x + obs.width / 2, obs.y + obs.height / 2, rubbleColor, 20);

    if (obs.type === 'building') {
      this.stats.buildingsDestroyed++;
      this.stageProgress = Math.min(100, this.stageProgress + 9);
    } else if (obs.type === 'asteroid' && !obs.isSplit && obs.width > 55) {
      // Split giant asteroid into 2 smaller meteorites
      this.stats.asteroidsDestroyed++;
      this.stageProgress = Math.min(100, this.stageProgress + 7);

      for (let i = 0; i < 2; i++) {
        this.obstacles.push({
          id: Math.random().toString(),
          type: 'meteorite',
          x: obs.x + (i - 0.5) * 30,
          y: obs.y + (i - 0.5) * 30,
          width: 32,
          height: 32,
          hp: 40,
          maxHp: 40,
          vx: obs.vx + (Math.random() - 0.5) * 2,
          vy: (i === 0 ? -2 : 2) + (Math.random() - 0.5),
          color: '#ea580c',
          rotation: Math.random() * Math.PI,
          rotationSpeed: (Math.random() - 0.5) * 3,
          isSplit: true,
        });
      }
    } else {
      this.stats.asteroidsDestroyed++;
      this.stageProgress = Math.min(100, this.stageProgress + 8);
    }

    // Remove from array
    this.obstacles = this.obstacles.filter(o => o.id !== obs.id);

    // Stage progression checks
    if (this.stage === 'city' && this.stageProgress >= 100) {
      this.triggerCityToSpaceTransition();
    } else if (this.stage === 'space' && this.stageProgress >= 100) {
      this.triggerSpaceToBossTransition();
    }
  }

  public damageDrone(drone: BossDrone, amount: number, hitX: number, hitY: number) {
    drone.hp = Math.max(0, drone.hp - amount);
    this.damageNumbers.push({
      id: Math.random().toString(),
      text: `-${Math.round(amount)}`,
      x: hitX,
      y: hitY - 12,
      vy: -1.3,
      color: '#f87171',
      isBlackFlash: false,
      life: 0.85,
      maxLife: 0.85,
      scale: 1.0,
    });
    this.spawnHitParticles(hitX, hitY, '#f43f5e', 8);

    if (drone.hp <= 0) {
      soundManager.playExplosion();
      this.screenShake = Math.max(this.screenShake, 12);
      this.spawnRubble(drone.x, drone.y, '#64748b', 16);
      this.spawnHitParticles(drone.x, drone.y, '#f59e0b', 16);
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: '💥 ¡DRON DESTRUIDO! (+100)',
        x: drone.x,
        y: drone.y - 25,
        vy: -1.8,
        color: '#fbbf24',
        isBlackFlash: false,
        life: 1.4,
        maxLife: 1.4,
        scale: 1.25,
      });
      this.stats.score += 100;
    }
  }

  // --- Boss Damage & Mechanics ---

  private applyDamageToBoss(baseDmg: number, attackType: AttackType, hitX: number, hitY: number, bypassShield: boolean = false) {
    if (!this.boss || this.stage !== 'boss') return;

    // Check if Nanovalen's shield is active:
    // Prompt: "crear escudos de energia que absorban los disparos del gato" (Escudo Rojo)
    if (this.boss.shieldActive && !bypassShield) {
      soundManager.playShieldAbsorb();
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: '¡ABSORBIDO!',
        x: hitX,
        y: hitY - 15,
        vy: -1.5,
        color: '#ef4444',
        isBlackFlash: false,
        life: 0.9,
        maxLife: 0.9,
        scale: 1.1,
      });
      this.spawnHitParticles(hitX, hitY, '#ef4444', 12);
      return;
    }

    // Prompt: "reduce el daño del rayo verde de catvalentina y que con SOLO ese ataque no sea capaz de asestar un black flash"
    const canBlackFlash = attackType !== 'green_beam';
    const { damage, isBlackFlash } = canBlackFlash
      ? this.rollBlackFlash(baseDmg, hitX, hitY)
      : { damage: Math.round(baseDmg), isBlackFlash: false };

    this.boss.hp = Math.max(0, this.boss.hp - damage);
    this.stats.nanovalenDamageDealt += damage;
    this.stats.totalAttacksLanded++;
    this.stats.score += damage * 2;

    if (!isBlackFlash) {
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: `-${damage}`,
        x: hitX,
        y: hitY - 10,
        vy: -1.4,
        color: '#ff4466',
        isBlackFlash: false,
        life: 0.9,
        maxLife: 0.9,
        scale: 1.1,
      });
    }

    this.spawnHitParticles(hitX, hitY, isBlackFlash ? '#ff003b' : '#ff3b50', 12);

    // Defeat Nanovalen
    if (this.boss.hp <= 0) {
      this.triggerVictory();
    }
  }

  // --- Transitions ---

  private triggerCityToSpaceTransition() {
    this.stage = 'transition';
    this.transitionTimer = 3.0;
    this.obstacles = [];
    this.projectiles = [];
    soundManager.playExplosion();
  }

  private triggerSpaceToBossTransition() {
    this.stage = 'boss_intro';
    this.bossIntroTimer = 3.2;
    this.obstacles = [];
    this.projectiles = [];
    soundManager.stopMusic();
    soundManager.playLaserWarning();
  }

  private initBoss() {
    this.boss = {
      x: this.width - 150,
      y: this.height / 2,
      vx: 0,
      vy: 2.2,
      width: 86,
      height: 86,
      hp: 3400,
      maxHp: 3400,
      shieldActive: false,
      shieldTimer: 0,
      currentAttack: 'idle',
      attackTimer: 0,
      attackCooldown: 1.1,
      laserY: this.height / 2,
      laserHeight: 48,
      laserAngle: 0,
      laserWarningDuration: 1.5, // Exactly 1.5 seconds warning
      laserFireDuration: 0.65,
      gammaChargeProgress: 0,
      gammaRays: [],
      gammaBurstTimer: 0,
      eyeGlowIntensity: 1.0,
      floatOffset: 0,
      introTimer: 0,
      leftHand: { x: -36, y: 16, punchProgress: 0 },
      rightHand: { x: 36, y: 16, punchProgress: 0 },
      punchCooldown: 0,
      pullTimer: 0,
      pullHandExtended: 0,
    };
    this.drones = [];
  }

  private triggerVictory(isSantiscat: boolean = false) {
    this.stage = 'victory';
    soundManager.stopMusic();
    soundManager.playVictory();
    this.screenShake = 24;

    if (isSantiscat) {
      this.santiscatWins = (this.santiscatWins || 0) + 1;
      this.stats.santiscatWins = this.santiscatWins;
      if (this.santiscat) {
        this.spawnRubble(this.santiscat.x, this.santiscat.y, '#a855f7', 45);
        this.spawnRubble(this.santiscat.x, this.santiscat.y, '#f59e0b', 35);
        this.spawnHitParticles(this.santiscat.x, this.santiscat.y, '#38bdf8', 40);
      }
    } else {
      const prevWins = this.nanovalenWins;
      this.nanovalenWins = prevWins + 1;
      saveNanovalenWins(this.nanovalenWins);
      this.stats.nanovalenWins = this.nanovalenWins;

      // Check if any skin has just unlocked!
      const newlyUnlocked: string[] = [];
      (Object.keys(CHARACTER_SKINS) as CharacterSkinId[]).forEach(sId => {
        const skin = CHARACTER_SKINS[sId];
        if (skin.requiredWins > 0 && prevWins < skin.requiredWins && this.nanovalenWins >= skin.requiredWins) {
          newlyUnlocked.push(skin.name);
        }
      });

      if (newlyUnlocked.length > 0) {
        this.stats.unlockedSkinNotice = newlyUnlocked.join(', ');
      }

      // Victory explosion around Nanovalen
      if (this.boss) {
        this.spawnRubble(this.boss.x, this.boss.y, '#f43f5e', 45);
        this.spawnRubble(this.boss.x, this.boss.y, '#38bdf8', 35);
      }
    }

    if (this.onVictoryCallback) {
      this.onVictoryCallback();
    }
  }

  public triggerEarthDestructionCinematic() {
    this.stage = 'cinematic_earth_destruction';
    this.stats.deathReason = 'gamma_ray';
    soundManager.stopGammaSound();
    soundManager.stopMusic();
    soundManager.playEarthDestruction();
    this.screenShake = 26;
    this.cinematic = {
      timer: 0,
      maxDuration: 7.2,
      phase: 'incoming_burst',
      earthHealth: 1.0,
      flashAlpha: 0.9,
    };
  }

  public skipCinematic() {
    if (this.stage === 'cinematic_earth_destruction') {
      soundManager.stopGammaSound();
      this.triggerGameOver();
    }
  }

  private triggerGameOver() {
    this.stage = 'gameover';
    soundManager.stopGammaSound();
    soundManager.stopMusic();
    soundManager.playExplosion();
    if (this.onGameOverCallback) {
      this.onGameOverCallback();
    }
  }

  // --- Main Game Loop Update ---

  public update(delta: number) {
    if (delta > 0.1) delta = 0.1; // clamp lag spike

    this.stats.timeElapsed += delta;
    this.player.animationTime += delta;

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - delta * 30);
    }

    // Cinematic: Earth Destruction by Gamma Ray Burst
    if (this.stage === 'cinematic_earth_destruction' && this.cinematic) {
      const c = this.cinematic;
      c.timer += delta;

      if (c.flashAlpha > 0) {
        c.flashAlpha = Math.max(0, c.flashAlpha - delta * 1.5);
      }

      if (c.timer < 1.4) {
        c.phase = 'incoming_burst';
      } else if (c.timer < 2.6) {
        c.phase = 'impact_earth';
        c.earthHealth = 0.8;
      } else if (c.timer < 4.2) {
        c.phase = 'continents_melt';
        c.earthHealth = Math.max(0.1, 0.8 - (c.timer - 2.6) * 0.45);
      } else if (c.timer < 5.8) {
        c.phase = 'shattering_explosion';
        c.earthHealth = 0;
        this.screenShake = Math.max(this.screenShake, 18);
      } else {
        c.phase = 'extinction';
      }

      if (c.timer >= c.maxDuration) {
        this.triggerGameOver();
      }
      return;
    }

    // Transitions
    if (this.stage === 'transition') {
      this.transitionTimer -= delta;
      // Catvalen flies up into the cosmos
      this.player.x += (this.width * 0.4 - this.player.x) * 0.05;
      this.player.y += (this.height * 0.5 - this.player.y) * 0.05;
      if (this.transitionTimer <= 0) {
        this.startStage('space');
      }
      return;
    }

    if (this.stage === 'boss_intro') {
      this.bossIntroTimer -= delta;
      if (this.bossIntroTimer <= 0) {
        this.startStage('boss');
      }
      return;
    }

    if (this.stage === 'gameover' || this.stage === 'victory') {
      this.updateParticles(delta);
      this.updateDamageNumbers(delta);
      return;
    }

    // Time stop update for Perro Marrón
    if (this.player.timeStopActive) {
      this.player.timeStopTimer -= delta;
      if (this.player.timeStopTimer <= 0) {
        this.player.timeStopActive = false;
        soundManager.playShieldBreak();
        this.damageNumbers.push({
          id: Math.random().toString(),
          text: '⏳ TIEMPO REANUDADO',
          x: this.player.x,
          y: this.player.y - 35,
          vy: -1.2,
          color: '#fbbf24',
          isBlackFlash: false,
          life: 1.2,
          maxLife: 1.2,
          scale: 1.2,
        });
      }
    }

    // Update Camera
    this.updateCamera(delta);

    // Update Player (Always updates even during Time Stop!)
    this.updatePlayer(delta);

    // Update Projectiles (Internal check handles time stop freeze on boss projectiles)
    this.updateProjectiles(delta);

    // Update Obstacles (Frozen during time stop!)
    if (!this.player.timeStopActive) {
      this.updateObstacles(delta);
    }

    // Update Boss & Combat Drones (Nanovalen and drones are frozen during time stop!)
    if (this.stage === 'boss' && !this.player.timeStopActive) {
      if (this.boss) this.updateBoss(delta);
      this.updateDrones(delta);
    }

    // Level 4 Stages updates
    if (this.stage === 'distorted') {
      this.updateDistorted(delta);
    } else if (this.stage === 'rhythm_summon') {
      this.updateRhythmGame(delta);
    } else if (this.stage === 'santiscat_boss') {
      this.updateSantiscat(delta);
    }

    // Update Effects
    this.updateBlackFlashStrikes(delta);
    this.updateParticles(delta);
    this.updateDamageNumbers(delta);
  }

  private updatePlayer(delta: number) {
    const p = this.player;
    const skinConfig = CHARACTER_SKINS[p.skin] || CHARACTER_SKINS.catvalen;
    const moveSpeed = skinConfig.moveSpeed;

    // Special Gata Gris: charging green ray locks player in place!
    if (p.greenBeamCharging) {
      p.vx = 0;
      p.vy = 0;
      p.greenBeamChargeTimer += delta;

      // Swirling charging particles converging toward player
      if (Math.random() < 0.6) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 45 + Math.random() * 35;
        this.particles.push({
          x: p.x + Math.cos(ang) * rad,
          y: p.y + Math.sin(ang) * rad,
          vx: -Math.cos(ang) * 3.5,
          vy: -Math.sin(ang) * 3.5,
          size: 3 + Math.random() * 3,
          color: Math.random() > 0.5 ? '#22c55e' : '#4ade80',
          life: 0.35,
          maxLife: 0.35,
          alpha: 1,
          shape: 'spark',
        });
      }

      if (p.greenBeamChargeTimer >= p.greenBeamChargeMax) {
        p.greenBeamCharging = false;
        p.greenBeamFiring = true;
        p.greenBeamFiringTimer = 1.8;
        soundManager.playGreenBeamFire();
        this.screenShake = 24;
      }
    } else {
      // Normal Keyboard Movement
      let dx = 0;
      let dy = 0;
      if (this.keys['keyw'] || this.keys['arrowup']) dy -= 1;
      if (this.keys['keys'] || this.keys['arrowdown']) dy += 1;
      if (this.keys['keya'] || this.keys['arrowleft']) dx -= 1;
      if (this.keys['keyd'] || this.keys['arrowright']) dx += 1;

      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }

      if (dx !== 0 || dy !== 0) {
        p.vx = dx * moveSpeed;
        p.vy = dy * moveSpeed;
      } else {
        // Smooth friction deceleration
        p.vx *= 0.88;
        p.vy *= 0.88;
      }
    }

    p.x += p.vx;
    p.y += p.vy;

    // Continuous Green Beam Firing damage
    if (p.greenBeamFiring) {
      p.greenBeamFiringTimer -= delta;
      this.screenShake = Math.max(this.screenShake, 14);

      const beamY = p.y;
      const beamHalfHeight = 36;

      this.obstacles.forEach(obs => {
        if (obs.x > p.x && Math.abs(beamY - (obs.y + obs.height / 2)) < obs.height / 2 + beamHalfHeight) {
          this.applyDamageToObstacle(obs, 140 * delta, 'green_beam', obs.x + 10, beamY);
        }
      });

      // Prompt: "reduce el daño del rayo verde de catvalentina"
      this.drones.forEach(d => {
        if (d.x > p.x && Math.abs(beamY - d.y) < d.size + beamHalfHeight) {
          this.damageDrone(d, 140 * delta, d.x, beamY);
        }
      });

      if (this.boss && this.stage === 'boss') {
        if (this.boss.x > p.x && Math.abs(beamY - this.boss.y) < this.boss.height / 2 + beamHalfHeight) {
          this.applyDamageToBoss(130 * delta, 'green_beam', this.boss.x, beamY, true);
        }
      }

      if (p.greenBeamFiringTimer <= 0) {
        p.greenBeamFiring = false;
      }
    }

    // Gata Azul passive regen (+2.5 HP/sec)
    if (p.skin === 'gata_azul_manchas') {
      p.healRegenAccumulator += delta;
      if (p.healRegenAccumulator >= 1.0) {
        p.healRegenAccumulator = 0;
        if (p.hp < p.maxHp) {
          p.hp = Math.min(p.maxHp, p.hp + 2.5);
        }
      }
    }

    // Boss mind control auto-punch logic & shield disabled timer
    if (this.boss) {
      if (this.boss.shieldDisabledTimer && this.boss.shieldDisabledTimer > 0) {
        this.boss.shieldDisabledTimer -= delta;
        this.boss.shieldActive = false;
        this.boss.shieldTimer = 0;
      }

      if (this.boss.mindControlTimer && this.boss.mindControlTimer > 0) {
        this.boss.mindControlTimer -= delta;
        this.boss.currentAttack = 'idle';
        if (!this.boss.mindControlSelfPunchCount) this.boss.mindControlSelfPunchCount = 0;

        // Auto-hit every 0.6 seconds
        const punchInterval = 0.6;
        const currentPunchIndex = Math.floor((2.5 - this.boss.mindControlTimer) / punchInterval);
        if (currentPunchIndex > this.boss.mindControlSelfPunchCount) {
          this.boss.mindControlSelfPunchCount = currentPunchIndex;
          soundManager.playPunch();
          this.applyDamageToBoss(75, 'mind_control', this.boss.x, this.boss.y, true);
          this.screenShake = 12;
          this.damageNumbers.push({
            id: Math.random().toString(),
            text: '¡AUTO-GOLPE! (-75)',
            x: this.boss.x + (Math.random() - 0.5) * 40,
            y: this.boss.y - 20,
            vy: -1.8,
            color: '#f43f5e',
            isBlackFlash: false,
            life: 1.2,
            maxLife: 1.2,
            scale: 1.3,
          });
        }
      }
    }

    // Clamp inside arena / world
    const margin = 40;
    const isLevel4 = this.stage === 'distorted' || this.stage === 'rhythm_summon' || this.stage === 'santiscat_boss';
    const boundX = isLevel4 ? this.camera.worldWidth - margin : this.width - margin;
    const boundY = isLevel4 ? this.camera.worldHeight - margin : this.height - margin;
    if (p.x < margin) p.x = margin;
    if (p.x > boundX) p.x = boundX;
    if (p.y < margin) p.y = margin;
    if (p.y > boundY) p.y = boundY;

    // Cooldowns
    if (this.infiniteHeals) {
      p.healsRemaining = p.maxHeals;
    }
    if (this.noCooldowns) {
      p.punchCooldown = 0;
      p.fireballCooldown = 0;
      p.lightningCooldown = 0;
      p.powerBurstCooldown = 0;
      p.shieldCooldown = 0;
      p.healCooldown = 0;
      p.special1Cooldown = 0;
      p.special2Cooldown = 0;
    } else {
      if (p.punchCooldown > 0) p.punchCooldown -= delta;
      if (p.fireballCooldown > 0) p.fireballCooldown -= delta;
      if (p.lightningCooldown > 0) p.lightningCooldown -= delta;
      if (p.powerBurstCooldown > 0) p.powerBurstCooldown -= delta;
      if (p.healCooldown > 0) p.healCooldown -= delta;
      if (p.special1Cooldown > 0) p.special1Cooldown = Math.max(0, p.special1Cooldown - delta);
      if (p.special2Cooldown > 0) p.special2Cooldown = Math.max(0, p.special2Cooldown - delta);
    }

    // Hand punch progress decay
    if (p.leftHand.punchProgress > 0) {
      p.leftHand.punchProgress = Math.max(0, p.leftHand.punchProgress - delta * 5);
    }
    if (p.rightHand.punchProgress > 0) {
      p.rightHand.punchProgress = Math.max(0, p.rightHand.punchProgress - delta * 5);
    }

    // Shield duration and cooldown
    if (p.shieldActive) {
      p.shieldTimer -= delta;
      if (p.shieldTimer <= 0) {
        p.shieldActive = false;
      }
    }
    if (p.shieldCooldown > 0) {
      p.shieldCooldown = Math.max(0, p.shieldCooldown - delta);
    }

    // Invulnerability timer
    if (p.isInvulnerable) {
      p.invulnerableTimer -= delta;
      if (p.invulnerableTimer <= 0) {
        p.isInvulnerable = false;
        p.eyeState = 'normal';
      }
    }
  }

  private rollBossBlackFlash(baseDamage: number, hitX: number, hitY: number): { damage: number; isBlackFlash: boolean } {
    // Prompt: "que nanovalen tenga un 1% de probabilidad de hacer un black flash tambien"
    const isBlackFlash = Math.random() < 0.01;

    if (isBlackFlash) {
      const critDamage = Math.round(baseDamage * 2.5);
      this.stats.bossBlackFlashesCount++;
      soundManager.playBossBlackFlash();
      this.screenShake = 24;

      // Sinister red-outlined black lightning branches
      const branches: { x1: number; y1: number; x2: number; y2: number }[] = [];
      const branchCount = 10;
      for (let i = 0; i < branchCount; i++) {
        let curX = 0;
        let curY = 0;
        const mainAngle = (i * Math.PI * 2) / branchCount + (Math.random() - 0.5) * 0.4;
        const segments = 5;
        const segLen = 20 + Math.random() * 12;

        for (let s = 0; s < segments; s++) {
          const nextAngle = mainAngle + (Math.random() - 0.5) * 0.9;
          const nextX = curX + Math.cos(nextAngle) * segLen;
          const nextY = curY + Math.sin(nextAngle) * segLen;
          branches.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });
          curX = nextX;
          curY = nextY;
        }
      }

      this.blackFlashStrikes.push({
        id: Math.random().toString(),
        x: hitX,
        y: hitY,
        timer: 0.85,
        maxTimer: 0.85,
        lightningBranches: branches,
        damage: critDamage,
        isBoss: true,
      });

      this.damageNumbers.push({
        id: Math.random().toString(),
        text: `★ NANOVALEN BLACK FLASH! -${critDamage} ★`,
        x: hitX,
        y: hitY - 35,
        vy: -2.0,
        color: '#ff003b',
        isBlackFlash: true,
        life: 1.8,
        maxLife: 1.8,
        scale: 1.45,
      });

      return { damage: critDamage, isBlackFlash: true };
    }

    return { damage: baseDamage, isBlackFlash: false };
  }

  public takePlayerDamage(amount: number, source: 'meteor' | 'laser' | 'gamma' | 'collision' = 'collision') {
    if (this.player.shieldActive) {
      // Green shield absorbs all incoming damage!
      soundManager.playShieldAbsorb();
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: '¡BLOQUEADO!',
        x: this.player.x,
        y: this.player.y - 30,
        vy: -1.5,
        color: '#34d399',
        isBlackFlash: false,
        life: 0.9,
        maxLife: 0.9,
        scale: 1.1,
      });
      return;
    }

    if (this.player.isInvulnerable || this.godMode) return;

    // Check Nanovalen's 1% Black Flash on boss attacks
    let finalAmount = amount;
    if (source === 'meteor' || source === 'laser' || source === 'gamma') {
      const crit = this.rollBossBlackFlash(amount, this.player.x, this.player.y);
      finalAmount = crit.damage;
    }

    this.player.hp = Math.max(0, this.player.hp - finalAmount);
    this.player.isInvulnerable = true;
    this.player.invulnerableTimer = source === 'gamma' ? 0.35 : 0.85;
    this.player.eyeState = 'hurt';
    this.screenShake = Math.max(this.screenShake, source === 'gamma' ? 24 : 14);
    soundManager.playExplosion();

    this.damageNumbers.push({
      id: Math.random().toString(),
      text: `-${finalAmount}`,
      x: this.player.x,
      y: this.player.y - 20,
      vy: -1.2,
      color: '#ef4444',
      isBlackFlash: false,
      life: 0.9,
      maxLife: 0.9,
      scale: 1.1,
    });

    if (this.player.hp <= 0) {
      // Prompt: "que si mueres en el estallido de rayos gamma haya una cinematica antes de la pantalla de gameover que sea la tierra siendo afectada y destruida por los estallidos"
      const inGammaAttack = source === 'gamma' || (this.boss && (this.boss.currentAttack === 'gamma_ray_charge' || this.boss.currentAttack === 'gamma_ray_burst'));
      if (inGammaAttack) {
        soundManager.stopGammaSound();
        this.triggerEarthDestructionCinematic();
      } else {
        this.triggerGameOver();
      }
    }
  }

  // --- Obstacle Spawner & Collision ---

  private updateObstacles(delta: number) {
    if (this.stage !== 'city' && this.stage !== 'space') return;

    this.obstacleSpawnTimer += delta;
    const spawnInterval = this.stage === 'city' ? 1.6 : 1.3;

    if (this.obstacleSpawnTimer >= spawnInterval) {
      this.obstacleSpawnTimer = 0;
      this.spawnObstacle();
    }

    // Move obstacles
    this.obstacles.forEach(obs => {
      obs.x += obs.vx * delta * 60;
      obs.y += obs.vy * delta * 60;
      if (obs.rotationSpeed) {
        obs.rotation = (obs.rotation || 0) + obs.rotationSpeed * delta;
      }

      // Check collision with player
      const p = this.player;
      const collided =
        p.x + p.width * 0.4 > obs.x &&
        p.x - p.width * 0.4 < obs.x + obs.width &&
        p.y + p.height * 0.4 > obs.y &&
        p.y - p.height * 0.4 < obs.y + obs.height;

      if (collided) {
        this.takePlayerDamage(obs.type === 'building' ? 25 : 20);
        // Damage obstacle slightly on collision
        obs.hp -= 30;
        if (obs.hp <= 0) {
          this.destroyObstacle(obs);
        }
      }
    });

    // Remove off-screen obstacles
    this.obstacles = this.obstacles.filter(obs => obs.x + obs.width > -100);
  }

  private spawnObstacle() {
    if (this.stage === 'city') {
      // Skyscraper Buildings
      const bWidth = Math.floor(Math.random() * 50) + 65;
      const bHeight = Math.floor(Math.random() * 200) + 160;
      const floors = Math.floor(bHeight / 24);
      const cols = Math.floor(bWidth / 16);
      const windows: boolean[][] = [];
      for (let f = 0; f < floors; f++) {
        windows[f] = [];
        for (let c = 0; c < cols; c++) {
          windows[f][c] = Math.random() > 0.35;
        }
      }

      // Buildings emerge from the ground or hover as towering city structures
      const y = this.height - bHeight - 30;
      this.obstacles.push({
        id: Math.random().toString(),
        type: 'building',
        x: this.width + 30,
        y,
        width: bWidth,
        height: bHeight,
        hp: 180,
        maxHp: 180,
        vx: -2.8,
        vy: 0,
        color: ['#1e293b', '#334155', '#1f2937', '#111827'][Math.floor(Math.random() * 4)],
        floors,
        windows,
        antenna: Math.random() > 0.4,
      });

    } else if (this.stage === 'space') {
      // Meteorites & Giant Asteroids
      const isGiant = Math.random() > 0.55;
      const size = isGiant ? Math.floor(Math.random() * 30) + 65 : Math.floor(Math.random() * 20) + 36;
      const y = Math.random() * (this.height - size - 60) + 30;

      this.obstacles.push({
        id: Math.random().toString(),
        type: isGiant ? 'asteroid' : 'meteorite',
        x: this.width + 30,
        y,
        width: size,
        height: size,
        hp: isGiant ? 150 : 60,
        maxHp: isGiant ? 150 : 60,
        vx: isGiant ? -3.2 : -4.8,
        vy: (Math.random() - 0.5) * 1.5,
        color: isGiant ? '#64748b' : '#c2410c',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 2,
        isSplit: false,
      });
    }
  }

  // --- Projectiles Update & Collision ---

  private updateProjectiles(delta: number) {
    this.projectiles.forEach(p => {
      // If time is stopped, freeze enemy projectiles in mid air!
      if (this.player.timeStopActive && !p.type.startsWith('player_')) {
        return;
      }

      p.duration += delta;

      // Homing behavior for magic orbs and energy blades
      if (p.type === 'player_magic_orb' || p.type === 'player_energy_blade') {
        let targetX = this.width + 100;
        let targetY = p.y;
        if (this.boss && this.stage === 'boss') {
          targetX = this.boss.x;
          targetY = this.boss.y;
        } else if (this.obstacles.length > 0) {
          const fwd = this.obstacles.filter(o => o.x > p.x);
          if (fwd.length > 0) {
            targetX = fwd[0].x + fwd[0].width / 2;
            targetY = fwd[0].y + fwd[0].height / 2;
          }
        }
        const ang = Math.atan2(targetY - p.y, targetX - p.x);
        const curAng = Math.atan2(p.vy, p.vx);
        const speed = Math.hypot(p.vx, p.vy) || 14;
        const newAng = curAng + (ang - curAng) * 0.12;
        p.vx = Math.cos(newAng) * speed;
        p.vy = Math.sin(newAng) * speed;
      }

      // Special Anvil gravity & slam
      if (p.type === 'player_energy_anvil') {
        p.y += p.vy * delta * 60;
        const groundY = this.boss && this.stage === 'boss' ? this.boss.y : this.height * 0.65;
        if (p.y >= groundY) {
          soundManager.playEnergyAnvil();
          this.screenShake = 22;
          this.spawnHitParticles(p.x, p.y, '#facc15', 24);
          this.spawnRubble(p.x, p.y, '#ca8a04', 16);

          if (this.boss && this.stage === 'boss') {
            this.applyDamageToBoss(p.damage, 'energy_anvil', p.x, p.y, true);
          }
          this.obstacles.forEach(obs => {
            if (Math.hypot(obs.x + obs.width / 2 - p.x, obs.y + obs.height / 2 - p.y) < 160) {
              this.applyDamageToObstacle(obs, p.damage, 'energy_anvil', p.x, p.y);
            }
          });
          this.drones.forEach(d => {
            if (Math.hypot(d.x - p.x, d.y - p.y) < 160) {
              this.damageDrone(d, p.damage, d.x, d.y);
            }
          });
          p.duration = p.maxDuration;
          return;
        }
      } else {
        p.x += p.vx * delta * 60;
        p.y += p.vy * delta * 60;
      }

      // Update trail
      p.trail.unshift({ x: p.x, y: p.y, alpha: 1 });
      if (p.trail.length > 8) p.trail.pop();

      // Check collision with obstacles
      if (p.type.startsWith('player_')) {
        for (const obs of this.obstacles) {
          const hit =
            p.x + p.radius > obs.x &&
            p.x - p.radius < obs.x + obs.width &&
            p.y + p.radius > obs.y &&
            p.y - p.radius < obs.y + obs.height;

          if (hit) {
            this.applyDamageToObstacle(obs, p.damage, p.type.replace('player_', '') as AttackType, p.x, p.y);
            if (p.type !== 'player_light_laser') {
              p.duration = p.maxDuration;
            }
            break;
          }
        }

        // Check collision with Drones
        for (const drone of this.drones) {
          const dDist = Math.hypot(p.x - drone.x, p.y - drone.y);
          if (dDist < drone.size + p.radius) {
            this.damageDrone(drone, p.damage, p.x, p.y);
            if (p.type !== 'player_light_laser') {
              p.duration = p.maxDuration;
            }
            break;
          }
        }

        // Check collision with Nanovalen
        if (this.boss && this.stage === 'boss') {
          const bDist = Math.hypot(p.x - this.boss.x, p.y - this.boss.y);
          if (bDist < this.boss.width / 2 + p.radius) {
            this.applyDamageToBoss(p.damage, p.type.replace('player_', '') as AttackType, p.x, p.y);
            if (p.type !== 'player_light_laser') {
              p.duration = p.maxDuration;
            }
          }
        }

        // Check collision with Santiscat Boss in Level 4
        if (this.santiscat && this.stage === 'santiscat_boss') {
          const sDist = Math.hypot(p.x - this.santiscat.x, p.y - this.santiscat.y);
          if (sDist < this.santiscat.width / 2 + p.radius) {
            this.applyDamageToSantiscat(p.damage, p.type.replace('player_', '') as AttackType, p.x, p.y);
            if (p.type !== 'player_light_laser') {
              p.duration = p.maxDuration;
            }
          }
        }
      } else if (p.type === 'boss_meteor' || p.type === 'boss_drone_laser' || p.type === 'boss_pulse_laser') {
        // Nanovalen meteor or drone laser hits player
        const pDist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (pDist < this.player.width * 0.4 + p.radius) {
          this.takePlayerDamage(p.damage, p.type === 'boss_meteor' ? 'meteor' : 'laser');
          p.duration = p.maxDuration;
        }
      } else if (p.type === 'santiscat_sun_shot') {
        const pDist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (pDist < this.player.width * 0.45 + p.radius) {
          this.takePlayerDamage(p.damage, 'laser');
          p.duration = p.maxDuration;
        }
      } else if (p.type === 'santiscat_oneshot_fireball') {
        const pDist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (pDist < this.player.width * 0.45 + p.radius) {
          if (this.player.shieldActive) {
            soundManager.playShieldAbsorb();
            this.damageNumbers.push({
              id: Math.random().toString(),
              text: '🛡️ ¡ONE-SHOT ANULADO CON ESCUDO!',
              x: this.player.x,
              y: this.player.y - 30,
              vy: -1.6,
              color: '#34d399',
              isBlackFlash: false,
              life: 1.6,
              maxLife: 1.6,
              scale: 1.3,
            });
            this.spawnHitParticles(this.player.x, this.player.y, '#34d399', 18);
          } else if (!this.godMode && !this.player.isInvulnerable) {
            // One-Shot Death required by user!
            this.stats.deathReason = 'santiscat_oneshot';
            this.takePlayerDamage(99999, 'collision');
          }
          p.duration = p.maxDuration;
        }
      } else if (p.type === 'santiscat_debris') {
        const pDist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (pDist < this.player.width * 0.45 + p.radius) {
          this.takePlayerDamage(p.damage, 'collision');
          p.duration = p.maxDuration;
        }
      }
    });

    // Remove expired
    const maxBoundX = (this.stage === 'distorted' || this.stage === 'rhythm_summon' || this.stage === 'santiscat_boss')
      ? this.camera.worldWidth + 150
      : this.width + 100;
    const maxBoundY = (this.stage === 'distorted' || this.stage === 'rhythm_summon' || this.stage === 'santiscat_boss')
      ? this.camera.worldHeight + 150
      : this.height + 100;
    this.projectiles = this.projectiles.filter(p => p.duration < p.maxDuration && p.x > -150 && p.x < maxBoundX && p.y > -150 && p.y < maxBoundY);
  }

  // --- NANOVALEN BOSS AI & ATTACK LOGIC ---
  // Prompt attacks:
  // 1. Tirar meteoritos hacia el jugador
  // 2. Lanzar lasers con un aviso previo de 1.5 segundo
  // 3. Crear escudos de energia que absorban los disparos del gato
  // 4. Ataque final: explosion de rayos gamma que catvalen debera esquivar, este ataque no puede ser cancelado

  private updateBoss(delta: number) {
    const b = this.boss!;
    b.floatOffset = Math.sin(this.stats.timeElapsed * 3) * 14;

    // Movement: hover smoothly vertically
    b.y += b.vy * delta * 60;
    if (b.y < 100) {
      b.y = 100;
      b.vy = Math.abs(b.vy);
    } else if (b.y > this.height - 100) {
      b.y = this.height - 100;
      b.vy = -Math.abs(b.vy);
    }

    // Shield duration
    if (b.shieldActive) {
      b.shieldTimer -= delta;
      if (b.shieldTimer <= 0) {
        b.shieldActive = false;
      }
    }

    // Hand punch progress & punch cooldown decay
    if (b.punchCooldown > 0) b.punchCooldown -= delta;
    if (b.leftHand.punchProgress > 0) {
      b.leftHand.punchProgress = Math.max(0, b.leftHand.punchProgress - delta * 3.5);
    }
    if (b.rightHand.punchProgress > 0) {
      b.rightHand.punchProgress = Math.max(0, b.rightHand.punchProgress - delta * 3.5);
    }

    // Prompt: "nanovalen debe ser capaz de golpear (al igual q el jugador) pero mas lento y con un cierto rango de acercamiento necesario"
    const distToPlayer = Math.hypot(this.player.x - b.x, this.player.y - b.y);
    const inMeleeRange = distToPlayer < 140;
    const canMeleePunch =
      b.punchCooldown <= 0 &&
      inMeleeRange &&
      b.currentAttack !== 'gamma_ray_charge' &&
      b.currentAttack !== 'gamma_ray_burst' &&
      b.currentAttack !== 'gravity_pull';

    if (canMeleePunch) {
      b.punchCooldown = 1.8; // Slower than player's 0.75s
      const punchHand = Math.random() > 0.5 ? b.leftHand : b.rightHand;
      punchHand.punchProgress = 1.0;
      soundManager.playPunch();

      if (this.player.shieldActive) {
        soundManager.playShieldAbsorb();
        this.damageNumbers.push({
          id: Math.random().toString(),
          text: '¡GOLPE BLOQUEADO!',
          x: this.player.x,
          y: this.player.y - 25,
          vy: -1.4,
          color: '#34d399',
          isBlackFlash: false,
          life: 0.9,
          maxLife: 0.9,
          scale: 1.15,
        });
        this.spawnHitParticles(this.player.x, this.player.y, '#34d399', 10);
      } else {
        const crit = this.rollBossBlackFlash(28, this.player.x, this.player.y);
        this.takePlayerDamage(crit.damage, 'collision');
        this.damageNumbers.push({
          id: Math.random().toString(),
          text: crit.isBlackFlash ? '★ NANOVALEN PUÑO BLACK FLASH! ★' : '-28 (PUÑO)',
          x: this.player.x,
          y: this.player.y - 22,
          vy: -1.4,
          color: '#ef4444',
          isBlackFlash: crit.isBlackFlash,
          life: 0.95,
          maxLife: 0.95,
          scale: 1.2,
        });
      }
    }

    // Check trigger for Final Attack (Gamma Ray Burst):
    // Triggers when boss HP drops below 35% and hasn't triggered recently
    const hpRatio = b.hp / b.maxHp;

    if (b.currentAttack === 'idle') {
      b.attackCooldown -= delta;
      if (b.attackCooldown <= 0) {
        this.selectBossAttack(hpRatio);
      }
    } else {
      this.executeBossAttack(delta);
    }
  }

  private selectBossAttack(hpRatio: number) {
    const b = this.boss!;

    // If HP < 0.35 and gamma ready, launch the uncancelable Gamma Ray Burst!
    if (hpRatio < 0.35 && b.gammaBurstTimer <= 0) {
      this.startGammaRayBurst();
      return;
    }

    // Normal attack pool:
    // 1) meteor_storm
    // 2) laser_warning (1.5s telegraph)
    // 3) energy_shield (absorbs shots - Escudo Rojo)
    // 4) gravity_pull (pulls player -> shield or guaranteed black flash)
    // 5) drone_spawn (3 combat drones with 300 HP)
    const options: BossAttack[] = ['meteor_storm', 'laser_warning', 'energy_shield', 'gravity_pull'];
    if (this.drones.length === 0) {
      options.push('drone_spawn');
    }

    const chosen = options[Math.floor(Math.random() * options.length)];
    b.currentAttack = chosen;
    b.attackTimer = 0;

    if (chosen === 'laser_warning') {
      // Prompt: "lanzar lasers con un aviso previo de 1.5 segundo"
      b.laserY = this.player.y;
      b.laserHeight = 48;
      soundManager.playLaserWarning();
    } else if (chosen === 'energy_shield') {
      // Prompt: "el escudo de nanovalen debe ser rojo"
      b.shieldActive = true;
      b.shieldTimer = 4.5;
      soundManager.playShield();
      b.attackCooldown = 4.0;
      b.currentAttack = 'idle';
    } else if (chosen === 'meteor_storm') {
      soundManager.playExplosion();
    } else if (chosen === 'gravity_pull') {
      // Prompt: "otro ataque donde nanovalen extienda la mano (circulo) y atraiga el jugador hacia el y si el jugador no activa su escudo, el ataque resultara en que nanovalen le acierte un black flash garantizado al jugador"
      soundManager.playLaserWarning();
      soundManager.playGravityPull();
      b.pullTimer = 2.4;
      b.pullHandExtended = 0;
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: '⚠️ ¡ATRACCIÓN GRAVITATORIA! ¡ACTIVA TU ESCUDO (SHIFT)!',
        x: this.width * 0.45,
        y: 65,
        vy: -0.8,
        color: '#f43f5e',
        isBlackFlash: false,
        life: 2.2,
        maxLife: 2.2,
        scale: 1.3,
      });
    } else if (chosen === 'drone_spawn') {
      // Prompt: "lanza 3 drones alrededor del mapa y que vayan disparando laseres en distintos patrones. los drones seguiran disparandole al jugador durante el resto del combate (hasta que sean destruidos por el jugador o nanovalen active el estallido de rayos gamma, los drones tendran 300 HP)"
      soundManager.playLaserWarning();
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: '⚠️ ¡3 DRONES DE ASALTO ACTIVADOS (300 HP)!',
        x: b.x - 30,
        y: b.y - 40,
        vy: -1.2,
        color: '#f43f5e',
        isBlackFlash: false,
        life: 2.2,
        maxLife: 2.2,
        scale: 1.25,
      });

      this.drones = [
        {
          id: 'drone_1_' + Math.random().toString(),
          x: this.width * 0.42,
          y: 110,
          hp: 300,
          maxHp: 300,
          vx: 0.9,
          vy: 0.4,
          targetY: 110,
          pattern: 'sweep',
          shootTimer: 0.4,
          shootCooldown: 2.0,
          angle: 0,
          size: 24,
        },
        {
          id: 'drone_2_' + Math.random().toString(),
          x: this.width * 0.25,
          y: this.height * 0.52,
          hp: 300,
          maxHp: 300,
          vx: 0.6,
          vy: -0.6,
          targetY: this.height * 0.52,
          pattern: 'pulse',
          shootTimer: 0.8,
          shootCooldown: 2.4,
          angle: 0,
          size: 24,
        },
        {
          id: 'drone_3_' + Math.random().toString(),
          x: this.width * 0.55,
          y: this.height - 110,
          hp: 300,
          maxHp: 300,
          vx: -0.8,
          vy: 0.5,
          targetY: this.height - 110,
          pattern: 'tracker',
          shootTimer: 1.2,
          shootCooldown: 2.2,
          angle: 0,
          size: 24,
        },
      ];
      b.attackCooldown = 2.0;
      b.currentAttack = 'idle';
    }
  }

  private executeBossAttack(delta: number) {
    const b = this.boss!;
    b.attackTimer += delta;

    // 1. Meteor Storm (Enhanced speed & damage: 38 base)
    if (b.currentAttack === 'meteor_storm') {
      if (b.attackTimer > 0.25 && b.attackTimer < 1.7 && Math.random() < 0.32) {
        const targetAng = Math.atan2(this.player.y - b.y, this.player.x - b.x);
        const speed = 9.5;
        this.projectiles.push({
          id: Math.random().toString(),
          type: 'boss_meteor',
          x: b.x - 20,
          y: b.y + (Math.random() - 0.5) * 50,
          vx: Math.cos(targetAng) * speed,
          vy: Math.sin(targetAng) * speed,
          radius: 17,
          damage: 38,
          duration: 0,
          maxDuration: 3.5,
          color: '#ef4444',
          glowColor: '#dc2626',
          trail: [],
        });
      }

      if (b.attackTimer >= 1.8) {
        b.currentAttack = 'idle';
        b.attackCooldown = 1.0;
      }
    }

    // 2. Laser with 1.5s telegraph warning! (Enhanced damage: 75 base!)
    else if (b.currentAttack === 'laser_warning') {
      if (b.attackTimer < 0.6) {
        b.laserY += (this.player.y - b.laserY) * 0.09;
      }

      if (Math.floor(b.attackTimer * 3) !== Math.floor((b.attackTimer - delta) * 3)) {
        soundManager.playLaserWarning();
      }

      if (b.attackTimer >= 1.5) {
        b.currentAttack = 'laser_fire';
        b.attackTimer = 0;
        soundManager.playLaserFire();
        this.screenShake = 18;
      }
    } else if (b.currentAttack === 'laser_fire') {
      const halfLaserH = b.laserHeight / 2;
      if (this.player.x < b.x && Math.abs(this.player.y - b.laserY) < halfLaserH + 20) {
        this.takePlayerDamage(75, 'laser');
      }

      if (b.attackTimer >= b.laserFireDuration) {
        b.currentAttack = 'idle';
        b.attackCooldown = 1.2;
      }
    }

    // 3. Gravity Pull & Guaranteed Black Flash
    // "otro ataque donde nanovalen extienda la mano (circulo) y atraiga el jugador hacia el y si el jugador no activa su escudo, el ataque resultara en que nanovalen le acierte un black flash garantizado al jugador"
    else if (b.currentAttack === 'gravity_pull') {
      b.pullHandExtended = Math.min(1.0, b.attackTimer / 0.4);
      b.rightHand.x = -65;
      b.rightHand.punchProgress = 1.0;

      const handX = b.x - 70;
      const handY = b.y + 16;

      const pDx = handX - this.player.x;
      const pDy = handY - this.player.y;
      const pDist = Math.hypot(pDx, pDy);

      // Periodically trigger gravity vortex hum
      if (Math.floor(b.attackTimer * 3) !== Math.floor((b.attackTimer - delta) * 3)) {
        soundManager.playGravityPull();
      }

      // Vacuum suction pull effect towards Nanovalen's hand
      if (b.attackTimer < 1.7) {
        if (pDist > 45) {
          const pullSpeed = 8.0;
          this.player.x += (pDx / pDist) * pullSpeed;
          this.player.y += (pDy / pDist) * pullSpeed;
        }

        // Swirling gravitational vortex particles
        if (Math.random() < 0.6) {
          const pAngle = Math.random() * Math.PI * 2;
          const pRad = 35 + Math.random() * 55;
          this.particles.push({
            x: handX + Math.cos(pAngle) * pRad,
            y: handY + Math.sin(pAngle) * pRad,
            vx: -Math.cos(pAngle) * 4.5,
            vy: -Math.sin(pAngle) * 4.5,
            size: 3 + Math.random() * 3,
            color: Math.random() > 0.5 ? '#f43f5e' : '#a855f7',
            life: 0.3,
            maxLife: 0.3,
            alpha: 1,
            shape: 'spark',
          });
        }
      } else {
        // Climax: check if player raised shield!
        if (this.player.shieldActive) {
          soundManager.playShieldAbsorb();
          this.screenShake = 16;
          this.damageNumbers.push({
            id: Math.random().toString(),
            text: '🛡️ ¡BLACK FLASH ANULADO CON ESCUDO!',
            x: this.player.x,
            y: this.player.y - 30,
            vy: -1.6,
            color: '#34d399',
            isBlackFlash: false,
            life: 1.8,
            maxLife: 1.8,
            scale: 1.35,
          });
          this.spawnHitParticles(this.player.x, this.player.y, '#34d399', 18);
        } else {
          // NO SHIELD -> GUARANTEED BLACK FLASH!
          this.triggerGuaranteedBossBlackFlash(handX, handY);
        }

        b.pullHandExtended = 0;
        b.rightHand.x = 36;
        b.rightHand.punchProgress = 0;
        b.currentAttack = 'idle';
        b.attackCooldown = 2.0;
      }
    }

    // 4. Final Attack: Gamma Ray Burst (Uncancelable! Triple Power: 66 damage per tick!)
    else if (b.currentAttack === 'gamma_ray_charge') {
      b.gammaChargeProgress = Math.min(1, b.attackTimer / 2.0);
      b.x += (this.width * 0.7 - b.x) * 0.06;
      b.y += (this.height * 0.5 - b.y) * 0.06;

      if (b.attackTimer >= 2.0) {
        b.currentAttack = 'gamma_ray_burst';
        b.attackTimer = 0;
        soundManager.playGammaBurst();
        this.screenShake = 28;
      }
    } else if (b.currentAttack === 'gamma_ray_burst') {
      const burstDuration = 3.8;
      const rotSpeed = 0.9;

      b.gammaRays.forEach(ray => {
        ray.angle += rotSpeed * delta;
        ray.safeAngleStart = ray.angle + ray.width;
        ray.safeAngleEnd = ray.angle + Math.PI;

        const pAngle = Math.atan2(this.player.y - b.y, this.player.x - b.x);
        let normalizedPAngle = pAngle;
        if (normalizedPAngle < 0) normalizedPAngle += Math.PI * 2;

        let normalizedRayStart = ray.angle % (Math.PI * 2);
        if (normalizedRayStart < 0) normalizedRayStart += Math.PI * 2;
        let normalizedRayEnd = (ray.angle + ray.width) % (Math.PI * 2);
        if (normalizedRayEnd < 0) normalizedRayEnd += Math.PI * 2;

        let inLethal = false;
        if (normalizedRayStart < normalizedRayEnd) {
          inLethal = normalizedPAngle >= normalizedRayStart && normalizedPAngle <= normalizedRayEnd;
        } else {
          inLethal = normalizedPAngle >= normalizedRayStart || normalizedPAngle <= normalizedRayEnd;
        }

        if (inLethal) {
          this.takePlayerDamage(66, 'gamma');
        }
      });

      if (b.attackTimer >= burstDuration) {
        b.currentAttack = 'idle';
        b.attackCooldown = 2.5;
        b.gammaBurstTimer = 16.0;
      }
    }

    if (b.gammaBurstTimer > 0) {
      b.gammaBurstTimer -= delta;
    }
  }

  private triggerGuaranteedBossBlackFlash(hitX: number, hitY: number) {
    const critDamage = 135;
    this.stats.bossBlackFlashesCount++;
    soundManager.playBossBlackFlash();
    this.screenShake = 34;

    const branches: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const branchCount = 14;
    for (let i = 0; i < branchCount; i++) {
      let curX = 0;
      let curY = 0;
      const mainAngle = (i * Math.PI * 2) / branchCount + (Math.random() - 0.5) * 0.4;
      const segments = 6;
      const segLen = 22 + Math.random() * 14;

      for (let s = 0; s < segments; s++) {
        const nextAngle = mainAngle + (Math.random() - 0.5) * 0.85;
        const nextX = curX + Math.cos(nextAngle) * segLen;
        const nextY = curY + Math.sin(nextAngle) * segLen;
        branches.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });
        curX = nextX;
        curY = nextY;
      }
    }

    this.blackFlashStrikes.push({
      id: Math.random().toString(),
      x: this.player.x,
      y: this.player.y,
      timer: 1.1,
      maxTimer: 1.1,
      lightningBranches: branches,
      damage: critDamage,
      isBoss: true,
    });

    this.damageNumbers.push({
      id: Math.random().toString(),
      text: `💥 ★ NANOVALEN BLACK FLASH GARANTIZADO! -${critDamage} ★`,
      x: this.player.x,
      y: this.player.y - 45,
      vy: -2.2,
      color: '#ff003b',
      isBlackFlash: true,
      life: 2.4,
      maxLife: 2.4,
      scale: 1.5,
    });

    if (!this.godMode) {
      this.player.hp = Math.max(0, this.player.hp - critDamage);
      this.player.isInvulnerable = true;
      this.player.invulnerableTimer = 1.0;
      this.player.eyeState = 'hurt';

      if (this.player.hp <= 0) {
        this.triggerGameOver();
      }
    }
  }

  private updateDrones(delta: number) {
    if (this.stage !== 'boss' || this.drones.length === 0) return;

    this.drones.forEach(drone => {
      // Hover & patrol movement
      drone.x += drone.vx * delta * 60;
      drone.y += drone.vy * delta * 60;

      // Keep within arena bounds
      if (drone.x < 80) {
        drone.x = 80;
        drone.vx = Math.abs(drone.vx);
      } else if (drone.x > this.width - 220) {
        drone.x = this.width - 220;
        drone.vx = -Math.abs(drone.vx);
      }

      if (drone.y < 80) {
        drone.y = 80;
        drone.vy = Math.abs(drone.vy);
      } else if (drone.y > this.height - 80) {
        drone.y = this.height - 80;
        drone.vy = -Math.abs(drone.vy);
      }

      // Drone shooting pattern
      drone.shootTimer += delta;
      if (drone.shootTimer >= drone.shootCooldown) {
        drone.shootTimer = 0;
        soundManager.playDroneLaser();

        const angleToPlayer = Math.atan2(this.player.y - drone.y, this.player.x - drone.x);

        if (drone.pattern === 'sweep') {
          // Sweep laser fires 2 angled bolts
          [-0.15, 0.15].forEach(offset => {
            const ang = angleToPlayer + offset;
            const speed = 7.5;
            this.projectiles.push({
              id: Math.random().toString(),
              type: 'boss_drone_laser',
              x: drone.x,
              y: drone.y,
              vx: Math.cos(ang) * speed,
              vy: Math.sin(ang) * speed,
              radius: 9,
              damage: 18,
              duration: 0,
              maxDuration: 3.5,
              color: '#f43f5e',
              glowColor: '#ef4444',
              trail: [],
            });
          });
        } else if (drone.pattern === 'pulse') {
          // Rapid pulse plasma beads
          const speed = 8.5;
          this.projectiles.push({
            id: Math.random().toString(),
            type: 'boss_pulse_laser',
            x: drone.x,
            y: drone.y,
            vx: Math.cos(angleToPlayer) * speed,
            vy: Math.sin(angleToPlayer) * speed,
            radius: 8,
            damage: 20,
            duration: 0,
            maxDuration: 3.5,
            color: '#fb7185',
            glowColor: '#e11d48',
            trail: [],
          });
        } else if (drone.pattern === 'tracker') {
          // High speed precision tracking laser
          const speed = 9.8;
          this.projectiles.push({
            id: Math.random().toString(),
            type: 'boss_drone_laser',
            x: drone.x,
            y: drone.y,
            vx: Math.cos(angleToPlayer) * speed,
            vy: Math.sin(angleToPlayer) * speed,
            radius: 10,
            damage: 24,
            duration: 0,
            maxDuration: 3.0,
            color: '#ff2e4b',
            glowColor: '#dc2626',
            trail: [],
          });
        }
      }
    });

    // Filter destroyed drones
    this.drones = this.drones.filter(d => d.hp > 0);
  }

  private startGammaRayBurst() {
    const b = this.boss!;
    b.currentAttack = 'gamma_ray_charge';
    b.attackTimer = 0;
    b.gammaChargeProgress = 0;
    soundManager.playGammaCharge();

    // Prompt: "hasta que sean destruidos por el jugador o nanovalen active el estallido de rayos gamma, los drones tendran 300 HP"
    if (this.drones.length > 0) {
      this.drones.forEach(d => {
        this.spawnHitParticles(d.x, d.y, '#f43f5e', 14);
        this.spawnRubble(d.x, d.y, '#475569', 10);
      });
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: '⚡ DRONES CONSUMIDOS POR LA ENERGÍA GAMMA',
        x: this.width / 2,
        y: 80,
        vy: -1.0,
        color: '#fb7185',
        isBlackFlash: false,
        life: 1.6,
        maxLife: 1.6,
        scale: 1.2,
      });
      this.drones = [];
    }

    // 2 lethal wedges leaving 2 safe zones for Catvalen to maneuver and dodge!
    b.gammaRays = [
      {
        angle: 0.2,
        width: 1.1,
        speed: 0.8,
        safeAngleStart: 1.3,
        safeAngleEnd: 3.2,
      },
      {
        angle: 3.3,
        width: 1.1,
        speed: 0.8,
        safeAngleStart: 4.5,
        safeAngleEnd: 6.2,
      },
    ];
  }

  // --- Particles & FX ---

  private spawnHitParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        size: Math.random() * 4 + 2,
        color,
        life: 0.45,
        maxLife: 0.45,
        alpha: 1,
        shape: Math.random() > 0.5 ? 'spark' : 'circle',
      });
    }
  }

  private spawnRubble(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        size: Math.random() * 8 + 4,
        color,
        life: 0.8,
        maxLife: 0.8,
        alpha: 1,
        shape: 'square',
      });
    }
  }

  private updateParticles(delta: number) {
    this.particles.forEach(p => {
      p.life -= delta;
      p.x += p.vx * delta * 60;
      p.y += p.vy * delta * 60;
      p.alpha = Math.max(0, p.life / p.maxLife);
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updateBlackFlashStrikes(delta: number) {
    this.blackFlashStrikes.forEach(s => {
      s.timer -= delta;
    });
    this.blackFlashStrikes = this.blackFlashStrikes.filter(s => s.timer > 0);
  }

  private updateDamageNumbers(delta: number) {
    this.damageNumbers.forEach(d => {
      d.life -= delta;
      d.y += d.vy * delta * 60;
    });
    this.damageNumbers = this.damageNumbers.filter(d => d.life > 0);
  }

  // =========================================================================
  // LEVEL 4: DISTORTED REALITY, RHYTHM SUMMON & SANTISCAT BOSS METHODS
  // =========================================================================

  private updateCamera(delta: number) {
    const isLevel4 = this.stage === 'distorted' || this.stage === 'rhythm_summon' || this.stage === 'santiscat_boss';
    if (isLevel4) {
      const targetCamX = this.player.x - this.camera.viewportWidth / 2;
      const targetCamY = this.player.y - this.camera.viewportHeight / 2;
      this.camera.x += (targetCamX - this.camera.x) * 0.12;
      this.camera.y += (targetCamY - this.camera.y) * 0.12;
      const maxCamX = Math.max(0, this.camera.worldWidth - this.camera.viewportWidth);
      const maxCamY = Math.max(0, this.camera.worldHeight - this.camera.viewportHeight);
      this.camera.x = Math.max(0, Math.min(maxCamX, this.camera.x));
      this.camera.y = Math.max(0, Math.min(maxCamY, this.camera.y));
    } else {
      this.camera.x = 0;
      this.camera.y = 0;
    }
  }

  public initDistortedWorld() {
    this.stage = 'distorted';
    this.camera.worldWidth = 3200;
    this.camera.worldHeight = 2400;
    this.player.x = 400;
    this.player.y = 1200;
    this.player.vx = 0;
    this.player.vy = 0;
    this.obstacles = [];
    this.projectiles = [];
    this.drones = [];
    this.boss = null;
    this.santiscat = null;
    this.rhythmGame = null;

    // Populate large distorted world with floating buildings & space asteroids
    for (let i = 0; i < 35; i++) {
      const ox = 250 + Math.random() * 2700;
      const oy = 200 + Math.random() * 2000;
      // Keep altar clear
      if (Math.hypot(ox - 1600, oy - 1200) < 260) continue;

      const isBuilding = Math.random() > 0.5;
      if (isBuilding) {
        this.obstacles.push({
          id: `dist_b_${i}`,
          type: 'building',
          x: ox,
          y: oy,
          width: 80 + Math.random() * 45,
          height: 120 + Math.random() * 140,
          hp: 120,
          maxHp: 120,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          color: '#334155',
          rotation: (Math.random() - 0.5) * 0.4,
          rotationSpeed: (Math.random() - 0.5) * 0.05,
        });
      } else {
        this.obstacles.push({
          id: `dist_ast_${i}`,
          type: 'asteroid',
          x: ox,
          y: oy,
          width: 50 + Math.random() * 40,
          height: 50 + Math.random() * 40,
          hp: 90,
          maxHp: 90,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          color: '#6366f1',
          rotation: Math.random() * Math.PI,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
        });
      }
    }

    // Populate Reality Glitches / Spacetime Faults
    this.glitches = [];
    const glitchTypes: ('fault_line' | 'chromatic_vortex' | 'quantum_tear')[] = ['fault_line', 'chromatic_vortex', 'quantum_tear'];
    for (let i = 0; i < 20; i++) {
      const gx = 250 + Math.random() * 2700;
      const gy = 200 + Math.random() * 2000;
      if (Math.hypot(gx - 1600, gy - 1200) < 280) continue;
      this.glitches.push({
        id: `glitch_${i}`,
        x: gx,
        y: gy,
        width: 85 + Math.random() * 75,
        height: 38 + Math.random() * 38,
        type: glitchTypes[i % 3],
        pulseTimer: Math.random() * Math.PI * 2,
        damage: 25,
        angle: Math.random() * Math.PI * 2,
      });
    }
  }

  private updateDistorted(delta: number) {
    // Ambient floating obstacle physics
    this.obstacles.forEach(obs => {
      obs.x += obs.vx * delta * 60;
      obs.y += obs.vy * delta * 60;
      if (obs.rotationSpeed) {
        obs.rotation = (obs.rotation || 0) + obs.rotationSpeed * delta;
      }
      // Check collision with player
      const p = this.player;
      if (
        p.x + p.width * 0.4 > obs.x &&
        p.x - p.width * 0.4 < obs.x + obs.width &&
        p.y + p.height * 0.4 > obs.y &&
        p.y - p.height * 0.4 < obs.y + obs.height
      ) {
        this.takePlayerDamage(22, 'collision');
        obs.hp -= 20;
      }
    });

    // Update Reality Glitches & check player contact
    this.glitches.forEach(g => {
      g.pulseTimer += delta * 3;
      const dist = Math.hypot(this.player.x - g.x, this.player.y - g.y);
      if (dist < (g.width * 0.45 + this.player.width * 0.4)) {
        if (!this.player.shieldActive && !this.player.isInvulnerable && !this.godMode) {
          this.takePlayerDamage(g.damage, 'collision');
          this.stats.deathReason = 'reality_tear';
          this.spawnHitParticles(g.x, g.y, '#ec4899', 14);
          this.spawnHitParticles(g.x, g.y, '#06b6d4', 14);
          soundManager.playRealitySlash();
        }
      }
    });

    // Proximity to Ancient Altar
    const distToAltar = Math.hypot(this.player.x - 1600, this.player.y - 1200);
    if (distToAltar < 80) {
      this.startStage('rhythm_summon');
    }
  }

  public initRhythmSummon() {
    this.stage = 'rhythm_summon';
    this.camera.worldWidth = 3200;
    this.camera.worldHeight = 2400;
    this.player.x = 1600;
    this.player.y = 1380;
    this.player.vx = 0;
    this.player.vy = 0;
    this.obstacles = [];
    this.projectiles = [];

    const bpm = 128;
    const beatInterval = 60 / bpm; // ~0.46875s
    const beats: RhythmBeat[] = [];
    for (let i = 0; i < 14; i++) {
      beats.push({
        id: `beat_${i}`,
        targetTime: 1.4 + i * beatInterval,
        hit: false,
        missed: false,
      });
    }

    this.rhythmGame = {
      active: true,
      timer: 0,
      duration: 1.4 + 14 * beatInterval + 1.2,
      bpm,
      beats,
      score: 0,
      combo: 0,
      maxCombo: 0,
      requiredHits: 8,
      totalHits: 0,
      completed: false,
      failed: false,
      altarX: 1600,
      altarY: 1200,
    };
  }

  private updateRhythmGame(delta: number) {
    if (!this.rhythmGame || !this.rhythmGame.active) return;
    const rg = this.rhythmGame;
    rg.timer += delta;

    // Check misses
    rg.beats.forEach(b => {
      if (!b.hit && !b.missed && rg.timer > b.targetTime + 0.2) {
        b.missed = true;
        b.rating = 'miss';
        rg.combo = 0;
      }
    });

    // Check completion
    if (rg.totalHits >= rg.requiredHits && !rg.completed) {
      rg.completed = true;
      this.triggerSantiscatSummonSequence();
    } else if (rg.timer >= rg.duration && !rg.completed) {
      // Loop or restart beats smoothly
      this.initRhythmSummon();
    }
  }

  public hitRhythmBeat(): boolean {
    if (!this.rhythmGame || !this.rhythmGame.active || this.stage !== 'rhythm_summon') return false;
    const rg = this.rhythmGame;
    const curTime = rg.timer;

    let bestBeat: RhythmBeat | null = null;
    let minDelta = Infinity;

    for (const b of rg.beats) {
      if (b.hit || b.missed) continue;
      const dt = Math.abs(curTime - b.targetTime);
      if (dt < 0.22 && dt < minDelta) {
        minDelta = dt;
        bestBeat = b;
      }
    }

    if (bestBeat) {
      bestBeat.hit = true;
      rg.totalHits++;
      rg.combo++;
      rg.maxCombo = Math.max(rg.maxCombo, rg.combo);

      let rating: 'perfect' | 'great' = 'great';
      let scoreGain = 80;
      let col = '#38bdf8';

      if (minDelta <= 0.08) {
        rating = 'perfect';
        scoreGain = 150;
        col = '#facc15';
      }

      bestBeat.rating = rating;
      rg.score += scoreGain;
      soundManager.playRhythmHit(rating);
      this.screenShake = rating === 'perfect' ? 12 : 7;

      this.damageNumbers.push({
        id: Math.random().toString(),
        text: rating === 'perfect' ? '★ ¡PERFECTO! ★' : '¡GENIAL!',
        x: rg.altarX + (Math.random() - 0.5) * 40,
        y: rg.altarY - 70,
        vy: -1.7,
        color: col,
        isBlackFlash: rating === 'perfect',
        life: 0.9,
        maxLife: 0.9,
        scale: rating === 'perfect' ? 1.45 : 1.2,
      });

      this.spawnHitParticles(rg.altarX, rg.altarY, col, 16);

      if (rg.totalHits >= rg.requiredHits && !rg.completed) {
        rg.completed = true;
        this.triggerSantiscatSummonSequence();
      }
      return true;
    } else {
      rg.combo = 0;
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: 'FALLO',
        x: rg.altarX,
        y: rg.altarY - 50,
        vy: -1.2,
        color: '#94a3b8',
        isBlackFlash: false,
        life: 0.7,
        maxLife: 0.7,
        scale: 1.0,
      });
      return false;
    }
  }

  public triggerSantiscatSummonSequence() {
    soundManager.playSantiscatSummon();
    this.screenShake = 34;
    this.spawnHitParticles(1600, 1200, '#a855f7', 45);
    this.spawnHitParticles(1600, 1200, '#38bdf8', 40);
    this.spawnHitParticles(1600, 1200, '#f59e0b', 35);
    this.spawnRubble(1600, 1200, '#ffffff', 25);

    setTimeout(() => {
      this.startStage('santiscat_boss');
    }, 1300);
  }

  public initSantiscatBoss() {
    this.stage = 'santiscat_boss';
    this.camera.worldWidth = 3200;
    this.camera.worldHeight = 2400;
    this.obstacles = [];
    this.projectiles = [];
    this.drones = [];

    // Ambient arena debris for black hole absorption
    for (let i = 0; i < 28; i++) {
      const ox = 500 + Math.random() * 2200;
      const oy = 400 + Math.random() * 1600;
      if (Math.hypot(ox - 1600, oy - 1200) < 180) continue;
      this.obstacles.push({
        id: `santis_obs_${i}`,
        type: Math.random() > 0.5 ? 'building' : 'meteorite',
        x: ox,
        y: oy,
        width: 48 + Math.random() * 30,
        height: 48 + Math.random() * 30,
        hp: 75,
        maxHp: 75,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        color: '#a855f7',
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
      });
    }

    this.santiscat = {
      x: 1600,
      y: 950,
      vx: 0,
      vy: 0,
      width: 140,
      height: 140,
      hp: 4800,
      maxHp: 4800,
      shieldActive: false,
      shieldTimer: 0,
      currentAttack: 'idle',
      attackTimer: 0,
      attackCooldown: 1.8,
      floatOffset: 0,
      blackHole: {
        active: false,
        x: 1600,
        y: 830,
        vx: 0,
        vy: 0,
        radius: 46,
        phase: 'sun_charging',
        sunShotsFired: 0,
        sunShotTimer: 0,
        timer: 0,
        maxDuration: 8.5,
        absorbedDebris: [],
        gravityRadius: 380,
      },
      slashes: [],
      leftHand: { x: -50, y: 30, progress: 0 },
      rightHand: { x: 50, y: 30, progress: 0 },
      eyeState: 'glowing',
      facing: 1,
      summonExplosionTimer: 1.8,
    };
  }

  private updateSantiscat(delta: number) {
    if (!this.santiscat || this.stage !== 'santiscat_boss') return;
    const s = this.santiscat;

    s.floatOffset = Math.sin(this.stats.timeElapsed * 2.5) * 16;
    if (s.summonExplosionTimer && s.summonExplosionTimer > 0) {
      s.summonExplosionTimer -= delta;
    }

    // Direction facing player
    s.facing = this.player.x < s.x ? -1 : 1;

    // Movement: smooth floating around player
    if (s.currentAttack !== 'black_hole_chase') {
      const targetX = this.player.x + (s.facing === -1 ? 380 : -380);
      const targetY = this.player.y - 80;
      s.x += (targetX - s.x) * 0.025;
      s.y += (targetY - s.y) * 0.025;
    }

    // Hand punch progress decay
    if (s.leftHand.progress > 0) s.leftHand.progress = Math.max(0, s.leftHand.progress - delta * 3);
    if (s.rightHand.progress > 0) s.rightHand.progress = Math.max(0, s.rightHand.progress - delta * 3);

    // AI Attack Cycle
    if (s.currentAttack === 'idle') {
      s.attackCooldown -= delta;
      if (s.attackCooldown <= 0) {
        const attacks: SantiscatAttack[] = [
          'sun_burst',
          'oneshot_fireball',
          'reality_slashes',
          'sun_burst',
          'oneshot_fireball',
          'dimensional_warp',
        ];
        const nextAttack = attacks[Math.floor(Math.random() * attacks.length)];
        this.triggerSantiscatAttack(nextAttack);
      }
    } else if (s.currentAttack === 'sun_burst') {
      this.updateSantiscatSun(delta);
    } else if (s.currentAttack === 'compress_black_hole') {
      this.updateSantiscatCompress(delta);
    } else if (s.currentAttack === 'black_hole_chase') {
      this.updateSantiscatBlackHole(delta);
    } else if (s.currentAttack === 'oneshot_fireball') {
      this.updateSantiscatFireball(delta);
    } else if (s.currentAttack === 'reality_slashes') {
      this.updateSantiscatSlashes(delta);
    } else if (s.currentAttack === 'dimensional_warp') {
      this.updateSantiscatWarp(delta);
    }
  }

  private triggerSantiscatAttack(attack: SantiscatAttack) {
    if (!this.santiscat) return;
    const s = this.santiscat;
    s.currentAttack = attack;
    s.attackTimer = 0;

    if (attack === 'sun_burst') {
      s.blackHole.active = true;
      s.blackHole.phase = 'sun_charging';
      s.blackHole.x = s.x;
      s.blackHole.y = s.y - 120;
      s.blackHole.sunShotsFired = 0;
      s.blackHole.sunShotTimer = 0;
      s.eyeState = 'glowing';
    } else if (attack === 'oneshot_fireball') {
      s.eyeState = 'menacing';
      soundManager.playOneShotFireball();
    } else if (attack === 'reality_slashes') {
      s.eyeState = 'menacing';
      // Generate 3 slashing fracture lines around player
      s.slashes = [];
      for (let i = 0; i < 3; i++) {
        const ang = Math.random() * Math.PI;
        const len = 420;
        const cx = this.player.x + (Math.random() - 0.5) * 160;
        const cy = this.player.y + (Math.random() - 0.5) * 160;
        s.slashes.push({
          id: `slash_${i}_${Date.now()}`,
          x1: cx - Math.cos(ang) * (len / 2),
          y1: cy - Math.sin(ang) * (len / 2),
          x2: cx + Math.cos(ang) * (len / 2),
          y2: cy + Math.sin(ang) * (len / 2),
          phase: 'telegraph',
          timer: 0,
          maxTimer: 1.2,
          width: 24,
          damage: 65,
        });
      }
    }
  }

  private updateSantiscatSun(delta: number) {
    const s = this.santiscat!;
    const bh = s.blackHole;
    bh.x = s.x;
    bh.y = s.y - 120;
    bh.sunShotTimer += delta;

    if (bh.sunShotTimer >= 0.72) {
      bh.sunShotTimer = 0;
      bh.sunShotsFired++;
      soundManager.playSunBlast();
      this.screenShake = 10;

      // Launch celestial sun energy shot
      const ang = Math.atan2(this.player.y - bh.y, this.player.x - bh.x);
      const spd = 13;
      this.projectiles.push({
        id: Math.random().toString(),
        type: 'santiscat_sun_shot',
        x: bh.x,
        y: bh.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        radius: 16,
        damage: 42,
        duration: 0,
        maxDuration: 4.5,
        color: '#facc15',
        glowColor: '#ea580c',
        trail: [],
      });

      if (bh.sunShotsFired >= 5) {
        // Transition: Santiscat compresses it into a black hole!
        s.currentAttack = 'compress_black_hole';
        bh.phase = 'compressing';
        s.attackTimer = 0;
      }
    }
  }

  private updateSantiscatCompress(delta: number) {
    const s = this.santiscat!;
    s.attackTimer += delta;
    s.leftHand.progress = Math.min(1.0, s.attackTimer / 0.8);
    s.rightHand.progress = Math.min(1.0, s.attackTimer / 0.8);

    if (s.attackTimer >= 1.2) {
      soundManager.playBlackHoleCollapse();
      this.screenShake = 24;
      s.blackHole.phase = 'black_hole_active';
      s.blackHole.radius = 45;
      s.blackHole.timer = 0;
      s.blackHole.absorbedDebris = [];
      s.currentAttack = 'black_hole_chase';
      s.attackTimer = 0;
    }
  }

  private updateSantiscatBlackHole(delta: number) {
    const s = this.santiscat!;
    const bh = s.blackHole;
    bh.timer += delta;

    // Black Hole tracks player smoothly
    const dx = this.player.x - bh.x;
    const dy = this.player.y - bh.y;
    const dist = Math.hypot(dx, dy) || 1;
    const trackSpeed = 4.2;
    bh.x += (dx / dist) * trackSpeed * delta * 60;
    bh.y += (dy / dist) * trackSpeed * delta * 60;

    // Gravitational suction on nearby obstacles & debris
    this.obstacles.forEach(obs => {
      const oDist = Math.hypot(obs.x + obs.width / 2 - bh.x, obs.y + obs.height / 2 - bh.y);
      if (oDist < bh.gravityRadius) {
        // Pull towards black hole
        const pullStr = (1 - oDist / bh.gravityRadius) * 6.5;
        obs.x += ((bh.x - (obs.x + obs.width / 2)) / (oDist || 1)) * pullStr;
        obs.y += ((bh.y - (obs.y + obs.height / 2)) / (oDist || 1)) * pullStr;

        // Absorbed if close enough
        if (oDist < 60) {
          bh.absorbedDebris.push({
            id: obs.id,
            angle: Math.random() * Math.PI * 2,
            dist: 55 + Math.random() * 45,
            speed: 4.5 + Math.random() * 3.5,
            radius: 8 + Math.random() * 8,
            color: obs.color,
          });
          obs.hp = -999; // mark consumed
          soundManager.playPunch();
        }
      }
    });
    this.obstacles = this.obstacles.filter(o => o.hp > 0);

    // Update orbiting absorbed debris & test collision with Catvalen!
    bh.absorbedDebris.forEach(deb => {
      deb.angle += deb.speed * delta;
      const debX = bh.x + Math.cos(deb.angle) * deb.dist;
      const debY = bh.y + Math.sin(deb.angle) * deb.dist;
      const pDist = Math.hypot(this.player.x - debX, this.player.y - debY);
      if (pDist < this.player.width * 0.45 + deb.radius) {
        this.takePlayerDamage(28, 'collision');
      }
    });

    // Check player contact with event horizon
    if (dist < bh.radius + this.player.width * 0.35) {
      if (!this.godMode && !this.player.isInvulnerable) {
        this.stats.deathReason = 'black_hole';
        this.takePlayerDamage(65 * delta, 'collision');
      }
    }

    // Collapse after 8.5 seconds
    if (bh.timer >= bh.maxDuration) {
      soundManager.playExplosion();
      this.screenShake = 28;
      this.spawnHitParticles(bh.x, bh.y, '#ffffff', 40);
      this.spawnHitParticles(bh.x, bh.y, '#a855f7', 35);
      this.spawnRubble(bh.x, bh.y, '#6366f1', 25);
      bh.active = false;
      s.currentAttack = 'idle';
      s.attackCooldown = 2.0;
    }
  }

  private updateSantiscatFireball(delta: number) {
    const s = this.santiscat!;
    s.attackTimer += delta;

    if (s.attackTimer >= 0.6) {
      // Launch tiny ONE-SHOT fireball
      const ang = Math.atan2(this.player.y - s.y, this.player.x - s.x);
      const spd = 12;
      this.projectiles.push({
        id: Math.random().toString(),
        type: 'santiscat_oneshot_fireball',
        x: s.x + (s.facing === 1 ? 55 : -55),
        y: s.y + 10,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        radius: 9, // Small tiny fireball!
        damage: 99999, // ONE-SHOT!
        duration: 0,
        maxDuration: 4.8,
        color: '#ff003b',
        glowColor: '#ef4444',
        trail: [],
      });

      this.screenShake = 16;
      s.currentAttack = 'idle';
      s.attackCooldown = 2.4;
    }
  }

  private updateSantiscatSlashes(delta: number) {
    const s = this.santiscat!;
    s.attackTimer += delta;

    s.slashes.forEach(slash => {
      slash.timer += delta;
      if (slash.timer < 0.7) {
        slash.phase = 'telegraph';
      } else if (slash.timer < 0.95) {
        if (slash.phase === 'telegraph') {
          soundManager.playRealitySlash();
          this.screenShake = 18;
          // Check collision between player and line segment (x1, y1) to (x2, y2)
          const px = this.player.x;
          const py = this.player.y;
          const ldx = slash.x2 - slash.x1;
          const ldy = slash.y2 - slash.y1;
          const lenSq = ldx * ldx + ldy * ldy || 1;
          const t = Math.max(0, Math.min(1, ((px - slash.x1) * ldx + (py - slash.y1) * ldy) / lenSq));
          const projX = slash.x1 + t * ldx;
          const projY = slash.y1 + t * ldy;
          const distToLine = Math.hypot(px - projX, py - projY);

          if (distToLine < slash.width + this.player.width * 0.4) {
            this.stats.deathReason = 'reality_tear';
            this.takePlayerDamage(slash.damage, 'laser');
          }
        }
        slash.phase = 'slash';
      } else {
        slash.phase = 'fade';
      }
    });

    if (s.attackTimer >= 1.25) {
      s.slashes = [];
      s.currentAttack = 'idle';
      s.attackCooldown = 1.9;
    }
  }

  private updateSantiscatWarp(delta: number) {
    const s = this.santiscat!;
    soundManager.playTeleport();
    this.spawnHitParticles(s.x, s.y, '#a855f7', 20);
    s.x = Math.max(200, Math.min(3000, this.player.x + (Math.random() > 0.5 ? 420 : -420)));
    s.y = Math.max(200, Math.min(2200, this.player.y + (Math.random() - 0.5) * 360));
    this.spawnHitParticles(s.x, s.y, '#38bdf8', 20);
    s.currentAttack = 'idle';
    s.attackCooldown = 1.4;
  }

  public applyDamageToSantiscat(baseDmg: number, attackType: AttackType, hitX: number, hitY: number) {
    if (!this.santiscat || this.stage !== 'santiscat_boss') return;
    const s = this.santiscat;

    const { damage, isBlackFlash } = this.rollBlackFlash(baseDmg, hitX, hitY);
    s.hp = Math.max(0, s.hp - damage);
    this.stats.santiscatDamageDealt = (this.stats.santiscatDamageDealt || 0) + damage;
    this.stats.totalAttacksLanded++;
    this.stats.score += damage * 3;

    if (!isBlackFlash) {
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: `-${damage}`,
        x: hitX,
        y: hitY - 12,
        vy: -1.4,
        color: '#f43f5e',
        isBlackFlash: false,
        life: 0.9,
        maxLife: 0.9,
        scale: 1.15,
      });
    }

    this.spawnHitParticles(hitX, hitY, isBlackFlash ? '#ff003b' : '#c084fc', 12);

    if (s.hp <= 0) {
      this.triggerVictory(true);
    }
  }
}
