import React from 'react';
import { GameEngine } from '../game/gameEngine';
import { soundManager } from '../audio/soundManager';
import { CHARACTER_SKINS } from '../game/skins';
import {
  Volume2,
  VolumeX,
  Shield,
  Flame,
  Zap,
  Crosshair,
  Sparkles,
  Heart,
  Music,
  Radio,
  Eye,
  ShieldAlert,
  Sun,
  Wind,
  Clock,
  Compass,
  Hammer,
  Sword,
  Sparkle,
  Crown,
} from 'lucide-react';

interface HUDProps {
  engine: GameEngine;
  onPunch: () => void;
  onFireball: () => void;
  onLightning: () => void;
  onPowerBurst: () => void;
  onShield: () => void;
  onHeal: () => void;
  onSpecial1?: () => void;
  onSpecial2?: () => void;
  onOpenAudioModal?: () => void;
  onOpenAdminModal?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  engine,
  onPunch,
  onFireball,
  onLightning,
  onPowerBurst,
  onShield,
  onHeal,
  onSpecial1,
  onSpecial2,
  onOpenAudioModal,
  onOpenAdminModal,
  isMuted,
  onToggleMute,
}) => {
  const player = engine.player;
  const boss = engine.boss;
  const stage = engine.stage;
  const skinConfig = CHARACTER_SKINS[player.skin] || CHARACTER_SKINS.catvalen;

  if (stage === 'cinematic_earth_destruction') {
    return (
      <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-auto z-50">
        <button
          onClick={() => engine.skipCinematic()}
          className="px-4 py-2 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-full border border-neutral-700 text-xs font-bold font-game tracking-wider backdrop-blur-md shadow-xl transition-all active:scale-95 cursor-pointer"
        >
          Saltar Cinemática [Espacio]
        </button>
      </div>
    );
  }

  const hpPercent = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));

  // Cooldown percentages for visual overlays
  const punchCdPercent = player.punchCooldown > 0 ? (player.punchCooldown / player.punchMaxCooldown) * 100 : 0;
  const fireballCdPercent = player.fireballCooldown > 0 ? (player.fireballCooldown / player.fireballMaxCooldown) * 100 : 0;
  const lightningCdPercent = player.lightningCooldown > 0 ? (player.lightningCooldown / player.lightningMaxCooldown) * 100 : 0;
  const burstCdPercent = player.powerBurstCooldown > 0 ? (player.powerBurstCooldown / player.powerBurstMaxCooldown) * 100 : 0;
  const shieldCdPercent = player.shieldCooldown > 0 ? (player.shieldCooldown / player.shieldMaxCooldown) * 100 : 0;
  const healCdPercent = player.healCooldown > 0 ? (player.healCooldown / 0.85) * 100 : 0;
  const special1CdPercent = player.special1Cooldown > 0 ? (player.special1Cooldown / (player.special1MaxCooldown || 6.0)) * 100 : 0;
  const special2CdPercent = player.special2Cooldown > 0 ? (player.special2Cooldown / (player.special2MaxCooldown || 4.0)) * 100 : 0;

  const punchCd = player.punchCooldown > 0;
  const fireballCd = player.fireballCooldown > 0;
  const lightningCd = player.lightningCooldown > 0;
  const burstCd = player.powerBurstCooldown > 0;
  const healCd = player.healCooldown > 0;
  const special1Cd = player.special1Cooldown > 0 || player.greenBeamCharging;
  const special2Cd = player.special2Cooldown > 0;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 select-none">
      {/* Active Special Status Banners (Time stop, green beam, mind control) */}
      <div className="absolute top-20 inset-x-0 flex flex-col items-center gap-1.5 pointer-events-none z-30">
        {player.greenBeamCharging && (
          <div className="bg-emerald-950/90 border-2 border-emerald-400 text-emerald-200 px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-black animate-pulse">
            <Radio className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>⚡ CARGANDO RAYO VERDE: {(4.0 - player.greenBeamChargeTimer).toFixed(1)}s (INMÓVIL)</span>
          </div>
        )}
        {player.greenBeamFiring && (
          <div className="bg-emerald-600/90 border-2 border-white text-white px-5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-black animate-bounce">
            <Zap className="w-4 h-4 text-amber-300" />
            <span>💥 ¡MEGA-RAYO VERDE DISPARANDO!</span>
          </div>
        )}
        {player.timeStopActive && (
          <div className="bg-amber-950/90 border-2 border-amber-400 text-amber-200 px-5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-black animate-pulse">
            <Clock className="w-4 h-4 text-amber-400 animate-spin" />
            <span>⏳ TIEMPO DETENIDO: {player.timeStopTimer.toFixed(1)}s (¡ATACA A NANOVALEN!)</span>
          </div>
        )}
        {boss && boss.mindControlTimer && boss.mindControlTimer > 0 && (
          <div className="bg-purple-950/90 border-2 border-fuchsia-400 text-fuchsia-200 px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-black animate-pulse">
            <Eye className="w-4 h-4 text-fuchsia-400" />
            <span>🧠 NANOVALEN BAJO CONTROL MENTAL: SE GOLPEA A SÍ MISMO</span>
          </div>
        )}
        {boss && boss.shieldDisabledTimer && boss.shieldDisabledTimer > 0 && (
          <div className="bg-neutral-900/90 border border-fuchsia-500 text-fuchsia-300 px-3 py-1 rounded-full text-[11px] font-bold">
            ⚡ Escudo de Nanovalen Desactivado ({boss.shieldDisabledTimer.toFixed(1)}s)
          </div>
        )}
      </div>

      {/* Top Header Bar */}
      <div className="flex items-start justify-between gap-3 w-full">
        {/* Player Profile with Active Skin Avatar */}
        <div className="flex items-center gap-3 bg-neutral-900/85 backdrop-blur-md border border-neutral-700/80 rounded-2xl p-2.5 shadow-xl max-w-sm">
          {/* Avatar box */}
          <div
            className="relative w-12 h-12 border-2 border-neutral-900 rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-inner"
            style={{ backgroundColor: skinConfig.primaryColor }}
          >
            {/* Visual Mini Avatar representation */}
            <div
              className="w-8 h-8 border border-neutral-950 relative rounded-sm flex flex-col items-center justify-center"
              style={{ backgroundColor: skinConfig.primaryColor }}
            >
              {/* Ears */}
              {player.skin.startsWith('perro') ? (
                <>
                  <div
                    className="absolute -top-1 -left-2 w-3 h-5 rounded-b-md border border-neutral-950 rotate-12"
                    style={{ backgroundColor: skinConfig.secondaryColor }}
                  />
                  <div
                    className="absolute -top-1 -right-2 w-3 h-5 rounded-b-md border border-neutral-950 -rotate-12"
                    style={{ backgroundColor: skinConfig.secondaryColor }}
                  />
                </>
              ) : (
                <>
                  <div
                    className="absolute -top-1.5 left-0 w-2.5 h-2.5 border-t border-l border-neutral-950 rotate-12"
                    style={{ backgroundColor: skinConfig.secondaryColor }}
                  />
                  <div
                    className="absolute -top-1.5 right-0 w-2.5 h-2.5 border-t border-r border-neutral-950 -rotate-12"
                    style={{ backgroundColor: skinConfig.secondaryColor }}
                  />
                </>
              )}
              {/* Eyes */}
              <div className="flex gap-2">
                <div className="w-1.5 h-2 bg-neutral-950 rounded-full" />
                <div className="w-1.5 h-2 bg-neutral-950 rounded-full" />
              </div>
              {/* Snout or smile */}
              <div className="text-[7px] font-bold text-neutral-950 leading-none mt-0.5">
                {player.skin.startsWith('perro') ? '▼' : ':3'}
              </div>
            </div>
            {player.shieldActive && (
              <div
                className="absolute inset-0 border-2 rounded-lg animate-pulse"
                style={{
                  borderColor: skinConfig.shieldColor,
                  backgroundColor: `${skinConfig.shieldColor}30`,
                }}
              />
            )}
          </div>

          <div className="flex-1 min-w-[150px]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-extrabold text-neutral-100 tracking-wide font-display text-[13px]">
                {skinConfig.name.toUpperCase()}
              </span>
              <span className="font-bold text-neutral-300">
                {Math.ceil(player.hp)} / {player.maxHp} HP
              </span>
            </div>

            {/* HP Bar */}
            <div className="w-full h-3.5 bg-neutral-950 rounded-full p-0.5 border border-neutral-700/80 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  hpPercent > 50
                    ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                    : hpPercent > 25
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    : 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>

            {/* Shield Active Status */}
            {player.shieldActive && (
              <div
                className="flex items-center gap-1.5 text-[11px] font-bold mt-1"
                style={{ color: skinConfig.shieldColor }}
              >
                <Shield className="w-3.5 h-3.5 animate-spin" />
                <span>{skinConfig.shieldName}: {player.shieldTimer.toFixed(1)}s</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Stage Progress or Boss Bar */}
        <div className="flex-1 max-w-md mx-auto">
          {stage === 'city' && (
            <div className="bg-neutral-900/90 backdrop-blur-md border border-amber-500/30 rounded-2xl p-2.5 shadow-xl text-center">
              <div className="flex justify-between items-center text-xs font-bold mb-1">
                <span className="text-amber-400 font-display">🏙️ NIVEL 1: CIUDAD</span>
                <span className="text-neutral-300">Demolición: {engine.stageProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-950 rounded-full border border-neutral-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-200"
                  style={{ width: `${engine.stageProgress}%` }}
                />
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                Destruye los edificios para ascender al espacio
              </div>
            </div>
          )}

          {stage === 'space' && (
            <div className="bg-neutral-900/90 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-2.5 shadow-xl text-center">
              <div className="flex justify-between items-center text-xs font-bold mb-1">
                <span className="text-cyan-400 font-display">🌌 NIVEL 2: ESPACIO EXTERIOR</span>
                <span className="text-neutral-300">Asteroides: {engine.stageProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-950 rounded-full border border-neutral-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-200"
                  style={{ width: `${engine.stageProgress}%` }}
                />
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                Pulveriza meteoritos para localizar a Nanovalen
              </div>
            </div>
          )}

          {stage === 'transition' && (
            <div className="bg-neutral-900/90 backdrop-blur-md border border-purple-500/40 rounded-2xl p-3 shadow-xl text-center animate-pulse">
              <div className="text-sm font-black font-display text-purple-300 tracking-wider">
                🚀 ¡DESPEGANDO AL ESPACIO!
              </div>
              <div className="text-xs text-neutral-300 mt-0.5">Atravesando la atmósfera a velocidad hipersónica...</div>
            </div>
          )}

          {stage === 'boss_intro' && (
            <div className="bg-red-950/90 backdrop-blur-md border border-red-500/60 rounded-2xl p-3 shadow-xl text-center animate-bounce">
              <div className="text-sm font-black font-display text-red-400 tracking-wider">
                ⚠️ ¡ALERTA MÁXIMA: NANOVALEN DETECTADO! ⚠️
              </div>
              <div className="text-xs text-neutral-200 mt-0.5">El robot gato de ojos rojos ha llegado para pelear</div>
            </div>
          )}

          {stage === 'boss' && boss && (
            <div className="bg-neutral-950/95 backdrop-blur-md border-2 border-red-600/70 rounded-2xl p-2.5 shadow-2xl">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  {/* Nanovalen mini icon */}
                  <div className="w-6 h-6 bg-neutral-900 border border-red-500 rounded relative overflow-hidden flex items-center justify-center">
                    <div className="w-4 h-4 bg-zinc-900 relative">
                      <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-red-500 rounded-full shadow-[0_0_6px_#f00]"></div>
                      <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-red-500 rounded-full shadow-[0_0_6px_#f00]"></div>
                    </div>
                  </div>
                  <span className="font-black text-red-500 font-display text-sm tracking-widest">
                    NANOVALEN (JEFE)
                  </span>
                </div>
                <div className="text-xs font-bold text-neutral-300">
                  {Math.ceil(boss.hp)} / {boss.maxHp} HP
                </div>
              </div>

              {/* Boss HP Bar */}
              <div className="w-full h-3.5 bg-neutral-900 rounded-full p-0.5 border border-red-900 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 rounded-full transition-all duration-100"
                  style={{ width: `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%` }}
                />
              </div>

              {/* Boss Status Badges */}
              <div className="flex items-center justify-center gap-2 mt-1.5 text-[11px] font-bold">
                {boss.shieldActive && (
                  <span className="bg-red-700/90 text-white px-2 py-0.5 rounded-full border border-red-400 animate-pulse">
                    🛡️ ESCUDO ROJO ABSORBENTE ({boss.shieldTimer.toFixed(1)}s)
                  </span>
                )}
                {boss.currentAttack === 'gravity_pull' && (
                  <span className="bg-red-800/95 text-white px-2.5 py-0.5 rounded-full border border-rose-400 animate-pulse font-black">
                    🧲 ¡ATRACCIÓN GRAVITATORIA! (ESCUDO REQUERIDO)
                  </span>
                )}
                {engine.drones && engine.drones.length > 0 && (
                  <span className="bg-slate-800/90 text-red-300 px-2 py-0.5 rounded-full border border-red-500/60 font-bold">
                    🤖 {engine.drones.length} DRONES ({engine.drones.map(d => Math.ceil(d.hp)).join('/')} HP)
                  </span>
                )}
                {boss.currentAttack === 'laser_warning' && (
                  <span className="bg-red-600/90 text-white px-2 py-0.5 rounded-full border border-red-300 animate-warning">
                    ⚠️ CARGANDO LÁSER ({Math.max(0, 1.5 - boss.attackTimer).toFixed(1)}s)
                  </span>
                )}
                {boss.currentAttack === 'gamma_ray_charge' && (
                  <span className="bg-fuchsia-600/90 text-white px-2 py-0.5 rounded-full border border-fuchsia-300 animate-warning">
                    ⚡ EXPLOSIÓN GAMMA x3 (NO CANCELABLE)
                  </span>
                )}
                {boss.currentAttack === 'gamma_ray_burst' && (
                  <span className="bg-rose-700/90 text-white px-2 py-0.5 rounded-full border border-rose-300 animate-pulse">
                    💥 ¡ESTALLIDO GAMMA x3 ACTIVO!
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Level 4: Distorted Reality Exploration */}
          {stage === 'distorted' && (
            <div className="bg-neutral-900/90 backdrop-blur-md border border-fuchsia-500/40 rounded-2xl p-2.5 shadow-xl text-center">
              <div className="flex justify-between items-center text-xs font-bold mb-1">
                <span className="text-fuchsia-400 font-display">🌀 NIVEL 4: REALIDAD DISTORSIONADA</span>
                <span className="text-cyan-300">
                  Altar: {Math.round(Math.hypot(player.x - 1600, player.y - 1200))}m
                </span>
              </div>
              <div className="text-[11px] text-neutral-300 flex items-center justify-center gap-2">
                <span>🧭 Sigue las coordenadas hasta el Altar (1600, 1200) para invocar a Santiscat</span>
              </div>
            </div>
          )}

          {/* Level 4: Rhythm Summon Minigame */}
          {stage === 'rhythm_summon' && engine.rhythmGame && (
            <div className="bg-neutral-900/95 backdrop-blur-md border-2 border-amber-500/80 rounded-2xl p-3 shadow-2xl text-center">
              <div className="flex justify-between items-center text-xs font-black mb-1">
                <span className="text-amber-400 font-display text-sm tracking-wide">
                  🎵 INVOCACIÓN AL RITMO DEL BEAT
                </span>
                <span className="text-white bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400">
                  {engine.rhythmGame.totalHits} / {engine.rhythmGame.requiredHits} BEATS
                </span>
              </div>
              <div className="w-full h-3 bg-neutral-950 rounded-full border border-neutral-700 overflow-hidden relative mb-1">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 rounded-full transition-all duration-150"
                  style={{ width: `${Math.min(100, (engine.rhythmGame.totalHits / engine.rhythmGame.requiredHits) * 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-neutral-300 font-bold">
                Presiona [ESPACIO / E] cuando los anillos colapsen sobre el círculo central
              </div>
            </div>
          )}

          {/* Level 4: Santiscat Boss */}
          {stage === 'santiscat_boss' && engine.santiscat && (
            <div className="bg-neutral-950/95 backdrop-blur-md border-2 border-purple-500/70 rounded-2xl p-2.5 shadow-2xl">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  {/* Santiscat avatar */}
                  <img
                    src="/assets/aistudio/santiscat_18f093e7.png"
                    alt="Santiscat"
                    className="w-7 h-7 rounded border border-purple-400 bg-neutral-900 object-cover"
                  />
                  <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-cyan-400 font-display text-sm tracking-widest">
                    SANTISCAT (JEFE CÓSMICO)
                  </span>
                </div>
                <div className="text-xs font-bold text-neutral-300">
                  {Math.ceil(engine.santiscat.hp)} / {engine.santiscat.maxHp} HP
                </div>
              </div>

              {/* Boss HP Bar */}
              <div className="w-full h-3.5 bg-neutral-900 rounded-full p-0.5 border border-purple-900 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-400 rounded-full transition-all duration-100"
                  style={{ width: `${Math.max(0, (engine.santiscat.hp / engine.santiscat.maxHp) * 100)}%` }}
                />
              </div>

              {/* Boss Status Badges */}
              <div className="flex items-center justify-center gap-2 mt-1.5 text-[11px] font-bold">
                {engine.santiscat.currentAttack === 'sun_burst' && (
                  <span className="bg-amber-600/90 text-white px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse">
                    ☀️ INVOCANDO SOL ({engine.santiscat.blackHole.sunShotsFired}/5 DISPAROS)
                  </span>
                )}
                {engine.santiscat.currentAttack === 'compress_black_hole' && (
                  <span className="bg-indigo-700/95 text-white px-2.5 py-0.5 rounded-full border border-indigo-400 animate-pulse font-black">
                    🌌 COMPRIMIENDO SOL EN AGUJERO NEGRO...
                  </span>
                )}
                {engine.santiscat.currentAttack === 'black_hole_chase' && (
                  <span className="bg-black/90 text-orange-400 px-2.5 py-0.5 rounded-full border border-orange-500 animate-bounce font-black">
                    🕳️ ¡AGUJERO NEGRO ACTIVO! CURVATURA ESPACIAL
                  </span>
                )}
                {engine.santiscat.currentAttack === 'oneshot_fireball' && (
                  <span className="bg-red-700/95 text-white px-2.5 py-0.5 rounded-full border border-rose-300 animate-pulse font-black">
                    🔥 ¡BOLA DE FUEGO ONE-SHOT! (LETAL / USA ESCUDO)
                  </span>
                )}
                {engine.santiscat.currentAttack === 'reality_slashes' && (
                  <span className="bg-cyan-700/90 text-white px-2.5 py-0.5 rounded-full border border-cyan-300 animate-pulse font-black">
                    ⚔️ ¡CORTES EN LA REALIDAD! FRACTURA DIMENSIONAL
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Corner: Black Flash Counter & Audio */}
        <div className="flex items-center gap-2">
          {/* Black Flash Indicator */}
          <div className="bg-neutral-900/90 backdrop-blur-md border border-neutral-700 rounded-2xl px-3 py-2 shadow-xl flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neutral-950 border border-red-500 shadow-[0_0_8px_#ff0033] animate-pulse"></div>
            <div className="text-right">
              <div className="text-[10px] text-neutral-400 font-bold leading-tight">BLACK FLASH (2% / 1%)</div>
              <div className="text-xs font-black text-red-400 font-display">
                Cat: {engine.stats.blackFlashesCount} · <span className="text-rose-400">Boss: {engine.stats.bossBlackFlashesCount}</span>
              </div>
            </div>
          </div>

          {/* Music & Audio Settings Button */}
          {onOpenAudioModal && (
            <button
              onClick={onOpenAudioModal}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-amber-400 hover:text-amber-300 transition-colors shadow-lg active:scale-95 text-xs font-bold cursor-pointer"
              title="Personalizar Música y Sonidos (Nivel 1, 2, Boss, Rayo Gamma)"
            >
              <Music className="w-4 h-4" />
              <span className="hidden sm:inline">Música & Audio</span>
            </button>
          )}

          {/* Admin Panel Button */}
          {onOpenAdminModal && (
            <button
              onClick={onOpenAdminModal}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 hover:text-amber-200 transition-colors shadow-lg active:scale-95 text-xs font-bold cursor-pointer"
              title="Panel de Administrador (Desbloquear todo, trucos, saltos de nivel)"
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="pointer-events-auto p-2.5 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-colors shadow-lg active:scale-95"
            title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-green-400" />}
          </button>
        </div>
      </div>

      {/* Bottom Action Bar (Ability buttons + Visible Cooldowns) */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 pointer-events-auto bg-neutral-900/90 backdrop-blur-md border border-neutral-700/80 p-2 rounded-2xl shadow-2xl">
          {/* 1. Punch (Manos circulares) - Cooldown 0.75s */}
          <button
            onClick={onPunch}
            disabled={punchCd}
            className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-xl border font-bold transition-all active:scale-95 overflow-hidden ${
              punchCd
                ? 'bg-neutral-800/60 border-neutral-700 text-neutral-400 cursor-not-allowed'
                : 'bg-neutral-800 hover:bg-neutral-700 border-zinc-600 text-white shadow-md hover:border-zinc-400'
            }`}
          >
            {punchCdPercent > 0 && (
              <div
                className="absolute inset-x-0 bottom-0 bg-neutral-950/75 transition-all"
                style={{ height: `${punchCdPercent}%` }}
              />
            )}
            <div className="w-5 h-5 rounded-full border-2 border-white bg-zinc-500 mb-0.5 shadow-sm z-10"></div>
            <span className="text-[10px] font-black leading-none z-10">
              {punchCd ? `${player.punchCooldown.toFixed(1)}s` : 'GOLPE'}
            </span>
            <span className="text-[9px] text-zinc-400 font-mono z-10">[SPACE]</span>
          </button>

          {/* 2. Fireball (Bola de fuego) - Cooldown 2.2s */}
          <button
            onClick={onFireball}
            disabled={fireballCd}
            className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-xl border font-bold transition-all active:scale-95 overflow-hidden ${
              fireballCd
                ? 'bg-neutral-800/60 border-neutral-700 text-neutral-400 cursor-not-allowed'
                : 'bg-gradient-to-b from-orange-600/90 to-amber-700/90 hover:from-orange-500 hover:to-amber-600 border-orange-500/80 text-white shadow-md'
            }`}
          >
            {fireballCdPercent > 0 && (
              <div
                className="absolute inset-x-0 bottom-0 bg-neutral-950/75 transition-all"
                style={{ height: `${fireballCdPercent}%` }}
              />
            )}
            <Flame className="w-5 h-5 text-amber-300 mb-0.5 z-10" />
            <span className="text-[10px] font-black leading-none z-10">
              {fireballCd ? `${player.fireballCooldown.toFixed(1)}s` : 'FUEGO'}
            </span>
            <span className="text-[9px] text-amber-200 font-mono z-10">[1 / Q]</span>
          </button>

          {/* 3. Lightning (Rayo) - Cooldown 3.4s */}
          <button
            onClick={onLightning}
            disabled={lightningCd}
            className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-xl border font-bold transition-all active:scale-95 overflow-hidden ${
              lightningCd
                ? 'bg-neutral-800/60 border-neutral-700 text-neutral-400 cursor-not-allowed'
                : 'bg-gradient-to-b from-sky-600/90 to-blue-700/90 hover:from-sky-500 hover:to-blue-600 border-sky-400/80 text-white shadow-md'
            }`}
          >
            {lightningCdPercent > 0 && (
              <div
                className="absolute inset-x-0 bottom-0 bg-neutral-950/75 transition-all"
                style={{ height: `${lightningCdPercent}%` }}
              />
            )}
            <Zap className="w-5 h-5 text-sky-200 mb-0.5 z-10" />
            <span className="text-[10px] font-black leading-none z-10">
              {lightningCd ? `${player.lightningCooldown.toFixed(1)}s` : 'RAYO'}
            </span>
            <span className="text-[9px] text-sky-200 font-mono z-10">[2 / E]</span>
          </button>

          {/* 4. Power Burst (Ráfagas) - Cooldown 2.6s */}
          <button
            onClick={onPowerBurst}
            disabled={burstCd}
            className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-xl border font-bold transition-all active:scale-95 overflow-hidden ${
              burstCd
                ? 'bg-neutral-800/60 border-neutral-700 text-neutral-400 cursor-not-allowed'
                : 'bg-gradient-to-b from-cyan-600/90 to-teal-700/90 hover:from-cyan-500 hover:to-teal-600 border-cyan-400/80 text-white shadow-md'
            }`}
          >
            {burstCdPercent > 0 && (
              <div
                className="absolute inset-x-0 bottom-0 bg-neutral-950/75 transition-all"
                style={{ height: `${burstCdPercent}%` }}
              />
            )}
            <Crosshair className="w-5 h-5 text-cyan-200 mb-0.5 z-10" />
            <span className="text-[10px] font-black leading-none z-10">
              {burstCd ? `${player.powerBurstCooldown.toFixed(1)}s` : 'RÁFAGA'}
            </span>
            <span className="text-[9px] text-cyan-200 font-mono z-10">[3 / R]</span>
          </button>

          {/* 5. Green Shield (Escudo Verde) - Cooldown 7.5s */}
          <button
            onClick={onShield}
            disabled={shieldCdPercent > 0 || player.shieldActive}
            className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-xl border font-bold transition-all active:scale-95 overflow-hidden ${
              player.shieldActive
                ? 'bg-emerald-600 border-emerald-300 text-white animate-pulse shadow-[0_0_15px_#10b981]'
                : shieldCdPercent > 0
                ? 'bg-neutral-800/60 border-neutral-700 text-neutral-400 cursor-not-allowed'
                : 'bg-gradient-to-b from-emerald-600/90 to-green-700/90 hover:from-emerald-500 hover:to-green-600 border-emerald-400/80 text-white shadow-md'
            }`}
          >
            {shieldCdPercent > 0 && (
              <div
                className="absolute inset-x-0 bottom-0 bg-neutral-950/75 transition-all"
                style={{ height: `${shieldCdPercent}%` }}
              />
            )}
            <Shield className="w-5 h-5 text-emerald-200 mb-0.5 z-10" />
            <span className="text-[10px] font-black leading-none z-10">
              {player.shieldActive
                ? `${player.shieldTimer.toFixed(1)}s`
                : shieldCdPercent > 0
                ? `${player.shieldCooldown.toFixed(1)}s`
                : 'ESCUDO'}
            </span>
            <span className="text-[9px] text-emerald-200 font-mono z-10">[SHIFT / C]</span>
          </button>

          {/* 6. Heal */}
          <button
            onClick={onHeal}
            disabled={healCd || player.healsRemaining <= 0 || player.hp >= player.maxHp}
            className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-xl border font-bold transition-all active:scale-95 overflow-hidden ${
              player.healsRemaining <= 0
                ? 'bg-neutral-800/50 border-neutral-700 text-neutral-500 cursor-not-allowed'
                : healCd || player.hp >= player.maxHp
                ? 'bg-neutral-800/70 border-emerald-800 text-neutral-400 cursor-not-allowed'
                : 'bg-gradient-to-b from-emerald-500/90 to-green-700/90 hover:from-emerald-400 hover:to-green-600 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)] cursor-pointer'
            }`}
            title={`Curarse [F] - Usos restantes: ${player.healsRemaining}/${player.maxHeals}`}
          >
            {healCdPercent > 0 && (
              <div
                className="absolute inset-x-0 bottom-0 bg-neutral-950/75 transition-all"
                style={{ height: `${healCdPercent}%` }}
              />
            )}
            <Heart
              className={`w-5 h-5 mb-0.5 z-10 ${
                player.healsRemaining > 0 && player.hp < player.maxHp
                  ? 'text-rose-400 fill-rose-400 animate-pulse'
                  : 'text-neutral-500'
              }`}
            />
            <span className="text-[10px] font-black leading-none z-10">
              {player.healsRemaining <= 0
                ? 'AGOTADO'
                : healCd
                ? `${player.healCooldown.toFixed(1)}s`
                : 'CURAR'}
            </span>
            <span className="text-[9px] text-emerald-200 font-mono z-10">
              [F] ({player.healsRemaining})
            </span>
          </button>

          {/* 7. Special Ability 1 (For non-Catvalen skins) */}
          {player.skin !== 'catvalen' && onSpecial1 && (
            <button
              onClick={onSpecial1}
              disabled={special1Cd}
              className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-xl border font-bold transition-all active:scale-95 overflow-hidden ${
                special1Cd
                  ? 'bg-neutral-800/60 border-neutral-700 text-neutral-400 cursor-not-allowed'
                  : player.skin === 'gata_gris'
                  ? 'bg-gradient-to-b from-emerald-600 to-green-800 border-emerald-400 text-white shadow-[0_0_12px_#22c55e]'
                  : player.skin === 'gato_negro_blanco'
                  ? 'bg-gradient-to-b from-fuchsia-600 to-purple-800 border-fuchsia-400 text-white shadow-[0_0_12px_#d946ef]'
                  : player.skin === 'gato_blanco_manchas'
                  ? 'bg-gradient-to-b from-amber-500 to-yellow-600 border-yellow-300 text-white shadow-[0_0_12px_#facc15]'
                  : player.skin === 'gata_azul_manchas'
                  ? 'bg-gradient-to-b from-teal-500 to-cyan-700 border-teal-300 text-white shadow-[0_0_12px_#14b8a6]'
                  : 'bg-gradient-to-b from-amber-600 to-orange-800 border-amber-400 text-white shadow-[0_0_12px_#f59e0b]'
              }`}
              title={skinConfig.abilities[0]?.name || 'Poder Especial 1'}
            >
              {special1CdPercent > 0 && (
                <div
                  className="absolute inset-x-0 bottom-0 bg-neutral-950/75 transition-all"
                  style={{ height: `${special1CdPercent}%` }}
                />
              )}
              {player.skin === 'gata_gris' && <Radio className="w-5 h-5 text-emerald-200 mb-0.5 z-10 animate-pulse" />}
              {player.skin === 'gato_negro_blanco' && <Eye className="w-5 h-5 text-fuchsia-200 mb-0.5 z-10" />}
              {player.skin === 'gato_blanco_manchas' && <Sun className="w-5 h-5 text-yellow-200 mb-0.5 z-10" />}
              {player.skin === 'gata_azul_manchas' && <Sparkle className="w-5 h-5 text-teal-200 mb-0.5 z-10" />}
              {player.skin === 'perro_rubio' && <Hammer className="w-5 h-5 text-amber-200 mb-0.5 z-10" />}
              {player.skin === 'perro_marron' && <Clock className="w-5 h-5 text-amber-200 mb-0.5 z-10 animate-spin" />}
              <span className="text-[9px] font-black leading-none z-10 uppercase">
                {special1Cd
                  ? `${player.special1Cooldown.toFixed(1)}s`
                  : player.skin === 'gata_gris'
                  ? 'RAYO V.'
                  : player.skin === 'gato_negro_blanco'
                  ? 'AUTO-HIT'
                  : player.skin === 'gato_blanco_manchas'
                  ? 'LÁSER'
                  : player.skin === 'gata_azul_manchas'
                  ? 'ORBES'
                  : player.skin === 'perro_rubio'
                  ? 'YUNQUE'
                  : 'TIEMPO'}
              </span>
              <span className="text-[8px] font-mono text-neutral-300 z-10">[4 / G]</span>
            </button>
          )}

          {/* 8. Special Ability 2 (For skins with secondary power) */}
          {['gato_negro_blanco', 'gato_blanco_manchas', 'perro_rubio', 'perro_marron'].includes(player.skin) && onSpecial2 && (
            <button
              onClick={onSpecial2}
              disabled={special2Cd}
              className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-xl border font-bold transition-all active:scale-95 overflow-hidden ${
                special2Cd
                  ? 'bg-neutral-800/60 border-neutral-700 text-neutral-400 cursor-not-allowed'
                  : player.skin === 'gato_negro_blanco'
                  ? 'bg-gradient-to-b from-purple-700 to-indigo-900 border-purple-400 text-white shadow-[0_0_12px_#a855f7]'
                  : player.skin === 'gato_blanco_manchas'
                  ? 'bg-gradient-to-b from-yellow-500 to-amber-600 border-yellow-200 text-white shadow-[0_0_12px_#fbbf24]'
                  : player.skin === 'perro_rubio'
                  ? 'bg-gradient-to-b from-amber-600 to-yellow-700 border-amber-300 text-white shadow-[0_0_12px_#f59e0b]'
                  : 'bg-gradient-to-b from-orange-600 to-amber-800 border-amber-300 text-white shadow-[0_0_12px_#d97706]'
              }`}
              title={skinConfig.abilities[1]?.name || 'Poder Especial 2'}
            >
              {special2CdPercent > 0 && (
                <div
                  className="absolute inset-x-0 bottom-0 bg-neutral-950/75 transition-all"
                  style={{ height: `${special2CdPercent}%` }}
                />
              )}
              {player.skin === 'gato_negro_blanco' && <ShieldAlert className="w-5 h-5 text-purple-200 mb-0.5 z-10" />}
              {player.skin === 'gato_blanco_manchas' && <Wind className="w-5 h-5 text-yellow-200 mb-0.5 z-10" />}
              {player.skin === 'perro_rubio' && <Sword className="w-5 h-5 text-amber-200 mb-0.5 z-10" />}
              {player.skin === 'perro_marron' && <Compass className="w-5 h-5 text-amber-200 mb-0.5 z-10" />}
              <span className="text-[9px] font-black leading-none z-10 uppercase">
                {special2Cd
                  ? `${player.special2Cooldown.toFixed(1)}s`
                  : player.skin === 'gato_negro_blanco'
                  ? 'ROMPER'
                  : player.skin === 'gato_blanco_manchas'
                  ? 'DASH'
                  : player.skin === 'perro_rubio'
                  ? 'ESPADAS'
                  : 'WARP'}
              </span>
              <span className="text-[8px] font-mono text-neutral-300 z-10">[5 / T]</span>
            </button>
          )}
        </div>

        {/* Level 4 Rhythm Minigame Big Action Tap Button */}
        {stage === 'rhythm_summon' && (
          <div className="flex justify-center pointer-events-auto my-1">
            <button
              onClick={() => engine.hitRhythmBeat()}
              className="px-8 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-black font-display text-base tracking-widest rounded-2xl border-2 border-yellow-300 shadow-2xl shadow-amber-500/50 active:scale-95 transition-transform cursor-pointer animate-pulse flex items-center gap-2.5"
            >
              <span>🎵</span>
              <span>¡TOCAR RITMO! [ESPACIO / CLICK]</span>
              <span>🎵</span>
            </button>
          </div>
        )}

        {/* Desktop Helper Text */}
        <div className="text-[11px] text-neutral-400/90 font-medium bg-neutral-950/80 px-3 py-1 rounded-full border border-neutral-800 flex items-center gap-2 flex-wrap justify-center">
          <span>Moverse: <strong className="text-neutral-200 font-mono">WASD / Flechas</strong></span> ·
          <span>Golpear: <strong className="text-neutral-200 font-mono">Espacio</strong></span> ·
          <span>Curarse: <strong className="text-emerald-400 font-mono">F ({player.healsRemaining}/{player.maxHeals})</strong></span> ·
          <span>Escudo: <strong className="text-emerald-400 font-mono">Shift</strong></span> ·
          <span>Poderes: <strong className="text-amber-400 font-mono">1, 2, 3, 4, 5</strong></span>
        </div>
      </div>
    </div>
  );
};
