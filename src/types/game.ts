export type GameStage =
  | 'start'
  | 'city'
  | 'transition'
  | 'space'
  | 'boss_intro'
  | 'boss'
  | 'victory'
  | 'gameover'
  | 'cinematic_earth_destruction'
  | 'cinematic_santiscat_defeat'
  | 'distorted'
  | 'rhythm_summon'
  | 'santiscat_boss'
  | 'santiscat_boss_wormhole'
  | 'santiscat_boss_universe'
  | 'cosmic_escape';

export type CharacterSkinId =
  | 'catvalen'
  | 'gata_gris'
  | 'gato_negro_blanco'
  | 'gato_blanco_manchas'
  | 'gata_azul_manchas'
  | 'perro_rubio'
  | 'perro_marron';

export type AttackType =
  | 'punch'
  | 'fireball'
  | 'lightning'
  | 'power_burst'
  | 'green_beam'
  | 'mind_control'
  | 'shield_break'
  | 'light_laser'
  | 'magic_orb'
  | 'energy_anvil'
  | 'energy_blade'
  | 'time_stop'
  | 'teleport';

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  shieldActive: boolean;
  shieldTimer: number; // seconds remaining
  shieldMaxDuration: number;
  shieldCooldown: number; // seconds remaining
  shieldMaxCooldown: number;
  shieldColor?: string;
  holdingShield?: boolean;
  // Floating circular paws
  leftHand: { x: number; y: number; punchProgress: number };
  rightHand: { x: number; y: number; punchProgress: number };
  // Base Cooldowns
  punchCooldown: number;
  punchMaxCooldown: number;
  fireballCooldown: number;
  fireballMaxCooldown: number;
  lightningCooldown: number;
  lightningMaxCooldown: number;
  powerBurstCooldown: number;
  powerBurstMaxCooldown: number;
  // Heal ability (Press F)
  healsRemaining: number;
  maxHeals: number;
  healCooldown: number;
  isInvulnerable: boolean;
  invulnerableTimer: number;
  facing: 1 | -1;
  eyeState: 'normal' | 'squint' | 'blink' | 'fierce' | 'hurt';
  animationTime: number;

  // --- Active Character Skin ---
  skin: CharacterSkinId;

  // --- Special Abilities for Skins ---
  special1Cooldown: number;
  special1MaxCooldown: number;
  special2Cooldown: number;
  special2MaxCooldown: number;

  // Gata Gris: Green Ray (4s charge, immobile during charge)
  greenBeamCharging: boolean;
  greenBeamChargeTimer: number; // 0 to 4.0s
  greenBeamChargeMax: number;
  greenBeamFiring: boolean;
  greenBeamFiringTimer: number;

  // Gato Negro con Blanco: Mind Control & Shield Break
  mindControlActive: boolean;
  mindControlTimer: number;

  // Perro Marrón: Time Stop (za warudo) & Teleport
  timeStopActive: boolean;
  timeStopTimer: number;
  timeStopMaxDuration: number;

  // Gata Azul: Passive regen accumulator
  healRegenAccumulator: number;
}

export interface Projectile {
  id: string;
  type:
    | 'player_fireball'
    | 'player_lightning'
    | 'player_burst'
    | 'player_green_beam'
    | 'player_light_laser'
    | 'player_magic_orb'
    | 'player_energy_anvil'
    | 'player_energy_blade'
    | 'boss_meteor'
    | 'boss_energy'
    | 'boss_drone_laser'
    | 'boss_pulse_laser'
    | 'santiscat_sun_shot'
    | 'santiscat_oneshot_fireball'
    | 'santiscat_debris';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  duration: number;
  maxDuration: number;
  color: string;
  glowColor: string;
  trail: { x: number; y: number; alpha: number }[];
  isBlackFlash?: boolean;
  width?: number;
  height?: number;
  scale?: number;
  targetId?: string;
  targetY?: number;
}

export interface Obstacle {
  id: string;
  type: 'building' | 'meteorite' | 'asteroid' | 'glitch_shard' | 'corrupted_meteor';
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  vx: number;
  vy: number;
  color: string;
  floors?: number;
  windows?: boolean[][];
  antenna?: boolean;
  rotation?: number;
  rotationSpeed?: number;
  rubbleCount?: number;
  isSplit?: boolean;
}

export type BossAttack =
  | 'idle'
  | 'meteor_storm'
  | 'laser_warning'
  | 'laser_fire'
  | 'energy_shield'
  | 'gamma_ray_charge'
  | 'gamma_ray_burst'
  | 'drone_spawn'
  | 'gravity_pull';

export interface BossDrone {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number; // 300 HP
  vx: number;
  vy: number;
  targetY: number;
  pattern: 'sweep' | 'pulse' | 'tracker';
  shootTimer: number;
  shootCooldown: number;
  angle: number;
  size: number;
}

export interface Boss {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  shieldActive: boolean;
  shieldTimer: number;
  currentAttack: BossAttack;
  attackTimer: number;
  attackCooldown: number;
  // Laser attack details
  laserY: number;
  laserHeight: number;
  laserAngle: number;
  laserWarningDuration: number; // 1.5 seconds
  laserFireDuration: number;
  // Gamma ray burst details (uncancelable final attack)
  gammaChargeProgress: number; // 0 to 1
  gammaRays: { angle: number; width: number; speed: number; safeAngleStart: number; safeAngleEnd: number }[];
  gammaBurstTimer: number;
  eyeGlowIntensity: number;
  floatOffset: number;
  introTimer: number;
  isBlackFlashing?: boolean;
  // Mind control & puppet self-punch
  mindControlTimer?: number;
  mindControlSelfPunchCount?: number;
  shieldDisabledTimer?: number;
  // Melee floating fists & punches
  leftHand: { x: number; y: number; punchProgress: number };
  rightHand: { x: number; y: number; punchProgress: number };
  punchCooldown: number;
  // Gravity pull grapple
  pullTimer?: number;
  pullHandExtended?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  alpha: number;
  shape: 'circle' | 'square' | 'spark' | 'smoke' | 'star';
}

export interface BlackFlashStrike {
  id: string;
  x: number;
  y: number;
  timer: number;
  maxTimer: number;
  lightningBranches: { x1: number; y1: number; x2: number; y2: number }[];
  damage: number;
  isBoss?: boolean;
}

export interface DamageNumber {
  id: string;
  text: string;
  x: number;
  y: number;
  vy: number;
  color: string;
  isBlackFlash: boolean;
  life: number;
  maxLife: number;
  scale: number;
}

export interface GameStats {
  score: number;
  buildingsDestroyed: number;
  asteroidsDestroyed: number;
  nanovalenDamageDealt: number;
  santiscatDamageDealt?: number;
  blackFlashesCount: number;
  bossBlackFlashesCount: number;
  totalAttacksLanded: number;
  timeElapsed: number; // seconds
  deathReason?: 'standard' | 'gamma_ray' | 'santiscat_oneshot' | 'black_hole' | 'reality_tear' | 'cosmic_collapse';
  nanovalenWins?: number;
  santiscatWins?: number;
  unlockedSkinNotice?: string;
}

export interface CinematicState {
  timer: number;
  maxDuration: number;
  phase: 'incoming_burst' | 'impact_earth' | 'continents_melt' | 'shattering_explosion' | 'extinction';
  earthHealth: number; // 1.0 to 0.0
  flashAlpha: number;
}

export type SantiscatDefeatPhase =
  | 'shining_souls_release'
  | 'shield_warning'
  | 'shader_implosion'
  | 'giant_explosion'
  | 'fade_to_victory';

export interface SantiscatDefeatCinematicState {
  active: boolean;
  timer: number;
  maxDuration: number;
  phase: SantiscatDefeatPhase;
  lightIntensity: number; // 0 to 1
  implosionProgress: number; // 0 to 1
  explosionRadius: number;
  flashAlpha: number;
  santiscatX: number;
  santiscatY: number;
  shieldActivatedInTime: boolean;
  warningSoundPlayed?: boolean;
  implosionSoundPlayed?: boolean;
  explosionSoundPlayed?: boolean;
  souls: {
    id: string;
    name: string;
    color: string;
    glowColor: string;
    angle: number;
    distance: number;
    speed: number;
    scale: number;
    alpha: number;
  }[];
}

export interface Camera {
  x: number;
  y: number;
  viewportWidth: number;
  viewportHeight: number;
  worldWidth: number;
  worldHeight: number;
}

export interface RealityGlitch {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'fault_line' | 'chromatic_vortex' | 'quantum_tear';
  pulseTimer: number;
  damage: number;
  angle: number;
}

export interface BlackHoleState {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number; // event horizon
  phase: 'sun_charging' | 'compressing' | 'black_hole_active' | 'collapsing_explosion';
  sunShotsFired: number;
  sunShotTimer: number;
  timer: number;
  maxDuration: number;
  absorbedDebris: { id: string; angle: number; dist: number; speed: number; radius: number; color: string }[];
  gravityRadius: number;
}

export interface RealitySlash {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  phase: 'telegraph' | 'slash' | 'fade';
  timer: number;
  maxTimer: number;
  width: number;
  damage: number;
  hasHit?: boolean;
}

export interface RhythmBeat {
  id: string;
  targetTime: number; // in seconds relative to minigame start
  hit: boolean;
  missed: boolean;
  rating?: 'perfect' | 'great' | 'miss';
}

export interface RhythmGameState {
  active: boolean;
  timer: number;
  duration: number; // seconds (e.g. 11s)
  bpm: number; // e.g. 130
  beats: RhythmBeat[];
  score: number;
  combo: number;
  maxCombo: number;
  requiredHits: number;
  totalHits: number;
  completed: boolean;
  failed: boolean;
  altarX: number;
  altarY: number;
}

export type SantiscatAttack =
  | 'idle'
  | 'sun_burst'
  | 'compress_black_hole'
  | 'black_hole_chase'
  | 'oneshot_fireball'
  | 'reality_slashes'
  | 'dimensional_warp'
  | 'summon_jujutsu_cats'
  | 'absorbing_souls'
  | 'wormhole_flight'
  | 'rainbow_blast'
  | 'spiral_galaxy'
  | 'giant_stars'
  | 'supernova_burst'
  | 'omega_save_load';

export interface MalevolentShrineCut {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  timer: number;
  maxTimer: number;
  alpha: number;
}

export interface MalevolentShrineState {
  active: boolean;
  chanting: boolean;
  chantTimer: number; // 0 to 1.6s
  timer: number;
  maxDuration: number; // 7.0s
  shrineX: number;
  shrineY: number;
  redIntensity: number; // 0 to 1
  cuts: MalevolentShrineCut[];
  damageTickTimer: number;
}

export interface GojoDebris {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  angle: number;
  rotationSpeed: number;
  life: number;
}

export interface GojoTechniqueState {
  blue: {
    active: boolean;
    x: number;
    y: number;
    radius: number;
    suctionRadius: number;
    timer: number;
    maxDuration: number;
    absorbedDebris: GojoDebris[];
  };
  red: {
    active: boolean;
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    timer: number;
    maxDuration: number;
    repelledDebris: GojoDebris[];
  };
  purple: {
    active: boolean;
    phase: 'charging' | 'fired' | 'exploded';
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    timer: number;
    maxDuration: number;
    blueOrb: { x: number; y: number };
    redOrb: { x: number; y: number };
    fusionProgress: number; // 0 to 1
    distortionRadius: number;
    trail: { x: number; y: number; alpha: number; size: number }[];
  };
}

export interface JujutsuSummon {
  id: 'sukunacat' | 'gojocat';
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  active: boolean;
  state:
    | 'spawning'
    | 'idle'
    | 'follow'
    | 'dash'
    | 'cleave_slashes'
    | 'domain_chant'
    | 'domain_active'
    | 'lapse_blue'
    | 'reversal_red'
    | 'purple_charge'
    | 'purple_fire'
    | 'cooldown';
  timer: number;
  cooldownTimer: number;
  chantText?: string;
  dashTarget?: { x: number; y: number };
  slashes: RealitySlash[];
}

export interface HumanSoul {
  id: string;
  name: string;
  trait: string;
  image: string;
  color: string;
  glowColor: string;
  angle: number;
  distance: number;
  targetDistance: number;
  scale: number;
  alpha: number;
  absorbed: boolean;
}

export interface OmegaSaveFile {
  active: boolean;
  hasSave: boolean;
  stateText?: string;
  textTimer: number;
  savedPlayerX: number;
  savedPlayerY: number;
  savedPlayerHp: number;
  savedAttack: SantiscatAttack;
  loadTimer: number;
}

export interface RefusedToDieState {
  active: boolean;
  phase: 'idle' | 'heart_shattering' | 'heart_mending' | 'resurrected';
  timer: number;
  heartX: number;
  heartY: number;
  crackProgress: number;
  alpha: number;
}

export interface SantiscatBoss {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number; // 15000 HP in Phase 1, 99999 HP in Phase 2 & 2.5
  shieldActive: boolean;
  shieldTimer: number;
  currentAttack: SantiscatAttack;
  attackTimer: number;
  attackCooldown: number;
  floatOffset: number;
  blackHole: BlackHoleState;
  slashes: RealitySlash[];
  leftHand: { x: number; y: number; progress: number };
  rightHand: { x: number; y: number; progress: number };
  eyeState: 'happy' | 'menacing' | 'glowing';
  facing: 1 | -1;
  summonExplosionTimer?: number;
  jujutsuSummons: JujutsuSummon[];
  shrine: MalevolentShrineState;
  gojoTechniques: GojoTechniqueState;
  // --- FASE 2 & FASE 2.5 ADDITIONS ---
  bossPhase: 1 | 2 | 2.5;
  souls: HumanSoul[];
  soulAbsorbTimer: number;
  portalAngle: number;
  portalScale: number;
  wormholeProgress: number; // 0 to 100%
  wormholeTimer: number;
  rainbowBlast: {
    active: boolean;
    timer: number;
    chargeDuration: number;
    fireDuration: number;
    beamWidth: number;
    safeSide: 'top' | 'bottom' | 'center';
    safeY: number;
  };
  galaxies: {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    rotation: number;
    rotSpeed: number;
    color: string;
    life: number;
    maxLife: number;
  }[];
  giantStars: {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    explosionTimer: number;
    exploded: boolean;
    shockwaveRadius?: number;
  }[];
  supernovas: {
    id: string;
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    color: string;
    life: number;
    maxLife: number;
  }[];
  omegaSave: OmegaSaveFile;
  refusedToDie: RefusedToDieState;
}

// =========================================================================
// COSMIC ESCAPE SEQUENCE (AFTER SANTISCAT DEFEAT)
// =========================================================================

export interface CollapsingPlanet {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  crustColor: string;
  magmaColor: string;
  crackProgress: number; // 0 to 1
  collapseTimer: number;
  exploded: boolean;
  debrisCount: number;
  rotation: number;
  rotationSpeed: number;
}

export interface ExplodingStar {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  coreColor: string;
  phase: 'pulsing' | 'imploding' | 'supernova_blast';
  timer: number;
  cycleTimer: number;
  shockwaveRadius: number;
  maxShockwaveRadius: number;
  shockwaveActive: boolean;
}

export interface RealityFissure {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  pulseTimer: number;
  color: string;
  glowColor: string;
  damage: number;
}

export interface CosmicDebris {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  rotation: number;
  rotSpeed: number;
}

export interface CosmicEscapeState {
  active: boolean;
  timer: number; // 60.0s countdown
  maxTimer: number; // 60.0s
  worldWidth: number; // 13,500px
  worldHeight: number; // 2,200px
  wormholeX: number; // 12,800px
  wormholeY: number; // 1,100px
  wormholeRadius: number; // 220px
  wormholeAngle: number;
  planets: CollapsingPlanet[];
  explodingStars: ExplodingStar[];
  fissures: RealityFissure[];
  debris: CosmicDebris[];
  escapeDistanceTotal: number;
  escaped: boolean;
  escapeWarpTimer: number;
  warningSoundPlayed?: boolean;
}



