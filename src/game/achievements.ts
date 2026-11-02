/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Achievement {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  reward?: string;
}

const ACHIEVEMENTS_STORAGE_KEY = 'catvalen_achievements_v1';

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'you_played',
    title: 'You played!',
    subtitle: 'Entraste a una partida',
    description: 'Iniciaste una partida en solitario o te uniste a una sala multijugador.',
    icon: '🎮',
    unlocked: false,
  },
  {
    id: 'complete_level_1',
    title: 'Completaste el nivel 1',
    subtitle: 'La Ciudad',
    description: 'Demoliste los rascacielos al 100% y despegaste hacia la atmósfera espacial.',
    icon: '🏙️',
    unlocked: false,
  },
  {
    id: 'complete_level_2',
    title: 'Completaste el nivel 2',
    subtitle: 'Espacio Exterior',
    description: 'Pulverizaste asteroides espaciales y forzaste la aparición del robot Nanovalen.',
    icon: '🌌',
    unlocked: false,
  },
  {
    id: 'defeat_nanovalen',
    title: 'Derrotaste a Nanovalen',
    subtitle: 'Nivel 3: El Titán Robótico',
    description: 'Venciste a Nanovalen esquivando sus estallidos de rayos gamma y meteoritos.',
    icon: '🤖',
    unlocked: false,
  },
  {
    id: 'defeat_santiscat',
    title: 'Derrotaste a Santiscat',
    subtitle: 'Nivel 4: Fases 1, 2 y 2.5',
    description: 'Sobreviviste al agujero de gusano, te rehusaste a morir y derrotaste a Santiscat cósmico.',
    icon: '👑',
    unlocked: false,
    reward: '👑 Recompensa: Panel de Administrador desbloqueado para siempre.',
  },
];

type AchievementUnlockListener = (achievement: Achievement) => void;
const listeners: Set<AchievementUnlockListener> = new Set();

export function onAchievementUnlocked(listener: AchievementUnlockListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSavedAchievements(): Achievement[] {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!raw) return INITIAL_ACHIEVEMENTS;
    const parsed = JSON.parse(raw) as Record<string, { unlocked: boolean; unlockedAt?: number }>;
    return INITIAL_ACHIEVEMENTS.map((ach) => ({
      ...ach,
      unlocked: Boolean(parsed[ach.id]?.unlocked),
      unlockedAt: parsed[ach.id]?.unlockedAt,
    }));
  } catch {
    return INITIAL_ACHIEVEMENTS;
  }
}

export function saveAchievements(achievements: Achievement[]): void {
  try {
    const map: Record<string, { unlocked: boolean; unlockedAt?: number }> = {};
    achievements.forEach((ach) => {
      if (ach.unlocked) {
        map[ach.id] = { unlocked: true, unlockedAt: ach.unlockedAt };
      }
    });
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Error saving achievements:', e);
  }
}

export function unlockAchievement(achievementId: string): Achievement | null {
  const current = getSavedAchievements();
  const target = current.find((a) => a.id === achievementId);
  if (!target || target.unlocked) return null;

  target.unlocked = true;
  target.unlockedAt = Date.now();
  saveAchievements(current);

  listeners.forEach((listener) => {
    try {
      listener(target);
    } catch (e) {
      console.error('Error executing achievement listener:', e);
    }
  });

  return target;
}

export function isAchievementUnlocked(achievementId: string): boolean {
  const current = getSavedAchievements();
  const target = current.find((a) => a.id === achievementId);
  return Boolean(target?.unlocked);
}

/**
 * Admin Panel Permission Rule:
 * The PC host always has access.
 * Other players have it locked UNTIL they unlock the achievement "Derrotaste a santiscat".
 */
export function canAccessAdminPanel(isHost: boolean): boolean {
  if (isHost) return true;
  return isAchievementUnlocked('defeat_santiscat');
}
