import React, { useRef, useState } from 'react';
import { soundManager } from '../audio/soundManager';
import {
  Music,
  Upload,
  RotateCcw,
  X,
  Play,
  Square,
  CheckCircle2,
  Sparkles,
  Zap,
  Building2,
  Orbit,
  Skull,
  Radio,
} from 'lucide-react';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStage: string;
}

type AudioTab = 'city' | 'space' | 'boss' | 'gamma';

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ isOpen, onClose, currentStage }) => {
  const [activeTab, setActiveTab] = useState<AudioTab>(
    currentStage === 'space' ? 'space' : currentStage === 'boss' ? 'boss' : 'city'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);

  // Tick state to re-render track names
  const [, setRefresh] = useState(0);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isPlayingTest) {
      soundManager.stopGammaSound();
      if (currentStage === 'city' || currentStage === 'space' || currentStage === 'boss') {
        soundManager.playMusic(currentStage as 'city' | 'space' | 'boss');
      } else {
        soundManager.stopMusic();
      }
      setIsPlayingTest(false);
    }
    onClose();
  };

  const triggerRefresh = (msg: string) => {
    setRefresh(r => r + 1);
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeTab === 'gamma') {
      soundManager.setCustomGammaSound(file, file.name);
      triggerRefresh(`¡Efecto "${file.name}" cargado para el Estallido de Rayos Gamma!`);
    } else {
      soundManager.setCustomTrack(activeTab, file, file.name);
      const tabNames: Record<AudioTab, string> = {
        city: 'Nivel 1 (Ciudad)',
        space: 'Nivel 2 (Espacio)',
        boss: 'Jefe Final (Nanovalen)',
        gamma: 'Estallido Gamma',
      };
      triggerRefresh(`¡Canción "${file.name}" cargada para ${tabNames[activeTab]}!`);
    }
  };

  const handleResetDefault = () => {
    if (isPlayingTest) {
      soundManager.stopGammaSound();
      soundManager.stopMusic();
      setIsPlayingTest(false);
    }
    if (activeTab === 'gamma') {
      soundManager.resetDefaultGammaSound();
      triggerRefresh('Restablecido al sonido de estallido cósmico oficial de 8s.');
    } else {
      soundManager.resetDefaultTrack(activeTab);
      triggerRefresh('Restablecido al tema musical oficial sintetizado.');
    }
  };

  const handleTestAudio = () => {
    if (isPlayingTest) {
      soundManager.stopGammaSound();
      soundManager.stopMusic();
      setIsPlayingTest(false);
      triggerRefresh('⏹️ Reproducción detenida.');
      return;
    }

    setIsPlayingTest(true);
    if (activeTab === 'gamma') {
      soundManager.playGammaBurst();
      triggerRefresh('💥 Reproduciendo sonido del Estallido Gamma al explotar (no en carga)...');
    } else {
      soundManager.playMusic(activeTab);
      triggerRefresh('🎵 Reproduciendo pista de música en bucle...');
    }
  };

  const handleTabChange = (tab: AudioTab) => {
    if (isPlayingTest) {
      soundManager.stopGammaSound();
      soundManager.stopMusic();
      setIsPlayingTest(false);
    }
    setActiveTab(tab);
  };

  const getCurrentName = () => {
    if (activeTab === 'gamma') {
      return soundManager.getCustomGammaName();
    }
    return soundManager.getTrackName(activeTab);
  };

  const isCurrentCustom = () => {
    if (activeTab === 'gamma') {
      return soundManager.hasCustomGammaSound();
    }
    return soundManager.hasCustomTrack(activeTab);
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none animate-fadeIn">
      <div className="bg-neutral-900 border-2 border-amber-500/60 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-800/80 hover:bg-neutral-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black font-display text-white">Centro de Audio & Música</h2>
            <p className="text-xs text-neutral-400">Personaliza canciones por nivel y sonidos del jefe</p>
          </div>
        </div>

        {/* Feedback message */}
        {feedbackMsg && (
          <div className="mb-4 p-2.5 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2 shadow-lg animate-bounce">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-semibold">{feedbackMsg}</span>
          </div>
        )}

        {/* Tabs for Levels, Boss, and Gamma Sound */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-neutral-950 rounded-2xl border border-neutral-800 mb-5">
          <button
            onClick={() => handleTabChange('city')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeTab === 'city'
                ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Building2 className="w-4 h-4 mb-0.5" />
            <span>Nivel 1</span>
          </button>

          <button
            onClick={() => handleTabChange('space')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeTab === 'space'
                ? 'bg-cyan-500 text-neutral-950 shadow-md font-black'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Orbit className="w-4 h-4 mb-0.5" />
            <span>Nivel 2</span>
          </button>

          <button
            onClick={() => handleTabChange('boss')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeTab === 'boss'
                ? 'bg-red-500 text-neutral-950 shadow-md font-black'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Skull className="w-4 h-4 mb-0.5" />
            <span>Jefe Final</span>
          </button>

          <button
            onClick={() => handleTabChange('gamma')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeTab === 'gamma'
                ? 'bg-fuchsia-500 text-neutral-950 shadow-md font-black'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <Zap className="w-4 h-4 mb-0.5" />
            <span>Rayo Gamma</span>
          </button>
        </div>

        {/* Tab Description & Badge */}
        <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              {activeTab === 'gamma' ? 'Efecto del Estallido Gamma:' : 'Canción Asignada:'}
            </span>
            {isCurrentCustom() ? (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-black px-2.5 py-0.5 rounded-full border border-amber-500/40">
                Personalizado
              </span>
            ) : (
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-black px-2.5 py-0.5 rounded-full border border-blue-500/40">
                Predeterminado Oficial
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm font-black text-amber-400 truncate">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
            <span className="truncate">{getCurrentName()}</span>
          </div>

          <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
            {activeTab === 'city' &&
              'Música de fondo que se reproduce en bucle mientras destruyes rascacielos en la Ciudad.'}
            {activeTab === 'space' &&
              'Música de fondo cósmica que se reproduce al volar por el espacio exterior destruyendo asteroides.'}
            {activeTab === 'boss' &&
              'Tema de batalla épico durante el enfrentamiento cara a cara contra Nanovalen.'}
            {activeTab === 'gamma' &&
              'Este sonido se reproduce exactamente cuando el rayo de Nanovalen explota (no cuando lo carga), desatando la onda de choque.'}
          </p>
        </div>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Controls */}
        <div className="space-y-3 mb-5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-white font-black text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-transform active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>
              {activeTab === 'gamma'
                ? 'Cargar Audio para el Estallido de Rayos Gamma (.mp3, .wav)'
                : `Cargar Canción para ${activeTab === 'city' ? 'Nivel 1' : activeTab === 'space' ? 'Nivel 2' : 'Jefe Final'} (.mp3, .wav)`}
            </span>
          </button>

          <button
            onClick={handleTestAudio}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 border text-xs font-bold rounded-xl transition-all cursor-pointer ${
              isPlayingTest
                ? 'bg-rose-950/80 border-rose-500/80 text-rose-200 shadow-md shadow-rose-950/50'
                : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
            }`}
          >
            {isPlayingTest ? (
              <Square className="w-4 h-4 text-rose-400 fill-rose-400" />
            ) : (
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            )}
            <span>
              {isPlayingTest
                ? 'Detener Reproducción de Prueba'
                : activeTab === 'gamma'
                ? 'Probar Sonido de Explosión Gamma Ahora'
                : 'Escuchar Pista de Prueba Ahora'}
            </span>
          </button>

          {isCurrentCustom() && (
            <button
              onClick={handleResetDefault}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 font-medium text-xs rounded-xl transition-colors border border-neutral-700/60 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer a Sonido / Música Predeterminada</span>
            </button>
          )}
        </div>

        {/* Footer info */}
        <div className="text-[11px] text-neutral-400 bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/80 mb-5 leading-relaxed">
          <p>
            ✨ <strong>Tip:</strong> Puedes asignar canciones diferentes a cada nivel (1, 2 y Jefe) y un sonido personalizado para la explosión del rayo gamma. Si no cargas ningún archivo, sonarán los temas y efectos oficiales de alta fidelidad.
          </p>
        </div>

        {/* Ready Button */}
        <div>
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar / Continuar la Batalla
          </button>
        </div>
      </div>
    </div>
  );
};
