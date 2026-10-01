import React, { useEffect } from 'react';
import { RotateCcw, Shield, Skull, Globe, Home } from 'lucide-react';
import { GameStage } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface GameOverModalProps {
  stage: GameStage;
  deathReason?: 'standard' | 'gamma_ray';
  bossBlackFlashesCount?: number;
  onRetry: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stage,
  deathReason,
  bossBlackFlashesCount = 0,
  onRetry,
  onMainMenu,
}) => {
  const isGammaExtinction = deathReason === 'gamma_ray';

  // Ensure gamma sound stops immediately when game over is mounted
  useEffect(() => {
    soundManager.stopGammaSound();
  }, []);

  return (
    <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border-2 border-red-500/80 rounded-3xl p-6 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
        {/* Glow background */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-32 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Defeated Cat Icon */}
        <div className="mx-auto w-20 h-20 bg-neutral-800 border-3 border-neutral-700 rounded-2xl flex items-center justify-center mb-3 relative">
          <div className="w-14 h-14 bg-zinc-500 border-2 border-neutral-950 relative rounded-sm flex flex-col items-center justify-center">
            {/* Ears */}
            <div className="absolute -top-2 left-0 w-4 h-4 bg-zinc-500 border-t-2 border-l-2 border-neutral-950 rotate-12"></div>
            <div className="absolute -top-2 right-0 w-4 h-4 bg-zinc-500 border-t-2 border-r-2 border-neutral-950 -rotate-12"></div>
            {/* Defeated X Eyes */}
            <div className="flex gap-3 text-neutral-950 font-black text-xs">
              <span>✕</span>
              <span>✕</span>
            </div>
            {/* Mouth */}
            <div className="text-[10px] font-bold text-neutral-950">w</div>
          </div>
          {isGammaExtinction && (
            <div className="absolute -bottom-2 -right-2 p-1 bg-red-600 rounded-full border border-neutral-900 shadow-md">
              <Globe className="w-4 h-4 text-white animate-spin" />
            </div>
          )}
        </div>

        <h2 className="text-2xl md:text-3xl font-black font-display text-red-500 mb-1">
          {isGammaExtinction ? 'EXTINCIÓN PLANETARIA' : 'FIN DE LA PARTIDA'}
        </h2>

        <p className="text-neutral-300 text-xs md:text-sm mb-4 font-game">
          {isGammaExtinction
            ? 'El estallido de rayos gamma de Nanovalen aniquiló a Catvalen y pulverizó la Tierra.'
            : stage === 'boss'
            ? 'Nanovalen fue implacable con sus ataques mejorados. ¡Aprende sus patrones de combate!'
            : 'Los obstáculos derribaron a Catvalen. ¡Inténtalo de nuevo!'}
        </p>

        {/* Boss Black Flash Stat if any occurred */}
        {bossBlackFlashesCount > 0 && (
          <div className="mb-3 bg-red-950/70 border border-red-600/60 rounded-xl p-2 text-xs text-red-300 flex items-center justify-center gap-2">
            <Skull className="w-4 h-4 text-red-400" />
            <span>Nanovalen conectó <strong>{bossBlackFlashesCount} Black Flash (x2.5)</strong></span>
          </div>
        )}

        {/* Tips Box */}
        <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3 text-left text-xs text-neutral-300 mb-5 flex items-start gap-2.5">
          <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-emerald-400">Consejo de Supervivencia:</span>{' '}
            {isGammaExtinction ? (
              <span>
                ¡El estallido gamma es <strong>triple de potente</strong> y <strong>no se puede cancelar</strong>! Cuando Nanovalen lo active, maniobra de inmediato hacia el <strong>arco de seguridad verde</strong> para sobrevivir.
              </span>
            ) : (
              <span>
                Todos tus ataques tienen <strong>cooldown</strong>; administra bien tus bolas de fuego y rayos. Esquiva el láser de Nanovalen observando el <strong>aviso rojo de 1.5s</strong> o usa tu <strong>Escudo Verde</strong>.
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              soundManager.stopGammaSound();
              onRetry();
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold font-game shadow-lg shadow-red-600/25 transition-transform active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Reintentar Misión</span>
          </button>

          <button
            onClick={() => {
              soundManager.stopGammaSound();
              onMainMenu();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 text-neutral-200 hover:text-white font-bold font-game transition-all active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4 text-neutral-400" />
            <span>Volver al Menú Principal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
