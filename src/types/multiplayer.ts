import { CharacterSkinId } from '../game/skins';

export type DeviceType = 'pc' | 'mobile';

export interface MultiplayerPlayer {
  id: string;
  name: string;
  skin: CharacterSkinId;
  isHost: boolean;
  isReady: boolean;
  isAlive: boolean;
  isSpectating: boolean;
  spectatingTargetId?: string;
  device: DeviceType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  hp: number;
  maxHp: number;
  shieldActive: boolean;
  shieldColor: string;
  eyeState: string;
  animationTime: number;
  holdingShield: boolean;
  greenBeamCharging?: boolean;
  greenBeamFiring?: boolean;
  timeStopActive?: boolean;
}

export interface RoomBossState {
  hp: number;
  maxHp: number;
  shieldActive: boolean;
  shieldTimer: number;
  currentAttack: string;
  attackTimer: number;
  x: number;
  y: number;
}

export interface RoomSantiscatState {
  hp: number;
  maxHp: number;
  bossPhase: number;
  currentAttack: string;
  x: number;
  y: number;
  wormholeProgress: number;
  blackHoleActive: boolean;
  blackHoleX: number;
  blackHoleY: number;
  shrineActive: boolean;
}

export interface RoomState {
  code: string;
  name: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'gameover' | 'victory';
  stage: string;
  stageProgress: number;
  players: Record<string, MultiplayerPlayer>;
  boss: RoomBossState | null;
  santiscat: RoomSantiscatState | null;
  lastUpdate: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface RoomSummary {
  code: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: 'lobby' | 'playing' | 'gameover' | 'victory';
  hostName: string;
}

export type WSClientMessage =
  | { type: 'c2s_create_room'; roomName?: string; playerName: string; skin: CharacterSkinId; device: DeviceType }
  | { type: 'c2s_join_room'; roomCode: string; playerName: string; skin: CharacterSkinId; device: DeviceType }
  | { type: 'c2s_leave_room' }
  | { type: 'c2s_get_rooms' }
  | { type: 'c2s_set_ready'; isReady: boolean }
  | { type: 'c2s_set_skin'; skin: CharacterSkinId }
  | { type: 'c2s_start_game' }
  | {
      type: 'c2s_player_update';
      x: number;
      y: number;
      vx: number;
      vy: number;
      facing: number;
      hp: number;
      maxHp: number;
      shieldActive: boolean;
      shieldColor: string;
      eyeState: string;
      holdingShield: boolean;
      greenBeamCharging?: boolean;
      greenBeamFiring?: boolean;
      timeStopActive?: boolean;
      name?: string;
      skin?: CharacterSkinId;
      device?: DeviceType;
      isAlive?: boolean;
    }
  | {
      type: 'c2s_player_attack';
      attackType: string;
      x: number;
      y: number;
      vx?: number;
      vy?: number;
      angle?: number;
      facing?: number;
    }
  | {
      type: 'c2s_boss_hit';
      damage: number;
      attackType: string;
      isBlackFlash: boolean;
      hitX: number;
      hitY: number;
      target: 'nanovalen' | 'santiscat' | 'summon';
    }
  | {
      type: 'c2s_boss_sync';
      boss?: Partial<RoomBossState>;
      santiscat?: Partial<RoomSantiscatState>;
    }
  | {
      type: 'c2s_obstacle_hit';
      obstacleId: string;
      damage: number;
      hitX: number;
      hitY: number;
      isDestroyed: boolean;
      obstacleType: 'building' | 'asteroid' | 'meteorite';
      stageProgress: number;
    }
  | {
      type: 'c2s_boss_attack';
      bossType: 'nanovalen' | 'santiscat';
      attackType: string;
      params: any;
    }
  | {
      type: 'c2s_summon_santiscat';
      summonerId: string;
      summonerName: string;
    }
  | { type: 'c2s_stage_change'; stage: string; stageProgress?: number }
  | { type: 'c2s_player_died' }
  | { type: 'c2s_spectate'; targetId: string }
  | { type: 'c2s_chat'; text: string }
  | { type: 'c2s_restart' };

export type WSServerMessage =
  | { type: 's2c_room_created'; roomCode: string; playerId: string; room: RoomState }
  | { type: 's2c_room_joined'; roomCode: string; playerId: string; room: RoomState }
  | { type: 's2c_room_update'; room: RoomState }
  | { type: 's2c_room_list'; rooms: RoomSummary[] }
  | { type: 's2c_game_started'; stage: string; room: RoomState }
  | { type: 's2c_player_updated'; playerId: string; player: Partial<MultiplayerPlayer> }
  | {
      type: 's2c_player_attacked';
      playerId: string;
      attackType: string;
      x: number;
      y: number;
      vx?: number;
      vy?: number;
      angle?: number;
      facing?: number;
      skin: CharacterSkinId;
    }
  | {
      type: 's2c_boss_hit_broadcast';
      playerId: string;
      damage: number;
      remainingHp: number;
      attackType: string;
      isBlackFlash: boolean;
      hitX: number;
      hitY: number;
      target: string;
    }
  | {
      type: 's2c_obstacle_hit';
      playerId: string;
      obstacleId: string;
      damage: number;
      hitX: number;
      hitY: number;
      isDestroyed: boolean;
      obstacleType: 'building' | 'asteroid' | 'meteorite';
      stageProgress: number;
    }
  | {
      type: 's2c_boss_attack';
      bossType: 'nanovalen' | 'santiscat';
      attackType: string;
      params: any;
    }
  | {
      type: 's2c_santiscat_summoned';
      summonerId: string;
      summonerName: string;
    }
  | {
      type: 's2c_boss_synced';
      boss?: Partial<RoomBossState>;
      santiscat?: Partial<RoomSantiscatState>;
    }
  | { type: 's2c_stage_changed'; stage: string; stageProgress: number }
  | { type: 's2c_player_death'; playerId: string; playerName: string; allDead: boolean }
  | { type: 's2c_game_over'; deathReason?: string }
  | { type: 's2c_game_victory'; isSantiscat: boolean }
  | { type: 's2c_chat'; chat: ChatMessage }
  | { type: 's2c_error'; message: string };
