import React from 'react';
import { Play, Flame, Zap, Shield, Crosshair, Sparkles, Heart, Music } from 'lucide-react';

interface StartModalProps {
  onStart: () => void;
  onOpenAudioModal?: () => void;
}

export const StartModal: React.FC<StartModalProps> = ({ onStart, onOpenAudioModal }) => {
  return (
    <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 z-40">
      <div className="bg-neutral-900/95 border-2 border-amber-500/60 rounded-3xl p-6 max-w-xl w-full text-center shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Character VS Banner */}
        <div className="flex items-center justify-center gap-6 mb-5">
          {/* Catvalen (Square Cat from Image 1) */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-neutral-800 border-2 border-neutral-700 rounded-2xl flex items-center justify-center relative shadow-lg">
              <div className="w-14 h-14 bg-zinc-400 border-2 border-neutral-950 relative rounded-sm flex flex-col items-center justify-center">
                {/* Ears */}
                <div className="absolute -top-2 left-0 w-4 h-4 bg-zinc-400 border-t-2 border-l-2 border-neutral-950 rotate-12"></div>
                <div className="absolute -top-2 right-0 w-4 h-4 bg-zinc-400 border-t-2 border-r-2 border-neutral-950 -rotate-12"></div>
                {/* Eyes */}
                <div className="flex gap-2.5 mb-0.5">
                  <div className="w-2 h-2.5 bg-neutral-950 rounded-full"></div>
                  <div className="w-2 h-2.5 bg-neutral-950 rounded-full"></div>
                </div>
                {/* Mouth :3 */}
                <div className="text-[10px] font-black text-neutral-950 leading-none">:3</div>
              </div>
              {/* Floating circular paws */}
              <div className="absolute -left-2 top-8 w-5 h-5 rounded-full bg-zinc-300 border-2 border-neutral-950"></div>
              <div className="absolute -right-2 top-8 w-5 h-5 rounded-full bg-zinc-300 border-2 border-neutral-950"></div>
            </div>
            <span className="text-xs font-black font-display text-neutral-200 mt-2">CATVALEN</span>
            <span className="text-[10px] text-emerald-400 font-semibold">Héroe Cuadrado</span>
          </div>

          <div className="text-2xl font-black font-display text-amber-500">VS</div>

          {/* Nanovalen (Robot from Image 2) */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-neutral-800 border-2 border-red-500/70 rounded-2xl flex items-center justify-center relative shadow-lg shadow-red-950">
              <div className="w-14 h-14 bg-neutral-900 border-2 border-neutral-950 relative rounded-sm flex flex-col items-center justify-center overflow-hidden">
                {/* Top Black Helmet & Ears */}
                <div className="absolute inset-x-0 top-0 h-8 bg-neutral-950">
                  <div className="absolute -top-2 left-0.5 w-3 h-5 bg-neutral-950 border-t-2 border-l-2 border-neutral-950 rotate-6"></div>
                  <div className="absolute -top-2 right-0.5 w-3 h-5 bg-neutral-950 border-t-2 border-r-2 border-neutral-950 -rotate-6"></div>
                </div>
                {/* Slate Grey Lower Mask */}
                <div className="absolute inset-x-0 bottom-0 h-6 bg-slate-600 border-t border-neutral-950"></div>
                {/* Menacing Glowing Red Slit Eyes */}
                <div className="relative z-10 flex gap-2.5 mt-1">
                  <div className="w-3.5 h-2 bg-red-600 rounded-sm shadow-[0_0_8px_#ff0033] rotate-12"></div>
                  <div className="w-3.5 h-2 bg-red-600 rounded-sm shadow-[0_0_8px_#ff0033] -rotate-12"></div>
                </div>
              </div>
            </div>
            <span className="text-xs font-black font-display text-red-500 mt-2">NANOVALEN</span>
            <span className="text-[10px] text-red-400 font-semibold">Robot Espacial</span>
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-black font-display text-white mb-2">
          CATVALEN <span className="text-amber-400">VS</span> NANOVALEN
        </h1>

        <p className="text-neutral-300 text-xs md:text-sm mb-5 leading-relaxed font-game">
          ¡Destruye los edificios de la ciudad con tus poderes, surca el espacio esquivando meteoritos y derrota al temible jefe robot <strong>Nanovalen</strong> en su propio terreno!
        </p>

        {/* Powers & Mechanics Brief */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left mb-6 text-xs">
          <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 font-bold text-neutral-200 mb-1">
              <div className="w-3 h-3 rounded-full bg-zinc-400 border border-white"></div>
              <span>Manos Circulares</span>
            </div>
            <p className="text-[11px] text-neutral-400">Golpea cuerpo a cuerpo con tus puños.</p>
          </div>

          <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-1">
              <Flame className="w-3.5 h-3.5" />
              <span>Bola de Fuego</span>
            </div>
            <p className="text-[11px] text-neutral-400">Disparo explosivo de área devastador.</p>
          </div>

          <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 font-bold text-sky-400 mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Rayo Fulminante</span>
            </div>
            <p className="text-[11px] text-neutral-400">Atraviesa múltiples estructuras.</p>
          </div>

          <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 font-bold text-cyan-400 mb-1">
              <Crosshair className="w-3.5 h-3.5" />
              <span>Ráfagas de Poder</span>
            </div>
            <p className="text-[11px] text-neutral-400">Disparos continuos a gran cadencia.</p>
          </div>

          <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-1">
              <Shield className="w-3.5 h-3.5" />
              <span>Escudo Verde</span>
            </div>
            <p className="text-[11px] text-neutral-400">Inmunidad total temporal contra daño.</p>
          </div>

          <div className="bg-neutral-800/80 border border-emerald-500/60 rounded-xl p-2.5 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-1">
              <Heart className="w-3.5 h-3.5 fill-emerald-400" />
              <span>Curación [F]</span>
            </div>
            <p className="text-[11px] text-neutral-300">Restaura salud (+35 HP). <strong>Límite: 10 curas</strong>.</p>
          </div>

          <div className="bg-neutral-800/80 border border-red-500/60 rounded-xl p-2.5 shadow-[0_0_10px_rgba(255,0,50,0.15)] col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 font-black text-red-400 mb-1">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Black Flash (2%)</span>
            </div>
            <p className="text-[11px] text-red-300">¡Golpe crítico x2.5 con rayos negros y rojos!</p>
          </div>
        </div>

        {/* Music & Audio Settings button */}
        {onOpenAudioModal && (
          <div className="mb-4">
            <button
              onClick={onOpenAudioModal}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Music className="w-4 h-4 text-amber-400" />
              <span>🎵 Personalizar Música (Niveles 1, 2, Boss) & Rayo Gamma</span>
            </button>
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={onStart}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-white text-base font-black font-display tracking-wider shadow-xl shadow-orange-500/25 transition-transform active:scale-95 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>¡COMENZAR AVENTURA!</span>
        </button>
      </div>
    </div>
  );
};
