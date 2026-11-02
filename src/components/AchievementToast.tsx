/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Achievement, onAchievementUnlocked } from '../game/achievements';
import { Trophy, Sparkles } from 'lucide-react';

export const AchievementToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<Achievement | null>(null);

  useEffect(() => {
    const unsub = onAchievementUnlocked((ach) => {
      setActiveToast(ach);
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    });
    return unsub;
  }, []);

  if (!activeToast) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-bounce">
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border-2 border-amber-400 rounded-2xl px-5 py-3.5 shadow-[0_0_35px_rgba(251,191,36,0.45)] backdrop-blur-md flex items-center gap-3.5 max-w-md w-full">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0 shadow-inner">
          <span className="text-2xl">{activeToast.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 tracking-wider uppercase font-display">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>¡LOGRO DESBLOQUEADO!</span>
          </div>
          <div className="text-sm font-black text-white truncate">
            {activeToast.title}
          </div>
          <div className="text-[11px] text-neutral-300 font-medium">
            {activeToast.subtitle}
          </div>
          {activeToast.reward && (
            <div className="text-[10px] font-bold text-emerald-300 mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>{activeToast.reward}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
