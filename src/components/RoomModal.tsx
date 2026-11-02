import React, { useState, useEffect } from 'react';
import {
  Users,
  Wifi,
  Copy,
  Check,
  Smartphone,
  Laptop,
  Play,
  ArrowRight,
  Shield,
  Crown,
  MessageSquare,
  Sparkles,
  RefreshCw,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { multiplayerClient } from '../game/multiplayerClient';
import {
  CharacterSkinId,
  CHARACTER_SKINS,
  SKINS_ARRAY,
} from '../game/skins';
import { RoomState, RoomSummary, DeviceType, ChatMessage } from '../types/multiplayer';

interface RoomModalProps {
  isOpen: boolean;
  onCloseSolo: () => void;
  onGameStart: () => void;
  selectedSkin: CharacterSkinId;
  onSelectSkin: (skin: CharacterSkinId) => void;
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onCloseSolo,
  onGameStart,
  selectedSkin,
  onSelectSkin,
}) => {
  const [activeTab, setActiveTab] = useState<'hub' | 'lobby'>('hub');
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('catvalen_player_name') || `Jugador_${Math.floor(100 + Math.random() * 900)}`;
  });
  const [device, setDevice] = useState<DeviceType>(() => {
    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    return isMobile ? 'mobile' : 'pc';
  });
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [roomNameInput, setRoomNameInput] = useState<string>('');
  const [roomList, setRoomList] = useState<RoomSummary[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [localIp, setLocalIp] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Host Wi-Fi info from local Node.js server
  useEffect(() => {
    fetch('/api/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.url) {
          setLocalIp(data.url);
        }
      })
      .catch(() => {
        // Fallback to window location host
        setLocalIp(`http://${window.location.host}`);
      });
  }, []);

  // Wire multiplayer event callbacks
  useEffect(() => {
    multiplayerClient.onRoomListUpdate = (rooms) => {
      setRoomList(rooms);
    };

    multiplayerClient.onRoomJoined = (room) => {
      setCurrentRoom(room);
      setActiveTab('lobby');
      setErrorMessage(null);
    };

    multiplayerClient.onRoomUpdate = (room) => {
      setCurrentRoom(room);
    };

    multiplayerClient.onGameStarted = () => {
      onGameStart();
    };

    multiplayerClient.onChat = (chat) => {
      setChatMessages((prev) => [...prev.slice(-30), chat]);
    };

    multiplayerClient.onError = (msg) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    };

    // Poll room list on load
    multiplayerClient.requestRooms();
    const interval = setInterval(() => {
      if (activeTab === 'hub') {
        multiplayerClient.requestRooms();
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [activeTab, onGameStart]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const url = localIp || `http://${window.location.host}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
    });
  };

  const handleSaveName = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('catvalen_player_name', name);
  };

  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    multiplayerClient.createRoom(roomNameInput.trim() || undefined, playerName, selectedSkin, device);
  };

  const handleJoinRoom = (code: string) => {
    if (!playerName.trim() || !code.trim()) return;
    multiplayerClient.joinRoom(code, playerName, selectedSkin, device);
  };

  const handleLeaveRoom = () => {
    multiplayerClient.leaveRoom();
    setCurrentRoom(null);
    setActiveTab('hub');
  };

  const handleToggleReady = () => {
    if (!currentRoom || !multiplayerClient.myPlayerId) return;
    const me = currentRoom.players[multiplayerClient.myPlayerId];
    if (me) {
      multiplayerClient.setReady(!me.isReady);
    }
  };

  const handleSelectSkinInLobby = (skinId: CharacterSkinId) => {
    onSelectSkin(skinId);
    multiplayerClient.setSkin(skinId);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    multiplayerClient.sendChat(chatInput);
    setChatInput('');
  };

  const myId = multiplayerClient.myPlayerId;
  const isHost = currentRoom && myId ? currentRoom.hostId === myId : false;
  const myPlayer = currentRoom && myId ? currentRoom.players[myId] : null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-neutral-900 border-2 border-amber-500/60 rounded-3xl p-4 sm:p-6 max-w-3xl w-full text-white shadow-2xl relative my-auto">
        {/* Glow backdrop */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl sm:text-2xl font-black font-display tracking-wide">
              {activeTab === 'hub' ? 'MULTIJUGADOR LOCAL' : `SALA: ${currentRoom?.code}`}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'hub' ? (
              <button
                onClick={onCloseSolo}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Jugar en Solitario
              </button>
            ) : (
              <button
                onClick={handleLeaveRoom}
                className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-700/50 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Salir de la Sala
              </button>
            )}
          </div>
        </div>

        {/* Error message toast */}
        {errorMessage && (
          <div className="mb-3 p-2.5 bg-rose-900/60 border border-rose-500/60 rounded-xl text-rose-200 text-xs font-semibold flex items-center gap-2 animate-pulse">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Wi-Fi Host Network Card */}
        <div className="mb-4 bg-gradient-to-r from-neutral-800/90 via-neutral-800/60 to-neutral-800/90 border border-amber-500/30 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Wifi className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300 tracking-wider flex items-center gap-1.5">
                <span>CONECTARSE POR MISMO WI-FI</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              </div>
              <div className="text-sm sm:text-base font-black font-mono text-white">
                {localIp || 'Cargando IP de red...'}
              </div>
              <p className="text-[11px] text-neutral-400">
                Abre esta dirección en el navegador de tu celular u otra notebook conectada al mismo Wi-Fi.
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyLink}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs px-3.5 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-neutral-950" /> : <Copy className="w-3.5 h-3.5" />}
            {isCopied ? '¡Enlace Copiado!' : 'Copiar Enlace'}
          </button>
        </div>

        {/* TAB 1: HUB / CREATE & JOIN */}
        {activeTab === 'hub' && (
          <div className="space-y-4">
            {/* Player Name and Device Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-800/40 border border-neutral-700/60 p-3.5 rounded-2xl">
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Tu Nombre de Jugador:
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={playerName}
                  onChange={(e) => handleSaveName(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-400 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none"
                  placeholder="Tu apodo..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">
                  Dispositivo Detectado:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDevice('pc')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      device === 'pc'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    PC / Notebook
                  </button>

                  <button
                    type="button"
                    onClick={() => setDevice('mobile')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      device === 'mobile'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Celular
                  </button>
                </div>
              </div>
            </div>

            {/* Create Room or Join by Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Box 1: Create Room */}
              <div className="bg-neutral-800/50 border border-neutral-700/80 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-black text-amber-300 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Crear Nueva Sala
                  </h3>
                  <p className="text-xs text-neutral-400 mb-3">
                    Conviértete en anfitrión para que tus amigos en la misma red se unan.
                  </p>
                  <input
                    type="text"
                    maxLength={20}
                    value={roomNameInput}
                    onChange={(e) => setRoomNameInput(e.target.value)}
                    placeholder="Nombre de la sala (opcional)..."
                    className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none mb-3"
                  />
                </div>

                <button
                  onClick={handleCreateRoom}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 font-black py-2.5 px-4 rounded-xl shadow-lg shadow-amber-500/20 active:scale-98 transition cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4" />
                  Crear Sala Anfitriona
                </button>
              </div>

              {/* Box 2: Join by Code */}
              <div className="bg-neutral-800/50 border border-neutral-700/80 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-black text-sky-300 mb-1.5 flex items-center gap-1.5">
                    <ArrowRight className="w-4 h-4 text-sky-400" />
                    Unirse con Código
                  </h3>
                  <p className="text-xs text-neutral-400 mb-3">
                    Ingresa el código de 4 letras de la sala que creó tu amigo:
                  </p>
                  <input
                    type="text"
                    maxLength={4}
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    placeholder="CÓDIGO (ej. ABCD)"
                    className="w-full bg-neutral-900 border border-neutral-700 focus:border-sky-400 rounded-xl px-3 py-2 text-center text-lg font-black tracking-widest text-sky-300 outline-none uppercase mb-3"
                  />
                </div>

                <button
                  onClick={() => handleJoinRoom(roomCodeInput)}
                  disabled={roomCodeInput.length < 2}
                  className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-black py-2.5 px-4 rounded-xl shadow-lg shadow-sky-500/20 active:scale-98 transition cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Entrar a la Sala
                </button>
              </div>
            </div>

            {/* Public Rooms List */}
            <div className="bg-neutral-800/30 border border-neutral-700/60 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-400 tracking-wider">
                  SALAS ENCONTRADAS EN LA RED ({roomList.length})
                </span>
                <button
                  onClick={() => multiplayerClient.requestRooms()}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Actualizar
                </button>
              </div>

              {roomList.length === 0 ? (
                <div className="text-center py-6 text-neutral-500 text-xs">
                  No hay salas activas en este momento. ¡Crea una para comenzar!
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {roomList.map((room) => (
                    <div
                      key={room.code}
                      className="flex items-center justify-between bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 p-2.5 rounded-xl transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-400 text-sm bg-neutral-800 px-2 py-0.5 rounded-md">
                          {room.code}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {room.name}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            Host: {room.hostName} • {room.playerCount}/{room.maxPlayers} jugadores
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleJoinRoom(room.code)}
                        className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        Unirse
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ROOM LOBBY */}
        {activeTab === 'lobby' && currentRoom && (
          <div className="space-y-4">
            {/* Room info bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-800/60 p-3 rounded-2xl border border-neutral-700/60">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 font-bold">CÓDIGO:</span>
                <span className="text-lg font-black font-mono text-amber-400 bg-neutral-900 px-2.5 py-1 rounded-xl border border-amber-500/30">
                  {currentRoom.code}
                </span>
                <button
                  onClick={() => handleCopyCode(currentRoom.code)}
                  className="text-xs text-amber-400 hover:text-amber-300 p-1.5 rounded-lg bg-neutral-900 border border-neutral-700 cursor-pointer"
                  title="Copiar código de sala"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="text-xs font-bold text-neutral-300">
                Jugadores en la sala:{' '}
                <span className="text-amber-400 font-black">
                  {Object.keys(currentRoom.players).length} / 4
                </span>
              </div>
            </div>

            {/* Players in Lobby Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.values(currentRoom.players).map((p) => {
                const isMe = p.id === myId;
                const skinConfig = CHARACTER_SKINS[p.skin] || CHARACTER_SKINS.catvalen;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      isMe
                        ? 'bg-neutral-800/90 border-amber-500/80 shadow-md'
                        : 'bg-neutral-800/40 border-neutral-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Character avatar badge */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border border-white/20 shadow-inner"
                        style={{ backgroundColor: skinConfig.primaryColor }}
                      >
                        {p.skin === 'perro_rubio' || p.skin === 'perro_marron' ? '🐶' : '🐱'}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-white">
                            {p.name} {isMe && '(Tú)'}
                          </span>
                          {p.isHost && (
                            <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                          <span className="flex items-center gap-0.5">
                            {p.device === 'mobile' ? (
                              <Smartphone className="w-3 h-3 text-sky-400" />
                            ) : (
                              <Laptop className="w-3 h-3 text-emerald-400" />
                            )}
                            {p.device === 'mobile' ? 'Celular' : 'PC'}
                          </span>
                          <span>•</span>
                          <span className="text-amber-300 font-semibold">
                            {skinConfig.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {p.isReady ? (
                        <span className="text-[11px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> LISTO
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-lg">
                          Eligiendo...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* In-Lobby Skin Picker (All skins free!) */}
            <div className="bg-neutral-800/30 border border-neutral-700/60 p-3 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> ELIGE TU SKIN (TODAS DESBLOQUEADAS GRATIS)
                </span>
                <span className="text-[11px] text-neutral-400">
                  {CHARACTER_SKINS[selectedSkin]?.name}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {SKINS_ARRAY.map((s) => {
                  const isCur = selectedSkin === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSkinInLobby(s.id)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                        isCur
                          ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 scale-102'
                          : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border border-white/20"
                        style={{ backgroundColor: s.primaryColor }}
                      >
                        {s.id.startsWith('perro') ? '🐶' : '🐱'}
                      </div>
                      <span className="text-[10px] font-black text-white text-center line-clamp-1">
                        {s.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* In-Lobby Chat */}
            <div className="bg-neutral-950/70 border border-neutral-800 p-2.5 rounded-2xl">
              <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-400 mb-1.5">
                <MessageSquare className="w-3 h-3 text-amber-400" />
                Chat de la Sala
              </div>

              <div className="h-20 overflow-y-auto space-y-1 mb-2 pr-1 text-xs">
                {chatMessages.length === 0 ? (
                  <div className="text-neutral-500 text-[11px] italic py-2 text-center">
                    Escribe un mensaje para coordinar la partida con tus compañeros...
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className="text-neutral-300">
                      <span className="font-bold text-amber-300">{msg.senderName}:</span>{' '}
                      <span>{msg.text}</span>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  maxLength={60}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escribir mensaje..."
                  className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-1 text-xs text-white outline-none"
                />
                <button
                  type="submit"
                  className="bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold px-3 py-1 rounded-xl text-xs cursor-pointer"
                >
                  Enviar
                </button>
              </form>
            </div>

            {/* Actions: Ready & Start Game */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={handleToggleReady}
                className={`w-full sm:flex-1 py-3 px-4 rounded-xl font-black text-sm transition cursor-pointer flex items-center justify-center gap-2 border ${
                  myPlayer?.isReady
                    ? 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                {myPlayer?.isReady ? 'CANCELAR LISTO' : '¡ESTOY LISTO!'}
              </button>

              {isHost && (
                <button
                  onClick={() => multiplayerClient.startGame()}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 shadow-xl shadow-amber-500/25 active:scale-98 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  INICIAR PARTIDA
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
