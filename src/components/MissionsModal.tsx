/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  SideQuest,
  getSavedSideQuests,
  resetSideQuests,
  calculateActivePowerBonuses,
  ActivePowerBonuses,
} from '../game/sideQuests';
import {
  Target,
  CheckCircle2,
  X,
  Zap,
  RotateCcw,
  Building2,
  Rocket,
  Skull,
  Shield,
  Flame,
} from 'lucide-react';

interface MissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestsUpdated?: () => void;
}

type CategoryTab = 'all' | 'city' | 'space' | 'bosses' | 'combat';

export const MissionsModal: React.FC<MissionsModalProps> = ({
  isOpen,
  onClose,
  onQuestsUpdated,
}) => {
  const [quests, setQuests] = useState<SideQuest[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryTab>('all');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const reloadQuests = () => {
    setQuests(getSavedSideQuests());
  };

  useEffect(() => {
    if (isOpen) {
      reloadQuests();
      setShowResetConfirm(false);
    }
  }, [isOpen]);

  const powerBonuses: ActivePowerBonuses = useMemo(() => {
    return calculateActivePowerBonuses(quests);
  }, [quests]);

  if (!isOpen) return null;

  const completedCount = quests.filter((q) => q.completed).length;

  const filteredQuests = quests.filter((q) => {
    if (selectedCategory === 'all') return true;
    return q.category === selectedCategory;
  });

  const handleReset = () => {
    const fresh = resetSideQuests();
    setQuests(fresh);
    setShowResetConfirm(false);
    if (onQuestsUpdated) onQuestsUpdated();
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'city':
        return <Building2 className="w-3.5 h-3.5 text-amber-400" />;
      case 'space':
        return <Rocket className="w-3.5 h-3.5 text-cyan-400" />;
      case 'bosses':
        return <Skull className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Zap className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  // Percent bonuses for summary display
  const buildingBonusPct = Math.round((powerBonuses.buildingMultiplier - 1) * 100);
  const asteroidBonusPct = Math.round((powerBonuses.asteroidMultiplier - 1) * 100);
  const bossBonusPct = Math.round((powerBonuses.bossMultiplier - 1) * 100);
  const globalBonusPct = Math.round((powerBonuses.globalMultiplier - 1) * 100);
  const critBonusPct = Math.round((powerBonuses.critMultiplier - 1) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-neutral-900 border-2 border-cyan-500/60 rounded-3xl p-4 sm:p-6 max-w-2xl w-full text-white shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-96 h-36 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-400/50 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Target className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black font-display tracking-wide text-white">
                  MISIONES SECUNDARIAS
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  POTENCIA DE ATAQUE
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Completa objetivos para potenciar tus golpes contra edificios, asteroides y jefes.
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

        {/* Active Power Multipliers Summary */}
        <div className="mb-3.5 p-3 rounded-2xl bg-gradient-to-r from-neutral-950/90 via-neutral-900 to-neutral-950/90 border border-cyan-500/30 shrink-0 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Bonus de Daño Activos Acumulados:
            </div>
            <span className="text-xs font-semibold text-neutral-400">
              {completedCount} de {quests.length} misiones
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-xl bg-neutral-900/90 border border-amber-500/30">
              <div className="text-[10px] text-amber-300 font-semibold flex items-center justify-center gap-1">
                <Building2 className="w-3 h-3" /> Edificios
              </div>
              <div className="text-base font-black text-amber-400">
                +{buildingBonusPct}%
              </div>
            </div>

            <div className="p-2 rounded-xl bg-neutral-900/90 border border-cyan-500/30">
              <div className="text-[10px] text-cyan-300 font-semibold flex items-center justify-center gap-1">
                <Rocket className="w-3 h-3" /> Asteroides
              </div>
              <div className="text-base font-black text-cyan-400">
                +{asteroidBonusPct}%
              </div>
            </div>

            <div className="p-2 rounded-xl bg-neutral-900/90 border border-rose-500/30">
              <div className="text-[10px] text-rose-300 font-semibold flex items-center justify-center gap-1">
                <Skull className="w-3 h-3" /> Jefes
              </div>
              <div className="text-base font-black text-rose-400">
                +{bossBonusPct}%
              </div>
            </div>

            <div className="p-2 rounded-xl bg-neutral-900/90 border border-emerald-500/30">
              <div className="text-[10px] text-emerald-300 font-semibold flex items-center justify-center gap-1">
                <Flame className="w-3 h-3" /> Global / Crit
              </div>
              <div className="text-base font-black text-emerald-400">
                +{globalBonusPct + critBonusPct}%
              </div>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 pb-2 border-b border-neutral-800/80 mb-3 shrink-0 overflow-x-auto">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'city', label: 'Ciudad' },
            { id: 'space', label: 'Espacio' },
            { id: 'bosses', label: 'Jefes' },
            { id: 'combat', label: 'Combate' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as CategoryTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-cyan-500 text-neutral-950 shadow-md shadow-cyan-500/30'
                  : 'bg-neutral-800/70 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quests List */}
        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1 min-h-0">
          {filteredQuests.map((quest) => {
            const progressRatio = Math.min(1, quest.current / quest.target);
            const progressPercent = Math.round(progressRatio * 100);

            return (
              <div
                key={quest.id}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
                  quest.completed
                    ? 'bg-neutral-900/90 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                    : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-2.5">
                    <div className="text-2xl shrink-0 mt-0.5">{quest.icon}</div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-white">
                          {quest.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-neutral-800 text-neutral-300 flex items-center gap-1 border border-neutral-700/60">
                          {getCategoryIcon(quest.category)}
                          {quest.category.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {quest.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {quest.completed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        COMPLETADA
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold text-neutral-400">
                        {quest.current.toLocaleString()} / {quest.target.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Reward */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex-1">
                    <div className="w-full h-2 bg-neutral-950 rounded-full border border-neutral-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          quest.completed
                            ? 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                        quest.completed
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {quest.rewardText}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-neutral-800/80 flex items-center justify-between gap-3 shrink-0">
          {showResetConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-400 font-semibold">
                ¿Reiniciar todo el progreso?
              </span>
              <button
                onClick={handleReset}
                className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition cursor-pointer"
              >
                Sí, reiniciar
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-2 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-rose-400 transition cursor-pointer"
              title="Reinicia las misiones para volver a conseguir los aumentos"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reiniciar Misiones
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white shadow-lg shadow-cyan-600/30 transition cursor-pointer"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
