import React, { useState } from 'react';
import {
  CharacterSkinId,
  CHARACTER_SKINS,
  SKINS_ARRAY,
  isSkinUnlocked,
} from '../game/skins';
import {
  Play,
  Flame,
  Zap,
  Shield,
  Crosshair,
  Sparkles,
  Heart,
  Music,
  Lock,
  CheckCircle2,
  Trophy,
  Info,
  Clock,
  Radio,
  Eye,
  ShieldAlert,
  Sun,
  Hammer,
  Sword,
  Wand2,
  Wrench,
  Crown,
} from 'lucide-react';

interface StartModalProps {
  onStart: () => void;
  selectedSkin: CharacterSkinId;
  nanovalenWins: number;
  adminUnlockAll?: boolean;
  onSelectSkin: (skinId: CharacterSkinId) => void;
  onSetWins?: (wins: number) => void;
  onOpenAudioModal?: () => void;
  onOpenAdminModal?: () => void;
}

export const StartModal: React.FC<StartModalProps> = ({
  onStart,
  selectedSkin,
  nanovalenWins,
  adminUnlockAll = false,
  onSelectSkin,
  onSetWins,
  onOpenAudioModal,
  onOpenAdminModal,
}) => {
  const [activeTab, setActiveTab] = useState<'skins' | 'controls'>('skins');
  const [previewSkinId, setPreviewSkinId] = useState<CharacterSkinId>(selectedSkin);
  const [showSandbox, setShowSandbox] = useState<boolean>(false);

  const previewSkin = CHARACTER_SKINS[previewSkinId] || CHARACTER_SKINS.catvalen;
  const isPreviewUnlocked = isSkinUnlocked(previewSkinId, nanovalenWins, adminUnlockAll);
  const isSelected = selectedSkin === previewSkinId;

  const handleSelect = (id: CharacterSkinId) => {
    setPreviewSkinId(id);
    if (isSkinUnlocked(id, nanovalenWins, adminUnlockAll)) {
      onSelectSkin(id);
    }
  };

  return (
    <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 z-40 overflow-y-auto">
      <div className="bg-neutral-900/95 border-2 border-amber-500/60 rounded-3xl p-5 sm:p-6 max-w-2xl w-full text-center shadow-2xl relative my-auto">
        {/* Ambient Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header / Title */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black font-display text-white tracking-wide">
              CATVALEN <span className="text-amber-400">VS</span> NANOVALEN
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Win Counter Badge */}
            <div className="flex items-center gap-2 bg-neutral-800/90 border border-amber-500/50 px-3 py-1 rounded-xl shadow-inner">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-amber-300">
                {nanovalenWins} {nanovalenWins === 1 ? 'Victoria' : 'Victorias'}
              </span>
            </div>

            {/* Admin Panel Button */}
            {onOpenAdminModal && (
              <button
                onClick={onOpenAdminModal}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                title="Abrir Panel de Administrador para desbloquear todo"
              >
                <Crown className="w-3.5 h-3.5 fill-neutral-950 text-neutral-950" />
                <span>PANEL ADMIN</span>
              </button>
            )}
          </div>
        </div>

        {/* Admin Unlock All Active Alert */}
        {adminUnlockAll && (
          <div className="bg-emerald-500/15 border border-emerald-400/60 rounded-xl py-1.5 px-3 mb-3 flex items-center justify-center gap-2 text-xs font-black text-emerald-300 animate-pulse">
            <Crown className="w-4 h-4 text-emerald-400" />
            <span>MODO ADMIN ACTIVO: TODAS LAS SKINS Y PODERES ESTÁN DESBLOQUEADOS</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-center gap-2 mb-4 bg-neutral-950/70 p-1 rounded-2xl border border-neutral-800">
          <button
            onClick={() => setActiveTab('skins')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'skins'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            🎭 SELECCIÓN DE PERSONAJES / SKINS
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            className={`flex-1 py-2 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'controls'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            🎮 GUÍA DE PODERES & CONTROLES
          </button>
        </div>

        {/* --- TAB 1: SKINS SELECTOR --- */}
        {activeTab === 'skins' && (
          <div className="space-y-4">
            {/* Characters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
              {SKINS_ARRAY.map((skin) => {
                const unlocked = isSkinUnlocked(skin.id, nanovalenWins, adminUnlockAll);
                const selected = selectedSkin === skin.id;
                const isCurrentPreview = previewSkinId === skin.id;

                return (
                  <button
                    key={skin.id}
                    onClick={() => handleSelect(skin.id)}
                    className={`relative p-2.5 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                      isCurrentPreview
                        ? 'border-amber-400 bg-neutral-800 shadow-[0_0_15px_rgba(251,191,36,0.25)] ring-2 ring-amber-400/50'
                        : selected
                        ? 'border-emerald-500/70 bg-neutral-800/80'
                        : unlocked
                        ? 'border-neutral-700 bg-neutral-800/50 hover:bg-neutral-800 hover:border-neutral-500'
                        : 'border-neutral-800 bg-neutral-900/60 opacity-75 hover:opacity-90'
                    }`}
                  >
                    {/* Top status tag */}
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-neutral-950/70 text-neutral-300">
                        {skin.species}
                      </span>
                      {selected ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> ELEGIDO
                        </span>
                      ) : unlocked ? (
                        <span className="text-[10px] font-bold text-amber-400">✓ Listo</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-400">
                          <Lock className="w-3 h-3 text-red-400" /> {skin.requiredWins} win{skin.requiredWins > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Avatar Icon Preview */}
                    <div className="flex items-center gap-2.5 my-1">
                      <div
                        className="w-10 h-10 rounded-xl border-2 border-neutral-950 flex items-center justify-center relative shadow-sm overflow-hidden shrink-0"
                        style={{ backgroundColor: skin.primaryColor }}
                      >
                        {/* Mini face elements */}
                        {skin.species === 'perro' ? (
                          <>
                            <div
                              className="absolute top-0 left-0 w-2.5 h-4 rounded-b border border-neutral-950"
                              style={{ backgroundColor: skin.secondaryColor }}
                            />
                            <div
                              className="absolute top-0 right-0 w-2.5 h-4 rounded-b border border-neutral-950"
                              style={{ backgroundColor: skin.secondaryColor }}
                            />
                            <div className="flex gap-1.5 mt-0.5">
                              <div className="w-1.5 h-1.5 bg-neutral-950 rounded-full" />
                              <div className="w-1.5 h-1.5 bg-neutral-950 rounded-full" />
                            </div>
                            <div className="text-[7px] text-neutral-950 font-black leading-none">▼</div>
                          </>
                        ) : (
                          <>
                            <div
                              className="absolute top-0 left-0.5 w-2 h-2 border-t border-l border-neutral-950 rotate-12"
                              style={{ backgroundColor: skin.secondaryColor }}
                            />
                            <div
                              className="absolute top-0 right-0.5 w-2 h-2 border-t border-r border-neutral-950 -rotate-12"
                              style={{ backgroundColor: skin.secondaryColor }}
                            />
                            <div className="flex gap-1.5 mb-0.5">
                              <div className="w-1.5 h-2 bg-neutral-950 rounded-full" />
                              <div className="w-1.5 h-2 bg-neutral-950 rounded-full" />
                            </div>
                            <div className="text-[7px] text-neutral-950 font-black leading-none">:3</div>
                          </>
                        )}
                      </div>

                      <div className="overflow-hidden">
                        <div className="text-xs font-black text-neutral-100 truncate">{skin.name}</div>
                        <div className="text-[10px] text-neutral-400 truncate">{skin.maxHp} HP</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected / Previewed Skin Detail Card */}
            <div className="bg-neutral-800/90 border border-neutral-700 rounded-2xl p-4 text-left shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2.5 pb-2.5 border-b border-neutral-700/80">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white font-display">{previewSkin.name}</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-200 font-bold">
                      {previewSkin.title}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 mt-1">{previewSkin.description}</p>
                </div>

                {/* Select / Unlock button */}
                <div className="shrink-0 w-full sm:w-auto">
                  {isSelected ? (
                    <div className="px-4 py-2 bg-emerald-600/90 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow">
                      <CheckCircle2 className="w-4 h-4" /> SELECCIONADO
                    </div>
                  ) : isPreviewUnlocked ? (
                    <button
                      onClick={() => onSelectSkin(previewSkinId)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-black rounded-xl text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
                    >
                      ✓ ELEGIR ESTE PERSONAJE
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-neutral-900 border border-red-500/50 text-red-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                      <Lock className="w-4 h-4 text-red-400" /> Requiere {previewSkin.requiredWins} victorias ({nanovalenWins}/{previewSkin.requiredWins})
                    </div>
                  )}
                </div>
              </div>

              {/* Attributes & Abilities Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-700/70">
                  <span className="text-[11px] text-neutral-400 font-bold block mb-1">❤️ Salud Máxima</span>
                  <span className="text-sm font-black text-emerald-400">{previewSkin.maxHp} HP</span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    {previewSkin.id === 'gata_gris' ? '¡Doble de resistencia!' : 'Resistencia base'}
                  </span>
                </div>

                <div className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-700/70">
                  <span className="text-[11px] text-neutral-400 font-bold block mb-1">🛡️ Escudo Protector</span>
                  <span className="text-sm font-black text-sky-400">{previewSkin.shieldName}</span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    Invulnerabilidad temporal
                  </span>
                </div>

                <div className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-700/70">
                  <span className="text-[11px] text-neutral-400 font-bold block mb-1">⚡ Velocidad</span>
                  <span className="text-sm font-black text-amber-400">
                    {previewSkin.moveSpeed > 8 ? 'Superrápido (+50%)' : 'Estándar'}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    {previewSkin.passiveDescription || 'Movilidad estándar'}
                  </span>
                </div>
              </div>

              {/* Special abilities list */}
              <div className="mt-3 pt-2.5 border-t border-neutral-700/60">
                <span className="text-[11px] font-bold text-amber-300 block mb-1.5">
                  ✨ Poderes y Habilidades Específicas de {previewSkin.name}:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {previewSkin.abilities.map((ab) => (
                    <div
                      key={ab.id}
                      className="bg-neutral-900/90 border border-neutral-700/70 rounded-xl p-2 flex items-start gap-2"
                    >
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-white font-bold text-[10px]"
                        style={{ backgroundColor: ab.color }}
                      >
                        {ab.key.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-black text-neutral-200">
                          <span>{ab.name}</span>
                          <span className="text-[10px] font-mono text-amber-400">[{ab.key}]</span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5 leading-tight">{ab.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sandbox / Testing Tool (For developer and user convenience to test skins immediately!) */}
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-2.5 text-xs text-neutral-400">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowSandbox(!showSandbox)}
                  className="flex items-center gap-1.5 text-neutral-400 hover:text-amber-300 transition-colors font-bold cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>🧪 Modo Pruebas / Ajustar Victorias ({showSandbox ? 'Ocultar' : 'Mostrar'})</span>
                </button>
                <span className="text-[10px] text-neutral-500">
                  Prueba cualquier personaje sin tener que jugar 50 partidas
                </span>
              </div>

              {showSandbox && onSetWins && (
                <div className="mt-2.5 pt-2 border-t border-neutral-800 flex flex-wrap items-center gap-2 justify-center">
                  <span className="text-[11px] font-bold text-neutral-300">Ajustar Victorias:</span>
                  <button
                    onClick={() => onSetWins(2)}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    2 Wins (Catvalentina)
                  </button>
                  <button
                    onClick={() => onSetWins(5)}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    5 Wins (Laura)
                  </button>
                  <button
                    onClick={() => onSetWins(10)}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    10 Wins (Zulmo)
                  </button>
                  <button
                    onClick={() => onSetWins(20)}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    20 Wins (Marta)
                  </button>
                  <button
                    onClick={() => onSetWins(25)}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    25 Wins (Fermin)
                  </button>
                  <button
                    onClick={() => onSetWins(50)}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-black cursor-pointer"
                  >
                    ★ 50 Wins (Tina - Desbloquear Todas)
                  </button>
                  <button
                    onClick={() => onSetWins(0)}
                    className="px-2 py-1 bg-red-950/60 hover:bg-red-900/60 text-red-300 rounded-lg text-[11px] cursor-pointer"
                  >
                    Reset (0)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: CONTROLS & MECHANICS GUIDE --- */}
        {activeTab === 'controls' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left text-xs">
              <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 font-bold text-neutral-200 mb-1">
                  <div className="w-3 h-3 rounded-full bg-zinc-400 border border-white" />
                  <span>Manos Circulares</span>
                </div>
                <p className="text-[11px] text-neutral-400">Golpea cuerpo a cuerpo con tus puños circulares [Espacio].</p>
              </div>

              <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Bola de Fuego [1/Q]</span>
                </div>
                <p className="text-[11px] text-neutral-400">Disparo explosivo de área devastador.</p>
              </div>

              <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 font-bold text-sky-400 mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Rayo Fulminante [2/E]</span>
                </div>
                <p className="text-[11px] text-neutral-400">Lanza eléctrica que atraviesa estructuras.</p>
              </div>

              <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 font-bold text-cyan-400 mb-1">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Ráfagas de Poder [3/R]</span>
                </div>
                <p className="text-[11px] text-neutral-400">Disparos continuos a gran cadencia.</p>
              </div>

              <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Escudo Protector [Shift]</span>
                </div>
                <p className="text-[11px] text-neutral-400">Inmunidad total temporal contra todo daño.</p>
              </div>

              <div className="bg-neutral-800/80 border border-emerald-500/60 rounded-xl p-2.5 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-1">
                  <Heart className="w-3.5 h-3.5 fill-emerald-400" />
                  <span>Curación [F]</span>
                </div>
                <p className="text-[11px] text-neutral-300">Restaura vida. 10 a 15 usos según personaje.</p>
              </div>

              <div className="bg-neutral-800/80 border border-red-500/60 rounded-xl p-2.5 shadow-[0_0_10px_rgba(255,0,50,0.15)] col-span-2 sm:col-span-3">
                <div className="flex items-center gap-1.5 font-black text-red-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Black Flash (2% / 1% de Nanovalen)</span>
                </div>
                <p className="text-[11px] text-red-300">
                  ¡Golpe crítico x2.5 con distorsión y rayos negros con delineado rojo!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Music & Audio Settings button */}
        {onOpenAudioModal && (
          <div className="mt-4 mb-3">
            <button
              onClick={onOpenAudioModal}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Music className="w-4 h-4 text-amber-400" />
              <span>🎵 Personalizar Música (Niveles 1, 2, Boss) & Sonido Rayo Gamma</span>
            </button>
          </div>
        )}

        {/* Big Start Button with Selected Character Name */}
        <button
          onClick={onStart}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-white text-base font-black font-display tracking-wider shadow-xl shadow-orange-500/25 transition-transform active:scale-95 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>¡JUGAR CON {CHARACTER_SKINS[selectedSkin]?.name.toUpperCase() || 'CATVALEN'}!</span>
        </button>
      </div>
    </div>
  );
};

