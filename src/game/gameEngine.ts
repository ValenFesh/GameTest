import { soundManager } from '../audio/soundManager';
import { multiplayerClient } from './multiplayerClient';
import { MultiplayerPlayer } from '../types/multiplayer';
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
  JujutsuSummon,
  SantiscatDefeatCinematicState,
  SantiscatDefeatPhase,
  CosmicEscapeState,
  CollapsingPlanet,
  ExplodingStar,
  RealityFissure,
  CosmicDebris,
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
import { unlockAchievement } from './achievements';
import {
  SideQuest,
  ActivePowerBonuses,
  getSavedSideQuests,
  saveSideQuests,
  resetSideQuests,
  calculateActivePowerBonuses,
  progressQuestItem,
} from './sideQuests';

export class GameEngine {
  public width: number = 960;
  public height: number = 600;

  // Secondary Missions & Attack Power Scaling
  public sideQuests: SideQuest[] = getSavedSideQuests();
  public powerBonuses: ActivePowerBonuses = calculateActivePowerBonuses(this.sideQuests);
  public onQuestCompletedCallback?: (quest: SideQuest) => void;
  private survivorSecondTimer: number = 0;

  // Multiplayer & Touch
  public isMultiplayer: boolean = false;
  public myPlayerId: string = '';
  public remotePlayers: Map<string, MultiplayerPlayer> = new Map();
  public isSpectating: boolean = false;
  public spectatingTargetId: string | null = null;
  public touchDx: number = 0;
  public touchDy: number = 0;
  private netSyncTimer: number = 0;

  public currentSkin: CharacterSkinId = 'catvalen';
  public nanovalenWins: number = 0;
  public santiscatWins: number = 0;
  public adminUnlockAll: boolean = false;
  public godMode: boolean = false;
  public infiniteHeals: boolean = false;
  public noCooldowns: boolean = false;

  public stage: GameStage = 'start';
  public lastBattleStage: GameStage = 'city';
  public stageProgress: number = 0; // 0 to 100
  public stageTarget: number = 100;
  public screenShake: number = 0;

  public player: Player;
  public boss: Boss | null = null;
  public drones: BossDrone[] = [];
  public cinematic: CinematicState | null = null;
  public santiscatDefeatCinematic: SantiscatDefeatCinematicState | null = null;
  public cosmicEscape: CosmicEscapeState | null = null;
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
  public isSantiscatSummoning: boolean = false;

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
  public onGameOverCallback?: () => void;
  public onVictoryCallback?: () => void;

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

  public setupMultiplayer(isMulti: boolean, myId: string) {
    this.isMultiplayer = isMulti;
    this.myPlayerId = myId;
    this.remotePlayers.clear();
    this.isSpectating = false;
    this.spectatingTargetId = null;

    if (!isMulti) return;

    // Immediately populate existing room players so teammates are visible right away
    if (multiplayerClient.currentRoom?.players) {
      Object.values(multiplayerClient.currentRoom.players).forEach((p) => {
        if (p.id !== this.myPlayerId) {
          this.remotePlayers.set(p.id, {
            ...p,
            isAlive: p.isAlive !== false,
          });
        }
      });
    }

    multiplayerClient.onRemotePlayerUpdate = (playerId, updated) => {
      if (playerId === this.myPlayerId) return;
      const existing = this.remotePlayers.get(playerId);
      if (existing) {
        Object.assign(existing, updated);
        if (typeof updated.isAlive === 'boolean') {
          existing.isAlive = updated.isAlive;
        }
      } else {
        this.remotePlayers.set(playerId, {
          ...updated,
          isAlive: updated.isAlive !== false,
        } as MultiplayerPlayer);
      }
    };

    multiplayerClient.onRemotePlayerAttack = (attack) => {
      if (attack.playerId === this.myPlayerId) return;
      this.handleRemoteAttack(attack);
    };

    multiplayerClient.onBossHitBroadcast = (hit) => {
      if (hit.playerId !== this.myPlayerId) {
        if (hit.target === 'nanovalen' && this.boss) {
          if (this.boss.shieldActive) {
            soundManager.playShieldAbsorb();
            this.damageNumbers.push({
              id: Math.random().toString(),
              text: '¡ABSORBIDO (ESCUDO)!',
              x: hit.hitX,
              y: hit.hitY - 15,
              vy: -1.5,
              color: '#ef4444',
              isBlackFlash: false,
              life: 0.9,
              maxLife: 0.9,
              scale: 1.1,
            });
          } else {
            this.boss.hp = hit.remainingHp;
            this.damageNumbers.push({
              id: Math.random().toString(),
              text: hit.isBlackFlash ? `★ TEAMMATE BLACK FLASH! -${hit.damage} ★` : `-${hit.damage}`,
              x: hit.hitX,
              y: hit.hitY - 15,
              vy: -1.6,
              color: hit.isBlackFlash ? '#ff003b' : '#38bdf8',
              isBlackFlash: hit.isBlackFlash,
              life: 1.1,
              maxLife: 1.1,
              scale: hit.isBlackFlash ? 1.4 : 1.1,
            });
            this.spawnHitParticles(hit.hitX, hit.hitY, hit.isBlackFlash ? '#ff003b' : '#38bdf8', 12);
            if (this.boss.hp <= 0) {
              this.triggerVictory();
            }
          }
        } else if (hit.target === 'santiscat' && this.santiscat) {
          this.santiscat.hp = hit.remainingHp;
          this.damageNumbers.push({
            id: Math.random().toString(),
            text: hit.isBlackFlash ? `★ TEAMMATE BLACK FLASH! -${hit.damage} ★` : `-${hit.damage}`,
            x: hit.hitX,
            y: hit.hitY - 15,
            vy: -1.6,
            color: hit.isBlackFlash ? '#ff003b' : '#38bdf8',
            isBlackFlash: hit.isBlackFlash,
            life: 1.1,
            maxLife: 1.1,
            scale: hit.isBlackFlash ? 1.4 : 1.1,
          });
          this.spawnHitParticles(hit.hitX, hit.hitY, hit.isBlackFlash ? '#ff003b' : '#a855f7', 12);
          if (this.santiscat.hp <= 0) {
            if (this.santiscat.bossPhase === 1) {
              this.startSantiscatPhase2Cinematic();
            } else {
              this.startSantiscatDefeatCinematic(false);
            }
          }
        }
      }
    };

    multiplayerClient.onObstacleHit = (hit) => {
      if (hit.playerId === this.myPlayerId) return;

      const obs = this.obstacles.find((o) => o.id === hit.obstacleId);
      if (obs) {
        obs.hp -= hit.damage;
        this.spawnHitParticles(hit.hitX, hit.hitY, '#fb923c', 6);
        if (hit.isDestroyed || obs.hp <= 0) {
          this.destroyObstacle(obs, false);
        }
      } else if (hit.isDestroyed) {
        const rubbleColor = hit.obstacleType === 'building' ? '#475569' : '#78716c';
        this.spawnRubble(hit.hitX, hit.hitY, rubbleColor, 16);
        soundManager.playExplosion();
      }

      this.stageProgress = Math.max(this.stageProgress, hit.stageProgress);

      if (this.stage === 'city' && this.stageProgress >= 100) {
        this.triggerCityToSpaceTransition();
      } else if (this.stage === 'space' && this.stageProgress >= 100) {
        this.triggerSpaceToBossTransition();
      }
    };

    multiplayerClient.onBossAttack = (data) => {
      this.handleRemoteBossAttack(data);
    };

    multiplayerClient.onSantiscatSummoned = ({ summonerId, summonerName }) => {
      this.isSantiscatSummoning = true;
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: `⚡ ¡${summonerName} HA INVOCADO A SANTISCAT! ⚡`,
        x: 1600,
        y: 1100,
        vy: -1.6,
        color: '#fbbf24',
        isBlackFlash: true,
        life: 3.5,
        maxLife: 3.5,
        scale: 1.5,
      });
      soundManager.playSantiscatSummon();
      if (summonerId !== this.myPlayerId) {
        this.startStage('santiscat_boss');
      }
    };

    multiplayerClient.onStageChanged = (newStage, progress) => {
      if (this.stage !== newStage) {
        this.startStage(newStage as GameStage);
      }
      this.stageProgress = progress;
    };

    multiplayerClient.onPlayerDeath = (deadPlayerId, deadName, allDead) => {
      const p = this.remotePlayers.get(deadPlayerId);
      if (p) {
        p.isAlive = false;
        p.isSpectating = true;
      }
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: `💀 ${deadName} ha caído en combate`,
        x: this.camera.x + this.camera.viewportWidth / 2,
        y: this.camera.y + 100,
        vy: -0.6,
        color: '#f87171',
        isBlackFlash: false,
        life: 2.5,
        maxLife: 2.5,
        scale: 1.3,
      });
      if (allDead) {
        this.triggerGameOver();
      } else if (this.isSpectating && this.spectatingTargetId === deadPlayerId) {
        this.spectateNext();
      }
    };

    multiplayerClient.onGameOver = (deathReason) => {
      if (deathReason) this.stats.deathReason = deathReason as any;
      this.triggerGameOver();
    };

    multiplayerClient.onGameVictory = (isSantiscat) => {
      this.triggerVictory(isSantiscat);
    };
  }

  public handleRemoteAttack(attack: {
    playerId: string;
    attackType: string;
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    angle?: number;
    facing?: number;
    skin: CharacterSkinId;
  }) {
    const facing = attack.facing || 1;
    switch (attack.attackType) {
      case 'punch':
        soundManager.playPunch();
        this.spawnHitParticles(attack.x + facing * 35, attack.y, '#f8fafc', 8);
        break;
      case 'fireball':
        soundManager.playFireball();
        this.projectiles.push({
          id: Math.random().toString(),
          type: 'player_fireball',
          x: attack.x,
          y: attack.y,
          vx: (attack.vx || 14) * facing,
          vy: attack.vy || 0,
          radius: 14,
          damage: 48,
          duration: 0,
          maxDuration: 2.2,
          color: '#f97316',
          glowColor: '#ea580c',
          trail: [],
        });
        break;
      case 'lightning':
        soundManager.playLightning();
        this.projectiles.push({
          id: Math.random().toString(),
          type: 'player_lightning',
          x: attack.x,
          y: attack.y,
          vx: (attack.vx || 24) * facing,
          vy: 0,
          radius: 12,
          damage: 160,
          duration: 0,
          maxDuration: 1.5,
          color: '#38bdf8',
          glowColor: '#0284c7',
          trail: [],
        });
        break;
      case 'burst':
        soundManager.playPowerBurst();
        this.projectiles.push({
          id: Math.random().toString(),
          type: 'player_burst',
          x: attack.x,
          y: attack.y,
          vx: (attack.vx || 16) * facing,
          vy: attack.vy || 0,
          radius: 8,
          damage: 35,
          duration: 0,
          maxDuration: 1.8,
          color: '#06b6d4',
          glowColor: '#0891b2',
          trail: [],
        });
        break;
      case 'energy_blade':
        soundManager.playEnergyBlades();
        this.projectiles.push({
          id: Math.random().toString(),
          type: 'player_energy_blade',
          x: attack.x,
          y: attack.y,
          vx: (attack.vx || 18) * facing,
          vy: attack.vy || 0,
          radius: 14,
          damage: 75,
          duration: 0,
          maxDuration: 3.5,
          color: '#f59e0b',
          glowColor: '#d97706',
          trail: [],
        });
        break;
      case 'energy_anvil':
        soundManager.playEnergyAnvil();
        this.projectiles.push({
          id: Math.random().toString(),
          type: 'player_energy_anvil',
          x: attack.x,
          y: attack.y - 320,
          vx: 0,
          vy: 24,
          radius: 42,
          damage: 380,
          duration: 0,
          maxDuration: 1.6,
          color: '#facc15',
          glowColor: '#ca8a04',
          trail: [],
          targetY: attack.y,
        });
        break;
      case 'light_laser':
        soundManager.playLightLaser();
        this.projectiles.push({
          id: Math.random().toString(),
          type: 'player_light_laser',
          x: attack.x,
          y: attack.y,
          vx: (attack.vx || 26) * facing,
          vy: 0,
          radius: 16,
          damage: 130,
          duration: 0,
          maxDuration: 1.6,
          color: '#fef08a',
          glowColor: '#eab308',
          trail: [],
        });
        break;
      case 'time_stop':
        soundManager.playTimeStop();
        this.screenShake = 22;
        break;
    }
  }

  public isHostPlayer(): boolean {
    if (!this.isMultiplayer) return true;
    return multiplayerClient.currentRoom?.hostId === this.myPlayerId;
  }

  public handleRemoteBossAttack(data: { bossType: 'nanovalen' | 'santiscat'; attackType: string; params: any }) {
    if (data.bossType === 'nanovalen' && this.boss) {
      this.executeRemoteNanovalenAttack(data.attackType, data.params);
    } else if (data.bossType === 'santiscat' && this.santiscat) {
      this.executeRemoteSantiscatAttack(data.attackType, data.params);
    }
  }

  private executeRemoteNanovalenAttack(attackType: string, params: any) {
    if (!this.boss) return;
    const b = this.boss;
    b.currentAttack = attackType as any;
    b.attackTimer = 0;

    if (attackType === 'laser_warning') {
      b.laserY = params?.laserY ?? this.player.y;
      b.laserHeight = 48;
      soundManager.playLaserWarning();
    } else if (attackType === 'energy_shield') {
      b.shieldActive = true;
      b.shieldTimer = 4.5;
      soundManager.playShield();
      b.attackCooldown = 4.0;
      b.currentAttack = 'idle';
    } else if (attackType === 'meteor_storm') {
      soundManager.playExplosion();
    } else if (attackType === 'gravity_pull') {
      soundManager.playLaserWarning();
      soundManager.playGravityPull();
      b.pullTimer = 2.4;
      b.pullHandExtended = 0;
    } else if (attackType === 'gamma_ray_charge') {
      this.startGammaRayBurst();
    } else if (attackType === 'drone_spawn') {
      soundManager.playLaserWarning();
    }
  }

  private executeRemoteSantiscatAttack(attackType: string, params: any) {
    if (!this.santiscat) return;
    this.triggerSantiscatAttack(attackType as SantiscatAttack, false);
    if (attackType === 'rainbow_blast' && params?.safeSide && this.santiscat.rainbowBlast) {
      this.santiscat.rainbowBlast.safeSide = params.safeSide;
    }
  }

  public spectateNext() {
    const aliveRemotes = Array.from(this.remotePlayers.values()).filter(p => p.isAlive);
    if (aliveRemotes.length === 0) {
      this.spectatingTargetId = null;
      return;
    }
    if (!this.spectatingTargetId) {
      this.spectatingTargetId = aliveRemotes[0].id;
      return;
    }
    const idx = aliveRemotes.findIndex(p => p.id === this.spectatingTargetId);
    const nextIdx = (idx + 1) % aliveRemotes.length;
    this.spectatingTargetId = aliveRemotes[nextIdx].id;
    if (this.isMultiplayer) {
      multiplayerClient.sendSpectate(this.spectatingTargetId);
    }
  }

  public spectatePrev() {
    const aliveRemotes = Array.from(this.remotePlayers.values()).filter(p => p.isAlive);
    if (aliveRemotes.length === 0) {
      this.spectatingTargetId = null;
      return;
    }
    if (!this.spectatingTargetId) {
      this.spectatingTargetId = aliveRemotes[0].id;
      return;
    }
    const idx = aliveRemotes.findIndex(p => p.id === this.spectatingTargetId);
    const prevIdx = (idx - 1 + aliveRemotes.length) % aliveRemotes.length;
    this.spectatingTargetId = aliveRemotes[prevIdx].id;
    if (this.isMultiplayer) {
      multiplayerClient.sendSpectate(this.spectatingTargetId);
    }
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
    if (this.santiscat) {
      this.santiscat.hp = 0;
      this.startSantiscatDefeatCinematic();
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
      holdingShield: false,
    };
  }

  public startStage(stage: GameStage) {
    this.stage = stage;
    this.stageProgress = 0;
    this.obstacles = [];
    this.projectiles = [];
    this.drones = [];
    this.blackFlashStrikes = [];

    unlockAchievement('you_played');

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
    } else if (stage === 'santiscat_boss_wormhole') {
      this.initSantiscatBoss();
      if (this.santiscat) {
        this.santiscat.bossPhase = 2;
        this.santiscat.hp = 99999;
        this.santiscat.maxHp = 99999;
        this.santiscat.souls.forEach(soul => (soul.absorbed = true));
      }
      this.stage = 'santiscat_boss_wormhole';
      soundManager.playMusic('santiscat_phase2');
    } else if (stage === 'santiscat_boss_universe') {
      this.initSantiscatBoss();
      if (this.santiscat) {
        this.santiscat.bossPhase = 2.5;
        this.santiscat.hp = 99999;
        this.santiscat.maxHp = 99999;
        this.santiscat.souls.forEach(soul => (soul.absorbed = true));
      }
      this.stage = 'santiscat_boss_universe';
      soundManager.playMusic('santiscat_phase25');
    } else if (stage === 'cinematic_santiscat_defeat') {
      this.startSantiscatDefeatCinematic();
    }
  }

  public resetGame() {
    soundManager.stopGammaSound();
    this.player = this.createInitialPlayer();
    this.cinematic = null;
    this.santiscatDefeatCinematic = null;
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
    this.santiscatDefeatCinematic = null;
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

    if (this.stage === 'cinematic_santiscat_defeat') {
      if (code === 'Space' || code.toLowerCase() === 'space') {
        this.skipSantiscatDefeatCinematic();
      }
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
    } else if (code === 'Digit1' || code === 'KeyQ') {
      this.performFireball();
    } else if (code === 'Digit2' || code === 'KeyE' || code === 'KeyL') {
      this.performLightning();
    } else if (code === 'Digit3' || code === 'KeyR' || code === 'KeyU') {
      this.performPowerBurst();
    } else if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyC' || code === 'KeyK') {
      this.player.holdingShield = true;
      this.activateShield();
    } else if (code === 'Digit4' || code === 'KeyG') {
      this.performSpecial1();
    } else if (code === 'Digit5' || code === 'KeyT' || code === 'KeyV') {
      this.performSpecial2();
    }
  }

  public handleKeyUp(code: string) {
    this.keys[code.toLowerCase()] = false;
    if (code === 'KeyK' || code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyC') {
      this.player.holdingShield = false;
    }
  }

  public setHoldingShield(holding: boolean) {
    this.player.holdingShield = holding;
    if (holding) {
      this.activateShield();
    }
  }

  public setTouchDirection(dx: number, dy: number) {
    if (this.stage === 'gameover' || this.stage === 'victory' || this.stage === 'cinematic_earth_destruction') return;
    this.touchDx = dx;
    this.touchDy = dy;
    const speed = 7.5;
    this.player.vx = dx * speed;
    this.player.vy = dy * speed;
    // Prompt: "que catvalen pueda voltearse para tirar ataques hacia la izquierda"
    if (dx < -0.2) this.player.facing = -1;
    else if (dx > 0.2) this.player.facing = 1;
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

    // Melee hitbox in facing direction
    const punchX = this.player.x + (this.player.facing * 40);
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

    // Check hit on Santiscat Boss in Level 4 (Phase 1, Wormhole, Another Universe)
    if (this.santiscat && (this.stage === 'santiscat_boss' || this.stage === 'santiscat_boss_wormhole' || this.stage === 'santiscat_boss_universe')) {
      const sDist = Math.hypot(punchX - this.santiscat.x, punchY - this.santiscat.y);
      if (sDist < 140) {
        this.applyDamageToSantiscat(55, 'punch', punchX, punchY);
      }
      // Check hit on Jujutsu Summons (Sukunacat & Gojocat)
      if (this.santiscat.jujutsuSummons) {
        this.santiscat.jujutsuSummons.forEach(sm => {
          if (sm.active && Math.hypot(punchX - sm.x, punchY - sm.y) < punchRange + sm.width / 2) {
            this.applyDamageToSummon(sm, 65, 'punch', punchX, punchY);
          }
        });
      }
    }

    if (this.isMultiplayer) {
      multiplayerClient.sendPlayerAttack({
        attackType: 'punch',
        x: punchX,
        y: punchY,
        facing: this.player.facing,
      });
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

    const spawnX = this.player.x + (this.player.facing * 35);
    const spawnY = this.player.y;

    this.projectiles.push({
      id: Math.random().toString(),
      type: 'player_fireball',
      x: spawnX,
      y: spawnY,
      vx: 13 * this.player.facing,
      vy: (Math.random() - 0.5) * 1.2,
      radius: 14,
      damage: 85,
      duration: 0,
      maxDuration: 2.2,
      color: '#f97316',
      glowColor: '#ea580c',
      trail: [],
    });

    if (this.isMultiplayer) {
      multiplayerClient.sendPlayerAttack({
        attackType: 'fireball',
        x: spawnX,
        y: spawnY,
        vx: 13,
        facing: this.player.facing,
      });
    }

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

    const spawnX = this.player.x + (this.player.facing * 40);
    const spawnY = this.player.y;

    // High velocity piercing lightning spear in facing direction
    this.projectiles.push({
      id: Math.random().toString(),
      type: 'player_lightning',
      x: spawnX,
      y: spawnY,
      vx: 24 * this.player.facing,
      vy: 0,
      radius: 12,
      damage: 160,
      duration: 0,
      maxDuration: 1.5,
      color: '#38bdf8',
      glowColor: '#0284c7',
      trail: [],
    });

    if (this.isMultiplayer) {
      multiplayerClient.sendPlayerAttack({
        attackType: 'lightning',
        x: spawnX,
        y: spawnY,
        vx: 24,
        facing: this.player.facing,
      });
    }

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

    const spawnX = this.player.x + (this.player.facing * 35);
    const spawnY = this.player.y;

    // Fire 3 staggered energy bursts in facing direction
    [-6, 0, 6].forEach((angleDeg, i) => {
      setTimeout(() => {
        if (this.stage === 'gameover' || this.stage === 'victory' || this.stage === 'cinematic_earth_destruction') return;
        soundManager.playPowerBurst();
        const rad = (angleDeg * Math.PI) / 180;
        this.projectiles.push({
          id: Math.random().toString(),
          type: 'player_burst',
          x: spawnX,
          y: spawnY + (i - 1) * 7,
          vx: Math.cos(rad) * 16 * this.player.facing,
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

    if (this.isMultiplayer) {
      multiplayerClient.sendPlayerAttack({
        attackType: 'burst',
        x: spawnX,
        y: spawnY,
        vx: 16,
        facing: this.player.facing,
      });
    }

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
        // Manipulación / Control mental: Nanovalen se pega solo o aturde a Santiscat
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
        } else if (this.santiscat && (this.stage === 'santiscat_boss' || this.stage === 'santiscat_boss_wormhole' || this.stage === 'santiscat_boss_universe')) {
          this.applyDamageToSantiscat(260, 'mind_control', this.santiscat.x, this.santiscat.y);
          this.damageNumbers.push({
            id: Math.random().toString(),
            text: '🧠 ¡CONTROL MENTAL: SOBRECARGA PSÍQUICA (-260)!',
            x: this.santiscat.x,
            y: this.santiscat.y - 35,
            vy: -1.6,
            color: '#d946ef',
            isBlackFlash: false,
            life: 1.5,
            maxLife: 1.5,
            scale: 1.35,
          });
          this.spawnHitParticles(this.santiscat.x, this.santiscat.y, '#d946ef', 22);
        } else {
          // In city/space/distorted: telekinetic shockwave destroys closest 3 obstacles
          let crushed = 0;
          this.obstacles.forEach(obs => {
            if (crushed < 3 && (p.facing === 1 ? obs.x > p.x : obs.x < p.x)) {
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
          x: p.x + (p.facing * 40),
          y: p.y,
          vx: 36 * p.facing,
          vy: 0,
          radius: 16,
          damage: 220,
          duration: 0,
          maxDuration: 0.85,
          color: '#facc15',
          glowColor: '#eab308',
          trail: [],
        });

        // Instant pierce damage to all obstacles in facing line
        this.obstacles.forEach(obs => {
          const inLineX = p.facing === 1 ? obs.x > p.x : obs.x < p.x;
          if (Math.abs(p.y - (obs.y + obs.height / 2)) < obs.height / 2 + 25 && inLineX) {
            this.applyDamageToObstacle(obs, 220, 'light_laser', obs.x + 20, p.y);
          }
        });

        // Instant pierce damage to all drones in facing line
        this.drones.forEach(d => {
          const inLineD = p.facing === 1 ? d.x > p.x : d.x < p.x;
          if (Math.abs(p.y - d.y) < d.size + 25 && inLineD) {
            this.damageDrone(d, 220, d.x, p.y);
          }
        });

        if (this.boss && this.stage === 'boss' && Math.abs(p.y - this.boss.y) < 70) {
          const inLineB = p.facing === 1 ? this.boss.x > p.x : this.boss.x < p.x;
          if (inLineB) {
            this.applyDamageToBoss(240, 'light_laser', this.boss.x, p.y, false);
          }
        }

        if (this.santiscat && (this.stage === 'santiscat_boss' || this.stage === 'santiscat_boss_wormhole' || this.stage === 'santiscat_boss_universe') && Math.abs(p.y - this.santiscat.y) < 120) {
          const inLineS = p.facing === 1 ? this.santiscat.x > p.x : this.santiscat.x < p.x;
          if (inLineS) {
            this.applyDamageToSantiscat(240, 'light_laser', this.santiscat.x, p.y);
          }
        }

        if (this.isMultiplayer) {
          multiplayerClient.sendPlayerAttack({
            attackType: 'light_laser',
            x: p.x + (p.facing * 40),
            y: p.y,
            vx: 36,
            facing: p.facing,
          });
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
            x: p.x + (p.facing * 35),
            y: p.y + (i - 1) * 10,
            vx: Math.cos(rad) * 14 * p.facing,
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
        // Creación de objetos de la nada: Yunque masivo de energía cósmica (Fermin - Funciona en todos los niveles)
        p.special1Cooldown = 5.5;
        p.special1MaxCooldown = 5.5;
        soundManager.playEnergyAnvil();

        let targetX = p.x + (p.facing * 200);
        let targetY = p.y + 20;

        if (this.santiscat && (this.stage === 'santiscat_boss' || this.stage === 'santiscat_boss_wormhole' || this.stage === 'santiscat_boss_universe')) {
          targetX = this.santiscat.x;
          targetY = this.santiscat.y + 25;
        } else if (this.boss && this.stage === 'boss') {
          targetX = this.boss.x;
          targetY = this.boss.y + 25;
        } else if (this.obstacles.length > 0) {
          const fwd = this.obstacles.filter(o => p.facing === 1 ? o.x > p.x : o.x < p.x);
          if (fwd.length > 0) {
            targetX = fwd[0].x + fwd[0].width / 2;
            targetY = fwd[0].y + fwd[0].height / 2;
          }
        }

        // Start from high above the target level within view, guaranteeing it is never culled by y > -150
        const startY = targetY - 260;

        this.projectiles.push({
          id: Math.random().toString(),
          type: 'player_energy_anvil',
          x: targetX,
          y: startY,
          vx: 0,
          vy: 22,
          radius: 46,
          damage: 450,
          duration: 0,
          maxDuration: 3.5,
          color: '#facc15',
          glowColor: '#ca8a04',
          trail: [],
          targetY,
        });

        if (this.isMultiplayer) {
          multiplayerClient.sendPlayerAttack({
            attackType: 'energy_anvil',
            x: targetX,
            y: targetY,
            facing: p.facing,
          });
        }
        return true;
      }

      case 'perro_marron': {
        // Detener el tiempo: se pausa todo (Nanovalen, Santiscat, enemigos, proyectiles, mundo) menos Tina (Tina - Funciona en todos los niveles)
        p.special1Cooldown = 12.0;
        p.special1MaxCooldown = 12.0;
        p.timeStopActive = true;
        p.timeStopTimer = 4.5;
        p.timeStopMaxDuration = 4.5;
        soundManager.playTimeStop();
        this.screenShake = 18;
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

        if (this.isMultiplayer) {
          multiplayerClient.sendPlayerAttack({
            attackType: 'time_stop',
            x: p.x,
            y: p.y,
            facing: p.facing,
          });
        }
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
        // Desactivar escudo de Nanovalen o Santiscat
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
        }
        if (this.santiscat) {
          this.santiscat.shieldActive = false;
          this.santiscat.shieldTimer = 0;
          this.damageNumbers.push({
            id: Math.random().toString(),
            text: '💥 ¡ESCUDO DE SANTISCAT DESACTIVADO!',
            x: this.santiscat.x,
            y: this.santiscat.y - 30,
            vy: -1.5,
            color: '#c084fc',
            isBlackFlash: false,
            life: 1.4,
            maxLife: 1.4,
            scale: 1.35,
          });
          this.spawnHitParticles(this.santiscat.x, this.santiscat.y, '#c084fc', 22);
        }
        if (!this.boss && !this.santiscat) {
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
        const isLevel4Stage =
          this.stage === 'distorted' ||
          this.stage === 'rhythm_summon' ||
          this.stage === 'santiscat_boss' ||
          this.stage === 'santiscat_boss_wormhole' ||
          this.stage === 'santiscat_boss_universe';
        const maxX = isLevel4Stage ? this.camera.worldWidth - 50 : this.width - 50;
        p.x = Math.max(50, Math.min(maxX, p.x + p.facing * 240));
        p.isInvulnerable = true;
        p.invulnerableTimer = 1.2;
        this.spawnHitParticles(p.x, p.y, '#facc15', 18);
        return true;
      }

      case 'perro_rubio': {
        // Crear 4 espadas de energía materializadas que buscan enemigos (Fermin - Funciona en todos los niveles)
        p.special2Cooldown = 3.8;
        p.special2MaxCooldown = 3.8;
        soundManager.playEnergyBlades();
        [-30, -10, 10, 30].forEach((angDeg, i) => {
          const rad = (angDeg * Math.PI) / 180;
          this.projectiles.push({
            id: Math.random().toString(),
            type: 'player_energy_blade',
            x: p.x + (p.facing * 30),
            y: p.y + (i - 1.5) * 14,
            vx: Math.cos(rad) * 18 * p.facing,
            vy: Math.sin(rad) * 18,
            radius: 14,
            damage: 75,
            duration: 0,
            maxDuration: 3.5,
            color: '#f59e0b',
            glowColor: '#d97706',
            trail: [],
          });
        });

        if (this.isMultiplayer) {
          multiplayerClient.sendPlayerAttack({
            attackType: 'energy_blade',
            x: p.x + (p.facing * 30),
            y: p.y,
            vx: 18,
            facing: p.facing,
          });
        }
        return true;
      }

      case 'perro_marron': {
        // Teletransporte crono (Tina - Funciona en todos los niveles, incluyendo detrás de Santiscat y en mundo libre)
        p.special2Cooldown = 3.2;
        p.special2MaxCooldown = 3.2;
        soundManager.playTeleport();

        const isLevel4Stage =
          this.stage === 'distorted' ||
          this.stage === 'rhythm_summon' ||
          this.stage === 'santiscat_boss' ||
          this.stage === 'santiscat_boss_wormhole' ||
          this.stage === 'santiscat_boss_universe';
        const maxX = isLevel4Stage ? this.camera.worldWidth - 60 : this.width - 60;
        const minX = 60;
        const maxY = isLevel4Stage ? this.camera.worldHeight - 60 : this.height - 60;
        const minY = 60;

        if (this.santiscat && (this.stage === 'santiscat_boss' || this.stage === 'santiscat_boss_wormhole' || this.stage === 'santiscat_boss_universe')) {
          // Teletransporte directamente a la espalda de Santiscat en dirección contraria a su mirada
          const behindOffset = this.santiscat.facing === 1 ? -120 : 120;
          p.x = Math.max(minX, Math.min(maxX, this.santiscat.x + behindOffset));
          p.y = Math.max(minY, Math.min(maxY, this.santiscat.y));
          p.facing = this.santiscat.facing === 1 ? 1 : -1;
        } else if (this.boss && this.stage === 'boss') {
          // Teletransporte directamente a la espalda de Nanovalen
          p.x = Math.max(minX, Math.min(maxX, this.boss.x + 90));
          p.y = Math.max(minY, Math.min(maxY, this.boss.y));
          p.facing = -1;
        } else {
          // Salto temporal instantáneo hacia adelante en dirección facing
          p.x = Math.max(minX, Math.min(maxX, p.x + p.facing * 260));
        }

        p.isInvulnerable = true;
        p.invulnerableTimer = 0.8;
        this.spawnHitParticles(p.x, p.y, '#f59e0b', 22);
        this.spawnHitParticles(p.x, p.y, '#facc15', 18);
        return true;
      }

      default:
        return false;
    }
  }

  // --- Secondary Missions & Attack Power System ---

  public getDamageMultiplier(target: 'building' | 'asteroid' | 'boss' | 'santiscat', attackType?: AttackType): number {
    let mult = 1.0;
    if (!this.powerBonuses) return mult;

    // Global bonus from completing all or combat missions
    mult *= (this.powerBonuses.globalMultiplier || 1.0);

    if (target === 'building') {
      mult *= (this.powerBonuses.buildingMultiplier || 1.0);
      if (attackType === 'punch') {
        mult *= (this.powerBonuses.punchMultiplier || 1.0);
      } else if (attackType === 'fireball') {
        mult *= (this.powerBonuses.fireMultiplier || 1.0);
      } else if (attackType === 'lightning') {
        mult *= (this.powerBonuses.lightningMultiplier || 1.0);
      }
    } else if (target === 'asteroid') {
      mult *= (this.powerBonuses.asteroidMultiplier || 1.0);
      if (attackType === 'power_burst' || attackType === 'light_laser') {
        mult *= (this.powerBonuses.lightningMultiplier || 1.0);
      }
    } else if (target === 'boss' || target === 'santiscat') {
      mult *= (this.powerBonuses.bossMultiplier || 1.0);
    }

    return mult;
  }

  public progressQuest(questId: string, amount: number = 1) {
    const { quests, newlyCompletedQuest } = progressQuestItem(this.sideQuests, questId, amount);
    this.sideQuests = quests;
    saveSideQuests(this.sideQuests);
    this.powerBonuses = calculateActivePowerBonuses(this.sideQuests);

    if (newlyCompletedQuest) {
      soundManager.playQuestComplete();
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: `🎯 ¡MISIÓN: ${newlyCompletedQuest.title}! (${newlyCompletedQuest.rewardText})`,
        x: this.player ? this.player.x : this.width / 2,
        y: this.player ? this.player.y - 45 : 100,
        vy: -1.6,
        color: '#fbbf24',
        isBlackFlash: true,
        life: 3.5,
        maxLife: 3.5,
        scale: 1.4,
      });

      if (this.onQuestCompletedCallback) {
        this.onQuestCompletedCallback(newlyCompletedQuest);
      }
    }
  }

  public resetQuests() {
    this.sideQuests = resetSideQuests();
    this.powerBonuses = calculateActivePowerBonuses(this.sideQuests);
  }

  // --- Black Flash Critical Hit System (2% Chance) ---
  // Prompt: "una probabilidad de un 2% de que cualquiera de sus ataques sea un black flash (golpe critico)
  // duplicando el daño por 2.5 y haciendo un efecto de rayos de color negro con delineado rojo al golpear"

  private rollBlackFlash(baseDamage: number, hitX: number, hitY: number): { damage: number; isBlackFlash: boolean } {
    const isBlackFlash = Math.random() < 0.02;

    if (isBlackFlash) {
      const critMultiplier = 2.5 * (this.powerBonuses?.critMultiplier || 1.0);
      const critDamage = Math.round(baseDamage * critMultiplier);
      this.stats.blackFlashesCount++;
      soundManager.playBlackFlash();
      this.progressQuest('black_flash_master', 1);

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
    const targetType = obs.type === 'asteroid' || obs.type === 'meteorite' ? 'asteroid' : 'building';
    const questMult = this.getDamageMultiplier(targetType, _attackType);
    const modifiedBaseDmg = Math.round(baseDmg * questMult);
    const { damage, isBlackFlash } = this.rollBlackFlash(modifiedBaseDmg, hitX, hitY);
    obs.hp -= damage;
    this.stats.totalAttacksLanded++;
    this.stats.score += damage;

    if (!isBlackFlash) {
      const isEmpowered = questMult > 1.05;
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: isEmpowered ? `-${damage} ⚡` : `-${damage}`,
        x: hitX,
        y: hitY - 10,
        vy: -1.2,
        color: isEmpowered ? '#facc15' : '#fed7aa',
        isBlackFlash: false,
        life: 0.8,
        maxLife: 0.8,
        scale: isEmpowered ? 1.15 : 1.0,
      });
    }

    // Impact sparks
    this.spawnHitParticles(hitX, hitY, isBlackFlash ? '#ff1a3c' : '#fb923c', 8);

    // Quest progression
    if (obs.type === 'building') {
      if (_attackType === 'lightning') {
        this.progressQuest('cosmic_lightning_urban', 1);
      }
      if (obs.hp <= 0) {
        if (_attackType === 'punch') {
          this.progressQuest('demolisher_punch', 1);
        } else if (_attackType === 'fireball') {
          this.progressQuest('fire_storm_city', 1);
        }
      }
    } else if (obs.type === 'asteroid' || obs.type === 'meteorite') {
      if (obs.hp <= 0) {
        this.progressQuest('asteroid_shredder', 1);
        if (_attackType === 'power_burst' || _attackType === 'light_laser') {
          this.progressQuest('power_burst_cosmic', 1);
        }
      }
    }

    if (this.isMultiplayer) {
      multiplayerClient.sendObstacleHit({
        obstacleId: obs.id,
        damage,
        hitX,
        hitY,
        isDestroyed: obs.hp <= 0,
        obstacleType: obs.type as any,
        stageProgress: this.stageProgress,
      });
    }

    if (obs.hp <= 0) {
      this.destroyObstacle(obs, true);
    }
  }

  public destroyObstacle(obs: Obstacle, broadcast: boolean = true) {
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

    if (broadcast && this.isMultiplayer) {
      multiplayerClient.sendObstacleHit({
        obstacleId: obs.id,
        damage: 999,
        hitX: obs.x + obs.width / 2,
        hitY: obs.y + obs.height / 2,
        isDestroyed: true,
        obstacleType: obs.type as any,
        stageProgress: this.stageProgress,
      });
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
      this.progressQuest('drone_hunter', 1);
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

    const questMult = this.getDamageMultiplier('boss', attackType);
    const modifiedBaseDmg = Math.round(baseDmg * questMult);

    // Prompt: "reduce el daño del rayo verde de catvalentina y que con SOLO ese ataque no sea capaz de asestar un black flash"
    const canBlackFlash = attackType !== 'green_beam';
    const { damage, isBlackFlash } = canBlackFlash
      ? this.rollBlackFlash(modifiedBaseDmg, hitX, hitY)
      : { damage: Math.round(modifiedBaseDmg), isBlackFlash: false };

    this.boss.hp = Math.max(0, this.boss.hp - damage);
    this.stats.nanovalenDamageDealt += damage;
    this.stats.totalAttacksLanded++;
    this.stats.score += damage * 2;
    this.progressQuest('nanovalen_overload', damage);

    if (!isBlackFlash) {
      const isEmpowered = questMult > 1.05;
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: isEmpowered ? `-${damage} ⚡` : `-${damage}`,
        x: hitX,
        y: hitY - 10,
        vy: -1.4,
        color: isEmpowered ? '#fbbf24' : '#ff4466',
        isBlackFlash: false,
        life: 0.9,
        maxLife: 0.9,
        scale: isEmpowered ? 1.2 : 1.1,
      });
    }

    this.spawnHitParticles(hitX, hitY, isBlackFlash ? '#ff003b' : '#ff3b50', 12);

    if (this.isMultiplayer) {
      multiplayerClient.sendBossHit({
        damage,
        attackType,
        isBlackFlash,
        hitX,
        hitY,
        target: 'nanovalen',
      });
    }

    // Defeat Nanovalen
    if (this.boss.hp <= 0) {
      unlockAchievement('defeat_nanovalen');
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: '💥 ¡NANOVALEN HA SIDO DERROTADO! 💥',
        x: this.boss.x,
        y: this.boss.y - 40,
        vy: -1.6,
        color: '#38bdf8',
        isBlackFlash: true,
        life: 3.5,
        maxLife: 3.5,
        scale: 1.5,
      });
      soundManager.playVictory();
      this.spawnRubble(this.boss.x, this.boss.y, '#f43f5e', 45);
      this.spawnRubble(this.boss.x, this.boss.y, '#38bdf8', 35);

      if (this.isMultiplayer) {
        multiplayerClient.sendStageChange('distorted', 0);
      }
      setTimeout(() => {
        this.startStage('distorted');
      }, 1500);
      return;
    }
  }

  // --- Transitions ---

  private triggerCityToSpaceTransition() {
    unlockAchievement('complete_level_1');
    this.stage = 'transition';
    this.transitionTimer = 3.0;
    this.obstacles = [];
    this.projectiles = [];
    soundManager.playExplosion();
    if (this.isMultiplayer && this.isHostPlayer()) {
      multiplayerClient.sendStageChange('transition', 100);
    }
  }

  private triggerSpaceToBossTransition() {
    unlockAchievement('complete_level_2');
    this.stage = 'boss_intro';
    this.bossIntroTimer = 3.2;
    this.obstacles = [];
    this.projectiles = [];
    soundManager.stopMusic();
    soundManager.playLaserWarning();
    if (this.isMultiplayer && this.isHostPlayer()) {
      multiplayerClient.sendStageChange('boss_intro', 100);
    }
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

  public triggerVictory(isSantiscat: boolean = false) {
    this.stage = 'victory';
    soundManager.stopMusic();
    soundManager.playVictory();
    this.screenShake = 35;

    if (isSantiscat) {
      unlockAchievement('defeat_santiscat');
      this.lastBattleStage = 'santiscat_boss_universe';
      this.santiscatWins = (this.santiscatWins || 0) + 1;
      this.stats.santiscatWins = this.santiscatWins;
      if (this.santiscat) {
        this.santiscat.hp = 0;
        this.spawnRubble(this.santiscat.x, this.santiscat.y, '#a855f7', 60);
        this.spawnRubble(this.santiscat.x, this.santiscat.y, '#f59e0b', 50);
        this.spawnHitParticles(this.santiscat.x, this.santiscat.y, '#38bdf8', 50);
        this.spawnHitParticles(this.santiscat.x, this.santiscat.y, '#ffffff', 60);
        this.spawnHitParticles(this.santiscat.x, this.santiscat.y, '#ec4899', 40);

        // Cancel all ongoing attacks, summons, domains, and projectiles
        this.santiscat.jujutsuSummons.forEach(sm => sm.active = false);
        this.santiscat.shrine.active = false;
        this.santiscat.shrine.chanting = false;
        this.santiscat.gojoTechniques.blue.active = false;
        this.santiscat.gojoTechniques.red.active = false;
        this.santiscat.gojoTechniques.purple.active = false;
        this.santiscat.rainbowBlast.active = false;
        this.santiscat.blackHole.active = false;
        this.santiscat.galaxies = [];
        this.santiscat.giantStars = [];
        this.santiscat.supernovas = [];
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

  public rematchSantiscat() {
    this.stats.deathReason = undefined;
    this.startStage('santiscat_boss');
  }

  private triggerGameOver() {
    if (this.stage !== 'gameover' && this.stage !== 'cinematic_earth_destruction') {
      this.lastBattleStage = this.stage;
    }
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

    // Cinematic: Santiscat Final Defeat (Super bright light, 12 souls, WebGL implosion, giant supernova explosion)
    if (this.stage === 'cinematic_santiscat_defeat' && this.santiscatDefeatCinematic) {
      this.updateSantiscatDefeatCinematic(delta);
      this.updateParticles(delta);
      this.updateDamageNumbers(delta);
      return;
    }

    // Cosmic Escape Sequence (1 minute escape to wormhole after Santiscat's defeat)
    if (this.stage === 'cosmic_escape' && this.cosmicEscape) {
      this.updateCamera(delta);
      this.updatePlayer(delta);
      this.updateProjectiles(delta);
      this.updateCosmicEscape(delta);
      this.updateBlackFlashStrikes(delta);
      this.updateParticles(delta);
      this.updateDamageNumbers(delta);

      // Multiplayer State Broadcast (~30Hz)
      if (this.isMultiplayer) {
        this.netSyncTimer += delta;
        if (this.netSyncTimer >= 0.033) {
          this.netSyncTimer = 0;
          multiplayerClient.sendPlayerUpdate({
            x: this.player.x,
            y: this.player.y,
            vx: this.player.vx,
            vy: this.player.vy,
            facing: this.player.facing,
            hp: this.player.hp,
            maxHp: this.player.maxHp,
            shieldActive: this.player.shieldActive,
            shieldColor: this.player.shieldColor || '#10b981',
            eyeState: this.player.eyeState,
            holdingShield: Boolean(this.player.holdingShield || this.keys['keyk'] || this.keys['shiftleft'] || this.keys['shiftright'] || this.keys['keyc']),
            greenBeamCharging: this.player.greenBeamCharging,
            greenBeamFiring: this.player.greenBeamFiring,
            timeStopActive: this.player.timeStopActive,
            name: multiplayerClient.currentRoom?.players[this.myPlayerId]?.name || 'Jugador',
            skin: this.player.skin,
            isAlive: !this.isSpectating && this.player.hp > 0,
          });
        }
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

    // Level 4 Stages updates (Frozen during Tina's Time Stop across all levels!)
    if (!this.player.timeStopActive) {
      if (this.stage === 'distorted') {
        this.updateDistorted(delta);
      } else if (this.stage === 'rhythm_summon') {
        this.updateRhythmGame(delta);
      } else if (
        this.stage === 'santiscat_boss' ||
        this.stage === 'santiscat_boss_wormhole' ||
        this.stage === 'santiscat_boss_universe'
      ) {
        this.updateSantiscat(delta);
      }
    }

    // Update Effects
    this.updateBlackFlashStrikes(delta);
    this.updateParticles(delta);
    this.updateDamageNumbers(delta);

    // Multiplayer State Broadcast (~30Hz)
    if (this.isMultiplayer) {
      this.netSyncTimer += delta;
      if (this.netSyncTimer >= 0.033) {
        this.netSyncTimer = 0;
        multiplayerClient.sendPlayerUpdate({
          x: this.player.x,
          y: this.player.y,
          vx: this.player.vx,
          vy: this.player.vy,
          facing: this.player.facing,
          hp: this.player.hp,
          maxHp: this.player.maxHp,
          shieldActive: this.player.shieldActive,
          shieldColor: this.player.shieldColor || '#10b981',
          eyeState: this.player.eyeState,
          holdingShield: Boolean(this.player.holdingShield || this.keys['keyk'] || this.keys['shiftleft'] || this.keys['shiftright'] || this.keys['keyc']),
          greenBeamCharging: this.player.greenBeamCharging,
          greenBeamFiring: this.player.greenBeamFiring,
          timeStopActive: this.player.timeStopActive,
          name: multiplayerClient.currentRoom?.players[this.myPlayerId]?.name || 'Jugador',
          skin: this.player.skin,
          isAlive: !this.isSpectating && this.player.hp > 0,
        });
      }
    }
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
      // Normal Keyboard & Touch Joystick Movement
      let dx = 0;
      let dy = 0;
      if (this.keys['keyw'] || this.keys['arrowup']) dy -= 1;
      if (this.keys['keys'] || this.keys['arrowdown']) dy += 1;
      if (this.keys['keya'] || this.keys['arrowleft']) {
        dx -= 1;
        p.facing = -1;
      }
      if (this.keys['keyd'] || this.keys['arrowright']) {
        dx += 1;
        p.facing = 1;
      }

      // Add touch joystick direction (if active)
      if (this.touchDx !== 0 || this.touchDy !== 0) {
        dx = this.touchDx;
        dy = this.touchDy;
      } else if (dx !== 0 && dy !== 0) {
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

    // Dead players in spectator mode don't move physical hitbox
    if (!this.isSpectating) {
      p.x += p.vx;
      p.y += p.vy;
    }

    // Continuous Green Beam Firing damage in facing direction
    if (p.greenBeamFiring) {
      p.greenBeamFiringTimer -= delta;
      this.screenShake = Math.max(this.screenShake, 14);

      const beamY = p.y;
      const beamHalfHeight = 36;

      this.obstacles.forEach(obs => {
        const inBeam = p.facing === 1 ? obs.x > p.x : obs.x < p.x;
        if (inBeam && Math.abs(beamY - (obs.y + obs.height / 2)) < obs.height / 2 + beamHalfHeight) {
          this.applyDamageToObstacle(obs, 140 * delta, 'green_beam', obs.x + 10, beamY);
        }
      });

      // Prompt: "reduce el daño del rayo verde de catvalentina"
      this.drones.forEach(d => {
        const inBeam = p.facing === 1 ? d.x > p.x : d.x < p.x;
        if (inBeam && Math.abs(beamY - d.y) < d.size + beamHalfHeight) {
          this.damageDrone(d, 140 * delta, d.x, beamY);
        }
      });

      if (this.boss && this.stage === 'boss') {
        const inBeam = p.facing === 1 ? this.boss.x > p.x : this.boss.x < p.x;
        if (inBeam && Math.abs(beamY - this.boss.y) < this.boss.height / 2 + beamHalfHeight) {
          this.applyDamageToBoss(130 * delta, 'green_beam', this.boss.x, beamY, true);
        }
      }

      if (this.santiscat && (this.stage === 'santiscat_boss' || this.stage === 'santiscat_boss_wormhole' || this.stage === 'santiscat_boss_universe')) {
        const inBeam = p.facing === 1 ? this.santiscat.x > p.x : this.santiscat.x < p.x;
        if (inBeam && Math.abs(beamY - this.santiscat.y) < this.santiscat.height / 2 + beamHalfHeight) {
          this.applyDamageToSantiscat(140 * delta, 'green_beam', this.santiscat.x, beamY);
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
    const isLevel4 =
      this.stage === 'distorted' ||
      this.stage === 'rhythm_summon' ||
      this.stage === 'santiscat_boss' ||
      this.stage === 'santiscat_boss_wormhole' ||
      this.stage === 'santiscat_boss_universe' ||
      this.stage === 'cosmic_escape';
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
    const isDomainActive = Boolean(this.santiscat?.shrine?.active);
    const isHoldingShieldKey = Boolean(p.holdingShield || this.keys['keyk'] || this.keys['shiftleft'] || this.keys['shiftright'] || this.keys['keyc']);

    if (isDomainActive && isHoldingShieldKey) {
      // During Malevolent Shrine, holding K keeps shield active to withstand the thousands of cuts!
      p.shieldActive = true;
      p.shieldTimer = p.shieldMaxDuration;
      p.shieldCooldown = 0;
    } else {
      if (p.shieldActive) {
        p.shieldTimer -= delta;
        if (p.shieldTimer <= 0) {
          p.shieldActive = false;
        }
      }
      if (p.shieldCooldown > 0) {
        p.shieldCooldown = Math.max(0, p.shieldCooldown - delta);
      }
    }

    // Invulnerability timer
    if (p.isInvulnerable) {
      p.invulnerableTimer -= delta;
      if (p.invulnerableTimer <= 0) {
        p.isInvulnerable = false;
        p.eyeState = 'normal';
      }
    }

    // Survivor Quest Tracker: Maintain >= 40% HP in boss battles
    const isBossStage =
      this.stage === 'boss' ||
      this.stage === 'santiscat_boss' ||
      this.stage === 'santiscat_boss_wormhole' ||
      this.stage === 'santiscat_boss_universe';
    if (isBossStage && !this.isSpectating && p.hp >= p.maxHp * 0.4) {
      this.survivorSecondTimer += delta;
      if (this.survivorSecondTimer >= 1.0) {
        this.survivorSecondTimer = 0;
        this.progressQuest('survivor_elite', 1);
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
    // Dead or spectating players cannot take any damage!
    if (
      this.isSpectating ||
      this.player.hp <= 0 ||
      this.stage === 'gameover' ||
      this.stage === 'victory' ||
      this.stage === 'cinematic_earth_destruction' ||
      this.godMode ||
      this.player.isInvulnerable
    ) {
      return;
    }

    if (this.player.shieldActive) {
      // Green shield absorbs all incoming damage!
      soundManager.playShieldAbsorb();
      this.progressQuest('shield_guardian', 1);
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
      // Phase 2.5: ONLY in this stage, player can refuse to die Undertale style!
      if (this.stage === 'santiscat_boss_universe' || (this.santiscat && this.santiscat.bossPhase === 2.5)) {
        this.triggerRefusedToDie();
        return;
      }

      // Multiplayer spectator mode: if in multiplayer, fall into spectator mode to follow active teammates!
      if (this.isMultiplayer) {
        multiplayerClient.sendPlayerDied();
        this.isSpectating = true;
        this.spectateNext();
        soundManager.stopGammaSound();
        soundManager.stopMusic();
        soundManager.playExplosion();
        return;
      }

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

      // Homing behavior for magic orbs and energy blades (Marta & Fermin - works in all stages including Santiscat)
      if (p.type === 'player_magic_orb' || p.type === 'player_energy_blade') {
        let targetX = p.x + (this.player.facing * 500);
        let targetY = p.y;
        if (this.santiscat && (this.stage === 'santiscat_boss' || this.stage === 'santiscat_boss_wormhole' || this.stage === 'santiscat_boss_universe')) {
          targetX = this.santiscat.x;
          targetY = this.santiscat.y;
        } else if (this.boss && this.stage === 'boss') {
          targetX = this.boss.x;
          targetY = this.boss.y;
        } else if (this.obstacles.length > 0) {
          const fwd = this.obstacles.filter(o => this.player.facing === 1 ? o.x > p.x : o.x < p.x);
          if (fwd.length > 0) {
            targetX = fwd[0].x + fwd[0].width / 2;
            targetY = fwd[0].y + fwd[0].height / 2;
          }
        }
        const ang = Math.atan2(targetY - p.y, targetX - p.x);
        const curAng = Math.atan2(p.vy, p.vx);
        const speed = Math.hypot(p.vx, p.vy) || 16;
        const newAng = curAng + (ang - curAng) * 0.14;
        p.vx = Math.cos(newAng) * speed;
        p.vy = Math.sin(newAng) * speed;
      }

      // Special Anvil gravity & slam (Fermin - Colossal anvil damages Nanovalen, Santiscat, summons, obstacles in all levels)
      if (p.type === 'player_energy_anvil') {
        p.y += p.vy * delta * 60;
        const groundY = p.targetY !== undefined ? p.targetY : (this.player.y + 40);

        // Mid-air collision check while falling
        if (this.boss && this.stage === 'boss') {
          if (Math.hypot(p.x - this.boss.x, p.y - this.boss.y) < this.boss.width / 2 + p.radius) {
            this.applyDamageToBoss(p.damage * 0.75, 'energy_anvil', p.x, p.y, true);
          }
        }
        if (this.santiscat && (this.stage === 'santiscat_boss' || this.stage === 'santiscat_boss_wormhole' || this.stage === 'santiscat_boss_universe')) {
          if (Math.hypot(p.x - this.santiscat.x, p.y - this.santiscat.y) < this.santiscat.width / 2 + p.radius) {
            this.applyDamageToSantiscat(p.damage * 0.75, 'energy_anvil', p.x, p.y);
          }
          if (this.santiscat.jujutsuSummons) {
            this.santiscat.jujutsuSummons.forEach(sm => {
              if (sm.active && Math.hypot(p.x - sm.x, p.y - sm.y) < sm.width / 2 + p.radius) {
                this.applyDamageToSummon(sm, p.damage * 0.75, 'energy_anvil', p.x, p.y);
              }
            });
          }
        }

        if (p.y >= groundY) {
          soundManager.playEnergyAnvil();
          this.screenShake = 32;
          this.spawnHitParticles(p.x, groundY, '#facc15', 36);
          this.spawnHitParticles(p.x, groundY, '#ffffff', 25);
          this.spawnRubble(p.x, groundY, '#ca8a04', 30);

          const blastRadius = 240;
          if (this.boss && this.stage === 'boss') {
            if (Math.hypot(this.boss.x - p.x, this.boss.y - groundY) < blastRadius) {
              this.applyDamageToBoss(p.damage, 'energy_anvil', p.x, groundY, true);
            }
          }
          if (this.santiscat && (this.stage === 'santiscat_boss' || this.stage === 'santiscat_boss_wormhole' || this.stage === 'santiscat_boss_universe')) {
            if (Math.hypot(this.santiscat.x - p.x, this.santiscat.y - groundY) < blastRadius) {
              this.applyDamageToSantiscat(p.damage, 'energy_anvil', p.x, groundY);
            }
          }
          if (this.santiscat?.jujutsuSummons) {
            this.santiscat.jujutsuSummons.forEach(sm => {
              if (sm.active && Math.hypot(sm.x - p.x, sm.y - groundY) < blastRadius) {
                this.applyDamageToSummon(sm, p.damage, 'energy_anvil', p.x, groundY);
              }
            });
          }
          this.obstacles.forEach(obs => {
            if (Math.hypot(obs.x + obs.width / 2 - p.x, obs.y + obs.height / 2 - groundY) < blastRadius) {
              this.applyDamageToObstacle(obs, p.damage, 'energy_anvil', p.x, groundY);
            }
          });
          this.drones.forEach(d => {
            if (Math.hypot(d.x - p.x, d.y - groundY) < blastRadius) {
              this.damageDrone(d, p.damage, d.x, d.y);
            }
          });

          this.damageNumbers.push({
            id: Math.random().toString(),
            text: '⚡ ¡IMPACTO DE YUNQUE CÓSMICO! ⚡',
            x: p.x,
            y: groundY - 45,
            vy: -1.8,
            color: '#facc15',
            isBlackFlash: true,
            life: 1.3,
            maxLife: 1.3,
            scale: 1.4,
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
        if (this.santiscat && (this.stage === 'santiscat_boss' || this.stage === 'santiscat_boss_wormhole' || this.stage === 'santiscat_boss_universe')) {
          const sDist = Math.hypot(p.x - this.santiscat.x, p.y - this.santiscat.y);
          if (sDist < this.santiscat.width / 2 + p.radius) {
            this.applyDamageToSantiscat(p.damage, p.type.replace('player_', '') as AttackType, p.x, p.y);
            if (p.type !== 'player_light_laser') {
              p.duration = p.maxDuration;
            }
          }

          // Check collision with Jujutsu Summons
          if (this.santiscat.jujutsuSummons) {
            for (const sm of this.santiscat.jujutsuSummons) {
              if (sm.active && Math.hypot(p.x - sm.x, p.y - sm.y) < sm.width / 2 + p.radius) {
                this.applyDamageToSummon(sm, p.damage, p.type.replace('player_', '') as AttackType, p.x, p.y);
                if (p.type !== 'player_light_laser') {
                  p.duration = p.maxDuration;
                }
                break;
              }
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

    // Remove expired (Supports large world in all Level 4 stages: distorted, rhythm, boss, wormhole, alternate universe)
    const isLevel4 =
      this.stage === 'distorted' ||
      this.stage === 'rhythm_summon' ||
      this.stage === 'santiscat_boss' ||
      this.stage === 'santiscat_boss_wormhole' ||
      this.stage === 'santiscat_boss_universe' ||
      this.stage === 'cosmic_escape';
    const maxBoundX = isLevel4 ? this.camera.worldWidth + 150 : this.width + 100;
    const maxBoundY = isLevel4 ? this.camera.worldHeight + 150 : this.height + 100;
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
        if (!this.isMultiplayer || this.isHostPlayer()) {
          this.selectBossAttack(hpRatio);
        }
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

    if (this.isMultiplayer && this.isHostPlayer()) {
      multiplayerClient.sendBossAttack('nanovalen', chosen, { laserY: this.player.y });
    }

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

    if (!this.godMode && !this.isSpectating && this.player.hp > 0) {
      this.player.hp = Math.max(0, this.player.hp - critDamage);
      this.player.isInvulnerable = true;
      this.player.invulnerableTimer = 1.0;
      this.player.eyeState = 'hurt';

      if (this.player.hp <= 0) {
        if (this.isMultiplayer) {
          multiplayerClient.sendPlayerDied();
          this.isSpectating = true;
          this.spectateNext();
          soundManager.stopGammaSound();
          soundManager.stopMusic();
          soundManager.playExplosion();
        } else {
          this.triggerGameOver();
        }
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

    if (this.isMultiplayer && this.isHostPlayer()) {
      multiplayerClient.sendBossAttack('nanovalen', 'gamma_ray_charge', {});
    }

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
    const isLevel4 =
      this.stage === 'distorted' ||
      this.stage === 'rhythm_summon' ||
      this.stage === 'santiscat_boss' ||
      this.stage === 'santiscat_boss_wormhole' ||
      this.stage === 'santiscat_boss_universe' ||
      this.stage === 'cosmic_escape';

    let focusX = this.player.x;
    let focusY = this.player.y;

    if (this.isSpectating && this.spectatingTargetId) {
      const target = this.remotePlayers.get(this.spectatingTargetId);
      if (target && target.isAlive) {
        focusX = target.x;
        focusY = target.y;
      }
    }

    if (isLevel4) {
      const targetCamX = focusX - this.camera.viewportWidth / 2;
      const targetCamY = focusY - this.camera.viewportHeight / 2;
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
      if (this.isMultiplayer && this.isSantiscatSummoning) {
        return;
      }
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
    this.isSantiscatSummoning = true;
    if (this.isMultiplayer) {
      const myName = multiplayerClient.currentRoom?.players[this.myPlayerId]?.name || 'Jugador';
      multiplayerClient.sendSummonSantiscat(this.myPlayerId, myName);
      multiplayerClient.sendStageChange('santiscat_boss', 0);
    }
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

    // Restore player status for the Santiscat boss fight
    this.player.hp = this.player.maxHp;
    this.player.isInvulnerable = false;
    this.player.invulnerableTimer = 0;
    this.player.shieldActive = false;
    this.player.shieldCooldown = 0;
    this.player.punchCooldown = 0;
    this.player.fireballCooldown = 0;
    this.player.lightningCooldown = 0;
    this.player.powerBurstCooldown = 0;
    this.player.healsRemaining = this.player.maxHeals;
    this.player.eyeState = 'normal';
    this.player.x = 1600;
    this.player.y = 1500;
    this.player.vx = 0;
    this.player.vy = 0;
    this.camera.x = 1600 - this.camera.viewportWidth / 2;
    this.camera.y = 1500 - this.camera.viewportHeight / 2;

    this.santiscat = {
      x: 1600,
      y: 950,
      vx: 0,
      vy: 0,
      width: 140,
      height: 140,
      hp: 15000,
      maxHp: 15000,
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
      jujutsuSummons: [
        {
          id: 'sukunacat',
          name: 'Sukunacat (Rey de las Maldiciones)',
          x: 1350,
          y: 1100,
          vx: 0,
          vy: 0,
          width: 95,
          height: 95,
          hp: 12000,
          maxHp: 12000,
          facing: 1,
          active: false,
          state: 'idle',
          timer: 0,
          cooldownTimer: 1.2,
          slashes: [],
        },
        {
          id: 'gojocat',
          name: 'Gojocat (El Más Fuerte)',
          x: 1850,
          y: 1100,
          vx: 0,
          vy: 0,
          width: 95,
          height: 95,
          hp: 12000,
          maxHp: 12000,
          facing: -1,
          active: false,
          state: 'idle',
          timer: 0,
          cooldownTimer: 3.5,
          slashes: [],
        },
      ],
      shrine: {
        active: false,
        chanting: false,
        chantTimer: 0,
        timer: 0,
        maxDuration: 7.2,
        shrineX: 1600,
        shrineY: 960,
        redIntensity: 0,
        cuts: [],
        damageTickTimer: 0,
      },
      gojoTechniques: {
        blue: {
          active: false,
          x: 1600,
          y: 1100,
          radius: 40,
          suctionRadius: 420,
          timer: 0,
          maxDuration: 5.5,
          absorbedDebris: [],
        },
        red: {
          active: false,
          x: 1600,
          y: 1100,
          radius: 20,
          maxRadius: 360,
          timer: 0,
          maxDuration: 3.2,
          repelledDebris: [],
        },
        purple: {
          active: false,
          phase: 'charging',
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          radius: 95,
          timer: 0,
          maxDuration: 5.5,
          blueOrb: { x: 0, y: 0 },
          redOrb: { x: 0, y: 0 },
          fusionProgress: 0,
          distortionRadius: 220,
          trail: [],
        },
      },
      // --- FASE 2 & FASE 2.5 INITIALIZATION ---
      bossPhase: 1,
      souls: [
        { id: 'tenacidad', name: 'Tenacidad', trait: 'Tenacidad', image: '/assets/aistudio/Tenacidad_ca49aeec.png', color: '#ec4899', glowColor: '#db2777', angle: 0, distance: 0, targetDistance: 190, scale: 0.9, alpha: 0, absorbed: false },
        { id: 'integridad', name: 'Integridad', trait: 'Integridad', image: '/assets/aistudio/Integridad_ca808672.png', color: '#1d4ed8', glowColor: '#1e40af', angle: (Math.PI * 2 * 1) / 12, distance: 0, targetDistance: 190, scale: 0.9, alpha: 0, absorbed: false },
        { id: 'justicia', name: 'Justicia', trait: 'Justicia', image: '/assets/aistudio/Justicia_3626915d.png', color: '#facc15', glowColor: '#eab308', angle: (Math.PI * 2 * 2) / 12, distance: 0, targetDistance: 190, scale: 0.9, alpha: 0, absorbed: false },
        { id: 'valentia', name: 'Valentía', trait: 'Valentía', image: '/assets/aistudio/Valentia_7a5ea704.png', color: '#f97316', glowColor: '#ea580c', angle: (Math.PI * 2 * 3) / 12, distance: 0, targetDistance: 190, scale: 0.9, alpha: 0, absorbed: false },
        { id: 'simpatia', name: 'Simpatía', trait: 'Simpatía', image: '/assets/aistudio/Simpatia_1f6b6d79.png', color: '#06b6d4', glowColor: '#0891b2', angle: (Math.PI * 2 * 4) / 12, distance: 0, targetDistance: 190, scale: 0.9, alpha: 0, absorbed: false },
        { id: 'rectitud', name: 'Rectitud', trait: 'Rectitud', image: '/assets/aistudio/Rectitud_1721dbcd.png', color: '#8b5cf6', glowColor: '#7c3aed', angle: (Math.PI * 2 * 5) / 12, distance: 0, targetDistance: 190, scale: 0.9, alpha: 0, absorbed: false },
        { id: 'determinacion', name: 'Determinación', trait: 'Determinación', image: '/assets/aistudio/Determinacion_b541db8d.png', color: '#ef4444', glowColor: '#dc2626', angle: (Math.PI * 2 * 6) / 12, distance: 0, targetDistance: 190, scale: 0.9, alpha: 0, absorbed: false },
        { id: 'paciencia', name: 'Paciencia', trait: 'Paciencia', image: '/assets/aistudio/Paciencia_227b909a.png', color: '#38bdf8', glowColor: '#0284c7', angle: (Math.PI * 2 * 7) / 12, distance: 0, targetDistance: 190, scale: 0.9, alpha: 0, absorbed: false },
        { id: 'perseverancia', name: 'Perseverancia', trait: 'Perseverancia', image: '/assets/aistudio/Perseverancia_74b3517e.png', color: '#a855f7', glowColor: '#9333ea', angle: (Math.PI * 2 * 8) / 12, distance: 0, targetDistance: 190, scale: 0.9, alpha: 0, absorbed: false },
        { id: 'amabilidad', name: 'Amabilidad', trait: 'Amabilidad', image: '/assets/aistudio/Amabilidad_2df30abc.png', color: '#22c55e', glowColor: '#16a34a', angle: (Math.PI * 2 * 9) / 12, distance: 0, targetDistance: 190, scale: 0.9, alpha: 0, absorbed: false },
        { id: 'coraje', name: 'Coraje', trait: 'Coraje', image: '/assets/aistudio/Coraje_e2838b81.png', color: '#eab308', glowColor: '#ca8a04', angle: (Math.PI * 2 * 10) / 12, distance: 0, targetDistance: 190, scale: 0.9, alpha: 0, absorbed: false },
        { id: 'entendimiento', name: 'Entendimiento', trait: 'Entendimiento', image: '/assets/aistudio/Entendimiento_eb7ff49c.png', color: '#10b981', glowColor: '#059669', angle: (Math.PI * 2 * 11) / 12, distance: 0, targetDistance: 190, scale: 0.9, alpha: 0, absorbed: false },
      ],
      soulAbsorbTimer: 0,
      portalAngle: 0,
      portalScale: 0,
      wormholeProgress: 0,
      wormholeTimer: 0,
      rainbowBlast: {
        active: false,
        timer: 0,
        chargeDuration: 1.3,
        fireDuration: 1.8,
        beamWidth: 260,
        safeSide: 'bottom',
        safeY: 1600,
      },
      galaxies: [],
      giantStars: [],
      supernovas: [],
      omegaSave: {
        active: false,
        hasSave: false,
        stateText: undefined,
        textTimer: 0,
        savedPlayerX: 1600,
        savedPlayerY: 1500,
        savedPlayerHp: 100,
        savedAttack: 'idle',
        loadTimer: 0,
      },
      refusedToDie: {
        active: false,
        phase: 'idle',
        timer: 0,
        heartX: 1600,
        heartY: 1500,
        crackProgress: 0,
        alpha: 0,
      },
    };
  }

  private updateSantiscat(delta: number) {
    if (!this.santiscat || (this.stage !== 'santiscat_boss' && this.stage !== 'santiscat_boss_wormhole' && this.stage !== 'santiscat_boss_universe')) return;
    const s = this.santiscat;

    // Ensure Santiscat dies or transitions immediately when his HP reaches 0!
    if (s.hp <= 0) {
      if (s.bossPhase === 1) {
        if (s.currentAttack !== 'absorbing_souls') {
          this.startSantiscatPhase2Cinematic();
        }
        return;
      } else {
        // Phase 2 or Phase 2.5: Santiscat dies completely and triggers victory!
        this.triggerVictory(true);
        return;
      }
    }

    s.floatOffset = Math.sin(this.stats.timeElapsed * 2.5) * 16;
    if (s.summonExplosionTimer && s.summonExplosionTimer > 0) {
      s.summonExplosionTimer -= delta;
    }

    // Direction facing player
    s.facing = this.player.x < s.x ? -1 : 1;

    // Movement: periodically and smoothly tracks player to stay within close combat range
    const distToPlayer = Math.hypot(this.player.x - s.x, this.player.y - s.y);

    if (s.currentAttack !== 'black_hole_chase' && s.currentAttack !== 'absorbing_souls' && s.currentAttack !== 'rainbow_blast') {
      const targetOffset = s.facing === -1 ? 320 : -320;
      const targetX = this.player.x + targetOffset;
      const targetY = this.player.y - 70;

      // Dynamic tracking speed based on distance:
      // If player moves far away (> 420px), Santiscat glides quickly toward the player
      let followRate = 0.038;
      if (distToPlayer > 800) {
        followRate = 0.12; // Fast catch-up
      } else if (distToPlayer > 480) {
        followRate = 0.075; // Swift closing distance
      }

      s.x += (targetX - s.x) * followRate;
      s.y += (targetY - s.y) * followRate;

      // Keep Santiscat nicely framed within arena boundaries
      const minX = 140;
      const maxX = this.camera.worldWidth - 140;
      const minY = 140;
      const maxY = this.camera.worldHeight - 140;
      s.x = Math.max(minX, Math.min(maxX, s.x));
      s.y = Math.max(minY, Math.min(maxY, s.y));
    }

    // Hand punch progress decay
    if (s.leftHand.progress > 0) s.leftHand.progress = Math.max(0, s.leftHand.progress - delta * 3);
    if (s.rightHand.progress > 0) s.rightHand.progress = Math.max(0, s.rightHand.progress - delta * 3);

    // Update Refused to Die animation in Phase 2.5
    if (s.refusedToDie && s.refusedToDie.active) {
      s.refusedToDie.timer += delta;
      if (s.refusedToDie.timer >= 3.2) {
        s.refusedToDie.active = false;
        s.refusedToDie.phase = 'idle';
      }
    }

    // Update Supernovas explosion shockwaves
    this.updateSantiscatSupernovas(delta);

    // --- PHASE TRANSITION: ABSORBING 12 SOULS ---
    if (s.currentAttack === 'absorbing_souls') {
      this.updateSantiscatAbsorbingSouls(delta);
      return;
    }

    // --- PHASE 2: WORMHOLE PROGRESSION ---
    if (this.stage === 'santiscat_boss_wormhole') {
      s.wormholeTimer += delta;
      s.wormholeProgress = Math.min(100, (s.wormholeTimer / 45) * 100);

      // Transition to Phase 2.5 when reaching 100% of wormhole
      if (s.wormholeProgress >= 100 && s.bossPhase === 2) {
        this.transitionToPhase25Universe();
        return;
      }
    }

    // AI Attack Cycle
    if (s.currentAttack === 'idle') {
      s.attackCooldown -= delta;
      if (s.attackCooldown <= 0) {
        if (this.isMultiplayer && !this.isHostPlayer()) {
          return;
        }
        let attacks: SantiscatAttack[] = [];
        if (s.bossPhase === 1) {
          attacks = [
            'summon_jujutsu_cats',
            'sun_burst',
            'oneshot_fireball',
            'reality_slashes',
            'summon_jujutsu_cats',
            'sun_burst',
            'oneshot_fireball',
            'dimensional_warp',
          ];
        } else if (s.bossPhase === 2) {
          // Wormhole attacks: Giant Rainbow Blast, Spiral Galaxies, Giant Stars / Supernovas, Omega Save/Load, Black Holes
          attacks = [
            'rainbow_blast',
            'spiral_galaxy',
            'giant_stars',
            'omega_save_load',
            'black_hole_chase',
            'rainbow_blast',
            'spiral_galaxy',
            'giant_stars',
          ];
        } else {
          // Phase 2.5: Alternate Universe ultimate cosmic attacks
          attacks = [
            'rainbow_blast',
            'spiral_galaxy',
            'giant_stars',
            'omega_save_load',
            'sun_burst',
            'reality_slashes',
            'black_hole_chase',
          ];
        }
        const nextAttack = attacks[Math.floor(Math.random() * attacks.length)];
        this.triggerSantiscatAttack(nextAttack);
      }
    } else if (s.currentAttack === 'summon_jujutsu_cats') {
      this.updateSantiscatSummonCats(delta);
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
    } else if (s.currentAttack === 'rainbow_blast') {
      this.updateSantiscatRainbowBlast(delta);
    } else if (s.currentAttack === 'spiral_galaxy') {
      this.updateSantiscatGalaxies(delta);
    } else if (s.currentAttack === 'giant_stars') {
      this.updateSantiscatGiantStars(delta);
    } else if (s.currentAttack === 'omega_save_load') {
      this.updateSantiscatOmegaSaveLoad(delta);
    }

    // Update Jujutsu Summons, Malevolent Shrine, and Gojo Techniques if in Phase 1
    if (s.bossPhase === 1) {
      this.updateJujutsuSummons(delta);
      this.updateMalevolentShrine(delta);
      this.updateGojoTechniques(delta);
    }
  }

  private triggerSantiscatAttack(attack: SantiscatAttack, broadcast: boolean = true) {
    if (!this.santiscat) return;
    const s = this.santiscat;
    s.currentAttack = attack;
    s.attackTimer = 0;

    if (broadcast && this.isMultiplayer && this.isHostPlayer()) {
      multiplayerClient.sendBossAttack('santiscat', attack, {
        safeSide: s.rainbowBlast?.safeSide,
        x: s.x,
        y: s.y,
      });
    }

    if (attack === 'summon_jujutsu_cats') {
      s.eyeState = 'glowing';
      s.leftHand.progress = 1.0;
      s.rightHand.progress = 1.0;
      soundManager.playSantiscatSummon();
      this.screenShake = 22;
      this.spawnHitParticles(s.x, s.y, '#dc2626', 30);
      this.spawnHitParticles(s.x, s.y, '#38bdf8', 30);
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: '🔥 ¡SANTISCAT INVOCA A SUKUNACAT Y GOJOCAT! 🔥',
        x: s.x,
        y: s.y - 75,
        vy: -1.4,
        color: '#f43f5e',
        isBlackFlash: true,
        life: 2.2,
        maxLife: 2.2,
        scale: 1.4,
      });

      // Activate summons with positioning near player
      s.jujutsuSummons.forEach(sm => {
        sm.active = true;
        sm.maxHp = 12000;
        sm.hp = sm.maxHp;
        sm.state = 'idle';
        sm.timer = 0;
        sm.cooldownTimer = sm.id === 'sukunacat' ? 0.8 : 3.2; // Staggered: Sukunacat attacks first, Gojocat waits
        if (sm.id === 'sukunacat') {
          sm.x = Math.max(250, this.player.x - 320);
          sm.y = this.player.y - 60;
        } else {
          sm.x = Math.min(this.camera.worldWidth - 250, this.player.x + 320);
          sm.y = this.player.y - 60;
        }
      });
    } else if (attack === 'sun_burst') {
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
          damage: 20, // Non-lethal damage (does not kill automatically)
          hasHit: false,
        });
      }
    } else if (attack === 'rainbow_blast') {
      this.triggerSantiscatRainbowBlast();
    } else if (attack === 'spiral_galaxy') {
      this.triggerSantiscatGalaxies();
    } else if (attack === 'giant_stars') {
      this.triggerSantiscatGiantStars();
    } else if (attack === 'omega_save_load') {
      this.triggerSantiscatOmegaSaveLoad();
    } else if (attack === 'black_hole_chase') {
      s.blackHole.active = true;
      s.blackHole.phase = 'black_hole_active';
      s.blackHole.x = s.x;
      s.blackHole.y = s.y - 80;
      s.blackHole.radius = 48;
      s.blackHole.timer = 0;
      s.blackHole.maxDuration = 8.5;
      s.blackHole.absorbedDebris = [];
      s.eyeState = 'menacing';
      soundManager.playBlackHoleCollapse();
      this.screenShake = 24;

      this.damageNumbers.push({
        id: Math.random().toString(),
        text: '🕳️ ¡AGUJERO NEGRO CÓSMICO! ¡ALÉJATE DE SU GRAVEDAD! 🕳️',
        x: s.x,
        y: s.y - 85,
        vy: -1.3,
        color: '#a855f7',
        isBlackFlash: true,
        life: 2.2,
        maxLife: 2.2,
        scale: 1.4,
      });
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

    // Prompt: "que el agujero negro de santiscat te mate automaticamente si entras en el"
    if (dist < bh.radius + this.player.width * 0.35) {
      if (!this.godMode && !this.isSpectating && this.player.hp > 0) {
        this.stats.deathReason = 'black_hole';
        this.player.hp = 0;
        this.player.isInvulnerable = true;
        soundManager.playBlackHoleCollapse();
        this.screenShake = 32;
        this.spawnHitParticles(this.player.x, this.player.y, '#000000', 35);
        this.spawnHitParticles(this.player.x, this.player.y, '#a855f7', 25);
        if (this.isMultiplayer) {
          this.isSpectating = true;
          multiplayerClient.sendPlayerDied();
          this.spectateNext();
          return;
        }
        this.triggerGameOver();
        return;
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

          if (distToLine < slash.width + this.player.width * 0.4 && !slash.hasHit) {
            slash.hasHit = true;
            this.stats.deathReason = 'reality_tear';
            // Prompt: "haz que los cortes no te maten automaticamente"
            const safeDamage = Math.min(slash.damage, Math.max(1, this.player.hp - 10));
            this.takePlayerDamage(safeDamage, 'collision');
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
    if (!this.santiscat) return;
    if (this.stage !== 'santiscat_boss' && this.stage !== 'santiscat_boss_wormhole' && this.stage !== 'santiscat_boss_universe') return;
    const s = this.santiscat;

    // During soul absorption transition, Santiscat cannot be damaged
    if (s.currentAttack === 'absorbing_souls') return;

    const questMult = this.getDamageMultiplier('santiscat', attackType);
    const modifiedBaseDmg = Math.round(baseDmg * questMult);

    const { damage, isBlackFlash } = this.rollBlackFlash(modifiedBaseDmg, hitX, hitY);
    s.hp = Math.max(0, s.hp - damage);
    this.stats.santiscatDamageDealt = (this.stats.santiscatDamageDealt || 0) + damage;
    this.stats.totalAttacksLanded++;
    this.stats.score += damage * 3;
    this.progressQuest('santiscat_breaker', damage);

    if (!isBlackFlash) {
      const isEmpowered = questMult > 1.05;
      this.damageNumbers.push({
        id: Math.random().toString(),
        text: isEmpowered ? `-${damage} ⚡` : `-${damage}`,
        x: hitX,
        y: hitY - 12,
        vy: -1.4,
        color: isEmpowered ? '#fbbf24' : '#f43f5e',
        isBlackFlash: false,
        life: 0.9,
        maxLife: 0.9,
        scale: isEmpowered ? 1.25 : 1.15,
      });
    }

    this.spawnHitParticles(hitX, hitY, isBlackFlash ? '#ff003b' : '#c084fc', 12);

    if (this.isMultiplayer) {
      multiplayerClient.sendBossHit({
        damage,
        attackType,
        isBlackFlash,
        hitX,
        hitY,
        target: 'santiscat',
      });
    }

    if (s.hp <= 0) {
      if (s.bossPhase === 1) {
        this.startSantiscatPhase2Cinematic();
      } else {
        // Phase 2 (wormhole) or Phase 2.5 (another universe): Santiscat dies completely!
        this.startSantiscatDefeatCinematic();
      }
    }
  }

  // =========================================================================
  // SANTISCAT PHASE 2 (WORMHOLE & 12 HUMAN SOULS) & PHASE 2.5 (ANOTHER UNIVERSE)
  // =========================================================================

  public startSantiscatPhase2Cinematic() {
    if (!this.santiscat) return;
    const s = this.santiscat;
    s.hp = 1; // Hanging on near death
    s.currentAttack = 'absorbing_souls';
    s.attackTimer = 0;
    s.soulAbsorbTimer = 0;
    s.portalScale = 0;
    s.portalAngle = 0;

    // Dismiss any Jujutsu Summons or active domains
    s.jujutsuSummons.forEach(sm => {
      sm.active = false;
      sm.state = 'idle';
    });
    s.shrine.active = false;
    s.shrine.chanting = false;
    s.gojoTechniques.blue.active = false;
    s.gojoTechniques.red.active = false;
    s.gojoTechniques.purple.active = false;

    // Reset 12 human souls to emerge from portal
    s.souls.forEach((soul, i) => {
      soul.absorbed = false;
      soul.alpha = 0;
      soul.distance = 0;
      soul.targetDistance = 210;
      soul.scale = 0.9;
      soul.angle = (Math.PI * 2 * i) / 12;
    });

    soundManager.playSoulAbsorption();
    this.screenShake = 32;

    this.damageNumbers.push({
      id: Math.random().toString(),
      text: '🌀 SANTISCAT ABRE UN PORTAL SOMBRÍO E INVOCA 12 ALMAS HUMANAS! 🌀',
      x: s.x,
      y: s.y - 95,
      vy: -1.2,
      color: '#c084fc',
      isBlackFlash: true,
      life: 3.5,
      maxLife: 3.5,
      scale: 1.5,
    });
  }

  private updateSantiscatAbsorbingSouls(delta: number) {
    const s = this.santiscat!;
    s.soulAbsorbTimer += delta;
    s.portalAngle += delta * 3.0;

    // Center Santiscat for dramatic soul absorption ritual
    s.x += (1600 - s.x) * 0.04;
    s.y += (1050 - s.y) * 0.04;

    // Step 1 (0 to 1.8s): Dark shadow portal opens & expands behind Santiscat
    if (s.soulAbsorbTimer < 1.8) {
      s.portalScale = Math.min(1.2, s.portalScale + delta * 0.85);
    }

    // Step 2 (1.0 to 3.8s): The 12 human souls emerge from portal, orbit in ring around Santiscat
    s.souls.forEach((soul, idx) => {
      if (s.soulAbsorbTimer > 0.4 + idx * 0.08) {
        soul.alpha = Math.min(1, soul.alpha + delta * 2.2);
        soul.distance += (soul.targetDistance - soul.distance) * 0.07;
        // Faster spinning ring animation
        const spinSpeed = 1.6 + s.soulAbsorbTimer * 1.1;
        soul.angle += delta * spinSpeed;

        // Sparkle trail for each soul
        if (Math.random() < 0.4) {
          const sx = s.x + Math.cos(soul.angle) * soul.distance;
          const sy = s.y + Math.sin(soul.angle) * soul.distance;
          this.particles.push({
            x: sx,
            y: sy,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            size: Math.random() * 4 + 2,
            color: soul.color,
            life: 0.35,
            maxLife: 0.35,
            alpha: 1,
            shape: 'spark',
          });
        }
      }
    });

    // Step 3 (3.8s to 4.8s): The souls converge rapidly into Santiscat's chest and get absorbed!
    if (s.soulAbsorbTimer >= 3.8 && s.soulAbsorbTimer < 4.8) {
      s.souls.forEach(soul => {
        soul.distance = Math.max(0, soul.distance - delta * 460);
        soul.scale = Math.max(0.2, soul.scale - delta * 0.8);
        if (soul.distance <= 20) {
          soul.absorbed = true;
          soul.alpha = 0;
        }
      });
      this.screenShake = Math.max(this.screenShake, 18);
    }

    // Step 4 (4.8s Climax): Blinding flash, Santiscat ascends into Phase 2 (99,999 HP) & enters Wormhole!
    if (s.soulAbsorbTimer >= 4.8) {
      s.souls.forEach(soul => (soul.absorbed = true));
      s.hp = 99999;
      s.maxHp = 99999;
      s.bossPhase = 2;
      this.stage = 'santiscat_boss_wormhole';
      s.wormholeTimer = 0;
      s.wormholeProgress = 0;
      s.currentAttack = 'idle';
      s.attackCooldown = 1.8;
      soundManager.playMusic('santiscat_phase2');

      this.screenShake = 42;
      this.spawnHitParticles(s.x, s.y, '#ffffff', 50);
      this.spawnHitParticles(s.x, s.y, '#ec4899', 30);
      this.spawnHitParticles(s.x, s.y, '#06b6d4', 30);
      this.spawnHitParticles(s.x, s.y, '#facc15', 30);

      this.damageNumbers.push({
        id: Math.random().toString(),
        text: '⚡ ¡FASE 2: VIAJE POR EL AGUJERO DE GUSANO! (99,999 HP) ⚡',
        x: s.x,
        y: s.y - 100,
        vy: -1.6,
        color: '#fbbf24',
        isBlackFlash: true,
        life: 3.5,
        maxLife: 3.5,
        scale: 1.6,
      });
    }
  }

  // --- ATTACK 1: GIANT RAINBOW ENERGY BLAST ---
  private triggerSantiscatRainbowBlast() {
    const s = this.santiscat!;
    s.currentAttack = 'rainbow_blast';
    s.attackTimer = 0;
    s.rainbowBlast.active = true;
    s.rainbowBlast.timer = 0;
    // Safe corridor: top or bottom of the screen
    s.rainbowBlast.safeSide = Math.random() < 0.5 ? 'top' : 'bottom';
    s.rainbowBlast.safeY = s.rainbowBlast.safeSide === 'top' ? this.player.y - 200 : this.player.y + 200;
    s.eyeState = 'glowing';
    soundManager.playRainbowBlastCharge();

    this.damageNumbers.push({
      id: Math.random().toString(),
      text: '🌈 ¡BLAST DE ENERGÍA ARCOÍRIS GIGANTE! ¡ESQUIVA A LA ZONA SEGURA! 🌈',
      x: s.x,
      y: s.y - 80,
      vy: -1.2,
      color: '#f43f5e',
      isBlackFlash: true,
      life: 2.4,
      maxLife: 2.4,
      scale: 1.4,
    });
  }

  private updateSantiscatRainbowBlast(delta: number) {
    const s = this.santiscat!;
    const rb = s.rainbowBlast;
    rb.timer += delta;

    // Align blast horizontally with Santiscat across arena
    const beamCenterY = s.y;
    const beamHalfWidth = rb.beamWidth / 2;

    if (rb.timer >= rb.chargeDuration && rb.timer - delta < rb.chargeDuration) {
      soundManager.playRainbowBlastFire();
      this.screenShake = 35;
    }

    // Firing active period (chargeDuration to chargeDuration + fireDuration)
    if (rb.timer >= rb.chargeDuration && rb.timer <= rb.chargeDuration + rb.fireDuration) {
      this.screenShake = Math.max(this.screenShake, 24);

      // Check collision with player: One-shot if player is inside the giant beam!
      const playerInBeamY = Math.abs(this.player.y - beamCenterY) < beamHalfWidth + this.player.height * 0.4;
      const playerInSafeCorridor =
        rb.safeSide === 'top' ? this.player.y < beamCenterY - beamHalfWidth : this.player.y > beamCenterY + beamHalfWidth;

      if (playerInBeamY && !playerInSafeCorridor) {
        if (this.player.shieldActive) {
          // Shield absorbs hit
          soundManager.playShieldAbsorb();
        } else {
          // One-shot instant kill!
          this.stats.deathReason = 'santiscat_oneshot';
          this.takePlayerDamage(9999, 'laser');
        }
      }
    }

    if (rb.timer >= rb.chargeDuration + rb.fireDuration) {
      rb.active = false;
      s.currentAttack = 'idle';
      s.attackCooldown = 2.2;
    }
  }

  // --- ATTACK 2: SPIRAL GALAXIES ---
  private triggerSantiscatGalaxies() {
    const s = this.santiscat!;
    s.currentAttack = 'spiral_galaxy';
    s.attackTimer = 0;
    soundManager.playEnergyBlades();
    this.screenShake = 16;

    // Spawn 3 spinning galaxies cutting across spacetime
    const colors = ['#c084fc', '#38bdf8', '#facc15'];
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3 + Math.random() * 0.4;
      const speed = 7.5;
      s.galaxies.push({
        id: `galaxy_${Date.now()}_${i}`,
        x: s.x + Math.cos(ang) * 90,
        y: s.y + Math.sin(ang) * 90,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        radius: 68,
        rotation: 0,
        rotSpeed: (Math.random() > 0.5 ? 1 : -1) * 3.8,
        color: colors[i % colors.length],
        life: 4.8,
        maxLife: 4.8,
      });
    }
  }

  private updateSantiscatGalaxies(delta: number) {
    const s = this.santiscat!;
    s.attackTimer += delta;

    s.galaxies.forEach(g => {
      g.life -= delta;
      g.rotation += g.rotSpeed * delta;
      // Slight homing drift towards player
      const angToPlayer = Math.atan2(this.player.y - g.y, this.player.x - g.x);
      g.vx += Math.cos(angToPlayer) * delta * 4;
      g.vy += Math.sin(angToPlayer) * delta * 4;
      g.x += g.vx * delta * 60;
      g.y += g.vy * delta * 60;

      // Check collision with player
      const dist = Math.hypot(this.player.x - g.x, this.player.y - g.y);
      if (dist < g.radius + this.player.width * 0.4) {
        this.takePlayerDamage(35, 'laser');
        this.spawnHitParticles(g.x, g.y, g.color, 12);
      }
    });

    s.galaxies = s.galaxies.filter(g => g.life > 0);

    if (s.attackTimer >= 4.8) {
      s.currentAttack = 'idle';
      s.attackCooldown = 1.9;
    }
  }

  // --- ATTACK 3: GIANT STARS & SUPERNOVAS ---
  private triggerSantiscatGiantStars() {
    const s = this.santiscat!;
    s.currentAttack = 'giant_stars';
    s.attackTimer = 0;
    soundManager.playSunBlast();
    this.screenShake = 24;

    this.damageNumbers.push({
      id: Math.random().toString(),
      text: '🌟 ¡COLAPSO ESTELAR! ¡SUPERNOVAS EN FORMACIÓN! 🌟',
      x: s.x,
      y: s.y - 85,
      vy: -1.3,
      color: '#f59e0b',
      isBlackFlash: true,
      life: 2.2,
      maxLife: 2.2,
      scale: 1.45,
    });

    // Spawn 2 giant burning stars
    const starColors = ['#f59e0b', '#ef4444'];
    [-1, 1].forEach((dir, i) => {
      s.giantStars.push({
        id: `star_${Date.now()}_${i}`,
        x: s.x + dir * 180,
        y: s.y - 120,
        vx: dir * 4.6,
        vy: (Math.random() - 0.5) * 2.8,
        radius: 68,
        color: starColors[i],
        explosionTimer: 2.4,
        exploded: false,
      });
    });
  }

  private updateSantiscatGiantStars(delta: number) {
    const s = this.santiscat!;
    s.attackTimer += delta;

    s.giantStars.forEach(st => {
      if (!st.exploded) {
        st.x += st.vx * delta * 60;
        st.y += st.vy * delta * 60;
        st.explosionTimer -= delta;

        // Stellar fusion particle aura
        if (Math.random() < 0.65) {
          const pAng = Math.random() * Math.PI * 2;
          this.particles.push({
            x: st.x + Math.cos(pAng) * st.radius,
            y: st.y + Math.sin(pAng) * st.radius,
            vx: Math.cos(pAng) * 3,
            vy: Math.sin(pAng) * 3,
            size: Math.random() * 6 + 3,
            color: st.color,
            life: 0.4,
            maxLife: 0.4,
            alpha: 1,
            shape: 'circle',
          });
        }

        // Explode into Colossal Supernova!
        if (st.explosionTimer <= 0) {
          st.exploded = true;
          soundManager.playSupernova();
          this.screenShake = 45;

          s.supernovas.push({
            id: `supernova_${Date.now()}_${Math.random()}`,
            x: st.x,
            y: st.y,
            radius: 25,
            maxRadius: 480, // Colossal, epic blast radius
            color: st.color,
            life: 2.4,
            maxLife: 2.4,
          });

          // Massive multi-colored blast particles
          this.spawnHitParticles(st.x, st.y, '#ffffff', 40);
          this.spawnHitParticles(st.x, st.y, '#facc15', 35);
          this.spawnHitParticles(st.x, st.y, st.color, 35);
          this.spawnHitParticles(st.x, st.y, '#a855f7', 25);
          this.spawnRubble(st.x, st.y, '#ea580c', 25);

          this.damageNumbers.push({
            id: Math.random().toString(),
            text: '💥 ¡ESTALLIDO CÓSMICO DE SUPERNOVA! 💥',
            x: st.x,
            y: st.y - 70,
            vy: -1.6,
            color: '#fbbf24',
            isBlackFlash: true,
            life: 2.2,
            maxLife: 2.2,
            scale: 1.5,
          });
        }
      }
    });

    s.giantStars = s.giantStars.filter(st => !st.exploded);

    if (s.attackTimer >= 4.2) {
      s.currentAttack = 'idle';
      s.attackCooldown = 2.2;
    }
  }

  private updateSantiscatSupernovas(delta: number) {
    if (!this.santiscat) return;
    const s = this.santiscat;

    s.supernovas.forEach(sn => {
      sn.life -= delta;
      const progress = 1 - sn.life / sn.maxLife;
      // Explosive expansion curve (fast burst out, then expanding front)
      const ease = 1 - Math.pow(1 - progress, 2.2);
      sn.radius = 25 + (sn.maxRadius - 25) * ease;

      // Shockwave ring hits & pushes player
      const dist = Math.hypot(this.player.x - sn.x, this.player.y - sn.y);

      if (dist < sn.radius + 35) {
        // Relativistic shockwave push
        const ang = Math.atan2(this.player.y - sn.y, this.player.x - sn.x);
        const pushForce = Math.max(3, (1 - dist / sn.maxRadius) * 20);
        this.player.x += Math.cos(ang) * pushForce;
        this.player.y += Math.sin(ang) * pushForce;

        if (Math.abs(dist - sn.radius) < 55) {
          this.takePlayerDamage(55, 'meteor');
          this.spawnHitParticles(this.player.x, this.player.y, sn.color, 14);
        }
      }
    });

    s.supernovas = s.supernovas.filter(sn => sn.life > 0);
  }

  // --- ATTACK 4: OMEGA FLOWEY SAVE & LOAD MECHANIC ---
  private triggerSantiscatOmegaSaveLoad() {
    const s = this.santiscat!;
    s.currentAttack = 'omega_save_load';
    s.attackTimer = 0;

    // Step 1: Save player state and checkpoint!
    s.omegaSave = {
      active: true,
      hasSave: true,
      stateText: 'FILE 1 SAVED',
      textTimer: 1.6,
      savedPlayerX: this.player.x,
      savedPlayerY: this.player.y,
      savedPlayerHp: this.player.hp,
      savedAttack: 'omega_save_load',
      loadTimer: 3.2,
    };

    soundManager.playOmegaSave();
    this.screenShake = 20;

    this.damageNumbers.push({
      id: Math.random().toString(),
      text: '[ FILE 1 SAVED ]',
      x: s.x,
      y: s.y - 85,
      vy: -1.2,
      color: '#38bdf8',
      isBlackFlash: true,
      life: 2.0,
      maxLife: 2.0,
      scale: 1.5,
    });

    // Launch intense initial barrage
    this.launchOmegaBarrage();
  }

  private launchOmegaBarrage() {
    const s = this.santiscat!;
    // Rapid ring of star pellets
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI * 2) / 8 + Math.random() * 0.2;
      const spd = 10.5;
      this.projectiles.push({
        id: Math.random().toString(),
        type: 'santiscat_sun_shot',
        x: s.x,
        y: s.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        radius: 12,
        damage: 28,
        duration: 0,
        maxDuration: 3.2,
        color: '#38bdf8',
        glowColor: '#0284c7',
        trail: [],
      });
    }
  }

  private updateSantiscatOmegaSaveLoad(delta: number) {
    const s = this.santiscat!;
    const os = s.omegaSave;
    s.attackTimer += delta;

    if (os.textTimer > 0) {
      os.textTimer -= delta;
    }

    if (os.loadTimer > 0) {
      os.loadTimer -= delta;
      if (os.loadTimer <= 0 && os.hasSave) {
        // Step 2: LOAD! Rewind player position back to saved point and replay attacks!
        os.hasSave = false;
        os.stateText = 'FILE 1 LOADED';
        os.textTimer = 1.8;
        soundManager.playOmegaLoad();
        this.screenShake = 32;

        // Teleport player back to saved location!
        this.player.x = os.savedPlayerX;
        this.player.y = os.savedPlayerY;
        this.spawnHitParticles(this.player.x, this.player.y, '#38bdf8', 25);

        this.damageNumbers.push({
          id: Math.random().toString(),
          text: '[ FILE 1 LOADED ]',
          x: this.player.x,
          y: this.player.y - 40,
          vy: -1.5,
          color: '#f43f5e',
          isBlackFlash: true,
          life: 2.0,
          maxLife: 2.0,
          scale: 1.5,
        });

        // Replay barrage immediately!
        this.launchOmegaBarrage();
      }
    }

    if (s.attackTimer >= 5.0) {
      os.active = false;
      s.currentAttack = 'idle';
      s.attackCooldown = 2.0;
    }
  }

  // --- TRANSITION TO PHASE 2.5: ANOTHER UNIVERSE ---
  public transitionToPhase25Universe() {
    if (!this.santiscat) return;
    const s = this.santiscat;
    this.stage = 'santiscat_boss_universe';
    s.bossPhase = 2.5;
    s.currentAttack = 'idle';
    s.attackCooldown = 1.5;
    soundManager.playMusic('santiscat_phase25');

    this.screenShake = 38;
    this.spawnHitParticles(s.x, s.y, '#ffffff', 40);
    this.spawnHitParticles(this.player.x, this.player.y, '#ef4444', 30);

    this.damageNumbers.push({
      id: Math.random().toString(),
      text: '🌌 ¡FASE 2.5: HAS LLEGADO A OTRO UNIVERSO! 🌌',
      x: this.player.x,
      y: this.player.y - 70,
      vy: -1.6,
      color: '#e0e7ff',
      isBlackFlash: true,
      life: 3.5,
      maxLife: 3.5,
      scale: 1.6,
    });
  }

  // --- PHASE 2.5 EXCLUSIVE: REFUSED TO DIE ("PERO SE REHUSÓ A MORIR") ---
  public triggerRefusedToDie() {
    if (!this.santiscat) return;
    const s = this.santiscat;

    soundManager.playRefuseToDie();
    this.screenShake = 35;

    // Restore full HP & grant protective invulnerability
    this.player.hp = this.player.maxHp;
    this.player.isInvulnerable = true;
    this.player.invulnerableTimer = 3.5;
    this.player.shieldActive = true;
    this.player.shieldTimer = 3.0;

    s.refusedToDie = {
      active: true,
      phase: 'heart_shattering',
      timer: 0,
      heartX: this.player.x,
      heartY: this.player.y,
      crackProgress: 0,
      alpha: 1,
    };

    this.damageNumbers.push({
      id: Math.random().toString(),
      text: '❤️ ¡PERO TE REHUSASTE A MORIR! ❤️',
      x: this.player.x,
      y: this.player.y - 50,
      vy: -1.8,
      color: '#ef4444',
      isBlackFlash: true,
      life: 3.2,
      maxLife: 3.2,
      scale: 1.65,
    });

    this.spawnHitParticles(this.player.x, this.player.y, '#ef4444', 35);
    this.spawnHitParticles(this.player.x, this.player.y, '#ffffff', 25);
  }

  // --- SANTISCAT FINAL DEFEAT CINEMATIC (PROCEDURAL IMPLOSION & GIANT SUPERNOVA EXPLOSION) ---
  public startSantiscatDefeatCinematic(broadcast: boolean = true) {
    this.stage = 'cinematic_santiscat_defeat';
    soundManager.stopMusic();
    soundManager.playSoulRelease();
    this.screenShake = 32;

    const sX = this.santiscat ? this.santiscat.x : (this.camera.x + this.camera.viewportWidth / 2);
    const sY = this.santiscat ? this.santiscat.y : (this.camera.y + this.camera.viewportHeight / 2);

    if (this.santiscat) {
      this.santiscat.hp = 0;
      this.santiscat.currentAttack = 'idle';
      this.santiscat.attackCooldown = 999;
      // Deactivate summons and dangerous domains
      this.santiscat.jujutsuSummons.forEach(sm => (sm.active = false));
      this.santiscat.shrine.active = false;
      this.santiscat.shrine.chanting = false;
      this.santiscat.gojoTechniques.blue.active = false;
      this.santiscat.gojoTechniques.red.active = false;
      this.santiscat.gojoTechniques.purple.active = false;
      this.santiscat.rainbowBlast.active = false;
      this.santiscat.blackHole.active = false;
      this.santiscat.galaxies = [];
      this.santiscat.giantStars = [];
      this.santiscat.supernovas = [];
    }

    // Cancel hostile projectiles
    this.projectiles = this.projectiles.filter(p => p.type.startsWith('player_'));

    const soulData = [
      { id: '1', name: 'Determinación', color: '#ef4444', glowColor: '#fca5a5' },
      { id: '2', name: 'Paciencia', color: '#06b6d4', glowColor: '#67e8f9' },
      { id: '3', name: 'Valentía', color: '#f97316', glowColor: '#fdba74' },
      { id: '4', name: 'Integridad', color: '#3b82f6', glowColor: '#93c5fd' },
      { id: '5', name: 'Perseverancia', color: '#a855f7', glowColor: '#d8b4fe' },
      { id: '6', name: 'Amabilidad', color: '#22c55e', glowColor: '#86efac' },
      { id: '7', name: 'Justicia', color: '#eab308', glowColor: '#fef08a' },
      { id: '8', name: 'Esperanza', color: '#ec4899', glowColor: '#fbcfe8' },
      { id: '9', name: 'Armonía', color: '#14b8a6', glowColor: '#99f6e4' },
      { id: '10', name: 'Luz Cósmica', color: '#8b5cf6', glowColor: '#c4b5fd' },
      { id: '11', name: 'Sabiduría', color: '#6366f1', glowColor: '#a5b4fc' },
      { id: '12', name: 'Libertad', color: '#ffffff', glowColor: '#f8fafc' },
    ];

    const souls = soulData.map((sd, i) => ({
      id: sd.id,
      name: sd.name,
      color: sd.color,
      glowColor: sd.glowColor,
      angle: (i * Math.PI * 2) / 12,
      distance: 0,
      speed: 1.8 + i * 0.12,
      scale: 1.0,
      alpha: 1.0,
    }));

    this.santiscatDefeatCinematic = {
      active: true,
      timer: 0,
      maxDuration: 12.5,
      phase: 'shining_souls_release',
      lightIntensity: 0.2,
      implosionProgress: 0,
      explosionRadius: 0,
      flashAlpha: 0,
      santiscatX: sX,
      santiscatY: sY,
      shieldActivatedInTime: false,
      warningSoundPlayed: false,
      implosionSoundPlayed: false,
      explosionSoundPlayed: false,
      souls,
    };

    this.damageNumbers.push({
      id: Math.random().toString(),
      text: '✨ ¡SANTISCAT HA SIDO VENCIDO! ¡LIBERACIÓN DE LAS 12 ALMAS! ✨',
      x: sX,
      y: sY - 95,
      vy: -1.3,
      color: '#facc15',
      isBlackFlash: true,
      life: 3.5,
      maxLife: 3.5,
      scale: 1.5,
    });

    if (broadcast && this.isMultiplayer) {
      multiplayerClient.sendStageChange('cinematic_santiscat_defeat', 0);
    }
  }

  public updateSantiscatDefeatCinematic(delta: number) {
    if (!this.santiscatDefeatCinematic) return;
    const c = this.santiscatDefeatCinematic;
    c.timer += delta;

    // Center camera on Santiscat
    const targetCamX = c.santiscatX - this.camera.viewportWidth / 2;
    const targetCamY = c.santiscatY - this.camera.viewportHeight / 2;
    this.camera.x += (targetCamX - this.camera.x) * 0.08;
    this.camera.y += (targetCamY - this.camera.y) * 0.08;

    // Check player shield activation (from touch or keyboard)
    if (this.player.shieldActive || this.player.holdingShield || this.keys['keyk'] || this.keys['shiftleft'] || this.keys['shiftright'] || this.keys['keyc']) {
      c.shieldActivatedInTime = true;
      this.player.shieldActive = true;
      this.player.shieldTimer = Math.max(this.player.shieldTimer, 3.5);
    }

    // Phase 1: 0.0s to 3.5s - Super bright divine light & 12 human souls release
    if (c.timer < 3.5) {
      c.phase = 'shining_souls_release';
      c.lightIntensity = Math.min(1.0, c.timer / 3.0);
      c.souls.forEach(s => {
        s.distance = Math.min(380, s.distance + delta * 120);
        s.angle += delta * s.speed;
        // Sparkle trails
        if (Math.random() < 0.45) {
          const sx = c.santiscatX + Math.cos(s.angle) * s.distance;
          const sy = c.santiscatY + Math.sin(s.angle) * s.distance;
          this.particles.push({
            x: sx,
            y: sy,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: Math.random() * 5 + 2,
            color: s.color,
            life: 0.4,
            maxLife: 0.4,
            alpha: 1,
            shape: 'spark',
          });
        }
      });
      // Blinding god rays particles from Santiscat
      if (Math.random() < 0.6) {
        const rayAng = Math.random() * Math.PI * 2;
        this.particles.push({
          x: c.santiscatX,
          y: c.santiscatY,
          vx: Math.cos(rayAng) * (Math.random() * 8 + 4),
          vy: Math.sin(rayAng) * (Math.random() * 8 + 4),
          size: Math.random() * 8 + 4,
          color: '#ffffff',
          life: 0.6,
          maxLife: 0.6,
          alpha: 1,
          shape: 'circle',
        });
      }
    }
    // Phase 2: 3.5s to 7.0s - Emergency hazard warning: raise shield!
    else if (c.timer < 7.0) {
      c.phase = 'shield_warning';
      if (!c.warningSoundPlayed) {
        soundManager.playShieldWarning();
        c.warningSoundPlayed = true;
      }
      c.lightIntensity = 1.0;
      // Pulse screen shake
      this.screenShake = Math.max(this.screenShake, 6 + Math.sin(c.timer * 12) * 4);

      c.souls.forEach(s => {
        s.distance = Math.min(520, s.distance + delta * 60);
        s.angle += delta * (s.speed * 1.3);
      });
    }
    // Phase 3: 7.0s to 9.2s - Procedural WebGL Spacetime Implosion
    else if (c.timer < 9.2) {
      c.phase = 'shader_implosion';
      if (!c.implosionSoundPlayed) {
        soundManager.playCosmicImplosion();
        c.implosionSoundPlayed = true;
      }
      c.implosionProgress = Math.min(1.0, (c.timer - 7.0) / 2.2);
      this.screenShake = Math.max(this.screenShake, 12 + c.implosionProgress * 25);

      // Suck particles and souls inwards towards singularity
      c.souls.forEach(s => {
        s.distance = Math.max(20, s.distance - delta * (c.implosionProgress * 280));
        s.angle += delta * (s.speed * 3.5);
      });

      // Spawn inward vortex dust
      if (Math.random() < 0.8) {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.random() * 350 + 150;
        this.particles.push({
          x: c.santiscatX + Math.cos(ang) * rad,
          y: c.santiscatY + Math.sin(ang) * rad,
          vx: -Math.cos(ang) * 9 * (1 + c.implosionProgress),
          vy: -Math.sin(ang) * 9 * (1 + c.implosionProgress),
          size: Math.random() * 6 + 3,
          color: Math.random() > 0.5 ? '#a855f7' : '#38bdf8',
          life: 0.35,
          maxLife: 0.35,
          alpha: 1,
          shape: 'spark',
        });
      }
    }
    // Phase 4: 9.2s to 12.2s - Giant Cosmic Supernova Explosion
    else if (c.timer < 12.2) {
      c.phase = 'giant_explosion';
      if (!c.explosionSoundPlayed) {
        soundManager.playCosmicSupernovaDefeat();
        c.flashAlpha = 1.0;
        this.screenShake = 65;
        c.explosionSoundPlayed = true;

        // Disintegrate Santiscat completely
        this.spawnRubble(c.santiscatX, c.santiscatY, '#a855f7', 80);
        this.spawnRubble(c.santiscatX, c.santiscatY, '#f59e0b', 70);
        this.spawnHitParticles(c.santiscatX, c.santiscatY, '#ffffff', 80);
        this.spawnHitParticles(c.santiscatX, c.santiscatY, '#38bdf8', 60);

        // Feedback for shield coverage
        if (this.player.shieldActive || c.shieldActivatedInTime) {
          this.damageNumbers.push({
            id: Math.random().toString(),
            text: '🛡️ ¡ESCUDO RESISTIÓ LA EXPLOSIÓN CÓSMICA! 🛡️',
            x: this.player.x,
            y: this.player.y - 45,
            vy: -1.6,
            color: '#34d399',
            isBlackFlash: true,
            life: 3.0,
            maxLife: 3.0,
            scale: 1.5,
          });
        } else {
          this.damageNumbers.push({
            id: Math.random().toString(),
            text: '💥 ¡ONDA EXPANSIVA CÓSMICA! 💥',
            x: this.player.x,
            y: this.player.y - 45,
            vy: -1.6,
            color: '#ef4444',
            isBlackFlash: true,
            life: 3.0,
            maxLife: 3.0,
            scale: 1.5,
          });
        }
      }

      // Flash decay
      if (c.flashAlpha > 0) {
        c.flashAlpha = Math.max(0, c.flashAlpha - delta * 0.9);
      }

      c.explosionRadius += delta * 2400;

      // Blast wave pushes player outward smoothly
      const pDist = Math.hypot(this.player.x - c.santiscatX, this.player.y - c.santiscatY);
      if (pDist < c.explosionRadius + 100) {
        const pAng = Math.atan2(this.player.y - c.santiscatY, this.player.x - c.santiscatX);
        const force = (this.player.shieldActive || c.shieldActivatedInTime) ? 4 : 14;
        this.player.x += Math.cos(pAng) * force;
        this.player.y += Math.sin(pAng) * force;
      }
    }
    // Phase 5: Spacetime collapses - Initiate 1-minute Cosmic Escape to Wormhole!
    else {
      c.phase = 'fade_to_victory';
      this.startCosmicEscape(true);
    }
  }

  public skipSantiscatDefeatCinematic() {
    if (this.stage === 'cinematic_santiscat_defeat') {
      this.startCosmicEscape(true);
    }
  }

  // =========================================================================
  // CATACLYSMIC COSMIC ESCAPE SEQUENCE (1-MINUTE RACE TO THE WORMHOLE)
  // =========================================================================

  public startCosmicEscape(broadcast: boolean = true) {
    this.stage = 'cosmic_escape';
    this.lastBattleStage = 'cosmic_escape';
    this.santiscatDefeatCinematic = null;
    this.boss = null;
    this.santiscat = null;
    this.obstacles = [];
    this.projectiles = [];
    this.drones = [];

    // Giant cosmic world: 13,500px length by 2,200px height
    this.camera.worldWidth = 13500;
    this.camera.worldHeight = 2200;

    // Reset player position at escape departure point
    this.player.x = 400;
    this.player.y = 1100;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.facing = 1;

    // Exit wormhole destination
    const wormholeX = 12800;
    const wormholeY = 1100;
    const wormholeRadius = 220;

    // 14 Collapsing Planets with magma veins & tumbling fragments
    const planets: CollapsingPlanet[] = [];
    const planetColors = [
      { color: '#3b82f6', crust: '#1e3a8a', magma: '#f97316' },
      { color: '#10b981', crust: '#064e3b', magma: '#ef4444' },
      { color: '#8b5cf6', crust: '#4c1d95', magma: '#ec4899' },
      { color: '#f59e0b', crust: '#78350f', magma: '#dc2626' },
      { color: '#06b6d4', crust: '#164e63', magma: '#fbbf24' },
    ];

    for (let i = 0; i < 14; i++) {
      const pX = 900 + i * 820 + (Math.random() - 0.5) * 200;
      const pY = 250 + (i % 2 === 0 ? 1 : -1) * (300 + Math.random() * 250) + 850;
      const theme = planetColors[i % planetColors.length];
      const rad = 85 + Math.random() * 65;
      planets.push({
        id: `planet_${i}`,
        x: pX,
        y: Math.max(220, Math.min(1980, pY)),
        radius: rad,
        color: theme.color,
        crustColor: theme.crust,
        magmaColor: theme.magma,
        crackProgress: 0.2 + Math.random() * 0.35,
        collapseTimer: 60 - i * 3.5,
        exploded: false,
        debrisCount: Math.floor(rad / 10),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.8,
      });
    }

    // 18 Exploding Stars / Supernovas
    const starColors = ['#f59e0b', '#ef4444', '#38bdf8', '#c084fc', '#ec4899'];
    const explodingStars: ExplodingStar[] = [];
    for (let i = 0; i < 18; i++) {
      const sX = 700 + i * 650 + (Math.random() - 0.5) * 180;
      const sY = 200 + Math.random() * 1800;
      const baseR = 60 + Math.random() * 50;
      explodingStars.push({
        id: `star_${i}`,
        x: sX,
        y: sY,
        radius: baseR,
        maxRadius: baseR,
        color: starColors[i % starColors.length],
        coreColor: '#ffffff',
        phase: (i % 3 === 0 ? 'imploding' : 'pulsing') as any,
        timer: Math.random() * 2.5,
        cycleTimer: 2.8 + Math.random() * 2.0,
        shockwaveRadius: 0,
        maxShockwaveRadius: baseR * 3.2,
        shockwaveActive: false,
      });
    }

    // 24 Reality Fissures
    const fissures: RealityFissure[] = [];
    for (let i = 0; i < 24; i++) {
      const fX = 800 + i * 480 + (Math.random() - 0.5) * 150;
      const fY = 300 + Math.random() * 1600;
      const angle = (Math.random() - 0.5) * Math.PI * 0.8;
      const len = 250 + Math.random() * 250;
      fissures.push({
        id: `fissure_${i}`,
        x1: fX - Math.cos(angle) * (len / 2),
        y1: fY - Math.sin(angle) * (len / 2),
        x2: fX + Math.cos(angle) * (len / 2),
        y2: fY + Math.sin(angle) * (len / 2),
        width: 22 + Math.random() * 14,
        pulseTimer: Math.random() * Math.PI * 2,
        color: i % 2 === 0 ? '#ec4899' : '#8b5cf6',
        glowColor: i % 2 === 0 ? '#f43f5e' : '#38bdf8',
        damage: 26,
      });
    }

    // 35 Cosmic Debris Fragments
    const debris: CosmicDebris[] = [];
    const debrisColors = ['#64748b', '#78716c', '#ef4444', '#f59e0b', '#3b82f6'];
    for (let i = 0; i < 35; i++) {
      debris.push({
        id: `debris_${i}`,
        x: 600 + Math.random() * 12000,
        y: 100 + Math.random() * 2000,
        vx: -2.5 - Math.random() * 3.5,
        vy: (Math.random() - 0.5) * 2.0,
        radius: 12 + Math.random() * 20,
        color: debrisColors[i % debrisColors.length],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 3.0,
      });
    }

    this.cosmicEscape = {
      active: true,
      timer: 60.0,
      maxTimer: 60.0,
      worldWidth: 13500,
      worldHeight: 2200,
      wormholeX,
      wormholeY,
      wormholeRadius,
      wormholeAngle: 0,
      planets,
      explodingStars,
      fissures,
      debris,
      escapeDistanceTotal: wormholeX - 400,
      escaped: false,
      escapeWarpTimer: 0,
      warningSoundPlayed: true,
    };

    // Audio: start alarm & epic escape soundtrack!
    soundManager.stopGammaSound();
    soundManager.playEscapeWarningAlarm();
    soundManager.playMusic('cosmic_escape');

    this.screenShake = 35;
    this.damageNumbers.push({
      id: Math.random().toString(),
      text: '⚠️ ¡EL UNIVERSO ALTERNO COLAPSA! ¡HUYE AL AGUJERO DE GUSANO! (1:00) ⚠️',
      x: this.player.x,
      y: this.player.y - 65,
      vy: -1.2,
      color: '#f43f5e',
      isBlackFlash: true,
      life: 4.5,
      maxLife: 4.5,
      scale: 1.6,
    });

    if (broadcast && this.isMultiplayer && this.isHostPlayer()) {
      multiplayerClient.sendStageChange('cosmic_escape', 0);
    }
  }

  public updateCosmicEscape(delta: number) {
    if (!this.cosmicEscape || !this.cosmicEscape.active) return;
    const esc = this.cosmicEscape;
    const p = this.player;

    // Wormhole rotation
    esc.wormholeAngle += delta * 2.8;

    // If already in warp animation to return home
    if (esc.escaped) {
      esc.escapeWarpTimer += delta;
      p.vx = 0;
      p.vy = 0;
      p.x += (esc.wormholeX - p.x) * 0.14;
      p.y += (esc.wormholeY - p.y) * 0.14;

      // Spawn portal entry particles
      for (let i = 0; i < 4; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.random() * esc.wormholeRadius;
        this.particles.push({
          x: esc.wormholeX + Math.cos(ang) * rad,
          y: esc.wormholeY + Math.sin(ang) * rad,
          vx: -Math.cos(ang) * 12,
          vy: -Math.sin(ang) * 12,
          size: Math.random() * 6 + 3,
          color: Math.random() > 0.5 ? '#38bdf8' : '#c084fc',
          life: 0.35,
          maxLife: 0.35,
          alpha: 1,
          shape: 'spark',
        });
      }

      if (esc.escapeWarpTimer >= 1.8) {
        this.triggerVictory(true);
      }
      return;
    }

    // 1-minute countdown
    esc.timer = Math.max(0, esc.timer - delta);

    // Urgent alarm when timer < 15s
    if (esc.timer < 15 && Math.floor(esc.timer) !== Math.floor(esc.timer + delta)) {
      soundManager.playEscapeWarningAlarm();
    }

    // Timer ran out: Universal Cataclysmic Collapse!
    if (esc.timer <= 0) {
      this.failCosmicEscape();
      return;
    }

    // Update Collapsing Planets
    esc.planets.forEach(pl => {
      pl.rotation += pl.rotationSpeed * delta;
      pl.crackProgress = Math.min(1.0, pl.crackProgress + delta * 0.015);

      // Planet magma sparks
      if (Math.random() < 0.35) {
        const a = Math.random() * Math.PI * 2;
        this.particles.push({
          x: pl.x + Math.cos(a) * pl.radius,
          y: pl.y + Math.sin(a) * pl.radius,
          vx: Math.cos(a) * (Math.random() * 3 + 1),
          vy: Math.sin(a) * (Math.random() * 3 + 1),
          size: Math.random() * 5 + 2,
          color: pl.magmaColor,
          life: 0.45,
          maxLife: 0.45,
          alpha: 1,
          shape: 'spark',
        });
      }

      // Check collision with player
      const dist = Math.hypot(p.x - pl.x, p.y - pl.y);
      if (dist < pl.radius + p.width * 0.4) {
        if (p.shieldActive) {
          soundManager.playShieldAbsorb();
          this.progressQuest('shield_guardian', 1);
          // Push player away from planet safely
          const ang = Math.atan2(p.y - pl.y, p.x - pl.x);
          p.x = pl.x + Math.cos(ang) * (pl.radius + p.width * 0.45 + 5);
          p.y = pl.y + Math.sin(ang) * (pl.radius + p.height * 0.45 + 5);
        } else {
          this.takePlayerDamage(24, 'collision');
          const ang = Math.atan2(p.y - pl.y, p.x - pl.x);
          p.x += Math.cos(ang) * 18;
          p.y += Math.sin(ang) * 18;
        }
      }
    });

    // Update Exploding Stars & Supernovas
    esc.explodingStars.forEach(st => {
      st.timer += delta;

      if (st.phase === 'pulsing') {
        st.radius = st.maxRadius * (1.0 + Math.sin(st.timer * 4.5) * 0.15);
        if (st.timer >= st.cycleTimer) {
          st.phase = 'imploding';
          st.timer = 0;
          soundManager.playCosmicImplosion();
        }
      } else if (st.phase === 'imploding') {
        // Gravitational collapse into tiny dense point
        st.radius = Math.max(8, st.maxRadius * (1.0 - (st.timer / 0.8) * 0.85));
        if (st.timer >= 0.8) {
          st.phase = 'supernova_blast';
          st.timer = 0;
          st.shockwaveRadius = st.radius;
          st.shockwaveActive = true;
          soundManager.playSupernovaExplosion();
          this.screenShake = Math.max(this.screenShake, 18);
        }
      } else if (st.phase === 'supernova_blast') {
        // Expanding blast shockwave
        st.shockwaveRadius += delta * 450;

        // Check shockwave collision with player
        const dist = Math.hypot(p.x - st.x, p.y - st.y);
        if (Math.abs(dist - st.shockwaveRadius) < 35 && st.shockwaveActive) {
          if (p.shieldActive) {
            soundManager.playShieldAbsorb();
            this.progressQuest('shield_guardian', 1);
            this.spawnHitParticles(p.x, p.y, '#34d399', 12);
          } else {
            this.takePlayerDamage(35, 'laser');
            this.spawnHitParticles(p.x, p.y, st.color, 16);
          }
        }

        if (st.shockwaveRadius >= st.maxShockwaveRadius) {
          st.phase = 'pulsing';
          st.timer = 0;
          st.shockwaveActive = false;
          st.radius = st.maxRadius;
        }
      }
    });

    // Update Reality Fissures
    esc.fissures.forEach(f => {
      f.pulseTimer += delta * 4;

      // Distance from player to line segment (x1, y1) to (x2, y2)
      const px = p.x;
      const py = p.y;
      const ldx = f.x2 - f.x1;
      const ldy = f.y2 - f.y1;
      const lenSq = ldx * ldx + ldy * ldy || 1;
      const t = Math.max(0, Math.min(1, ((px - f.x1) * ldx + (py - f.y1) * ldy) / lenSq));
      const projX = f.x1 + t * ldx;
      const projY = f.y1 + t * ldy;
      const dist = Math.hypot(px - projX, py - projY);

      if (dist < f.width / 2 + p.width * 0.35) {
        if (p.shieldActive) {
          soundManager.playShieldAbsorb();
          this.progressQuest('shield_guardian', 1);
          this.spawnHitParticles(p.x, p.y, '#34d399', 4);
        } else {
          this.takePlayerDamage(20, 'collision');
          this.spawnHitParticles(p.x, p.y, f.color, 6);
        }
      }
    });

    // Update Cosmic Debris
    esc.debris.forEach(deb => {
      deb.x += deb.vx * delta * 60;
      deb.y += deb.vy * delta * 60;
      deb.rotation += deb.rotSpeed * delta;

      // Wrap debris within cosmic boundaries
      if (deb.x < p.x - 1200) deb.x = p.x + 1200;
      if (deb.y < 0) deb.y = esc.worldHeight;
      if (deb.y > esc.worldHeight) deb.y = 0;

      const dist = Math.hypot(p.x - deb.x, p.y - deb.y);
      if (dist < deb.radius + p.width * 0.4) {
        if (p.shieldActive) {
          soundManager.playShieldAbsorb();
          this.progressQuest('shield_guardian', 1);
          deb.vx *= -1;
          deb.vy *= -1;
        } else {
          this.takePlayerDamage(15, 'collision');
          deb.vx *= -1;
        }
      }
    });

    // Wormhole Check
    const distToWormhole = Math.hypot(p.x - esc.wormholeX, p.y - esc.wormholeY);

    // Gravitational suction when getting close to wormhole
    if (distToWormhole < 650) {
      const suctionStrength = (1 - distToWormhole / 650) * 8.5;
      const pullAngle = Math.atan2(esc.wormholeY - p.y, esc.wormholeX - p.x);
      p.x += Math.cos(pullAngle) * suctionStrength;
      p.y += Math.sin(pullAngle) * suctionStrength;
    }

    // Enter wormhole: Escape Successful!
    if (distToWormhole < esc.wormholeRadius * 0.65) {
      esc.escaped = true;
      esc.escapeWarpTimer = 0;
      soundManager.playWormholeWarp();
      this.screenShake = 45;

      this.damageNumbers.push({
        id: Math.random().toString(),
        text: '🌀 ¡HAS ATRAVESADO EL AGUJERO DE GUSANO! REGRESANDO A CASA... 🌀',
        x: p.x,
        y: p.y - 50,
        vy: -1.4,
        color: '#38bdf8',
        isBlackFlash: true,
        life: 3.5,
        maxLife: 3.5,
        scale: 1.6,
      });
    }
  }

  public failCosmicEscape() {
    soundManager.stopMusic();
    soundManager.playEarthDestruction();
    this.screenShake = 60;
    this.stats.deathReason = 'cosmic_collapse';
    this.player.hp = 0;
    this.triggerGameOver();
  }

  public testCosmicEscape() {
    this.startCosmicEscape(false);
  }

  // --- CHEAT / TEST HELPERS FOR ADMIN PANEL ---
  public testSantiscatPhase2() {
    this.initSantiscatBoss();
    if (!this.santiscat) return;
    this.santiscat.hp = 1;
    this.startSantiscatPhase2Cinematic();
  }

  public testSantiscatPhase25() {
    this.initSantiscatBoss();
    if (!this.santiscat) return;
    this.santiscat.bossPhase = 2.5;
    this.santiscat.hp = 99999;
    this.santiscat.maxHp = 99999;
    this.transitionToPhase25Universe();
  }

  public testSantiscatDefeatCinematic() {
    this.initSantiscatBoss();
    if (!this.santiscat) return;
    this.santiscat.hp = 0;
    this.startSantiscatDefeatCinematic();
  }

  // =========================================================================
  // JUJUTSU KAISEN SUMMONS: SUKUNACAT & GOJOCAT AI & TECHNIQUES
  // =========================================================================

  private updateSantiscatSummonCats(delta: number) {
    const s = this.santiscat!;
    s.attackTimer += delta;
    if (s.attackTimer >= 1.2) {
      s.currentAttack = 'idle';
      s.attackCooldown = 3.6;
    }
  }

  // --- JUJUTSU SUMMON ATTACK CHECKS (MUTUAL EXCLUSION) ---
  public isSukunacatAttacking(): boolean {
    if (!this.santiscat) return false;
    const sukunacat = this.santiscat.jujutsuSummons.find(s => s.id === 'sukunacat');
    if (!sukunacat || !sukunacat.active) return false;

    // Check if Sukunacat is currently executing an attack
    if (
      sukunacat.state === 'dash' ||
      sukunacat.state === 'cleave_slashes' ||
      sukunacat.state === 'domain_chant' ||
      sukunacat.state === 'domain_active'
    ) {
      return true;
    }
    // Check if Malevolent Shrine is active
    if (this.santiscat.shrine && this.santiscat.shrine.active) {
      return true;
    }
    // Check if Cleave / Dismantle slashes are still active
    if (sukunacat.slashes && sukunacat.slashes.length > 0) {
      return true;
    }
    return false;
  }

  public isGojocatAttacking(): boolean {
    if (!this.santiscat) return false;
    const gojocat = this.santiscat.jujutsuSummons.find(s => s.id === 'gojocat');
    if (!gojocat || !gojocat.active) return false;

    // Check if Gojocat is in an attack state
    if (
      gojocat.state === 'purple_charge' ||
      gojocat.state === 'purple_fire' ||
      gojocat.state === 'lapse_blue' ||
      gojocat.state === 'reversal_red'
    ) {
      return true;
    }
    // Check if any Gojo technique is active on the field (Blue suction, Red repulsion, or Purple projectile)
    const gt = this.santiscat.gojoTechniques;
    if (gt) {
      if (gt.blue && gt.blue.active) return true;
      if (gt.red && gt.red.active) return true;
      if (gt.purple && gt.purple.active) return true;
    }
    return false;
  }

  private updateJujutsuSummons(delta: number) {
    if (!this.santiscat) return;
    const summons = this.santiscat.jujutsuSummons;

    summons.forEach(sm => {
      if (!sm.active) return;
      if (sm.id === 'sukunacat') {
        this.updateSukunacat(sm, delta);
      } else if (sm.id === 'gojocat') {
        this.updateGojocat(sm, delta);
      }
    });
  }

  // --- SUKUNACAT AI ---
  private updateSukunacat(sm: JujutsuSummon, delta: number) {
    const p = this.player;
    sm.timer += delta;
    sm.facing = p.x < sm.x ? -1 : 1;

    // Hand punch progress decay & cooldown
    if (sm.cooldownTimer > 0) sm.cooldownTimer -= delta;

    // Independent slashes update loop (runs on EVERY frame!)
    this.updateSukunacatSlashes(sm, delta);

    if (sm.state === 'idle' || sm.state === 'follow') {
      // Smooth stalking movement towards player maintaining 180-260px distance
      const targetDist = 220;
      const dx = p.x - sm.x;
      const dy = p.y - sm.y;
      const dist = Math.hypot(dx, dy) || 1;

      if (dist > targetDist + 40) {
        sm.x += (dx / dist) * 4.8 * delta * 60;
        sm.y += (dy / dist) * 4.8 * delta * 60;
      } else if (dist < targetDist - 30) {
        sm.x -= (dx / dist) * 3.2 * delta * 60;
        sm.y -= (dy / dist) * 3.2 * delta * 60;
      }

      // Floating sine bob
      sm.y += Math.sin(this.stats.timeElapsed * 3.5) * 0.8;

      // Verificación de exclusión mutua: si Gojocat está lanzando un ataque, Sukunacat DEBE esperar a que termine
      const isGojoAttacking = this.isGojocatAttacking();
      if (isGojoAttacking) {
        // Pausa el cooldown para que no lance nada hasta que Gojocat haya terminado por completo
        if (sm.cooldownTimer < 0.6) {
          sm.cooldownTimer = 0.6;
        }
      } else if (sm.cooldownTimer <= 0) {
        const canDomain = !this.santiscat!.shrine.active && (sm.timer > 12.0 || Math.random() < 0.35);
        if (canDomain) {
          // Trigger Malevolent Shrine Chant!
          sm.state = 'domain_chant';
          sm.timer = 0;
          sm.chantText = 'Ryoiki Tenkai... Fukuma Mizushi!';
          soundManager.playDomainChant();
          this.screenShake = 18;
          this.damageNumbers.push({
            id: Math.random().toString(),
            text: '⛩️ "RYOIKI TENKAI... FUKUMA MIZUSHI" ⛩️',
            x: sm.x,
            y: sm.y - 70,
            vy: -1.2,
            color: '#dc2626',
            isBlackFlash: true,
            life: 2.5,
            maxLife: 2.5,
            scale: 1.5,
          });
        } else {
          // Alternate between Dash & Cleave slashes
          const pickDash = Math.random() < 0.5;
          if (pickDash) {
            sm.state = 'dash';
            sm.timer = 0;
            sm.dashTarget = { x: p.x, y: p.y };
            soundManager.playSukunaDash();
            this.spawnHitParticles(sm.x, sm.y, '#dc2626', 15);
          } else {
            sm.state = 'cleave_slashes';
            sm.timer = 0;
            this.triggerSukunacatCleave(sm);
          }
        }
      }
    } else if (sm.state === 'dash') {
      // High-speed rush in direction of player to deal physical damage
      if (sm.dashTarget) {
        const dx = sm.dashTarget.x - sm.x;
        const dy = sm.dashTarget.y - sm.y;
        const dist = Math.hypot(dx, dy) || 1;
        const dashSpeed = 19;

        sm.x += (dx / dist) * dashSpeed * delta * 60;
        sm.y += (dy / dist) * dashSpeed * delta * 60;

        // Red supersonic dash trail
        this.particles.push({
          x: sm.x + (Math.random() - 0.5) * 20,
          y: sm.y + (Math.random() - 0.5) * 20,
          vx: -(dx / dist) * 3,
          vy: -(dy / dist) * 3,
          size: 6,
          color: Math.random() > 0.5 ? '#dc2626' : '#991b1b',
          life: 0.3,
          maxLife: 0.3,
          alpha: 1,
          shape: 'spark',
        });

        // Collision check with player
        const pDist = Math.hypot(this.player.x - sm.x, this.player.y - sm.y);
        if (pDist < this.player.width * 0.45 + sm.width * 0.4) {
          soundManager.playSukunaSlash();
          this.takePlayerDamage(28, 'collision');
          this.screenShake = 16;
          this.spawnHitParticles(this.player.x, this.player.y, '#dc2626', 18);
          sm.state = 'idle';
          sm.cooldownTimer = 1.6;
        }

        if (dist < 40 || sm.timer >= 0.6) {
          sm.state = 'idle';
          sm.cooldownTimer = 1.6;
        }
      }
    } else if (sm.state === 'cleave_slashes') {
      if (sm.timer >= 0.75) {
        sm.state = 'idle';
        sm.cooldownTimer = 1.8;
      }
    } else if (sm.state === 'domain_chant') {
      // Chanting for 1.5 seconds, then Malevolent Shrine explodes into reality
      if (sm.timer >= 1.5) {
        sm.state = 'domain_active';
        sm.timer = 0;
        const shrine = this.santiscat!.shrine;
        shrine.active = true;
        shrine.chanting = false;
        shrine.timer = 0;
        shrine.shrineX = sm.x;
        shrine.shrineY = sm.y - 100;
        shrine.redIntensity = 0.1;
        shrine.cuts = [];
        shrine.damageTickTimer = 0;

        soundManager.playDomainExpansion();
        this.screenShake = 32;
        this.spawnHitParticles(sm.x, sm.y, '#ff003b', 50);
        this.spawnHitParticles(sm.x, sm.y, '#000000', 40);

        this.damageNumbers.push({
          id: Math.random().toString(),
          text: '⚡ ¡MALEVOLENT SHRINE ACTIVADO! MANTÉN [K] ⚡',
          x: this.player.x,
          y: this.player.y - 85,
          vy: -1.6,
          color: '#facc15',
          isBlackFlash: true,
          life: 3.0,
          maxLife: 3.0,
          scale: 1.5,
        });
      }
    } else if (sm.state === 'domain_active') {
      // Hover in center while Malevolent Shrine runs
      if (!this.santiscat!.shrine.active) {
        sm.state = 'idle';
        sm.cooldownTimer = 9.0;
        sm.chantText = undefined;
      }
    }
  }

  private triggerSukunacatCleave(sm: JujutsuSummon) {
    soundManager.playSukunaSlash();
    this.screenShake = 14;
    // Launch 3 sharp Cleave/Dismantle cutting fractures in arc towards player directly into sm.slashes!
    for (let i = 0; i < 3; i++) {
      const baseAng = Math.atan2(this.player.y - sm.y, this.player.x - sm.x);
      const ang = baseAng + (i - 1) * 0.35;
      const len = 350;
      const cx = this.player.x + (Math.random() - 0.5) * 120;
      const cy = this.player.y + (Math.random() - 0.5) * 120;

      sm.slashes.push({
        id: `cleave_${Date.now()}_${i}`,
        x1: cx - Math.cos(ang) * (len / 2),
        y1: cy - Math.sin(ang) * (len / 2),
        x2: cx + Math.cos(ang) * (len / 2),
        y2: cy + Math.sin(ang) * (len / 2),
        phase: 'telegraph',
        timer: 0,
        maxTimer: 0.85,
        width: 24,
        damage: 28,
        hasHit: false,
      });
    }
  }

  private updateSukunacatSlashes(sm: JujutsuSummon, delta: number) {
    if (!sm.slashes || sm.slashes.length === 0) return;

    sm.slashes.forEach(slash => {
      slash.timer += delta;
      if (slash.timer < 0.55) {
        slash.phase = 'telegraph';
      } else if (slash.timer < 0.85) {
        if (slash.phase === 'telegraph') {
          soundManager.playSukunaSlash();
          this.screenShake = 16;
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

          if (distToLine < slash.width + this.player.width * 0.4 && !slash.hasHit) {
            slash.hasHit = true;
            this.stats.deathReason = 'reality_tear';
            const safeDamage = Math.min(slash.damage, Math.max(1, this.player.hp - 10));
            this.takePlayerDamage(safeDamage, 'collision');
            this.spawnHitParticles(px, py, '#dc2626', 16);
            this.spawnHitParticles(px, py, '#000000', 8);
          }
        }
        slash.phase = 'slash';
      } else {
        slash.phase = 'fade';
      }
    });

    sm.slashes = sm.slashes.filter(s => s.timer < s.maxTimer + 0.3);
  }

  // --- MALEVOLENT SHRINE (TEMPLO DEL MAL) UPDATE ---
  // Thousands of cuts sweeping the entire map with blood-red effect.
  // Player MUST hold 'K' (or shield) to withstand until domain finishes.
  // Cuts CANNOT damage Santiscat, Gojocat, or Sukunacat (ONLY player).
  // Music switches to domain_expansion and reverts on domain finish.
  private updateMalevolentShrine(delta: number) {
    if (!this.santiscat) return;
    const shrine = this.santiscat.shrine;
    if (!shrine.active) return;

    shrine.timer += delta;
    shrine.redIntensity = Math.min(1.0, shrine.redIntensity + delta * 2.5);

    // Keep domain expansion music looping
    soundManager.playMusic('domain_expansion');

    // Continuous dramatic earthquake screen shake
    this.screenShake = Math.max(this.screenShake, 11);

    // Procedural relentless rain of thousands of cuts across the map
    const cutBatch = 8;
    const cam = this.camera;
    for (let i = 0; i < cutBatch; i++) {
      const rx = cam.x + Math.random() * cam.viewportWidth;
      const ry = cam.y + Math.random() * cam.viewportHeight;
      const angle = Math.random() * Math.PI;
      const len = 120 + Math.random() * 260;

      shrine.cuts.push({
        x1: rx - Math.cos(angle) * (len / 2),
        y1: ry - Math.sin(angle) * (len / 2),
        x2: rx + Math.cos(angle) * (len / 2),
        y2: ry + Math.sin(angle) * (len / 2),
        timer: 0,
        maxTimer: 0.16,
        alpha: 1.0,
      });
    }

    // Decay and prune cuts
    shrine.cuts.forEach(c => {
      c.timer += delta;
      c.alpha = Math.max(0, 1.0 - c.timer / c.maxTimer);
    });
    shrine.cuts = shrine.cuts.filter(c => c.timer < c.maxTimer);

    // Damage tick every 0.22 seconds (Relentless domain slashing!)
    shrine.damageTickTimer += delta;
    if (shrine.damageTickTimer >= 0.22) {
      shrine.damageTickTimer = 0;

      // Check if player is holding 'K' or holding shield button
      const p = this.player;
      const isShieldHeld = Boolean(p.holdingShield || this.keys['keyk'] || this.keys['shiftleft'] || this.keys['shiftright'] || this.keys['keyc']);
      const isDeflectingWithShield = p.shieldActive && isShieldHeld;

      if (isDeflectingWithShield) {
        // Player withstands the thousands of cuts using their shield!
        soundManager.playShieldDeflect();
        this.spawnHitParticles(p.x, p.y, '#34d399', 8);
        this.spawnHitParticles(p.x, p.y, '#facc15', 6);
      } else {
        // Severe cleave damage dealt to player!
        soundManager.playSukunaSlash();
        this.takePlayerDamage(24, 'collision');
        this.stats.deathReason = 'reality_tear';
        this.spawnHitParticles(p.x, p.y, '#dc2626', 16);
        this.spawnHitParticles(p.x, p.y, '#ffffff', 8);

        this.damageNumbers.push({
          id: Math.random().toString(),
          text: '⚔️ CORTE DEL TEMPLO (-24) ¡MANTÉN [K]!',
          x: p.x + (Math.random() - 0.5) * 50,
          y: p.y - 35,
          vy: -1.8,
          color: '#ef4444',
          isBlackFlash: false,
          life: 0.9,
          maxLife: 0.9,
          scale: 1.25,
        });
      }
    }

    // When domain completes (7.2s)
    if (shrine.timer >= shrine.maxDuration) {
      shrine.active = false;
      shrine.redIntensity = 0;
      shrine.cuts = [];
      // Revert music to official Santiscat battle theme!
      soundManager.playMusic('santiscat');
      this.screenShake = 20;
      this.spawnHitParticles(shrine.shrineX, shrine.shrineY, '#ffffff', 30);
    }
  }

  // --- GOJOCAT AI ---
  private updateGojocat(sm: JujutsuSummon, delta: number) {
    const p = this.player;
    sm.timer += delta;
    sm.facing = p.x < sm.x ? -1 : 1;

    if (sm.cooldownTimer > 0) sm.cooldownTimer -= delta;

    if (sm.state === 'idle' || sm.state === 'follow') {
      // Hover at distance with Infinity barrier shimmer
      const targetDist = 280;
      const dx = p.x - sm.x;
      const dy = p.y - sm.y;
      const dist = Math.hypot(dx, dy) || 1;

      if (dist > targetDist + 30) {
        sm.x += (dx / dist) * 4.2 * delta * 60;
        sm.y += (dy / dist) * 4.2 * delta * 60;
      } else if (dist < targetDist - 30) {
        sm.x -= (dx / dist) * 3.5 * delta * 60;
        sm.y -= (dy / dist) * 3.5 * delta * 60;
      }
      sm.y += Math.cos(this.stats.timeElapsed * 2.8) * 0.9;

      // Verificación de exclusión mutua: si Sukunacat está realizando un ataque (Dash, Cortes, o Templo del Mal),
      // Gojocat DEBE esperar a que termine por completo antes de poder lanzar su propio ataque!
      const isSukunaAttacking = this.isSukunacatAttacking();
      if (isSukunaAttacking) {
        // Pausa el cooldown para que no lance nada hasta que Sukunacat haya terminado por completo
        if (sm.cooldownTimer < 0.6) {
          sm.cooldownTimer = 0.6;
        }
      } else if (sm.cooldownTimer <= 0) {
        // Techniques rotation: Blue -> Red -> Hollow Purple
        const techRoll = Math.random();
        if (techRoll < 0.38) {
          this.triggerGojocatBlue(sm);
        } else if (techRoll < 0.72) {
          this.triggerGojocatRed(sm);
        } else {
          this.triggerGojocatPurple(sm);
        }
      }
    } else if (sm.state === 'purple_charge') {
      // Charging Hollow Purple: Red in left, Blue in right, converging
      const purple = this.santiscat!.gojoTechniques.purple;
      purple.fusionProgress = Math.min(1.0, sm.timer / 1.3);

      if (sm.timer >= 1.3) {
        // Fire giant Hollow Purple!
        sm.state = 'idle';
        sm.cooldownTimer = 3.2;
        purple.phase = 'fired';
        purple.timer = 0;
        purple.x = sm.x;
        purple.y = sm.y;

        const ang = Math.atan2(this.player.y - sm.y, this.player.x - sm.x);
        const speed = 10.5;
        purple.vx = Math.cos(ang) * speed;
        purple.vy = Math.sin(ang) * speed;
        purple.radius = 95; // Giant sphere!

        soundManager.playHollowPurple();
        this.screenShake = 30;
      }
    } else if (sm.state === 'lapse_blue' || sm.state === 'reversal_red') {
      if (sm.timer >= 1.5) {
        sm.state = 'idle';
        sm.cooldownTimer = 2.0;
      }
    }
  }

  // Gojo Technique 1: Azul (Rotación del Ritual - Singularity Suction)
  private triggerGojocatBlue(sm: JujutsuSummon) {
    sm.state = 'lapse_blue';
    sm.timer = 0;
    const blue = this.santiscat!.gojoTechniques.blue;
    blue.active = true;
    blue.timer = 0;
    blue.maxDuration = 4.0; // Fair duration (was 5.5s)

    // Spawn Blue with a fair offset (180px - 260px) away from player
    // so the player is not instantly centered inside the singularity
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = 190 + Math.random() * 70;
    blue.x = Math.max(350, Math.min(this.camera.worldWidth - 350, this.player.x + Math.cos(spawnAngle) * spawnDist));
    blue.y = Math.max(350, Math.min(this.camera.worldHeight - 350, this.player.y + Math.sin(spawnAngle) * spawnDist));
    blue.absorbedDebris = [];

    soundManager.playLapseBlue();
    this.screenShake = 16;
    this.damageNumbers.push({
      id: Math.random().toString(),
      text: '🌀 "AZUL: ROTACIÓN DEL RITUAL" 🌀 (¡CORRE O USA [K]!)',
      x: blue.x,
      y: blue.y - 45,
      vy: -1.3,
      color: '#38bdf8',
      isBlackFlash: true,
      life: 2.2,
      maxLife: 2.2,
      scale: 1.35,
    });
  }

  // Gojo Technique 2: Rojo (Reversión del Ritual - Explosive Repulsion)
  private triggerGojocatRed(sm: JujutsuSummon) {
    sm.state = 'reversal_red';
    sm.timer = 0;
    const red = this.santiscat!.gojoTechniques.red;
    red.active = true;
    red.timer = 0;
    red.x = sm.x + (sm.facing === 1 ? 50 : -50);
    red.y = sm.y;
    red.radius = 20;
    red.repelledDebris = [];

    soundManager.playReversalRed();
    this.screenShake = 22;
    this.damageNumbers.push({
      id: Math.random().toString(),
      text: '🔴 "ROJO: REVERSIÓN DEL RITUAL" 🔴',
      x: red.x,
      y: red.y - 45,
      vy: -1.4,
      color: '#ef4444',
      isBlackFlash: true,
      life: 2.0,
      maxLife: 2.0,
      scale: 1.35,
    });
  }

  // Gojo Technique 3: Vacío Púrpura (Kyoshiki Murasaki - Giant One-Shot Spacetime Warping Sphere)
  private triggerGojocatPurple(sm: JujutsuSummon) {
    sm.state = 'purple_charge';
    sm.timer = 0;
    const purple = this.santiscat!.gojoTechniques.purple;
    purple.active = true;
    purple.phase = 'charging';
    purple.timer = 0;
    purple.x = sm.x;
    purple.y = sm.y;
    purple.fusionProgress = 0;
    purple.trail = [];

    soundManager.playMindControl();
    this.damageNumbers.push({
      id: Math.random().toString(),
      text: '🟣 "TÉCNICA IMAGINARIA: VACÍO PÚRPURA" 🟣',
      x: sm.x,
      y: sm.y - 70,
      vy: -1.5,
      color: '#c084fc',
      isBlackFlash: true,
      life: 2.5,
      maxLife: 2.5,
      scale: 1.5,
    });
  }

  // --- GOJO TECHNIQUES PHYSICS & COLLISION ---
  private updateGojoTechniques(delta: number) {
    if (!this.santiscat) return;
    const gt = this.santiscat.gojoTechniques;

    // 1. Azul (Lapse: Blue) - Everything attracted to singularity is destroyed
    if (gt.blue.active) {
      gt.blue.timer += delta;
      const b = gt.blue;

      // Gravitational attraction on player
      const dx = b.x - this.player.x;
      const dy = b.y - this.player.y;
      const pDist = Math.hypot(dx, dy) || 1;

      if (pDist < b.suctionRadius) {
        // Fair, escapable gravitational suction:
        // Base pull is scaled so player's movement speed (5.5 - 6.5) can actively overcome it and escape!
        const distRatio = Math.max(0, 1 - pDist / b.suctionRadius);
        let pullStr = Math.pow(distRatio, 1.35) * 2.8;

        // Active movement detection: if player is steering/moving away, give escape resistance!
        const isActivelyMoving = Boolean(
          this.keys['keyw'] || this.keys['arrowup'] ||
          this.keys['keys'] || this.keys['arrowdown'] ||
          this.keys['keya'] || this.keys['arrowleft'] ||
          this.keys['keyd'] || this.keys['arrowright'] ||
          Math.hypot(this.player.vx, this.player.vy) > 0.8
        );

        if (isActivelyMoving) {
          // Running away significantly reduces pull so player can cleanly escape
          pullStr *= 0.65;
        }

        // Shield [K] stability: holding shield anchors the player against gravity suction!
        const isShielding = Boolean(this.player.shieldActive || this.player.holdingShield || this.keys['keyk']);
        if (isShielding) {
          pullStr *= 0.3;
        }

        this.player.x += (dx / pDist) * pullStr;
        this.player.y += (dy / pDist) * pullStr;

        // If in core contact range:
        if (pDist < b.radius + 15) {
          if (isShielding) {
            soundManager.playShieldDeflect();
            this.spawnHitParticles(this.player.x, this.player.y, '#38bdf8', 6);
          } else {
            // Pulse damage with outward bounce so player is NEVER stuck inside core!
            this.takePlayerDamage(16, 'collision');
            this.spawnHitParticles(this.player.x, this.player.y, '#38bdf8', 12);
            soundManager.playPunch();

            const pushAngle = Math.atan2(this.player.y - b.y, this.player.x - b.x);
            this.player.x += Math.cos(pushAngle) * 45;
            this.player.y += Math.sin(pushAngle) * 45;
          }
        }
      }

      // Gravitational attraction & destruction of obstacles/debris
      this.obstacles.forEach(obs => {
        const ox = obs.x + obs.width / 2;
        const oy = obs.y + obs.height / 2;
        const odx = b.x - ox;
        const ody = b.y - oy;
        const oDist = Math.hypot(odx, ody) || 1;

        if (oDist < b.suctionRadius) {
          const oPull = (1 - oDist / b.suctionRadius) * 8.5;
          obs.x += (odx / oDist) * oPull;
          obs.y += (ody / oDist) * oPull;

          // Destroyed if pulled into singularity
          if (oDist < b.radius + 20) {
            obs.hp = -999;
            this.spawnHitParticles(ox, oy, '#38bdf8', 16);
            soundManager.playPunch();

            // Spawn flying suction debris that player can dodge or shield
            for (let i = 0; i < 2; i++) {
              const a = Math.random() * Math.PI * 2;
              const spd = 7 + Math.random() * 5;
              b.absorbedDebris.push({
                id: Math.random().toString(),
                x: b.x,
                y: b.y,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                radius: 8 + Math.random() * 6,
                color: obs.color || '#38bdf8',
                angle: Math.random() * Math.PI,
                rotationSpeed: 4,
                life: 1.4,
              });
            }
          }
        }
      });
      this.obstacles = this.obstacles.filter(o => o.hp > 0);

      // Update flying suction debris & check collision with player
      b.absorbedDebris.forEach(deb => {
        deb.life -= delta;
        deb.x += deb.vx * delta * 60;
        deb.y += deb.vy * delta * 60;
        const dist = Math.hypot(this.player.x - deb.x, this.player.y - deb.y);
        if (dist < this.player.width * 0.45 + deb.radius) {
          if (this.player.shieldActive || this.player.holdingShield || this.keys['keyk']) {
            soundManager.playShieldDeflect();
            this.spawnHitParticles(deb.x, deb.y, '#38bdf8', 6);
          } else {
            this.takePlayerDamage(16, 'collision');
          }
          deb.life = 0;
        }
      });
      b.absorbedDebris = b.absorbedDebris.filter(d => d.life > 0);

      if (b.timer >= b.maxDuration) {
        b.active = false;
        b.absorbedDebris = [];
      }
    }

    // 2. Rojo (Reversal: Red) - Everything repelled with extreme force & destroyed
    if (gt.red.active) {
      gt.red.timer += delta;
      const r = gt.red;
      r.radius = Math.min(r.maxRadius, r.radius + delta * 240);

      // Extreme repulsion force pushing player
      const dx = this.player.x - r.x;
      const dy = this.player.y - r.y;
      const pDist = Math.hypot(dx, dy) || 1;

      if (pDist < r.radius + 30) {
        const repelForce = 14;
        this.player.x += (dx / pDist) * repelForce;
        this.player.y += (dy / pDist) * repelForce;
        this.takePlayerDamage(25 * delta * 5, 'collision');
        this.spawnHitParticles(this.player.x, this.player.y, '#ef4444', 4);
      }

      // Repelling and shattering obstacles into flying debris
      this.obstacles.forEach(obs => {
        const ox = obs.x + obs.width / 2;
        const oy = obs.y + obs.height / 2;
        const odx = ox - r.x;
        const ody = oy - r.y;
        const oDist = Math.hypot(odx, ody) || 1;

        if (oDist < r.radius) {
          obs.hp = -999;
          this.spawnHitParticles(ox, oy, '#ef4444', 16);
          // Spawn flying blast debris
          for (let i = 0; i < 3; i++) {
            const a = Math.atan2(ody, odx) + (Math.random() - 0.5) * 0.8;
            const spd = 11 + Math.random() * 6;
            r.repelledDebris.push({
              id: Math.random().toString(),
              x: ox,
              y: oy,
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd,
              radius: 9 + Math.random() * 6,
              color: '#ef4444',
              angle: Math.random() * Math.PI,
              rotationSpeed: 6,
              life: 1.8,
            });
          }
        }
      });
      this.obstacles = this.obstacles.filter(o => o.hp > 0);

      // Update repelled debris
      r.repelledDebris.forEach(deb => {
        deb.life -= delta;
        deb.x += deb.vx * delta * 60;
        deb.y += deb.vy * delta * 60;
        const dist = Math.hypot(this.player.x - deb.x, this.player.y - deb.y);
        if (dist < this.player.width * 0.45 + deb.radius) {
          this.takePlayerDamage(26, 'collision');
          deb.life = 0;
        }
      });
      r.repelledDebris = r.repelledDebris.filter(d => d.life > 0);

      if (r.timer >= r.maxDuration) {
        r.active = false;
        r.repelledDebris = [];
      }
    }

    // 3. Vacío Púrpura (Hollow Technique: Purple) - Giant One-Shot Projectile with Spacetime Distortion
    if (gt.purple.active && gt.purple.phase === 'fired') {
      const pur = gt.purple;
      pur.timer += delta;
      pur.x += pur.vx * delta * 60;
      pur.y += pur.vy * delta * 60;

      // Particle trail
      pur.trail.unshift({ x: pur.x, y: pur.y, alpha: 1.0, size: pur.radius });
      if (pur.trail.length > 10) pur.trail.pop();

      // Screen tremor along trajectory
      this.screenShake = Math.max(this.screenShake, 14);

      // Vaporize all obstacles in path
      this.obstacles.forEach(obs => {
        const ox = obs.x + obs.width / 2;
        const oy = obs.y + obs.height / 2;
        if (Math.hypot(pur.x - ox, pur.y - oy) < pur.radius + obs.width / 2) {
          obs.hp = -999;
          this.spawnHitParticles(ox, oy, '#c084fc', 20);
          this.spawnHitParticles(ox, oy, '#38bdf8', 15);
        }
      });
      this.obstacles = this.obstacles.filter(o => o.hp > 0);

      // Collision check with player: ONE-SHOT KILL!
      const pDist = Math.hypot(this.player.x - pur.x, this.player.y - pur.y);
      if (pDist < this.player.width * 0.45 + pur.radius * 0.85) {
        if (!this.godMode) {
          soundManager.playHollowPurple();
          this.screenShake = 36;
          this.stats.deathReason = 'reality_tear';
          this.takePlayerDamage(99999, 'collision');
          pur.active = false;
          pur.phase = 'exploded';
          return;
        }
      }

      if (pur.timer >= pur.maxDuration) {
        pur.active = false;
        pur.phase = 'exploded';
      }
    }
  }

  // --- DAMAGE SUMMONS ---
  public applyDamageToSummon(sm: JujutsuSummon, baseDmg: number, attackType: AttackType, hitX: number, hitY: number) {
    const questMult = this.getDamageMultiplier('santiscat', attackType);
    const modifiedBaseDmg = Math.round(baseDmg * questMult);
    const { damage, isBlackFlash } = this.rollBlackFlash(modifiedBaseDmg, hitX, hitY);
    sm.hp = Math.max(0, sm.hp - damage);
    this.stats.totalAttacksLanded++;
    this.stats.score += damage * 2;
    this.progressQuest('jujutsu_cleanser', damage);

    const isEmpowered = questMult > 1.05;
    this.damageNumbers.push({
      id: Math.random().toString(),
      text: isBlackFlash ? `💥 BLACK FLASH! -${damage}` : (isEmpowered ? `-${damage} ⚡` : `-${damage}`),
      x: hitX,
      y: hitY - 14,
      vy: -1.6,
      color: sm.id === 'sukunacat' ? '#f43f5e' : '#38bdf8',
      isBlackFlash,
      life: 1.0,
      maxLife: 1.0,
      scale: isBlackFlash ? 1.4 : 1.1,
    });

    this.spawnHitParticles(hitX, hitY, sm.id === 'sukunacat' ? '#dc2626' : '#38bdf8', 12);

    if (sm.hp <= 0) {
      soundManager.playExplosion();
      this.screenShake = 18;
      this.spawnRubble(sm.x, sm.y, sm.id === 'sukunacat' ? '#7f1d1d' : '#0369a1', 25);
      this.progressQuest('jujutsu_cleanser', 500);
      sm.active = false;

      // Resurrect / re-summon after 16 seconds
      setTimeout(() => {
        if (this.santiscat && this.stage === 'santiscat_boss') {
          sm.active = true;
          sm.maxHp = 12000;
          sm.hp = sm.maxHp;
          sm.state = 'idle';
          sm.cooldownTimer = 1.2;
        }
      }, 16000);
    }
  }

  public testSummonJujutsuCats() {
    if (this.stage !== 'santiscat_boss') {
      this.startStage('santiscat_boss');
    }
    if (this.santiscat) {
      this.santiscat.jujutsuSummons.forEach(sm => {
        sm.maxHp = 12000;
        sm.hp = sm.maxHp;
        sm.cooldownTimer = sm.id === 'sukunacat' ? 0.8 : 3.2;
      });
      this.triggerSantiscatAttack('summon_jujutsu_cats');
    }
  }
}
