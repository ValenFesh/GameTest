/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameEngine } from '../game/gameEngine';
import { CHARACTER_SKINS } from '../game/skins';
import { multiplayerClient } from '../game/multiplayerClient';
import { Shield, Crown, X, Heart, Smartphone, Laptop, Users } from 'lucide-react';

interface PlayerHealthScoreboardProps {
  isOpen: boolean;
  onClose: () => void;
  engine: GameEngine;
}

export const PlayerHealthScoreboard: React.FC<PlayerHealthScoreboardProps> = ({
  isOpen,
  onClose,
  engine,
}) => {
  if (!isOpen) return null;

  const localPlayer = engine.player;
  const localSkin = CHARACTER_SKINS[localPlayer.skin] || CHARACTER_SKINS.catvalen;
  const localHp = Math.ceil(localPlayer.hp);
  const localMaxHp = localPlayer.maxHp;
  const localHpPercent = Math.max(0, Math.min(100, (localHp / localMaxHp) * 100));
  const isLocalAlive = !engine.isSpectating && localHp > 0;
  const isHost = multiplayerClient.currentRoom?.hostId === multiplayerClient.myPlayerId;
  const localDevice = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'pc';

  // Remote players list
  const remotePlayersList = Array.from(engine.remotePlayers.values());
  const totalPlayers = 1 + remotePlayersList.length;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-neutral-900 border-2 border-cyan-500/60 rounded-3xl p-5 sm:p-6 max-w-2xl w-full text-white shadow-2xl relative my-auto">
        {/* Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-36 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
              <Heart className="w-5 h-5 text-cyan-400 fill-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-black font-display tracking-wide text-white flex items-center gap-2">
                <span>TABLA DE VIDA DE LOS JUGADORES</span>
                {engine.isMultiplayer && (
                  <span className="text-xs bg-cyan-950 border border-cyan-500/60 text-cyan-300 font-mono px-2 py-0.5 rounded-lg">
                    SALA: {multiplayerClient.currentRoom?.code || 'LOCAL'}
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400">
                Total: <span className="text-cyan-400 font-bold">{totalPlayers} jugador{totalPlayers === 1 ? '' : 'es'}</span> en la partida
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
            title="Cerrar [Tab o Esc]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Players List Table */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {/* 1. Local Player (YOU) */}
          <div className="bg-neutral-800/90 border-2 border-amber-500/80 rounded-2xl p-3.5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Avatar Box */}
              <div
                className="w-12 h-12 rounded-xl border-2 border-neutral-950 flex items-center justify-center shrink-0 shadow-inner relative overflow-hidden"
                style={{ backgroundColor: localSkin.primaryColor }}
              >
                <div
                  className="w-8 h-8 rounded-sm border border-neutral-950 flex flex-col items-center justify-center"
                  style={{ backgroundColor: localSkin.primaryColor }}
                >
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-neutral-950 rounded-full" />
                    <div className="w-1.5 h-1.5 bg-neutral-950 rounded-full" />
                  </div>
                  <div className="text-[7px] font-bold text-neutral-950 mt-0.5">
                    {localPlayer.skin.startsWith('perro') ? '▼' : ':3'}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-white">
                    {multiplayerClient.currentRoom?.players[multiplayerClient.myPlayerId || '']?.name || 'Tú (Jugador Local)'}
                  </span>
                  <span className="bg-amber-500 text-neutral-950 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                    TÚ
                  </span>
                  {isHost && (
                    <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-300 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-yellow-500/40">
                      <Crown className="w-3 h-3 text-yellow-400" />
                      HOST
                    </span>
                  )}
                  <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                    {localDevice === 'mobile' ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
                    {localDevice === 'mobile' ? 'Celular' : 'PC'}
                  </span>
                </div>

                <div className="text-xs text-neutral-300 mt-0.5 flex items-center gap-2">
                  <span className="font-semibold">{localSkin.name}</span>
                  {localPlayer.shieldActive && (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                      <Shield className="w-3 h-3" /> Escudo ({localPlayer.shieldTimer.toFixed(1)}s)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* HP Bar & Value */}
            <div className="w-full sm:w-48 shrink-0">
              <div className="flex justify-between items-center text-xs font-bold mb-1">
                <span className={isLocalAlive ? 'text-emerald-400' : 'text-rose-400'}>
                  {isLocalAlive ? '🟢 VIVO' : '💀 CAÍDO'}
                </span>
                <span className="font-mono text-white text-[13px]">
                  {localHp} / {localMaxHp} HP
                </span>
              </div>
              <div className="w-full h-3 bg-neutral-950 rounded-full border border-neutral-700 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    !isLocalAlive
                      ? 'bg-neutral-600'
                      : localHpPercent > 50
                      ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                      : localHpPercent > 25
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
                  }`}
                  style={{ width: `${isLocalAlive ? localHpPercent : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2. Remote Teammates */}
          {remotePlayersList.length === 0 ? (
            engine.isMultiplayer ? (
              <div className="text-center py-6 text-neutral-500 text-xs bg-neutral-800/30 rounded-2xl border border-neutral-800">
                Esperando a que otros jugadores se unan a la sala con el código...
              </div>
            ) : (
              <div className="text-center py-6 text-neutral-400 text-xs bg-neutral-800/30 rounded-2xl border border-neutral-800">
                Estás jugando en modo solitario. ¡Invita a amigos por Wi-Fi abriendo las Salas Multijugador!
              </div>
            )
          ) : (
            remotePlayersList.map((mate) => {
              const mateSkin = CHARACTER_SKINS[mate.skin] || CHARACTER_SKINS.catvalen;
              const mateHp = Math.ceil(mate.hp);
              const mateMaxHp = mate.maxHp || 100;
              const mateHpPercent = Math.max(0, Math.min(100, (mateHp / mateMaxHp) * 100));
              const isAlive = mate.isAlive !== false && mateHp > 0;
              const isMateHost = multiplayerClient.currentRoom?.hostId === mate.id;

              return (
                <div
                  key={mate.id}
                  className="bg-neutral-800/60 border border-neutral-700/80 rounded-2xl p-3.5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar Box */}
                    <div
                      className="w-12 h-12 rounded-xl border-2 border-neutral-950 flex items-center justify-center shrink-0 shadow-inner relative overflow-hidden"
                      style={{ backgroundColor: mateSkin.primaryColor }}
                    >
                      <div
                        className="w-8 h-8 rounded-sm border border-neutral-950 flex flex-col items-center justify-center"
                        style={{ backgroundColor: mateSkin.primaryColor }}
                      >
                        <div className="flex gap-1.5">
                          <div className="w-1.5 h-1.5 bg-neutral-950 rounded-full" />
                          <div className="w-1.5 h-1.5 bg-neutral-950 rounded-full" />
                        </div>
                        <div className="text-[7px] font-bold text-neutral-950 mt-0.5">
                          {mate.skin.startsWith('perro') ? '▼' : ':3'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">
                          {mate.name}
                        </span>
                        {isMateHost && (
                          <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-300 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-yellow-500/40">
                            <Crown className="w-3 h-3 text-yellow-400" />
                            HOST
                          </span>
                        )}
                        <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                          {mate.device === 'mobile' ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
                          {mate.device === 'mobile' ? 'Celular' : 'PC'}
                        </span>
                      </div>

                      <div className="text-xs text-neutral-300 mt-0.5 flex items-center gap-2">
                        <span className="font-semibold">{mateSkin.name}</span>
                        {mate.shieldActive && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                            <Shield className="w-3 h-3" /> Escudo Activo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* HP Bar & Value */}
                  <div className="w-full sm:w-48 shrink-0">
                    <div className="flex justify-between items-center text-xs font-bold mb-1">
                      <span className={isAlive ? 'text-emerald-400' : 'text-rose-400'}>
                        {isAlive ? '🟢 VIVO' : '💀 CAÍDO'}
                      </span>
                      <span className="font-mono text-white text-[13px]">
                        {isAlive ? `${mateHp} / ${mateMaxHp} HP` : '0 HP'}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-neutral-950 rounded-full border border-neutral-700 overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-150 ${
                          !isAlive
                            ? 'bg-neutral-600'
                            : mateHpPercent > 50
                            ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                            : mateHpPercent > 25
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                            : 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
                        }`}
                        style={{ width: `${isAlive ? mateHpPercent : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info & close */}
        <div className="mt-5 pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-neutral-400 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-cyan-400" />
            Puedes presionar <strong className="text-white bg-neutral-800 px-1.5 py-0.5 rounded">[Tab]</strong> en PC para abrir o cerrar esta tabla.
          </span>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs transition cursor-pointer shadow-lg shadow-cyan-600/20"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
