import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GameEngine } from '../game/gameEngine';
import { CHARACTER_SKINS } from '../game/skins';
import {
  Flame,
  Zap,
  Crosshair,
  Shield,
  Heart,
  Sparkles,
  Eye,
  Radio,
  Clock,
  Hammer,
  Sword,
} from 'lucide-react';

interface TouchControlsProps {
  engine: GameEngine;
  onPunch: () => void;
  onFireball: () => void;
  onLightning: () => void;
  onPowerBurst: () => void;
  onShield: () => void;
  onHeal: () => void;
  onSpecial1?: () => void;
  onSpecial2?: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  engine,
  onPunch,
  onFireball,
  onLightning,
  onPowerBurst,
  onShield,
  onHeal,
  onSpecial1,
  onSpecial2,
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const player = engine.player;
  const skinConfig = CHARACTER_SKINS[player.skin] || CHARACTER_SKINS.catvalen;

  const punchCd = player.punchCooldown > 0;
  const fireballCd = player.fireballCooldown > 0;
  const lightningCd = player.lightningCooldown > 0;
  const burstCd = player.powerBurstCooldown > 0;
  const shieldCd = player.shieldCooldown > 0 && !engine.santiscat?.shrine?.active;
  const healCd = player.healCooldown > 0 || player.healsRemaining <= 0 || player.hp >= player.maxHp;
  const special1Cd = player.special1Cooldown > 0 || player.greenBeamCharging;
  const special2Cd = player.special2Cooldown > 0;

  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignore
      }
    }
  };

  const resetJoystick = useCallback(() => {
    setIsDragging(false);
    touchIdRef.current = null;
    setKnobPos({ x: 0, y: 0 });
    engine.setTouchDirection(0, 0);
  }, [engine]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsDragging(true);
    handleTouchMove(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!joystickRef.current || touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        const rect = joystickRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const maxDist = rect.width / 2;
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const dist = Math.hypot(dx, dy);

        if (dist > maxDist) {
          dx = (dx / dist) * maxDist;
          dy = (dy / dist) * maxDist;
        }

        setKnobPos({ x: dx, y: dy });
        // Send normalized vector to game engine
        engine.setTouchDirection(dx / maxDist, dy / maxDist);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        resetJoystick();
        break;
      }
    }
  };

  useEffect(() => {
    const handleGlobalEnd = () => resetJoystick();
    window.addEventListener('touchend', handleGlobalEnd);
    window.addEventListener('touchcancel', handleGlobalEnd);
    return () => {
      window.removeEventListener('touchend', handleGlobalEnd);
      window.removeEventListener('touchcancel', handleGlobalEnd);
    };
  }, [resetJoystick]);

  // Skin-specific action icons
  const renderSpecial1Icon = () => {
    switch (player.skin) {
      case 'gata_gris':
        return <Radio className="w-5 h-5 text-emerald-300" />;
      case 'gato_negro_blanco':
        return <Eye className="w-5 h-5 text-fuchsia-300" />;
      case 'gato_blanco_manchas':
        return <Zap className="w-5 h-5 text-amber-300" />;
      case 'gata_azul_manchas':
        return <Sparkles className="w-5 h-5 text-emerald-300" />;
      case 'perro_rubio':
        return <Hammer className="w-5 h-5 text-amber-300" />;
      case 'perro_marron':
        return <Clock className="w-5 h-5 text-amber-300" />;
      default:
        return null;
    }
  };

  const renderSpecial2Icon = () => {
    switch (player.skin) {
      case 'gato_negro_blanco':
        return <Shield className="w-5 h-5 text-fuchsia-300" />;
      case 'gato_blanco_manchas':
        return <Zap className="w-5 h-5 text-amber-300" />;
      case 'perro_rubio':
        return <Sword className="w-5 h-5 text-amber-300" />;
      case 'perro_marron':
        return <Sparkles className="w-5 h-5 text-amber-300" />;
      default:
        return null;
    }
  };

  const hasSpecial1 = Boolean(
    player.skin === 'gata_gris' ||
      player.skin === 'gato_negro_blanco' ||
      player.skin === 'gato_blanco_manchas' ||
      player.skin === 'gata_azul_manchas' ||
      player.skin === 'perro_rubio' ||
      player.skin === 'perro_marron'
  );

  const hasSpecial2 = Boolean(
    player.skin === 'gato_negro_blanco' ||
      player.skin === 'gato_blanco_manchas' ||
      player.skin === 'perro_rubio' ||
      player.skin === 'perro_marron'
  );

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 touch-none">
      {/* --- LEFT SIDE: FLOATING TOUCH JOYSTICK --- */}
      <div className="absolute bottom-4 left-4 pointer-events-auto select-none touch-none">
        <div
          ref={joystickRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="w-32 h-32 rounded-full bg-neutral-950/70 border-2 border-cyan-500/50 backdrop-blur-md relative flex items-center justify-center touch-none shadow-[0_0_20px_rgba(6,182,212,0.25)] active:border-cyan-400"
        >
          {/* Subtle Directional Arrows */}
          <div className="absolute top-1 text-[9px] text-cyan-400/60 font-bold">▲</div>
          <div className="absolute bottom-1 text-[9px] text-cyan-400/60 font-bold">▼</div>
          <div className="absolute left-1 text-[9px] text-cyan-400/60 font-bold">◀</div>
          <div className="absolute right-1 text-[9px] text-cyan-400/60 font-bold">▶</div>

          {/* Center Knob */}
          <div
            className={`w-14 h-14 rounded-full border-2 shadow-xl pointer-events-none transition-transform flex items-center justify-center ${
              isDragging
                ? 'bg-cyan-500 border-white shadow-[0_0_15px_#06b6d4]'
                : 'bg-neutral-800/90 border-cyan-400/80'
            }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          >
            <div className="w-5 h-5 rounded-full bg-white/70" />
          </div>
        </div>
      </div>

      {/* --- RIGHT SIDE: ERGONOMIC ACTION BUTTON PAD --- */}
      <div className="absolute bottom-3 right-3 pointer-events-auto select-none touch-none flex flex-col items-end gap-2">
        {/* Upper Action Arc: Specials & Utility */}
        <div className="flex items-center gap-2">
          {/* Heal */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              triggerHaptic();
              onHeal();
            }}
            disabled={healCd}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center border font-black shadow-lg transition-transform active:scale-90 ${
              healCd
                ? 'bg-neutral-900/70 border-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-br from-emerald-500 to-green-700 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.35)]'
            }`}
          >
            <Heart className="w-4 h-4 fill-current" />
            <span className="text-[8px] font-bold mt-0.5 leading-none">
              {player.healsRemaining}
            </span>
          </button>

          {/* Shield */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              triggerHaptic();
              engine.setHoldingShield(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              engine.setHoldingShield(false);
            }}
            disabled={shieldCd}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center border font-black shadow-lg transition-transform active:scale-90 ${
              player.shieldActive
                ? 'bg-emerald-500 border-white text-white animate-pulse shadow-[0_0_18px_#10b981]'
                : shieldCd
                ? 'bg-neutral-900/70 border-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-br from-emerald-600 to-teal-800 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="text-[8px] font-bold mt-0.5 leading-none">
              {player.shieldActive ? `${player.shieldTimer.toFixed(1)}s` : 'ESC'}
            </span>
          </button>

          {/* Skin Special 1 */}
          {hasSpecial1 && onSpecial1 && (
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                triggerHaptic();
                onSpecial1();
              }}
              disabled={special1Cd}
              className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center border font-black shadow-lg transition-transform active:scale-90 ${
                special1Cd
                  ? 'bg-neutral-900/70 border-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-br from-purple-600 to-fuchsia-800 border-fuchsia-400 text-white shadow-[0_0_15px_rgba(217,70,239,0.35)]'
              }`}
            >
              {renderSpecial1Icon()}
              <span className="text-[8px] font-bold mt-0.5 leading-none">
                {special1Cd ? `${player.special1Cooldown.toFixed(1)}s` : 'HAB 1'}
              </span>
            </button>
          )}

          {/* Skin Special 2 */}
          {hasSpecial2 && onSpecial2 && (
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                triggerHaptic();
                onSpecial2();
              }}
              disabled={special2Cd}
              className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center border font-black shadow-lg transition-transform active:scale-90 ${
                special2Cd
                  ? 'bg-neutral-900/70 border-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-br from-amber-600 to-orange-800 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.35)]'
              }`}
            >
              {renderSpecial2Icon()}
              <span className="text-[8px] font-bold mt-0.5 leading-none">
                {special2Cd ? `${player.special2Cooldown.toFixed(1)}s` : 'HAB 2'}
              </span>
            </button>
          )}
        </div>

        {/* Lower Primary Pad: Projectiles & Giant Punch */}
        <div className="flex items-center gap-2.5">
          {/* Fireball */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              triggerHaptic();
              onFireball();
            }}
            disabled={fireballCd}
            className={`w-13 h-13 rounded-2xl flex flex-col items-center justify-center border font-black shadow-lg transition-transform active:scale-90 ${
              fireballCd
                ? 'bg-neutral-900/70 border-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-br from-orange-500 to-red-700 border-orange-400 text-white shadow-[0_0_14px_rgba(249,115,22,0.35)]'
            }`}
          >
            <Flame className="w-5 h-5 text-amber-200" />
            <span className="text-[8px] font-bold mt-0.5 leading-none">
              {fireballCd ? `${player.fireballCooldown.toFixed(1)}s` : 'FUEGO'}
            </span>
          </button>

          {/* Lightning */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              triggerHaptic();
              onLightning();
            }}
            disabled={lightningCd}
            className={`w-13 h-13 rounded-2xl flex flex-col items-center justify-center border font-black shadow-lg transition-transform active:scale-90 ${
              lightningCd
                ? 'bg-neutral-900/70 border-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-br from-sky-500 to-blue-700 border-sky-400 text-white shadow-[0_0_14px_rgba(56,189,248,0.35)]'
            }`}
          >
            <Zap className="w-5 h-5 text-sky-200" />
            <span className="text-[8px] font-bold mt-0.5 leading-none">
              {lightningCd ? `${player.lightningCooldown.toFixed(1)}s` : 'RAYO'}
            </span>
          </button>

          {/* Power Burst */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              triggerHaptic();
              onPowerBurst();
            }}
            disabled={burstCd}
            className={`w-13 h-13 rounded-2xl flex flex-col items-center justify-center border font-black shadow-lg transition-transform active:scale-90 ${
              burstCd
                ? 'bg-neutral-900/70 border-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-br from-cyan-500 to-teal-700 border-cyan-400 text-white shadow-[0_0_14px_rgba(6,182,212,0.35)]'
            }`}
          >
            <Crosshair className="w-5 h-5 text-cyan-200" />
            <span className="text-[8px] font-bold mt-0.5 leading-none">
              {burstCd ? `${player.powerBurstCooldown.toFixed(1)}s` : 'RÁFAGA'}
            </span>
          </button>

          {/* GIANT PUNCH PRIMARY BUTTON */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              triggerHaptic();
              onPunch();
            }}
            disabled={punchCd}
            className={`w-18 h-18 rounded-3xl flex flex-col items-center justify-center border-2 font-black shadow-2xl transition-transform active:scale-90 ${
              punchCd
                ? 'bg-neutral-900/80 border-neutral-700 text-neutral-500 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-br from-zinc-200 to-zinc-400 border-white text-neutral-950 shadow-[0_0_25px_rgba(255,255,255,0.4)]'
            }`}
          >
            <div className="w-7 h-7 rounded-full border-2 border-neutral-950 bg-zinc-600 mb-0.5 shadow-sm" />
            <span className="text-[10px] font-black leading-none font-display">
              {punchCd ? `${player.punchCooldown.toFixed(1)}s` : 'GOLPE'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
