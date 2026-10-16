import React, { useState } from 'react';
import { GameEngine } from '../game/gameEngine';
import {
  CharacterSkinId,
  CHARACTER_SKINS,
  SKINS_ARRAY,
} from '../game/skins';
import { GameStage } from '../types/game';
import {
  Crown,
  ShieldCheck,
  Unlock,
  Lock,
  Zap,
  Heart,
  Infinity,
  Skull,
  RotateCcw,
  Check,
  Sparkles,
  Sliders,
  X,
  Flame,
  Clock,
  Compass,
  Trophy,
  Play,
  Wrench,
} from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: GameEngine | null;
  adminUnlockAll: boolean;
  onToggleAdminUnlockAll: (unlocked: boolean) => void;
  nanovalenWins: number;
  onSetWins: (wins: number) => void;
  selectedSkin: CharacterSkinId;
  onSelectSkin: (skinId: CharacterSkinId) => void;
  currentStage?: GameStage;
  onJumpStage?: (stage: GameStage) => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  engine,
  adminUnlockAll,
  onToggleAdminUnlockAll,
  nanovalenWins,
  onSetWins,
  selectedSkin,
  onSelectSkin,
  currentStage,
  onJumpStage,
}) => {
  const [activeTab, setActiveTab] = useState<'unlocks' | 'cheats' | 'stages'>('unlocks');
  const [godModeState, setGodModeState] = useState<boolean>(engine?.godMode || false);
  const [infiniteHealsState, setInfiniteHealsState] = useState<boolean>(engine?.infiniteHeals || false);
  const [noCooldownsState, setNoCooldownsState] = useState<boolean>(engine?.noCooldowns || false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const handleToggleGodMode = () => {
    const newVal = !godModeState;
    setGodModeState(newVal);
    if (engine) engine.setGodMode(newVal);
    showToast(newVal ? '🛡️ Modo Dios ACTIVADO (Inmortal)' : 'Modo Dios DESACTIVADO');
  };

  const handleToggleInfiniteHeals = () => {
    const newVal = !infiniteHealsState;
    setInfiniteHealsState(newVal);
    if (engine) engine.setInfiniteHeals(newVal);
    showToast(newVal ? '💚 Curaciones Infinitas ACTIVADAS' : 'Curaciones normales');
  };

  const handleToggleNoCooldowns = () => {
    const newVal = !noCooldownsState;
    setNoCooldownsState(newVal);
    if (engine) engine.setNoCooldowns(newVal);
    showToast(newVal ? '⚡ Sin Cooldowns ACTIVADO (Spam de Poderes)' : 'Cooldowns normales');
  };

  const handleInstaKillBoss = () => {
    if (engine) {
      engine.instaKillBoss();
      showToast('💥 ¡Nanovalen eliminado con 1 clic!');
    }
  };

  const handleJump = (stage: GameStage) => {
    if (onJumpStage) {
      onJumpStage(stage);
      showToast(`🚀 Salto a etapa: ${stage.toUpperCase()}`);
    } else if (engine) {
      engine.jumpToStage(stage);
      showToast(`🚀 Salto a etapa: ${stage.toUpperCase()}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border-2 border-amber-500/80 rounded-3xl p-5 sm:p-6 max-w-2xl w-full text-center shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5 text-left">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-display text-white flex items-center gap-2">
                PANEL DE ADMINISTRADOR <span className="text-[10px] bg-amber-500 text-neutral-950 px-2 py-0.5 rounded font-black">DEV</span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Desbloquea todo sin requisitos de victorias y gestiona trucos de prueba
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Cerrar Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Feedback Alert */}
        {toastMessage && (
          <div className="mb-3 py-1.5 px-3 bg-amber-500/20 border border-amber-500/50 rounded-xl text-xs font-bold text-amber-300 animate-in fade-in slide-in-from-top-2">
            {toastMessage}
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 mb-4 bg-neutral-950/80 p-1 rounded-2xl border border-neutral-800 shrink-0">
          <button
            onClick={() => setActiveTab('unlocks')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'unlocks'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>DESBLOQUEOS & SKINS</span>
          </button>
          <button
            onClick={() => setActiveTab('cheats')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'cheats'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>TRUCOS & CHEATS</span>
          </button>
          <button
            onClick={() => setActiveTab('stages')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'stages'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>SALTAR NIVELES</span>
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-left">
          {/* --- TAB 1: UNLOCKS & SKINS --- */}
          {activeTab === 'unlocks' && (
            <div className="space-y-4">
              {/* Master Unlock All Card */}
              <div className={`p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row items-center justify-between gap-3 ${
                adminUnlockAll
                  ? 'bg-gradient-to-r from-emerald-950/70 to-neutral-900 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : 'bg-neutral-950/80 border-neutral-700/80 hover:border-neutral-600'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                    adminUnlockAll
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}>
                    {adminUnlockAll ? <Unlock className="w-6 h-6 animate-pulse" /> : <Lock className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-white">
                        DESBLOQUEAR TODO AL INSTANTE
                      </span>
                      {adminUnlockAll && (
                        <span className="text-[10px] font-black bg-emerald-500 text-neutral-950 px-2 py-0.5 rounded-full">
                          ACTIVADO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-300 mt-0.5">
                      Desbloquea inmediatamente todas las 7 skins y sus habilidades sin requerir victorias contra Nanovalen.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const next = !adminUnlockAll;
                    onToggleAdminUnlockAll(next);
                    showToast(next ? '🔓 ¡TODAS LAS SKINS Y PODERES DESBLOQUEADOS!' : '🔒 Progresión por victorias reanudada');
                  }}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer shrink-0 ${
                    adminUnlockAll
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/30'
                      : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/30'
                  }`}
                >
                  {adminUnlockAll ? '✓ TODO DESBLOQUEADO (Click para revertir)' : '⚡ DESBLOQUEAR TODO AHORA'}
                </button>
              </div>

              {/* Instant Skin Equip Section */}
              <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-neutral-200">EQUIPAR CUALQUIER SKIN DIRECTAMENTE</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    Equipado: <strong className="text-amber-300">{CHARACTER_SKINS[selectedSkin]?.name}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SKINS_ARRAY.map((skin) => {
                    const isEquipped = selectedSkin === skin.id;

                    return (
                      <div
                        key={skin.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          isEquipped
                            ? 'bg-amber-500/15 border-amber-400/90 shadow-sm'
                            : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div
                            className="w-9 h-9 rounded-xl border border-neutral-950 flex items-center justify-center shrink-0 text-neutral-950 font-black text-xs"
                            style={{ backgroundColor: skin.primaryColor }}
                          >
                            {skin.species === 'perro' ? '🐶' : '🐱'}
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-black text-white truncate">{skin.name}</div>
                            <div className="text-[10px] text-neutral-400 flex items-center gap-1.5">
                              <span>{skin.maxHp} HP</span> ·
                              <span>Req: {skin.requiredWins} wins</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onSelectSkin(skin.id);
                            showToast(`🎭 Personaje equipado: ${skin.name}`);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer shrink-0 ${
                            isEquipped
                              ? 'bg-emerald-600 text-white cursor-default'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700'
                          }`}
                        >
                          {isEquipped ? '✓ EQUIPADO' : 'EQUIPAR'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Wins Modifier Controls */}
              <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-neutral-200">MODIFICADOR DE VICTORIAS VS NANOVALEN</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-300">
                    Actual: {nanovalenWins} {nanovalenWins === 1 ? 'Victoria' : 'Victorias'}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-400 mb-2.5">
                  Ajusta rápidamente el contador oficial de victorias para desbloquear niveles de recompensa específicos:
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { wins: 0, label: '0 (Reset)' },
                    { wins: 2, label: '2 Wins (Catvalentina)' },
                    { wins: 5, label: '5 Wins (Laura)' },
                    { wins: 10, label: '10 Wins (Zulmo)' },
                    { wins: 20, label: '20 Wins (Marta)' },
                    { wins: 25, label: '25 Wins (Fermin)' },
                    { wins: 50, label: '50 Wins (Tina)' },
                    { wins: 100, label: '100 Wins (Max)' },
                  ].map((preset) => (
                    <button
                      key={preset.wins}
                      onClick={() => {
                        onSetWins(preset.wins);
                        showToast(`🏆 Victorias ajustadas a: ${preset.wins}`);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        nanovalenWins === preset.wins
                          ? 'bg-amber-500 text-neutral-950 font-black'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 2: CHEATS & GAMEPLAY --- */}
          {activeTab === 'cheats' && (
            <div className="space-y-3">
              {/* God Mode */}
              <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    godModeState ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400' : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">MODO DIOS (INMORTALIDAD TOTAL)</div>
                    <div className="text-[11px] text-neutral-400">
                      El personaje no recibe daño de obstáculos, asteroides, láseres ni estallidos gamma.
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleToggleGodMode}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    godModeState
                      ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/30'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                  }`}
                >
                  {godModeState ? 'ACTIVADO' : 'DESACTIVADO'}
                </button>
              </div>

              {/* Infinite Heals */}
              <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    infiniteHealsState ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400' : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}>
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">CURACIONES INFINITAS</div>
                    <div className="text-[11px] text-neutral-400">
                      Tus usos de curación [F] nunca se agotan durante la partida.
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleToggleInfiniteHeals}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    infiniteHealsState
                      ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/30'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                  }`}
                >
                  {infiniteHealsState ? 'ACTIVADO' : 'DESACTIVADO'}
                </button>
              </div>

              {/* No Cooldowns */}
              <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    noCooldownsState ? 'bg-amber-500/20 border-amber-400 text-amber-400' : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">SIN COOLDOWNS (SPAM DE PODERES)</div>
                    <div className="text-[11px] text-neutral-400">
                      Dispara bolas de fuego, rayos, escudos, rayos verdes y parada del tiempo sin esperas.
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleToggleNoCooldowns}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    noCooldownsState
                      ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/30'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                  }`}
                >
                  {noCooldownsState ? 'ACTIVADO' : 'DESACTIVADO'}
                </button>
              </div>

              {/* Instant Boss Defeat */}
              <div className="p-3.5 bg-neutral-950/80 border border-red-500/40 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/50 flex items-center justify-center text-red-400">
                    <Skull className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">ELIMINAR A NANOVALEN (INSTA-WIN)</div>
                    <div className="text-[11px] text-neutral-400">
                      Causa 99,999 de daño de un solo golpe al jefe Nanovalen para probar la pantalla de victoria.
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleInstaKillBoss}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  💥 1-SHOT BOSS
                </button>
              </div>
            </div>
          )}

          {/* --- TAB 3: STAGES JUMP --- */}
          {activeTab === 'stages' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-300">
                Selecciona la etapa a la que deseas transportarte de inmediato:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'start' as GameStage,
                    title: '🏠 Menú Principal',
                    desc: 'Pantalla inicial del juego con selección de skins.',
                  },
                  {
                    id: 'city' as GameStage,
                    title: '🏙️ Nivel 1: La Ciudad',
                    desc: 'Demolición de edificios urbanos con Catvalen.',
                  },
                  {
                    id: 'space' as GameStage,
                    title: '🌌 Nivel 2: Espacio Profundo',
                    desc: 'Pulverización de asteroides y escombros cósmicos.',
                  },
                  {
                    id: 'boss_intro' as GameStage,
                    title: '⚠️ Intro de Nanovalen',
                    desc: 'Llegada dramática del jefe Nanovalen.',
                  },
                  {
                    id: 'boss' as GameStage,
                    title: '👾 Batalla Boss: Nanovalen',
                    desc: 'Enfrentamiento directo contra el jefe final.',
                  },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleJump(s.id)}
                    className="p-3 bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/60 rounded-2xl text-left transition-all active:scale-95 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-xs font-black text-white mb-0.5">{s.title}</div>
                      <div className="text-[10px] text-neutral-400">{s.desc}</div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400 mt-2">➔ Saltar a esta etapa</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 mt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span>Los cambios se aplican y guardan en tiempo real.</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-xl text-xs cursor-pointer"
          >
            Listo / Volver al Juego
          </button>
        </div>
      </div>
    </div>
  );
};
