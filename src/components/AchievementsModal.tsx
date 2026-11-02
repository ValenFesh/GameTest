/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Achievement, getSavedAchievements } from '../game/achievements';
import { Trophy, CheckCircle2, Lock, X, Sparkles, Crown } from 'lucide-react';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHost?: boolean;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  isHost = false,
}) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (isOpen) {
      setAchievements(getSavedAchievements());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-neutral-900 border-2 border-amber-500/60 rounded-3xl p-5 sm:p-6 max-w-xl w-full text-white shadow-2xl relative my-auto">
        {/* Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-black font-display tracking-wide text-white">
                SISTEMA DE LOGROS
              </h2>
              <p className="text-xs text-neutral-400">
                Progreso: <span className="text-amber-400 font-bold">{unlockedCount} / {achievements.length}</span> completados
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="w-full h-3 bg-neutral-950 rounded-full border border-neutral-800 overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-300"
              style={{ width: `${(unlockedCount / (achievements.length || 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Host vs Guest Admin Panel Note */}
        <div className="mb-4 p-3 rounded-2xl bg-neutral-800/50 border border-neutral-700/60 flex items-center gap-2.5 text-xs">
          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="text-neutral-300">
            {isHost ? (
              <span>Eres la <strong>PC Anfitriona</strong>: Tienes acceso total al <strong>Panel de Administrador</strong>.</span>
            ) : achievements.find((a) => a.id === 'defeat_santiscat')?.unlocked ? (
              <span className="text-emerald-300 font-bold">¡Has derrotado a Santiscat! Panel de Administrador DESBLOQUEADO para ti.</span>
            ) : (
              <span>Los jugadores invitados necesitan desbloquear el logro <strong>"Derrotaste a santiscat"</strong> para usar el Panel Admin.</span>
            )}
          </div>
        </div>

        {/* Achievements List */}
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                ach.unlocked
                  ? 'bg-neutral-800/80 border-amber-500/50 shadow-md'
                  : 'bg-neutral-900/60 border-neutral-800 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl border ${
                    ach.unlocked
                      ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 shadow-inner'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-500'
                  }`}
                >
                  {ach.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">
                      {ach.title}
                    </span>
                    <span className="text-[11px] text-amber-400/90 font-bold">
                      ({ach.subtitle})
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    {ach.description}
                  </p>
                  {ach.reward && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-black text-emerald-300">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>{ach.reward}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                {ach.unlocked ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-500">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Close Button */}
        <div className="mt-5 pt-3 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/20"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
