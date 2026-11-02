import http from 'http';
import os from 'os';
import path from 'path';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import {
  RoomState,
  MultiplayerPlayer,
  RoomSummary,
  WSClientMessage,
  WSServerMessage,
  ChatMessage,
} from './src/types/multiplayer';

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Get local IPv4 addresses on the same Wi-Fi / local network
function getLocalNetworkIps(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }

  return ips.length > 0 ? ips : ['localhost'];
}

// Room Manager
class RoomManager {
  private rooms: Map<string, RoomState> = new Map();
  private socketPlayerMap: Map<WebSocket, { playerId: string; roomCode?: string }> = new Map();
  private roomSockets: Map<string, Set<WebSocket>> = new Map();

  public getRoomsSummary(): RoomSummary[] {
    const summaries: RoomSummary[] = [];
    this.rooms.forEach((room) => {
      const host = Object.values(room.players).find((p) => p.isHost);
      summaries.push({
        code: room.code,
        name: room.name,
        playerCount: Object.keys(room.players).length,
        maxPlayers: 6,
        status: room.status,
        hostName: host ? host.name : 'Anfitrión',
      });
    });
    return summaries;
  }

  public registerSocket(ws: WebSocket): string {
    const playerId = `player_${Math.random().toString(36).substring(2, 9)}`;
    this.socketPlayerMap.set(ws, { playerId });
    return playerId;
  }

  public unregisterSocket(ws: WebSocket) {
    const data = this.socketPlayerMap.get(ws);
    if (data && data.roomCode) {
      this.leaveRoom(ws, data.roomCode, data.playerId);
    }
    this.socketPlayerMap.delete(ws);
  }

  public createRoom(
    ws: WebSocket,
    roomName: string | undefined,
    playerName: string,
    skin: any,
    device: 'pc' | 'mobile'
  ): { roomCode: string; playerId: string; room: RoomState } {
    const socketData = this.socketPlayerMap.get(ws);
    const playerId = socketData ? socketData.playerId : `p_${Date.now()}`;

    // Generate readable 4-character room code (e.g. CATS, MEOW, BOSS, KITY, etc.)
    const codeWords = ['GATO', 'VALE', 'LUNA', 'FELI', 'ROJO', 'SOL', 'NOVA', 'RAYO', 'AZUL', 'DOGS'];
    let code = `${codeWords[Math.floor(Math.random() * codeWords.length)]}${Math.floor(100 + Math.random() * 900)}`;
    while (this.rooms.has(code)) {
      code = `CAT${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const hostPlayer: MultiplayerPlayer = {
      id: playerId,
      name: playerName || 'Jugador 1',
      skin: skin || 'catvalen',
      isHost: true,
      isReady: true,
      isAlive: true,
      isSpectating: false,
      device: device || 'pc',
      x: 120,
      y: 350,
      vx: 0,
      vy: 0,
      facing: 1,
      hp: 100,
      maxHp: 100,
      shieldActive: false,
      shieldColor: '#10b981',
      eyeState: 'normal',
      animationTime: 0,
      holdingShield: false,
    };

    const room: RoomState = {
      code,
      name: roomName || `Sala de ${hostPlayer.name}`,
      hostId: playerId,
      status: 'lobby',
      stage: 'city',
      stageProgress: 0,
      players: { [playerId]: hostPlayer },
      boss: null,
      santiscat: null,
      lastUpdate: Date.now(),
    };

    this.rooms.set(code, room);
    if (!this.roomSockets.has(code)) {
      this.roomSockets.set(code, new Set());
    }
    this.roomSockets.get(code)!.add(ws);

    if (socketData) {
      socketData.roomCode = code;
    }

    return { roomCode: code, playerId, room };
  }

  public joinRoom(
    ws: WebSocket,
    roomCode: string,
    playerName: string,
    skin: any,
    device: 'pc' | 'mobile'
  ): { success: boolean; error?: string; room?: RoomState; playerId?: string } {
    const formattedCode = roomCode.trim().toUpperCase();
    const room = this.rooms.get(formattedCode);

    if (!room) {
      return { success: false, error: `No se encontró la sala con código "${formattedCode}". Verifica que el código sea correcto.` };
    }

    const currentCount = Object.keys(room.players).length;
    if (currentCount >= 6) {
      return { success: false, error: 'La sala ya está llena (máximo 6 jugadores).' };
    }

    const socketData = this.socketPlayerMap.get(ws);
    const playerId = socketData ? socketData.playerId : `p_${Date.now()}`;

    // Starting spawn offsets for teammates so they don't overlap awkwardly
    const spawnY = 250 + (currentCount % 5) * 80;
    const spawnX = 80 + (currentCount % 3) * 45;

    const newPlayer: MultiplayerPlayer = {
      id: playerId,
      name: playerName || `Jugador ${currentCount + 1}`,
      skin: skin || 'catvalen',
      isHost: false,
      isReady: room.status === 'playing', // If joining an active game, join directly
      isAlive: true,
      isSpectating: false,
      device: device || 'mobile',
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      facing: 1,
      hp: 100,
      maxHp: 100,
      shieldActive: false,
      shieldColor: '#10b981',
      eyeState: 'normal',
      animationTime: 0,
      holdingShield: false,
    };

    room.players[playerId] = newPlayer;
    room.lastUpdate = Date.now();

    if (!this.roomSockets.has(formattedCode)) {
      this.roomSockets.set(formattedCode, new Set());
    }
    this.roomSockets.get(formattedCode)!.add(ws);

    if (socketData) {
      socketData.roomCode = formattedCode;
    }

    // Broadcast updated room state to all players in the room
    this.broadcastToRoom(formattedCode, { type: 's2c_room_update', room });

    return { success: true, room, playerId };
  }

  public leaveRoom(ws: WebSocket, roomCode: string, playerId: string) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    delete room.players[playerId];

    const sockets = this.roomSockets.get(roomCode);
    if (sockets) {
      sockets.delete(ws);
    }

    const remainingPlayers = Object.keys(room.players);
    if (remainingPlayers.length === 0) {
      // Room empty, delete room
      this.rooms.delete(roomCode);
      this.roomSockets.delete(roomCode);
    } else {
      // If host left, assign first remaining player as new host
      if (room.hostId === playerId) {
        const nextHostId = remainingPlayers[0];
        room.hostId = nextHostId;
        room.players[nextHostId].isHost = true;
      }
      this.broadcastToRoom(roomCode, { type: 's2c_room_update', room });
    }
  }

  public getRoom(roomCode: string): RoomState | undefined {
    return this.rooms.get(roomCode);
  }

  public broadcastToRoom(roomCode: string, msg: WSServerMessage, excludeSocket?: WebSocket) {
    const sockets = this.roomSockets.get(roomCode);
    if (!sockets) return;

    const payload = JSON.stringify(msg);
    sockets.forEach((s) => {
      if (s !== excludeSocket && s.readyState === WebSocket.OPEN) {
        try {
          s.send(payload);
        } catch (e) {
          console.error('Error broadcasting to client:', e);
        }
      }
    });
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const roomManager = new RoomManager();

  app.use(express.json());

  // API to query host local IP addresses for easily connecting from other phones/notebooks on the same Wi-Fi
  app.get('/api/network-info', (_req: Request, res: Response) => {
    const localIps = getLocalNetworkIps();
    res.json({
      localIps,
      port: PORT,
      hostname: os.hostname(),
      activeRooms: roomManager.getRoomsSummary(),
    });
  });

  // WebSocket Server Handling
  wss.on('connection', (ws: WebSocket) => {
    const playerId = roomManager.registerSocket(ws);

    // Send room list immediately upon connection
    const sendMsg = (msg: WSServerMessage) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    };

    sendMsg({
      type: 's2c_room_list',
      rooms: roomManager.getRoomsSummary(),
    });

    ws.on('message', (raw: string) => {
      try {
        const msg: WSClientMessage = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'c2s_get_rooms': {
            sendMsg({
              type: 's2c_room_list',
              rooms: roomManager.getRoomsSummary(),
            });
            break;
          }

          case 'c2s_create_room': {
            const { roomCode, room } = roomManager.createRoom(
              ws,
              msg.roomName,
              msg.playerName,
              msg.skin,
              msg.device
            );
            sendMsg({
              type: 's2c_room_created',
              roomCode,
              playerId,
              room,
            });
            break;
          }

          case 'c2s_join_room': {
            const result = roomManager.joinRoom(
              ws,
              msg.roomCode,
              msg.playerName,
              msg.skin,
              msg.device
            );
            if (result.success && result.room) {
              sendMsg({
                type: 's2c_room_joined',
                roomCode: result.room.code,
                playerId,
                room: result.room,
              });
            } else {
              sendMsg({
                type: 's2c_error',
                message: result.error || 'Error al unirse a la sala.',
              });
            }
            break;
          }

          case 'c2s_set_ready': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (!clientData?.roomCode) return;
            const room = roomManager.getRoom(clientData.roomCode);
            if (room && room.players[playerId]) {
              room.players[playerId].isReady = msg.isReady;
              roomManager.broadcastToRoom(room.code, { type: 's2c_room_update', room });
            }
            break;
          }

          case 'c2s_set_skin': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (!clientData?.roomCode) return;
            const room = roomManager.getRoom(clientData.roomCode);
            if (room && room.players[playerId]) {
              room.players[playerId].skin = msg.skin;
              roomManager.broadcastToRoom(room.code, { type: 's2c_room_update', room });
            }
            break;
          }

          case 'c2s_start_game': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (!clientData?.roomCode) return;
            const room = roomManager.getRoom(clientData.roomCode);
            if (room && room.hostId === playerId) {
              room.status = 'playing';
              room.stage = 'city';
              room.stageProgress = 0;
              // Reset all players alive
              Object.values(room.players).forEach((p) => {
                p.isAlive = true;
                p.isSpectating = false;
                p.hp = p.maxHp;
              });
              roomManager.broadcastToRoom(room.code, {
                type: 's2c_game_started',
                stage: 'city',
                room,
              });
            }
            break;
          }

          case 'c2s_player_update': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (!clientData?.roomCode) return;
            const room = roomManager.getRoom(clientData.roomCode);
            if (room && room.players[playerId]) {
              const p = room.players[playerId];
              p.x = msg.x;
              p.y = msg.y;
              p.vx = msg.vx;
              p.vy = msg.vy;
              p.facing = msg.facing;
              p.hp = msg.hp;
              if (msg.maxHp) p.maxHp = msg.maxHp;
              if (msg.skin) p.skin = msg.skin;
              if (msg.name) p.name = msg.name;
              if (msg.device) p.device = msg.device;
              if (typeof msg.isAlive === 'boolean') p.isAlive = msg.isAlive;
              p.shieldActive = msg.shieldActive;
              p.shieldColor = msg.shieldColor;
              p.eyeState = msg.eyeState;
              p.holdingShield = msg.holdingShield;
              p.greenBeamCharging = msg.greenBeamCharging;
              p.greenBeamFiring = msg.greenBeamFiring;
              p.timeStopActive = msg.timeStopActive;

              // Broadcast player movement/state to all other players in the room
              roomManager.broadcastToRoom(
                room.code,
                {
                  type: 's2c_player_updated',
                  playerId,
                  player: {
                    id: p.id,
                    name: p.name,
                    skin: p.skin,
                    device: p.device,
                    isAlive: p.isAlive,
                    isSpectating: p.isSpectating,
                    x: p.x,
                    y: p.y,
                    vx: p.vx,
                    vy: p.vy,
                    facing: p.facing,
                    hp: p.hp,
                    maxHp: p.maxHp,
                    shieldActive: p.shieldActive,
                    shieldColor: p.shieldColor,
                    eyeState: p.eyeState,
                    holdingShield: p.holdingShield,
                    greenBeamCharging: p.greenBeamCharging,
                    greenBeamFiring: p.greenBeamFiring,
                    timeStopActive: p.timeStopActive,
                  },
                },
                ws
              );
            }
            break;
          }

          case 'c2s_player_attack': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (!clientData?.roomCode) return;
            const room = roomManager.getRoom(clientData.roomCode);
            if (room && room.players[playerId]) {
              const playerSkin = room.players[playerId].skin;
              roomManager.broadcastToRoom(
                room.code,
                {
                  type: 's2c_player_attacked',
                  playerId,
                  attackType: msg.attackType,
                  x: msg.x,
                  y: msg.y,
                  vx: msg.vx,
                  vy: msg.vy,
                  angle: msg.angle,
                  facing: msg.facing,
                  skin: playerSkin,
                },
                ws
              );
            }
            break;
          }

          case 'c2s_boss_hit': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (!clientData?.roomCode) return;
            const room = roomManager.getRoom(clientData.roomCode);
            if (room) {
              let remainingHp = 0;
              if (msg.target === 'nanovalen' && room.boss) {
                // If Nanovalen shield is active, check if bypassed
                const isPunch = msg.attackType === 'punch';
                if (!room.boss.shieldActive || isPunch) {
                  room.boss.hp = Math.max(0, room.boss.hp - msg.damage);
                }
                remainingHp = room.boss.hp;
              } else if (msg.target === 'santiscat' && room.santiscat) {
                room.santiscat.hp = Math.max(0, room.santiscat.hp - msg.damage);
                remainingHp = room.santiscat.hp;
              }

              // Broadcast hit and damage numbers so all teammates see the collective damage
              roomManager.broadcastToRoom(room.code, {
                type: 's2c_boss_hit_broadcast',
                playerId,
                damage: msg.damage,
                remainingHp,
                attackType: msg.attackType,
                isBlackFlash: msg.isBlackFlash,
                hitX: msg.hitX,
                hitY: msg.hitY,
                target: msg.target,
              });
            }
            break;
          }

          case 'c2s_boss_sync': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (!clientData?.roomCode) return;
            const room = roomManager.getRoom(clientData.roomCode);
            if (room) {
              if (msg.boss) {
                room.boss = { ...(room.boss || ({} as any)), ...msg.boss };
              }
              if (msg.santiscat) {
                room.santiscat = { ...(room.santiscat || ({} as any)), ...msg.santiscat };
              }
              roomManager.broadcastToRoom(room.code, {
                type: 's2c_boss_synced',
                boss: room.boss || undefined,
                santiscat: room.santiscat || undefined,
              }, ws);
            }
            break;
          }

          case 'c2s_obstacle_hit': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (!clientData?.roomCode) return;
            const room = roomManager.getRoom(clientData.roomCode);
            if (room) {
              room.stageProgress = msg.stageProgress;
              roomManager.broadcastToRoom(room.code, {
                type: 's2c_obstacle_hit',
                playerId,
                obstacleId: msg.obstacleId,
                damage: msg.damage,
                hitX: msg.hitX,
                hitY: msg.hitY,
                isDestroyed: msg.isDestroyed,
                obstacleType: msg.obstacleType,
                stageProgress: msg.stageProgress,
              }, ws);
            }
            break;
          }

          case 'c2s_boss_attack': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (!clientData?.roomCode) return;
            const room = roomManager.getRoom(clientData.roomCode);
            if (room) {
              roomManager.broadcastToRoom(room.code, {
                type: 's2c_boss_attack',
                bossType: msg.bossType,
                attackType: msg.attackType,
                params: msg.params,
              }, ws);
            }
            break;
          }

          case 'c2s_summon_santiscat': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (!clientData?.roomCode) return;
            const room = roomManager.getRoom(clientData.roomCode);
            if (room) {
              if ((room as any).santiscatSummoned) {
                sendMsg({
                  type: 's2c_error',
                  message: `Santiscat ya fue invocado por ${(room as any).santiscatSummonerName || 'otro jugador'}.`,
                });
                return;
              }
              (room as any).santiscatSummoned = true;
              (room as any).santiscatSummonerId = msg.summonerId;
              (room as any).santiscatSummonerName = msg.summonerName;
              room.stage = 'santiscat_boss';
              roomManager.broadcastToRoom(room.code, {
                type: 's2c_santiscat_summoned',
                summonerId: msg.summonerId,
                summonerName: msg.summonerName,
              });
            }
            break;
          }

          case 'c2s_stage_change': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (!clientData?.roomCode) return;
            const room = roomManager.getRoom(clientData.roomCode);
            if (room) {
              room.stage = msg.stage;
              room.stageProgress = msg.stageProgress || 0;
              roomManager.broadcastToRoom(room.code, {
                type: 's2c_stage_changed',
                stage: msg.stage,
                stageProgress: room.stageProgress,
              });
            }
            break;
          }

          case 'c2s_player_died': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (!clientData?.roomCode) return;
            const room = roomManager.getRoom(clientData.roomCode);
            if (room && room.players[playerId]) {
              const p = room.players[playerId];
              p.isAlive = false;
              p.isSpectating = true;
              p.hp = 0;

              // Check if any teammate is still alive
              const alivePlayers = Object.values(room.players).filter((pl) => pl.isAlive);
              const allDead = alivePlayers.length === 0;

              roomManager.broadcastToRoom(room.code, {
                type: 's2c_player_death',
                playerId,
                playerName: p.name,
                allDead,
              });

              if (allDead) {
                room.status = 'gameover';
                roomManager.broadcastToRoom(room.code, {
                  type: 's2c_game_over',
                });
              }
            }
            break;
          }

          case 'c2s_spectate': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (!clientData?.roomCode) return;
            const room = roomManager.getRoom(clientData.roomCode);
            if (room && room.players[playerId]) {
              room.players[playerId].spectatingTargetId = msg.targetId;
            }
            break;
          }

          case 'c2s_chat': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (!clientData?.roomCode) return;
            const room = roomManager.getRoom(clientData.roomCode);
            if (room && room.players[playerId]) {
              const chat: ChatMessage = {
                id: `chat_${Date.now()}_${Math.random()}`,
                senderId: playerId,
                senderName: room.players[playerId].name,
                text: msg.text.slice(0, 120),
                timestamp: Date.now(),
              };
              roomManager.broadcastToRoom(room.code, {
                type: 's2c_chat',
                chat,
              });
            }
            break;
          }

          case 'c2s_restart': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (!clientData?.roomCode) return;
            const room = roomManager.getRoom(clientData.roomCode);
            if (room && room.hostId === playerId) {
              room.status = 'playing';
              room.stage = 'city';
              room.stageProgress = 0;
              Object.values(room.players).forEach((p) => {
                p.isAlive = true;
                p.isSpectating = false;
                p.hp = p.maxHp;
              });
              roomManager.broadcastToRoom(room.code, {
                type: 's2c_game_started',
                stage: 'city',
                room,
              });
            }
            break;
          }

          case 'c2s_leave_room': {
            const clientData = (roomManager as any).socketPlayerMap.get(ws);
            if (clientData?.roomCode) {
              roomManager.leaveRoom(ws, clientData.roomCode, playerId);
              clientData.roomCode = undefined;
            }
            break;
          }
        }
      } catch (err) {
        console.error('Error processing websocket message:', err);
      }
    });

    ws.on('close', () => {
      roomManager.unregisterSocket(ws);
    });

    ws.on('error', (err) => {
      console.warn('Client websocket error:', err);
      roomManager.unregisterSocket(ws);
    });
  });

  // Vite middleware in dev or static files in production
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalNetworkIps();
    console.log(`====================================================`);
    console.log(`🐱 CATVALEN MULTIPLAYER LOCAL SERVER ACTIVO`);
    console.log(`🎮 En este PC / Host:   http://localhost:${PORT}`);
    ips.forEach((ip) => {
      console.log(`📱 En Celulares / Wi-Fi: http://${ip}:${PORT}`);
    });
    console.log(`====================================================`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start full-stack server:', err);
  process.exit(1);
});
