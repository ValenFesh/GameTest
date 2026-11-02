import React from 'react';
import { Eye, ChevronLeft, ChevronRight, Skull, Shield, Users } from 'lucide-react';
import { GameEngine } from '../game/gameEngine';
import { CHARACTER_SKINS } from '../game/skins';

interface SpectatorOverlayProps {
  engine: GameEngine;
  onNextTarget: () => void;
  onPrevTarget: () => void;
}

export const SpectatorOverlay: React.FC<SpectatorOverlayProps> = ({
  engine,
  onNextTarget,
  onPrevTarget,
}) => {
  if (!engine.isSpectating) return null;

  const targetId = engine.spectatingTargetId;
  const target = targetId ? engine.remotePlayers.get(targetId) : null;
  const alivePlayers = Array.from(engine.remotePlayers.values()).filter((p) => p.isAlive);
  const targetSkin = target ? CHARACTER_SKINS[target.skin] || CHARACTER_SKINS.catvalen : null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none w-full max-w-lg px-3">
      <div className="bg-neutral-900/90 backdrop-blur-md border border-amber-500/60 rounded-2xl p-2.5 px-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 w-full pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>

          <div>
            <div className="text-[10px] font-black tracking-wider text-amber-400 flex items-center gap-1.5">
              <span>MODO ESPECTADOR</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            </div>

            <div className="text-sm font-black text-white flex items-center gap-1.5">
              <span>Siguiendo a:</span>
              <span className="text-amber-300 font-mono">
                {target ? target.name : 'Buscando compañeros...'}
              </span>
              {targetSkin && (
                <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded-md border border-neutral-700">
                  {targetSkin.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Previous / Next Target Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrevTarget}
            disabled={alivePlayers.length <= 1}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Jugador anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-bold text-neutral-400 px-1">
            {alivePlayers.length} {alivePlayers.length === 1 ? 'vivo' : 'vivos'}
          </span>

          <button
            onClick={onNextTarget}
            disabled={alivePlayers.length <= 1}
            className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Siguiente jugador"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
