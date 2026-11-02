/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type QuestCategory = 'city' | 'space' | 'bosses' | 'combat';

export type QuestBoostType =
  | 'building_damage'
  | 'asteroid_damage'
  | 'boss_damage'
  | 'global_damage'
  | 'punch_damage'
  | 'fire_damage'
  | 'lightning_damage'
  | 'crit_damage';

export interface SideQuest {
  id: string;
  title: string;
  category: QuestCategory;
  categoryName: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  completed: boolean;
  completedAt?: number;
  rewardText: string;
  boostType: QuestBoostType;
  boostPercent: number; // e.g. 25 for +25%
  stageRecommendation: string;
}

export interface ActivePowerBonuses {
  buildingMultiplier: number; // e.g. 1.45 (1.0 + 0.45)
  asteroidMultiplier: number; // e.g. 1.55 (1.0 + 0.55)
  bossMultiplier: number;     // e.g. 1.65 (1.0 + 0.65)
  globalMultiplier: number;   // e.g. 1.30 (1.0 + 0.30)
  punchMultiplier: number;    // e.g. 1.25
  fireMultiplier: number;     // e.g. 1.20
  lightningMultiplier: number;// e.g. 1.25
  critMultiplier: number;     // e.g. 1.35
  totalCompleted: number;
  totalQuests: number;
  totalPercentBonus: number;  // sum of all unlocked percentages
}

const SIDE_QUESTS_STORAGE_KEY = 'catvalen_side_quests_v1';

export const INITIAL_SIDE_QUESTS: SideQuest[] = [
  // --- NIVEL 1: CIUDAD ---
  {
    id: 'demolisher_punch',
    title: 'Demoledor Titánico',
    category: 'city',
    categoryName: 'Nivel 1: Ciudad',
    description: 'Destruye 12 edificios usando Puñetazos cuerpo a cuerpo [J].',
    icon: '🥊',
    target: 12,
    current: 0,
    completed: false,
    rewardText: '+25% Daño de Puñetazos y Demolición',
    boostType: 'punch_damage',
    boostPercent: 25,
    stageRecommendation: 'Nivel 1 (Ciudad)',
  },
  {
    id: 'fire_storm_city',
    title: 'Bombardeo Ígneo',
    category: 'city',
    categoryName: 'Nivel 1: Ciudad',
    description: 'Incinera y destruye 8 edificios con Bolas de Fuego [K].',
    icon: '🔥',
    target: 8,
    current: 0,
    completed: false,
    rewardText: '+20% Potencia de Fuego y Onda Expansiva',
    boostType: 'fire_damage',
    boostPercent: 20,
    stageRecommendation: 'Nivel 1 (Ciudad)',
  },
  {
    id: 'cosmic_lightning_urban',
    title: 'Pararrayos Celestial',
    category: 'city',
    categoryName: 'Nivel 1: Ciudad',
    description: 'Acierta 10 Rayos Cósmicos [L] contra estructuras o enemigos.',
    icon: '⚡',
    target: 10,
    current: 0,
    completed: false,
    rewardText: '+25% Potencia Eléctrica y Perforación',
    boostType: 'lightning_damage',
    boostPercent: 25,
    stageRecommendation: 'Nivel 1 o Espacio',
  },

  // --- NIVEL 2: ESPACIO PROFUNDO ---
  {
    id: 'asteroid_shredder',
    title: 'Pulverizador de Meteoros',
    category: 'space',
    categoryName: 'Nivel 2: Espacio',
    description: 'Destruye 15 asteroides o meteoritos espaciales.',
    icon: '☄️',
    target: 15,
    current: 0,
    completed: false,
    rewardText: '+30% Daño contra Asteroides Espaciales',
    boostType: 'asteroid_damage',
    boostPercent: 30,
    stageRecommendation: 'Nivel 2 (Espacio)',
  },
  {
    id: 'power_burst_cosmic',
    title: 'Estallido Estelar',
    category: 'space',
    categoryName: 'Nivel 2: Espacio',
    description: 'Destruye 6 meteoritos usando la Ráfaga de Poder [U] o habilidades especiales.',
    icon: '💫',
    target: 6,
    current: 0,
    completed: false,
    rewardText: '+25% Daño a Obstáculos y Mayor Alcance',
    boostType: 'building_damage',
    boostPercent: 25,
    stageRecommendation: 'Nivel 2 (Espacio)',
  },
  {
    id: 'shield_guardian',
    title: 'Guardián Impenetrable',
    category: 'combat',
    categoryName: 'Defensa y Combate',
    description: 'Bloquea 8 impactos de proyectiles o colisiones usando tu Escudo [SHIFT / I].',
    icon: '🛡️',
    target: 8,
    current: 0,
    completed: false,
    rewardText: '+20% Potencia Global en Todos los Poderes',
    boostType: 'global_damage',
    boostPercent: 20,
    stageRecommendation: 'Todos los Niveles',
  },

  // --- NIVELES 3 Y 4: COMBATE DE JEFES (NANOVALEN Y SANTISCAT) ---
  {
    id: 'drone_hunter',
    title: 'Cazador de Drones Tácticos',
    category: 'bosses',
    categoryName: 'Nivel 3: Nanovalen',
    description: 'Destruye 3 drones de combate desplegados por Nanovalen.',
    icon: '🤖',
    target: 3,
    current: 0,
    completed: false,
    rewardText: '+30% Daño Crítico contra Nanovalen y Jefes',
    boostType: 'boss_damage',
    boostPercent: 30,
    stageRecommendation: 'Nivel 3 (Boss Nanovalen)',
  },
  {
    id: 'black_flash_master',
    title: 'Maestro del Destello Negro',
    category: 'combat',
    categoryName: 'Combate Avanzado',
    description: 'Acierta 2 golpes críticos de Black Flash (2% de probabilidad o garantizados).',
    icon: '★',
    target: 2,
    current: 0,
    completed: false,
    rewardText: '+35% Daño Crítico de Black Flash',
    boostType: 'crit_damage',
    boostPercent: 35,
    stageRecommendation: 'Combates contra Jefes',
  },
  {
    id: 'jujutsu_cleanser',
    title: 'Purificador de Entidades',
    category: 'bosses',
    categoryName: 'Nivel 4: Santiscat',
    description: 'Daña a los clones de Jujutsu (Sukunacat / Gojocat) o esquiva 4 reality slashes.',
    icon: '⛩️',
    target: 4,
    current: 0,
    completed: false,
    rewardText: '+35% Potencia de Ataque contra Santiscat y Jefes Cósmicos',
    boostType: 'boss_damage',
    boostPercent: 35,
    stageRecommendation: 'Nivel 4 (Santiscat)',
  },
  {
    id: 'survivor_elite',
    title: 'Superviviente Cósmico',
    category: 'combat',
    categoryName: 'Resistencia Extrema',
    description: 'Sobrevive durante 60 segundos de combate sin que tu salud caiga del 40%.',
    icon: '❤️',
    target: 60,
    current: 0,
    completed: false,
    rewardText: '+25% Daño Masivo en Todos los Ataques',
    boostType: 'global_damage',
    boostPercent: 25,
    stageRecommendation: 'Cualquier Nivel / Arena',
  },
];

type QuestCompleteListener = (quest: SideQuest) => void;
const questCompleteListeners: Set<QuestCompleteListener> = new Set();

export function onQuestCompleted(listener: QuestCompleteListener): () => void {
  questCompleteListeners.add(listener);
  return () => questCompleteListeners.delete(listener);
}

export function getSavedSideQuests(): SideQuest[] {
  try {
    const raw = localStorage.getItem(SIDE_QUESTS_STORAGE_KEY);
    if (!raw) return INITIAL_SIDE_QUESTS.map(q => ({ ...q }));
    const parsed = JSON.parse(raw) as Record<string, { current: number; completed: boolean; completedAt?: number }>;
    return INITIAL_SIDE_QUESTS.map((q) => ({
      ...q,
      current: Math.min(q.target, Math.max(0, parsed[q.id]?.current ?? 0)),
      completed: Boolean(parsed[q.id]?.completed),
      completedAt: parsed[q.id]?.completedAt,
    }));
  } catch {
    return INITIAL_SIDE_QUESTS.map(q => ({ ...q }));
  }
}

export function saveSideQuests(quests: SideQuest[]): void {
  try {
    const map: Record<string, { current: number; completed: boolean; completedAt?: number }> = {};
    quests.forEach((q) => {
      map[q.id] = {
        current: q.current,
        completed: q.completed,
        completedAt: q.completedAt,
      };
    });
    localStorage.setItem(SIDE_QUESTS_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Error saving side quests:', e);
  }
}

export function resetSideQuests(): SideQuest[] {
  try {
    localStorage.removeItem(SIDE_QUESTS_STORAGE_KEY);
  } catch (e) {
    console.error('Error resetting quests:', e);
  }
  return INITIAL_SIDE_QUESTS.map(q => ({ ...q }));
}

/**
 * Calculates real-time total power multipliers derived from all completed side quests
 */
export function calculateActivePowerBonuses(quests: SideQuest[]): ActivePowerBonuses {
  let buildingBonus = 0;
  let asteroidBonus = 0;
  let bossBonus = 0;
  let globalBonus = 0;
  let punchBonus = 0;
  let fireBonus = 0;
  let lightningBonus = 0;
  let critBonus = 0;
  let totalCompleted = 0;
  let totalPercentBonus = 0;

  quests.forEach((q) => {
    if (q.completed) {
      totalCompleted++;
      totalPercentBonus += q.boostPercent;
      const factor = q.boostPercent / 100;

      switch (q.boostType) {
        case 'building_damage':
          buildingBonus += factor;
          break;
        case 'asteroid_damage':
          asteroidBonus += factor;
          break;
        case 'boss_damage':
          bossBonus += factor;
          break;
        case 'global_damage':
          globalBonus += factor;
          break;
        case 'punch_damage':
          punchBonus += factor;
          buildingBonus += factor * 0.5;
          break;
        case 'fire_damage':
          fireBonus += factor;
          buildingBonus += factor * 0.5;
          break;
        case 'lightning_damage':
          lightningBonus += factor;
          bossBonus += factor * 0.5;
          break;
        case 'crit_damage':
          critBonus += factor;
          bossBonus += factor * 0.5;
          break;
      }
    }
  });

  return {
    buildingMultiplier: 1.0 + buildingBonus + globalBonus,
    asteroidMultiplier: 1.0 + asteroidBonus + globalBonus,
    bossMultiplier: 1.0 + bossBonus + globalBonus,
    globalMultiplier: 1.0 + globalBonus,
    punchMultiplier: 1.0 + punchBonus + globalBonus,
    fireMultiplier: 1.0 + fireBonus + globalBonus,
    lightningMultiplier: 1.0 + lightningBonus + globalBonus,
    critMultiplier: 1.0 + critBonus + globalBonus,
    totalCompleted,
    totalQuests: quests.length,
    totalPercentBonus,
  };
}

/**
 * Progresses a quest by amount and triggers listeners if newly completed
 */
export function progressQuestItem(
  quests: SideQuest[],
  questId: string,
  amount: number = 1
): { quests: SideQuest[]; newlyCompletedQuest: SideQuest | null } {
  let newlyCompletedQuest: SideQuest | null = null;
  const updated = quests.map((q) => {
    if (q.id === questId) {
      if (q.completed) return q;
      const nextVal = Math.min(q.target, q.current + amount);
      const isNowCompleted = nextVal >= q.target;
      if (isNowCompleted && !q.completed) {
        newlyCompletedQuest = {
          ...q,
          current: nextVal,
          completed: true,
          completedAt: Date.now(),
        };
        return newlyCompletedQuest;
      }
      return {
        ...q,
        current: nextVal,
      };
    }
    return q;
  });

  if (newlyCompletedQuest) {
    saveSideQuests(updated);
    questCompleteListeners.forEach((fn) => fn(newlyCompletedQuest!));
  } else {
    // Only save occasionally or when value changed
    saveSideQuests(updated);
  }

  return { quests: updated, newlyCompletedQuest };
}
