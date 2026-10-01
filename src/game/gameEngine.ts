import { soundManager } from '../audio/soundManager';
import {
  AttackType,
  BlackFlashStrike,
  Boss,
  BossAttack,
  CinematicState,
  DamageNumber,
  GameStage,
  GameStats,
  Obstacle,
  Particle,
  Player,
  Projectile,
} from '../types/game';

export class GameEngine {
  public width: number = 960;
  public height: number = 600;

  public stage: GameStage = 'start';
  public stageProgress: number = 0; // 0 to 100
  public stageTarget: number = 100;
  public screenShake: number = 0;

  public player: Player;
  public boss: Boss | null = null;
  public cinematic: CinematicState | null = null;
  public obstacles: Obstacle[] = [];
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public blackFlashStrikes: BlackFlashStrike[] = [];
  public damageNumbers: DamageNumber[] = [];

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
    this.player = this.createInitialPlayer();
  }

  public setCallbacks(onGameOver: () => void, onVictory: () => void) {
    this.onGameOverCallback = onGameOver;
    this.onVictoryCallback = onVictory;
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    // Keep player in bounds
    if (this.player.x > width - 100) this.player.x = width - 100;
    if (this.player.y > height - 80) this.player.y = height - 80;
  }

  private createInitialPlayer(): Player {
    return {
      x: 120,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      width: 58,
      height: 58,
      hp: 100,
      maxHp: 100,
      shieldActive: false,
      shieldTimer: 0,
      shieldMaxDuration: 2.8,
      shieldCooldown: 0,
      shieldMaxCooldown: 7.5,
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
      healsRemaining: 10,
      maxHeals: 10,
      healCooldown: 0,
      isInvulnerable: false,
      invulnerableTimer: 0,
      facing: 1,
      eyeState: 'normal',
      animationTime: 0,
    };
  }

  public startStage(stage: GameStage) {
    this.stage = stage;
    this.stageProgress = 0;
    this.obstacles = [];
    this.projectiles = [];
    this.blackFlashStrikes = [];

    if (stage === 'city') {
      this.stageTarget = 100;
      soundManager.playMusic('city');
    } else if (stage === 'space') {
      this.stageTarget = 100;
      soundManager.playMusic('space');
    } else if (stage === 'boss') {
      soundManager.playMusic('boss');
      this.initBoss();
    }
  }

  public resetGame() {
    soundManager.stopGammaSound();
    this.player = this.createInitialPlayer();
    this.cinematic = null;
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
    this.particles = [];
    this.blackFlashStrikes = [];
    this.damageNumbers = [];
    this.cinematic = null;
    this.boss = null;
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

    // Check hit on Boss (Punch can penetrate Nanovalen even with energy shield!)
    if (this.boss && (this.stage === 'boss')) {
      const bossDist = Math.hypot(punchX - this.boss.x, punchY - this.boss.y);
      if (bossDist < 100) {
        this.applyDamageToBoss(45, 'punch', punchX, punchY, true);
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
   * 5. Escudo Verde (Cooldown: 7.5s, Duración: 2.8s)
   */
  public activateShield(): boolean {
    if (this.player.shieldCooldown > 0 || this.player.shieldActive || this.stage === 'start' || this.stage === 'gameover' || this.stage === 'cinematic_earth_destruction') {
      return false;
    }

    this.player.shieldActive = true;
    this.player.shieldTimer = this.player.shieldMaxDuration;
    this.player.shieldCooldown = this.player.shieldMaxCooldown;
    soundManager.playShield();

    // Spawn green shield activation particles
    for (let i = 0; i < 16; i++) {
      const ang = (i * Math.PI * 2) / 16;
      this.particles.push({
        x: this.player.x + Math.cos(ang) * 45,
        y: this.player.y + Math.sin(ang) * 45,
        vx: Math.cos(ang) * 2.5,
        vy: Math.sin(ang) * 2.5,
        size: 4,
        color: '#10b981',
        life: 0.5,
        maxLife: 0.5,
        alpha: 1,
        shape: 'spark',
      });
    }

    return true;
  }

  /**
   * 6. Curación de Catvalen (Presionando F, límite 10 curaciones)
   * Recupera salud, emite partículas esmeralda y destellos mágicos
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
        text: '¡SIN CURAS (0/10)!',
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
    p.healCooldown = 0.9; // 0.9s cooldown between heals

    const healAmount = 35;
    const oldHp = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + healAmount);
    const actualHealed = Math.round(p.hp - oldHp);

    soundManager.playHeal();

    // Floating green healing number
    this.damageNumbers.push({
      id: Math.random().toString(),
      text: `+${actualHealed} HP (${p.healsRemaining}/10)`,
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

  // --- Boss Damage & Mechanics ---

  private applyDamageToBoss(baseDmg: number, attackType: AttackType, hitX: number, hitY: number, bypassShield: boolean = false) {
    if (!this.boss || this.stage !== 'boss') return;

    // Check if Nanovalen's shield is active:
    // Prompt: "crear escudos de energia que absorban los disparos del gato"
    if (this.boss.shieldActive && !bypassShield) {
      soundManager.playShieldAbsorb();
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: '¡ABSORBIDO!',
        x: hitX,
        y: hitY - 15,
        vy: -1.5,
        color: '#818cf8',
        isBlackFlash: false,
        life: 0.9,
        maxLife: 0.9,
        scale: 1.1,
      });
      this.spawnHitParticles(hitX, hitY, '#818cf8', 10);
      return;
    }

    const { damage, isBlackFlash } = this.rollBlackFlash(baseDmg, hitX, hitY);
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
    };
  }

  private triggerVictory() {
    this.stage = 'victory';
    soundManager.stopMusic();
    soundManager.playVictory();
    this.screenShake = 22;

    // Victory explosion around Nanovalen
    if (this.boss) {
      this.spawnRubble(this.boss.x, this.boss.y, '#f43f5e', 45);
      this.spawnRubble(this.boss.x, this.boss.y, '#38bdf8', 35);
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

    // Update Player
    this.updatePlayer(delta);

    // Update Projectiles
    this.updateProjectiles(delta);

    // Update Obstacles (Buildings & Asteroids)
    this.updateObstacles(delta);

    // Update Boss (Nanovalen)
    if (this.stage === 'boss' && this.boss) {
      this.updateBoss(delta);
    }

    // Update Effects
    this.updateBlackFlashStrikes(delta);
    this.updateParticles(delta);
    this.updateDamageNumbers(delta);
  }

  private updatePlayer(delta: number) {
    const p = this.player;

    // Keyboard Movement
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

    const moveSpeed = 6.5;
    if (dx !== 0 || dy !== 0) {
      p.vx = dx * moveSpeed;
      p.vy = dy * moveSpeed;
    } else {
      // Smooth friction deceleration
      p.vx *= 0.88;
      p.vy *= 0.88;
    }

    p.x += p.vx;
    p.y += p.vy;

    // Clamp inside arena
    const margin = 35;
    if (p.x < margin) p.x = margin;
    if (p.x > this.width - margin) p.x = this.width - margin;
    if (p.y < margin) p.y = margin;
    if (p.y > this.height - margin) p.y = this.height - margin;

    // Cooldowns
    if (p.punchCooldown > 0) p.punchCooldown -= delta;
    if (p.fireballCooldown > 0) p.fireballCooldown -= delta;
    if (p.lightningCooldown > 0) p.lightningCooldown -= delta;
    if (p.powerBurstCooldown > 0) p.powerBurstCooldown -= delta;
    if (p.healCooldown > 0) p.healCooldown -= delta;

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

    if (this.player.isInvulnerable) return;

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
      p.duration += delta;
      p.x += p.vx * delta * 60;
      p.y += p.vy * delta * 60;

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
            // Expire projectile
            p.duration = p.maxDuration;
            break;
          }
        }

        // Check collision with Nanovalen
        if (this.boss && this.stage === 'boss') {
          const bDist = Math.hypot(p.x - this.boss.x, p.y - this.boss.y);
          if (bDist < (this.boss.width / 2 + p.radius)) {
            this.applyDamageToBoss(p.damage, p.type.replace('player_', '') as AttackType, p.x, p.y);
            p.duration = p.maxDuration;
          }
        }
      } else if (p.type === 'boss_meteor') {
        // Nanovalen meteor hits player
        const pDist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (pDist < this.player.width * 0.4 + p.radius) {
          this.takePlayerDamage(p.damage, 'meteor');
          p.duration = p.maxDuration;
        }
      }
    });

    // Remove expired
    this.projectiles = this.projectiles.filter(p => p.duration < p.maxDuration && p.x > -100 && p.x < this.width + 100);
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
    // 3) energy_shield (absorbs shots)
    const options: BossAttack[] = ['meteor_storm', 'laser_warning', 'energy_shield'];
    const chosen = options[Math.floor(Math.random() * options.length)];

    b.currentAttack = chosen;
    b.attackTimer = 0;

    if (chosen === 'laser_warning') {
      // Prompt: "lanzar lasers con un aviso previo de 1.5 segundo"
      b.laserY = this.player.y;
      b.laserHeight = 48;
      soundManager.playLaserWarning();
    } else if (chosen === 'energy_shield') {
      // Prompt: "crear escudos de energia que absorban los disparos del gato"
      b.shieldActive = true;
      b.shieldTimer = 4.5;
      soundManager.playShield();
      b.attackCooldown = 4.0;
      b.currentAttack = 'idle';
    } else if (chosen === 'meteor_storm') {
      soundManager.playExplosion();
    }
  }

  private executeBossAttack(delta: number) {
    const b = this.boss!;
    b.attackTimer += delta;

    // 1. Meteor Storm (Enhanced speed & damage: 38 base)
    if (b.currentAttack === 'meteor_storm') {
      // Launch barrage of fast tracking meteorites
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
      // Tracking player's Y slightly during the first 0.6s of warning
      if (b.attackTimer < 0.6) {
        b.laserY += (this.player.y - b.laserY) * 0.09;
      }

      // Warning beeps
      if (Math.floor(b.attackTimer * 3) !== Math.floor((b.attackTimer - delta) * 3)) {
        soundManager.playLaserWarning();
      }

      // Exactly 1.5s warning elapsed!
      if (b.attackTimer >= 1.5) {
        b.currentAttack = 'laser_fire';
        b.attackTimer = 0;
        soundManager.playLaserFire();
        this.screenShake = 18;
      }
    } else if (b.currentAttack === 'laser_fire') {
      // Fire duration 0.65s
      const halfLaserH = b.laserHeight / 2;
      // Check player collision in laser corridor
      if (this.player.x < b.x && Math.abs(this.player.y - b.laserY) < halfLaserH + 20) {
        this.takePlayerDamage(75, 'laser');
      }

      if (b.attackTimer >= b.laserFireDuration) {
        b.currentAttack = 'idle';
        b.attackCooldown = 1.2;
      }
    }

    // 3. Final Attack: Gamma Ray Burst (Uncancelable! Triple Power: 66 damage per tick!)
    else if (b.currentAttack === 'gamma_ray_charge') {
      b.gammaChargeProgress = Math.min(1, b.attackTimer / 2.0);
      // Smoothly move Nanovalen to arena center
      b.x += (this.width * 0.7 - b.x) * 0.06;
      b.y += (this.height * 0.5 - b.y) * 0.06;

      if (b.attackTimer >= 2.0) {
        b.currentAttack = 'gamma_ray_burst';
        b.attackTimer = 0;
        soundManager.playGammaBurst();
        this.screenShake = 28;
      }
    } else if (b.currentAttack === 'gamma_ray_burst') {
      // Gamma ray burst lasts 3.8 seconds with rotating lethal arcs and safe dodge gaps!
      const burstDuration = 3.8;
      const rotSpeed = 0.9;

      // Update rays
      b.gammaRays.forEach(ray => {
        ray.angle += rotSpeed * delta;
        ray.safeAngleStart = ray.angle + ray.width;
        ray.safeAngleEnd = ray.angle + Math.PI;

        // Check player angle relative to boss center
        const pAngle = Math.atan2(this.player.y - b.y, this.player.x - b.x);
        let normalizedPAngle = pAngle;
        if (normalizedPAngle < 0) normalizedPAngle += Math.PI * 2;

        let normalizedRayStart = ray.angle % (Math.PI * 2);
        if (normalizedRayStart < 0) normalizedRayStart += Math.PI * 2;
        let normalizedRayEnd = (ray.angle + ray.width) % (Math.PI * 2);
        if (normalizedRayEnd < 0) normalizedRayEnd += Math.PI * 2;

        // If inside lethal sector and not inside safe pocket
        let inLethal = false;
        if (normalizedRayStart < normalizedRayEnd) {
          inLethal = normalizedPAngle >= normalizedRayStart && normalizedPAngle <= normalizedRayEnd;
        } else {
          inLethal = normalizedPAngle >= normalizedRayStart || normalizedPAngle <= normalizedRayEnd;
        }

        if (inLethal) {
          // Triple-strength gamma damage: 66 per tick
          this.takePlayerDamage(66, 'gamma');
        }
      });

      if (b.attackTimer >= burstDuration) {
        b.currentAttack = 'idle';
        b.attackCooldown = 2.5;
        b.gammaBurstTimer = 16.0; // Cooldown for next gamma ray burst
      }
    }

    if (b.gammaBurstTimer > 0) {
      b.gammaBurstTimer -= delta;
    }
  }

  private startGammaRayBurst() {
    const b = this.boss!;
    b.currentAttack = 'gamma_ray_charge';
    b.attackTimer = 0;
    b.gammaChargeProgress = 0;
    soundManager.playGammaCharge();

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
}
