export type CharacterSkinId =
  | 'catvalen'
  | 'gata_gris'
  | 'gato_negro_blanco'
  | 'gato_blanco_manchas'
  | 'gata_azul_manchas'
  | 'perro_rubio'
  | 'perro_marron';

export interface SkinAbility {
  id: string;
  name: string;
  key: string;
  cooldown: number;
  description: string;
  iconType: 'beam' | 'mind_control' | 'shield_break' | 'light_laser' | 'dash' | 'magic_orbs' | 'energy_create' | 'energy_blades' | 'time_stop' | 'teleport' | 'heal' | 'fire' | 'lightning' | 'shield';
  color: string;
}

export interface CharacterSkin {
  id: CharacterSkinId;
  name: string;
  title: string;
  species: 'gato' | 'gata' | 'perro';
  requiredWins: number;
  description: string;
  maxHp: number;
  moveSpeed: number;
  shieldColor: string;
  shieldName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  abilities: SkinAbility[];
  passiveDescription?: string;
}

export const CHARACTER_SKINS: Record<CharacterSkinId, CharacterSkin> = {
  catvalen: {
    id: 'catvalen',
    name: 'Catvalen',
    title: 'Héroe Cuadrado Clásico',
    species: 'gato',
    requiredWins: 0,
    description: 'El gato cuadrado original. Maestro del combate cuerpo a cuerpo y poderes elementales equilibrados.',
    maxHp: 100,
    moveSpeed: 6.5,
    shieldColor: '#10b981',
    shieldName: 'Escudo Verde',
    primaryColor: '#7a7d83',
    secondaryColor: '#5a5d63',
    accentColor: '#10b981',
    abilities: [
      {
        id: 'punch',
        name: 'Golpe Puño',
        key: 'ESPACIO',
        cooldown: 0.75,
        description: 'Golpea cuerpo a cuerpo con sus manos circulares flotantes.',
        iconType: 'beam',
        color: '#9ca3af',
      },
      {
        id: 'fireball',
        name: 'Bola de Fuego',
        key: '1 / Q',
        cooldown: 2.2,
        description: 'Disparo explosivo que causa daño de área.',
        iconType: 'fire',
        color: '#f97316',
      },
      {
        id: 'lightning',
        name: 'Rayo Fulminante',
        key: '2 / E',
        cooldown: 3.4,
        description: 'Lanza eléctrica de alta penetración.',
        iconType: 'lightning',
        color: '#38bdf8',
      },
      {
        id: 'shield',
        name: 'Escudo Verde',
        key: 'SHIFT',
        cooldown: 7.5,
        description: 'Invulnerabilidad temporal total.',
        iconType: 'shield',
        color: '#10b981',
      },
      {
        id: 'heal',
        name: 'Curación',
        key: 'F',
        cooldown: 0.9,
        description: 'Restaura +35 HP (Hasta 10 usos).',
        iconType: 'heal',
        color: '#4ade80',
      },
    ],
  },

  gata_gris: {
    id: 'gata_gris',
    name: 'Catvalentina',
    title: 'Gata Gris Claro · Haz Esmeralda',
    species: 'gata',
    requiredWins: 2,
    description: 'Tiene 200 de vida, escudo celeste y su poder supremo: un rayo verde devastador que carga durante 4 segundos inmóvil.',
    maxHp: 200,
    moveSpeed: 6.5,
    shieldColor: '#38bdf8',
    shieldName: 'Escudo Celeste',
    primaryColor: '#d1d5db',
    secondaryColor: '#e5e7eb',
    accentColor: '#22c55e',
    passiveDescription: '200 HP de resistencia y escudo de energía celeste.',
    abilities: [
      {
        id: 'green_beam',
        name: 'Rayo Verde (Carga 4s)',
        key: '4 / G',
        cooldown: 9.0,
        description: 'Tarda 4s en cargarse (inmóvil durante la carga). Dispara un haz verde continuo (daño ajustado, este ataque no puede asestar Black Flash).',
        iconType: 'beam',
        color: '#22c55e',
      },
      {
        id: 'shield',
        name: 'Escudo Celeste',
        key: 'SHIFT',
        cooldown: 7.0,
        description: 'Escudo celeste de alta protección reflectante.',
        iconType: 'shield',
        color: '#38bdf8',
      },
      {
        id: 'fireball',
        name: 'Bola de Fuego',
        key: '1 / Q',
        cooldown: 2.2,
        description: 'Disparo explosivo ígneo.',
        iconType: 'fire',
        color: '#f97316',
      },
      {
        id: 'lightning',
        name: 'Rayo Fulminante',
        key: '2 / E',
        cooldown: 3.4,
        description: 'Lanza eléctrica penetrante.',
        iconType: 'lightning',
        color: '#38bdf8',
      },
      {
        id: 'heal',
        name: 'Curación',
        key: 'F',
        cooldown: 0.9,
        description: 'Restaura +35 HP (Hasta 10 usos).',
        iconType: 'heal',
        color: '#4ade80',
      },
    ],
  },

  gato_negro_blanco: {
    id: 'gato_negro_blanco',
    name: 'Laura',
    title: 'Gato Negro con Blanco · Control Psiónico',
    species: 'gato',
    requiredWins: 5,
    description: 'Elegante felino con poderes de control mental. Puede obligar a Nanovalen a golpearse solo o romper su escudo protector instantáneamente.',
    maxHp: 130,
    moveSpeed: 7.2,
    shieldColor: '#a855f7',
    shieldName: 'Escudo Psiónico Violeta',
    primaryColor: '#171717',
    secondaryColor: '#f8fafc',
    accentColor: '#c084fc',
    passiveDescription: 'Control mental sobre enemigos y mayor velocidad táctica.',
    abilities: [
      {
        id: 'mind_control',
        name: 'Auto-Golpe Mental',
        key: '4 / G',
        cooldown: 8.0,
        description: 'Toma el control de Nanovalen, forzándolo a golpearse violentamente a sí mismo recibiendo gran daño y cancelando sus ataques.',
        iconType: 'mind_control',
        color: '#d946ef',
      },
      {
        id: 'shield_break',
        name: 'Desactivar Escudo',
        key: '5 / T',
        cooldown: 7.0,
        description: 'Rompe y desactiva el escudo protector de Nanovalen de inmediato para poder atacarlo libremente sin esperas.',
        iconType: 'shield_break',
        color: '#c084fc',
      },
      {
        id: 'energy_rays',
        name: 'Rayos de Energía',
        key: '2 / E',
        cooldown: 2.8,
        description: 'Ráfaga de haces de energía psiónica oscura que atraviesan blindajes.',
        iconType: 'lightning',
        color: '#a855f7',
      },
      {
        id: 'heal',
        name: 'Curación',
        key: 'F',
        cooldown: 0.9,
        description: 'Restaura +35 HP (Hasta 10 usos).',
        iconType: 'heal',
        color: '#4ade80',
      },
    ],
  },

  gato_blanco_manchas: {
    id: 'gato_blanco_manchas',
    name: 'Zulmo',
    title: 'Gato Blanco con Manchas · Heraldo de Luz',
    species: 'gato',
    requiredWins: 10,
    description: 'Capaz de acelerar a una velocidad muy superior al resto de los gatos (+50%). Posee un radiante escudo amarillo y un láser lumínico amarillo de impacto instantáneo.',
    maxHp: 130,
    moveSpeed: 9.8, // Much faster than base 6.5
    shieldColor: '#eab308',
    shieldName: 'Escudo Amarillo de Luz',
    primaryColor: '#f8fafc',
    secondaryColor: '#ea580c',
    accentColor: '#facc15',
    passiveDescription: '¡Acelera a más velocidad que otros gatos (+50% velocidad continua)!',
    abilities: [
      {
        id: 'light_laser',
        name: 'Láser Lumínico Amarillo',
        key: '4 / G',
        cooldown: 4.0,
        description: 'Láser amarillo de fotones concentrados de impacto instantáneo que abrasa a Nanovalen y perfora cualquier obstáculo.',
        iconType: 'light_laser',
        color: '#facc15',
      },
      {
        id: 'photon_dash',
        name: 'Destello Fotónico',
        key: '5 / T',
        cooldown: 3.5,
        description: 'Aceleración lumínica extrema instantánea en tu dirección de movimiento.',
        iconType: 'dash',
        color: '#fbbf24',
      },
      {
        id: 'shield',
        name: 'Escudo Amarillo',
        key: 'SHIFT',
        cooldown: 6.5,
        description: 'Cúpula de luz dorada resplandeciente.',
        iconType: 'shield',
        color: '#facc15',
      },
      {
        id: 'heal',
        name: 'Curación',
        key: 'F',
        cooldown: 0.9,
        description: 'Restaura +35 HP (Hasta 10 usos).',
        iconType: 'heal',
        color: '#4ade80',
      },
    ],
  },

  gata_azul_manchas: {
    id: 'gata_azul_manchas',
    name: 'Marta',
    title: 'Gata Azul Clarito con Manchas · Magia Verde y Vida',
    species: 'gata',
    requiredWins: 20,
    description: 'Especialista en magia verde ancestral, regeneración constante de salud (+2.5 HP/s), 15 curaciones potenciadas y esferas místicas de energía teledirigidas.',
    maxHp: 160,
    moveSpeed: 7.2,
    shieldColor: '#06b6d4',
    shieldName: 'Escudo Mágico Turquesa',
    primaryColor: '#7dd3fc',
    secondaryColor: '#0284c7',
    accentColor: '#10b981',
    passiveDescription: 'Regeneración continua de vida pasiva (+2.5 HP/s) y 15 curaciones potenciadas.',
    abilities: [
      {
        id: 'magic_orbs',
        name: 'Bolas de Poder Mágico',
        key: '4 / G',
        cooldown: 3.5,
        description: 'Dispara 3 esferas de magia verde teledirigidas que buscan a Nanovalen y rebotan generando explosiones florales.',
        iconType: 'magic_orbs',
        color: '#10b981',
      },
      {
        id: 'green_heal_burst',
        name: 'Magia Verde Curativa',
        key: 'F',
        cooldown: 0.8,
        description: 'Magia sanadora potenciada: restaura +50 HP y genera un aura que disuelve proyectiles enemigos (15 usos).',
        iconType: 'heal',
        color: '#34d399',
      },
      {
        id: 'shield',
        name: 'Escudo Esmeralda',
        key: 'SHIFT',
        cooldown: 6.5,
        description: 'Burbuja de runas arcanas protectoras.',
        iconType: 'shield',
        color: '#059669',
      },
    ],
  },

  perro_rubio: {
    id: 'perro_rubio',
    name: 'Fermin',
    title: 'Perro Rubio · Creación de Materia y Energía',
    species: 'perro',
    requiredWins: 25,
    description: 'Adorable y poderoso canino rubio. Tiene el poder de crear objetos de la nada con energía: yunques colosales que aplastan y espadas flotantes.',
    maxHp: 170,
    moveSpeed: 7.4,
    shieldColor: '#f59e0b',
    shieldName: 'Escudo de Construcción Ámbar',
    primaryColor: '#facc15',
    secondaryColor: '#ca8a04',
    accentColor: '#f59e0b',
    passiveDescription: 'Capacidad de materializar construcciones de energía de la nada.',
    abilities: [
      {
        id: 'energy_anvil',
        name: 'Crear Yunque de Energía',
        key: '4 / G',
        cooldown: 5.5,
        description: 'Crea de la nada un masivo yunque de pura energía cósmica que cae aplastando todo con temblor e impacto colosal.',
        iconType: 'energy_create',
        color: '#eab308',
      },
      {
        id: 'energy_blades',
        name: 'Espadas de Energía',
        key: '5 / T',
        cooldown: 3.8,
        description: 'Materializa de la nada 4 espadas de luz sólida que orbitan y salen disparadas a alta velocidad hacia Nanovalen.',
        iconType: 'energy_blades',
        color: '#f59e0b',
      },
      {
        id: 'shield',
        name: 'Escudo Ámbar',
        key: 'SHIFT',
        cooldown: 7.0,
        description: 'Barrera geométrica de energía construida.',
        iconType: 'shield',
        color: '#f59e0b',
      },
      {
        id: 'heal',
        name: 'Curación',
        key: 'F',
        cooldown: 0.9,
        description: 'Restaura +35 HP (Hasta 10 usos).',
        iconType: 'heal',
        color: '#4ade80',
      },
    ],
  },

  perro_marron: {
    id: 'perro_marron',
    name: 'Tina',
    title: 'Perro Marrón · Señora del Tiempo y Teletransporte',
    species: 'perro',
    requiredWins: 50,
    description: 'El perro definitivo de cronos. Puede detener el tiempo por completo (pausando a Nanovalen y todo el entorno mientras él sigue atacando), teletransportarse y moverse con máxima rapidez.',
    maxHp: 180,
    moveSpeed: 10.2, // Highest speed!
    shieldColor: '#b45309',
    shieldName: 'Escudo Cronológico Bronce',
    primaryColor: '#78350f',
    secondaryColor: '#92400e',
    accentColor: '#f59e0b',
    passiveDescription: '¡Máxima rapidez de movimiento (+57% velocidad) y control absoluto de la línea temporal!',
    abilities: [
      {
        id: 'time_stop',
        name: 'Detener el Tiempo (4.5s)',
        key: '4 / G',
        cooldown: 12.0,
        description: 'Detiene el tiempo: TODO se pausa excepto tú. Puedes moverte libremente y golpear a Nanovalen sin que pueda reaccionar.',
        iconType: 'time_stop',
        color: '#d97706',
      },
      {
        id: 'teleport',
        name: 'Teletransporte Crono',
        key: '5 / T',
        cooldown: 3.2,
        description: 'Warp temporal instantáneo hacia la dirección que estás mirando o directamente a la espalda de Nanovalen.',
        iconType: 'teleport',
        color: '#fbbf24',
      },
      {
        id: 'shield',
        name: 'Escudo Crono',
        key: 'SHIFT',
        cooldown: 6.5,
        description: 'Barrera de engranajes temporales dorados.',
        iconType: 'shield',
        color: '#d97706',
      },
      {
        id: 'heal',
        name: 'Curación',
        key: 'F',
        cooldown: 0.9,
        description: 'Restaura +35 HP (Hasta 10 usos).',
        iconType: 'heal',
        color: '#4ade80',
      },
    ],
  },
};

export const SKINS_ARRAY: CharacterSkin[] = [
  CHARACTER_SKINS.catvalen,
  CHARACTER_SKINS.gata_gris,
  CHARACTER_SKINS.gato_negro_blanco,
  CHARACTER_SKINS.gato_blanco_manchas,
  CHARACTER_SKINS.gata_azul_manchas,
  CHARACTER_SKINS.perro_rubio,
  CHARACTER_SKINS.perro_marron,
];

const WINS_STORAGE_KEY = 'catvalen_nanovalen_wins';
const SELECTED_SKIN_STORAGE_KEY = 'catvalen_selected_skin';
const ADMIN_UNLOCK_ALL_STORAGE_KEY = 'catvalen_admin_unlock_all';

export function getAdminUnlockAll(): boolean {
  try {
    return localStorage.getItem(ADMIN_UNLOCK_ALL_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveAdminUnlockAll(unlocked: boolean): void {
  try {
    localStorage.setItem(ADMIN_UNLOCK_ALL_STORAGE_KEY, unlocked ? 'true' : 'false');
  } catch {
    // Ignore storage errors in sandbox
  }
}

export function getSavedNanovalenWins(): number {
  try {
    const raw = localStorage.getItem(WINS_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  } catch {
    return 0;
  }
}

export function saveNanovalenWins(wins: number): void {
  try {
    localStorage.setItem(WINS_STORAGE_KEY, Math.max(0, wins).toString());
  } catch {
    // Ignore storage errors in sandbox
  }
}

export function getSavedSelectedSkin(): CharacterSkinId {
  try {
    const raw = localStorage.getItem(SELECTED_SKIN_STORAGE_KEY) as CharacterSkinId;
    if (raw && CHARACTER_SKINS[raw]) {
      return raw;
    }
  } catch {
    // fallback
  }
  return 'catvalen';
}

export function saveSelectedSkin(skinId: CharacterSkinId): void {
  try {
    localStorage.setItem(SELECTED_SKIN_STORAGE_KEY, skinId);
  } catch {
    // Ignore storage errors in sandbox
  }
}

export function isSkinUnlocked(skinId: CharacterSkinId, currentWins: number, adminUnlocked?: boolean): boolean {
  if (adminUnlocked || getAdminUnlockAll()) {
    return true;
  }
  const skin = CHARACTER_SKINS[skinId];
  if (!skin) return false;
  return currentWins >= skin.requiredWins;
}
