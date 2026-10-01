import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameStats } from '../types/game';
import { Trophy, RotateCcw, Zap, Building2, Flame, ShieldAlert, Home } from 'lucide-react';

interface VictoryModalProps {
  stats: GameStats;
  onPlayAgain: () => void;
  onRematchBoss: () => void;
  onMainMenu?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  stats,
  onPlayAgain,
  onRematchBoss,
  onMainMenu,
}) => {
  useEffect(() => {
    // Launch fireworks confetti
    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#10b981', '#38bdf8', '#f59e0b', '#ef4444', '#a855f7'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#10b981', '#38bdf8', '#f59e0b', '#ef4444', '#a855f7'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-300">
      <div className="bg-neutral-900 border-2 border-emerald-500/80 rounded-3xl p-6 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Square Cat Victory Avatar */}
        <div className="relative mx-auto w-24 h-24 bg-neutral-800 border-4 border-emerald-400 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/20 animate-bounce">
          <div className="w-16 h-16 bg-zinc-400 border-2 border-neutral-950 relative rounded-sm flex flex-col items-center justify-center">
            {/* Ears */}
            <div className="absolute -top-2.5 left-0 w-5 h-5 bg-zinc-400 border-t-2 border-l-2 border-neutral-950 rotate-12"></div>
            <div className="absolute -top-2.5 right-0 w-5 h-5 bg-zinc-400 border-t-2 border-r-2 border-neutral-950 -rotate-12"></div>
            {/* Eyes (Starry victory eyes) */}
            <div className="flex gap-4 mb-0.5">
              <span className="text-neutral-950 text-sm font-bold">★</span>
              <span className="text-neutral-950 text-sm font-bold">★</span>
            </div>
            {/* Mouth :3 */}
            <div className="text-[11px] font-black text-neutral-950">:3</div>
          </div>
          {/* Circular Hands giving thumbs up / waving */}
          <div className="absolute -left-3 top-7 w-6 h-6 rounded-full bg-zinc-300 border-2 border-neutral-950"></div>
          <div className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-zinc-300 border-2 border-neutral-950"></div>
        </div>

        {/* Victory Title required by prompt: "Ganaste!" */}
        <h1 className="text-4xl md:text-5xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-green-400 tracking-wider mb-1">
          ¡Ganaste!
        </h1>
        <p className="text-neutral-300 text-sm mb-5 font-game">
          ¡Catvalen destruyó los edificios, cruzó el cosmos y derrotó a Nanovalen!
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-6 text-left">
          <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-xl p-2.5 flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <div className="text-[11px] text-neutral-400 font-medium">Edificios Demolidos</div>
              <div className="text-lg font-black font-display text-white">{stats.buildingsDestroyed}</div>
            </div>
          </div>

          <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-xl p-2.5 flex items-center gap-2.5">
            <Flame className="w-6 h-6 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[11px] text-neutral-400 font-medium">Asteroides Pulverizados</div>
              <div className="text-lg font-black font-display text-white">{stats.asteroidsDestroyed}</div>
            </div>
          </div>

          <div className="bg-neutral-800/80 border border-neutral-700/60 rounded-xl p-2.5 flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <div className="text-[11px] text-neutral-400 font-medium">Daño a Nanovalen</div>
              <div className="text-lg font-black font-display text-white">{stats.nanovalenDamageDealt}</div>
            </div>
          </div>

          <div className="bg-neutral-800/80 border border-red-500/50 rounded-xl p-2.5 flex items-center gap-2.5 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
            <Zap className="w-6 h-6 text-red-500 shrink-0 animate-pulse" />
            <div>
              <div className="text-[11px] text-red-400 font-bold">Black Flashes (x2.5)</div>
              <div className="text-lg font-black font-display text-red-400">{stats.blackFlashesCount}</div>
            </div>
          </div>
        </div>

        {/* Total Score Banner */}
        <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-3 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-xs text-neutral-300 font-bold">PUNTUACIÓN FINAL</span>
          </div>
          <span className="text-xl font-black font-display text-amber-400">
            {stats.score.toLocaleString()} PTS
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 justify-center">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onPlayAgain}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-extrabold font-game shadow-lg shadow-emerald-500/25 transition-transform active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Jugar de Nuevo</span>
            </button>

            <button
              onClick={onRematchBoss}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-200 font-bold font-game transition-transform active:scale-95 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-red-400" />
              <span>Revancha Nanovalen</span>
            </button>
          </div>

          {onMainMenu && (
            <button
              onClick={onMainMenu}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <Home className="w-4 h-4 text-neutral-400" />
              <span>Volver al Menú Principal</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
