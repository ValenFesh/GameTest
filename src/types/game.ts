export type GameStage = 'start' | 'city' | 'transition' | 'space' | 'boss_intro' | 'boss' | 'victory' | 'gameover' | 'cinematic_earth_destruction';

export type AttackType = 'punch' | 'fireball' | 'lightning' | 'power_burst';

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
  // Floating circular paws
  leftHand: { x: number; y: number; punchProgress: number };
  rightHand: { x: number; y: number; punchProgress: number };
  // Cooldowns with their maximum base times
  punchCooldown: number;
  punchMaxCooldown: number;
  fireballCooldown: number;
  fireballMaxCooldown: number;
  lightningCooldown: number;
  lightningMaxCooldown: number;
  powerBurstCooldown: number;
  powerBurstMaxCooldown: number;
  // Heal ability (Press F, max 10 uses)
  healsRemaining: number;
  maxHeals: number;
  healCooldown: number;
  isInvulnerable: boolean;
  invulnerableTimer: number;
  facing: 1 | -1;
  eyeState: 'normal' | 'squint' | 'blink' | 'fierce' | 'hurt';
  animationTime: number;
}

export interface Projectile {
  id: string;
  type: 'player_fireball' | 'player_lightning' | 'player_burst' | 'boss_meteor' | 'boss_energy';
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
}

export interface Obstacle {
  id: string;
  type: 'building' | 'meteorite' | 'asteroid';
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

export type BossAttack = 'idle' | 'meteor_storm' | 'laser_warning' | 'laser_fire' | 'energy_shield' | 'gamma_ray_charge' | 'gamma_ray_burst';

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
  blackFlashesCount: number;
  bossBlackFlashesCount: number;
  totalAttacksLanded: number;
  timeElapsed: number; // seconds
  deathReason?: 'standard' | 'gamma_ray';
}

export interface CinematicState {
  timer: number;
  maxDuration: number;
  phase: 'incoming_burst' | 'impact_earth' | 'continents_melt' | 'shattering_explosion' | 'extinction';
  earthHealth: number; // 1.0 to 0.0
  flashAlpha: number;
}

