import {
  CharacterSkinId,
} from './skins';
import {
  DeviceType,
  RoomState,
  RoomSummary,
  WSClientMessage,
  WSServerMessage,
  MultiplayerPlayer,
  ChatMessage,
  RoomBossState,
  RoomSantiscatState,
} from '../types/multiplayer';

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  public myPlayerId: string | null = null;
  public currentRoom: RoomState | null = null;
  public isConnected: boolean = false;
  private reconnectTimer: any = null;

  // Event Callbacks
  public onRoomListUpdate?: (rooms: RoomSummary[]) => void;
  public onRoomJoined?: (room: RoomState, myPlayerId: string) => void;
  public onRoomUpdate?: (room: RoomState) => void;
  public onGameStarted?: (stage: string, room: RoomState) => void;
  public onRemotePlayerUpdate?: (playerId: string, player: Partial<MultiplayerPlayer>) => void;
  public onRemotePlayerAttack?: (attack: {
    playerId: string;
    attackType: string;
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    angle?: number;
    facing?: number;
    skin: CharacterSkinId;
  }) => void;
  public onBossHitBroadcast?: (hit: {
    playerId: string;
    damage: number;
    remainingHp: number;
    attackType: string;
    isBlackFlash: boolean;
    hitX: number;
    hitY: number;
    target: string;
  }) => void;
  public onBossSynced?: (sync: { boss?: Partial<RoomBossState>; santiscat?: Partial<RoomSantiscatState> }) => void;
  public onObstacleHit?: (data: {
    playerId: string;
    obstacleId: string;
    damage: number;
    hitX: number;
    hitY: number;
    isDestroyed: boolean;
    obstacleType: 'building' | 'asteroid' | 'meteorite';
    stageProgress: number;
  }) => void;
  public onBossAttack?: (data: { bossType: 'nanovalen' | 'santiscat'; attackType: string; params: any }) => void;
  public onSantiscatSummoned?: (data: { summonerId: string; summonerName: string }) => void;
  public onStageChanged?: (stage: string, stageProgress: number) => void;
  public onPlayerDeath?: (playerId: string, playerName: string, allDead: boolean) => void;
  public onGameOver?: (deathReason?: string) => void;
  public onGameVictory?: (isSantiscat: boolean) => void;
  public onChat?: (chat: ChatMessage) => void;
  public onError?: (message: string) => void;

  constructor() {
    this.connect();
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.requestRooms();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WSServerMessage = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (e) {
          console.error('Failed to parse websocket message:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        // Auto-reconnect after 2 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 2000);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('Multiplayer client error:', err);
      };
    } catch (e) {
      console.warn('Failed to establish WebSocket connection:', e);
    }
  }

  private send(msg: WSClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleServerMessage(msg: WSServerMessage) {
    switch (msg.type) {
      case 's2c_room_list':
        this.onRoomListUpdate?.(msg.rooms);
        break;

      case 's2c_room_created':
      case 's2c_room_joined':
        this.myPlayerId = msg.playerId;
        this.currentRoom = msg.room;
        this.onRoomJoined?.(msg.room, msg.playerId);
        break;

      case 's2c_room_update':
        this.currentRoom = msg.room;
        this.onRoomUpdate?.(msg.room);
        break;

      case 's2c_game_started':
        this.currentRoom = msg.room;
        this.onGameStarted?.(msg.stage, msg.room);
        break;

      case 's2c_player_updated':
        if (this.currentRoom && this.currentRoom.players[msg.playerId]) {
          Object.assign(this.currentRoom.players[msg.playerId], msg.player);
        }
        this.onRemotePlayerUpdate?.(msg.playerId, msg.player);
        break;

      case 's2c_player_attacked':
        this.onRemotePlayerAttack?.(msg);
        break;

      case 's2c_boss_hit_broadcast':
        this.onBossHitBroadcast?.(msg);
        break;

      case 's2c_boss_synced':
        this.onBossSynced?.(msg);
        break;

      case 's2c_obstacle_hit':
        if (this.currentRoom) {
          this.currentRoom.stageProgress = msg.stageProgress;
        }
        this.onObstacleHit?.(msg);
        break;

      case 's2c_boss_attack':
        this.onBossAttack?.(msg);
        break;

      case 's2c_santiscat_summoned':
        if (this.currentRoom) {
          this.currentRoom.stage = 'santiscat_boss';
        }
        this.onSantiscatSummoned?.(msg);
        break;

      case 's2c_stage_changed':
        if (this.currentRoom) {
          this.currentRoom.stage = msg.stage;
          this.currentRoom.stageProgress = msg.stageProgress;
        }
        this.onStageChanged?.(msg.stage, msg.stageProgress);
        break;

      case 's2c_player_death':
        if (this.currentRoom && this.currentRoom.players[msg.playerId]) {
          this.currentRoom.players[msg.playerId].isAlive = false;
          this.currentRoom.players[msg.playerId].isSpectating = true;
        }
        this.onPlayerDeath?.(msg.playerId, msg.playerName, msg.allDead);
        break;

      case 's2c_game_over':
        if (this.currentRoom) {
          this.currentRoom.status = 'gameover';
        }
        this.onGameOver?.(msg.deathReason);
        break;

      case 's2c_game_victory':
        if (this.currentRoom) {
          this.currentRoom.status = 'victory';
        }
        this.onGameVictory?.(msg.isSantiscat);
        break;

      case 's2c_chat':
        this.onChat?.(msg.chat);
        break;

      case 's2c_error':
        this.onError?.(msg.message);
        break;
    }
  }

  // Client Actions
  public requestRooms() {
    this.send({ type: 'c2s_get_rooms' });
  }

  public createRoom(roomName: string | undefined, playerName: string, skin: CharacterSkinId, device: DeviceType) {
    this.send({
      type: 'c2s_create_room',
      roomName,
      playerName,
      skin,
      device,
    });
  }

  public joinRoom(roomCode: string, playerName: string, skin: CharacterSkinId, device: DeviceType) {
    this.send({
      type: 'c2s_join_room',
      roomCode: roomCode.trim().toUpperCase(),
      playerName,
      skin,
      device,
    });
  }

  public setReady(isReady: boolean) {
    this.send({ type: 'c2s_set_ready', isReady });
  }

  public setSkin(skin: CharacterSkinId) {
    this.send({ type: 'c2s_set_skin', skin });
  }

  public startGame() {
    this.send({ type: 'c2s_start_game' });
  }

  public sendPlayerUpdate(playerState: {
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
    skin?: any;
    device?: any;
    isAlive?: boolean;
  }) {
    this.send({
      type: 'c2s_player_update',
      ...playerState,
    });
  }

  public sendPlayerAttack(attack: {
    attackType: string;
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    angle?: number;
    facing?: number;
  }) {
    this.send({
      type: 'c2s_player_attack',
      ...attack,
    });
  }

  public sendBossHit(hit: {
    damage: number;
    attackType: string;
    isBlackFlash: boolean;
    hitX: number;
    hitY: number;
    target: 'nanovalen' | 'santiscat' | 'summon';
  }) {
    this.send({
      type: 'c2s_boss_hit',
      ...hit,
    });
  }

  public sendBossSync(boss?: Partial<RoomBossState>, santiscat?: Partial<RoomSantiscatState>) {
    this.send({
      type: 'c2s_boss_sync',
      boss,
      santiscat,
    });
  }

  public sendObstacleHit(hit: {
    obstacleId: string;
    damage: number;
    hitX: number;
    hitY: number;
    isDestroyed: boolean;
    obstacleType: 'building' | 'asteroid' | 'meteorite';
    stageProgress: number;
  }) {
    this.send({
      type: 'c2s_obstacle_hit',
      ...hit,
    });
  }

  public sendBossAttack(bossType: 'nanovalen' | 'santiscat', attackType: string, params: any) {
    this.send({
      type: 'c2s_boss_attack',
      bossType,
      attackType,
      params,
    });
  }

  public sendSummonSantiscat(summonerId: string, summonerName: string) {
    this.send({
      type: 'c2s_summon_santiscat',
      summonerId,
      summonerName,
    });
  }

  public sendStageChange(stage: string, stageProgress?: number) {
    this.send({
      type: 'c2s_stage_change',
      stage,
      stageProgress,
    });
  }

  public sendPlayerDied() {
    this.send({ type: 'c2s_player_died' });
  }

  public sendSpectate(targetId: string) {
    this.send({ type: 'c2s_spectate', targetId });
  }

  public sendChat(text: string) {
    if (!text.trim()) return;
    this.send({ type: 'c2s_chat', text });
  }

  public restartGame() {
    this.send({ type: 'c2s_restart' });
  }

  public leaveRoom() {
    this.send({ type: 'c2s_leave_room' });
    this.currentRoom = null;
    this.requestRooms();
  }
}

export const multiplayerClient = new MultiplayerClient();
