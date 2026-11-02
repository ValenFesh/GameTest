import React, { useEffect } from 'react';
import { RotateCcw, Shield, Skull, Globe, Home } from 'lucide-react';
import { GameStage } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface GameOverModalProps {
  stage: GameStage;
  deathReason?: 'standard' | 'gamma_ray' | 'santiscat_oneshot' | 'black_hole' | 'reality_tear' | 'cosmic_collapse';
  bossBlackFlashesCount?: number;
  isSantiscatBattle?: boolean;
  onRetry: () => void;
  onRetrySantiscat?: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stage,
  deathReason,
  bossBlackFlashesCount = 0,
  isSantiscatBattle = false,
  onRetry,
  onRetrySantiscat,
  onMainMenu,
}) => {
  const isGammaExtinction = deathReason === 'gamma_ray';
  const isSantiscatOneShot = deathReason === 'santiscat_oneshot';
  const isBlackHoleDeath = deathReason === 'black_hole';
  const isRealityTear = deathReason === 'reality_tear';
  const isCosmicCollapse = deathReason === 'cosmic_collapse' || stage === 'cosmic_escape';

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
          {isCosmicCollapse
            ? '💥 EL UNIVERSO ALTERNO COLAPSÓ 💥'
            : isGammaExtinction
            ? 'EXTINCIÓN PLANETARIA'
            : isSantiscatOneShot
            ? '¡DESINTEGRACIÓN ONE-SHOT!'
            : isBlackHoleDeath
            ? '¡ABSORBIDO POR EL AGUJERO NEGRO!'
            : isRealityTear
            ? '¡DESGARRO DE LA REALIDAD!'
            : 'FIN DE LA PARTIDA'}
        </h2>

        <p className="text-neutral-300 text-xs md:text-sm mb-4 font-game">
          {isCosmicCollapse
            ? 'No lograste llegar a tiempo al agujero de gusano antes de la desintegración del espacio-tiempo.'
            : isGammaExtinction
            ? 'El estallido de rayos gamma de Nanovalen aniquiló a Catvalen y pulverizó la Tierra.'
            : isSantiscatOneShot
            ? 'La bola de fuego singular de Santiscat es 1-Shot letal al contacto directo.'
            : isBlackHoleDeath
            ? 'Entraste al Agujero Negro de Santiscat: ¡su horizonte de sucesos es muerte automática!'
            : isRealityTear
            ? 'Los cortes de realidad dañaron el espacio-tiempo alrededor de Catvalen.'
            : stage === 'santiscat_boss'
            ? 'Santiscat (15,000 HP) dominó la batalla cósmica. ¡Aprende sus fases para triunfar!'
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
            {isCosmicCollapse ? (
              <span>
                ¡Tienes <strong>1 minuto (60s)</strong> para huir! Vuela velozmente hacia la derecha (hacia <strong>x = 12,800</strong>) y <strong>activa tu escudo [Shift/K]</strong> para absorber el impacto de las supernovas y planetas en colapso.
              </span>
            ) : isSantiscatOneShot ? (
              <span>
                ¡La bola de fuego de Santiscat es pequeña pero <strong>mata al instante (1-Shot)</strong>! Activa tu <strong>Escudo</strong> [Shift/C] para neutralizarla o mantente a máxima distancia para esquivarla.
              </span>
            ) : isBlackHoleDeath ? (
              <span>
                ¡El <strong>Agujero Negro de Santiscat</strong> es <strong>muerte automática</strong> al entrar en él! Huye velozmente de su atracción gravitatoria y evita los escombros que orbitan a su alrededor.
              </span>
            ) : isRealityTear ? (
              <span>
                ¡Cuidado con los ataques dimensionales! Durante la <strong>Expansión de Dominio: Templo del Mal</strong> de Sukunacat, <strong>MANTÉN PRESIONADO [K]</strong> o el botón de escudo para que los miles de cortes no te maten. ¡Y esquiva a toda costa el <strong>Vacío Púrpura</strong> de Gojocat que es One-Shot!
              </span>
            ) : isGammaExtinction ? (
              <span>
                ¡El estallido gamma es <strong>triple de potente</strong> y <strong>no se puede cancelar</strong>! Cuando Nanovalen lo active, maniobra de inmediato hacia el <strong>arco de seguridad verde</strong> para sobrevivir.
              </span>
            ) : stage === 'santiscat_boss' ? (
              <span>
                Cuando Sukunacat use su <strong>Expansión de Dominio (Templo del Mal)</strong>, <strong>MANTÉN [K]</strong> o el escudo presionado hasta que termine. Esquiva la atracción de <strong>Azul</strong> y la repulsión de <strong>Rojo</strong> de Gojocat, y nunca toques el <strong>Vacío Púrpura</strong> ni el <strong>Agujero Negro</strong> (son letales al contacto).
              </span>
            ) : (
              <span>
                Recuerda que Catvalen ahora puede <strong>voltearse hacia la izquierda</strong> (presionando [A] o flecha izquierda) para disparar ataques y golpear en ambas direcciones.
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {/* Prominent Santiscat Rematch Button when in Level 4 Boss */}
          {onRetrySantiscat && (isSantiscatBattle || isBlackHoleDeath || isSantiscatOneShot || isRealityTear || isCosmicCollapse) && (
            <button
              onClick={() => {
                soundManager.stopGammaSound();
                onRetrySantiscat();
              }}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black font-display text-sm tracking-wider shadow-xl shadow-purple-600/35 transition-transform active:scale-95 cursor-pointer border border-purple-400/40"
            >
              <RotateCcw className="w-5 h-5 text-purple-200" />
              <span>Reintentar Batalla contra Santiscat</span>
            </button>
          )}

          <button
            onClick={() => {
              soundManager.stopGammaSound();
              onRetry();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold font-game shadow-lg shadow-red-600/25 transition-transform active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reintentar desde el Inicio</span>
          </button>

          <button
            onClick={() => {
              soundManager.stopGammaSound();
              onMainMenu();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-6 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 text-neutral-200 hover:text-white font-bold font-game transition-all active:scale-95 cursor-pointer text-xs"
          >
            <Home className="w-4 h-4 text-neutral-400" />
            <span>Volver al Menú Principal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
