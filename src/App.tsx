/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/gameEngine';
import { GameRenderer } from './game/renderer';
import { soundManager } from './audio/soundManager';
import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { StartModal } from './components/StartModal';
import { VictoryModal } from './components/VictoryModal';
import { GameOverModal } from './components/GameOverModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { GameStage } from './types/game';
import {
  CharacterSkinId,
  getSavedSelectedSkin,
  getSavedNanovalenWins,
  getAdminUnlockAll,
  saveAdminUnlockAll,
} from './game/skins';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);

  const [stage, setStage] = useState<GameStage>('start');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [selectedSkin, setSelectedSkin] = useState<CharacterSkinId>(() => getSavedSelectedSkin());
  const [nanovalenWins, setNanovalenWinsState] = useState<number>(() => getSavedNanovalenWins());
  const [adminUnlockAll, setAdminUnlockAllState] = useState<boolean>(() => getAdminUnlockAll());
  const [, setTick] = useState<number>(0); // force HUD re-render at smooth cadence

  // Initialize Game Engine & Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const engine = new GameEngine(width, height);
    engine.selectSkin(selectedSkin);
    engine.setNanovalenWins(nanovalenWins);
    engine.setAdminUnlockAll(adminUnlockAll);
    const renderer = new GameRenderer(ctx, width, height);

    engineRef.current = engine;
    rendererRef.current = renderer;

    engine.setCallbacks(
      () => setStage('gameover'),
      () => {
        setStage('victory');
        setNanovalenWinsState(engine.nanovalenWins);
      }
    );

    const handleResize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      canvas.width = nw;
      canvas.height = nh;
      engine.resize(nw, nh);
      renderer.resize(nw, nh);
    };

    window.addEventListener('resize', handleResize);

    // Keyboard controls
    const onKeyDown = (e: KeyboardEvent) => {
      // Admin Panel Hotkey (F1 or Backquote `)
      if (e.code === 'F1' || e.code === 'Backquote') {
        e.preventDefault();
        setIsAdminModalOpen((prev) => !prev);
        return;
      }

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      engine.handleKeyDown(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      engine.handleKeyUp(e.code);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Main 60fps Game Loop
    let lastTime = performance.now();
    let animId: number;
    let hudTimer = 0;

    const loop = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Update engine physics & state
      engine.update(delta);

      // Parallax background updates
      renderer.updateBackgrounds(delta, engine.stage, 3.0);

      // Render all layers
      ctx.save();

      // Screen Shake translation
      if (engine.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * engine.screenShake;
        const shakeY = (Math.random() - 0.5) * engine.screenShake;
        ctx.translate(shakeX, shakeY);
      }

      const gameTime = currentTime / 1000;

      if (engine.stage === 'cinematic_earth_destruction' && engine.cinematic) {
        // Render apocalyptic Earth Destruction cinematic
        renderer.drawEarthDestructionCinematic(engine.cinematic, gameTime);
      } else {
        // 1. Background (City skyline or deep space nebula)
        renderer.drawBackground(engine.stage, gameTime);

        // 2. Obstacles (Buildings or Asteroids)
        renderer.drawObstacles(engine.obstacles, engine.stage, gameTime);

        // 3. Projectiles (Fireballs, lightning, power bursts, boss meteors, drone lasers)
        renderer.drawProjectiles(engine.projectiles, gameTime);

        // 3.5 Boss Combat Drones (300 HP drones orbiting and shooting)
        if (engine.drones && engine.drones.length > 0) {
          renderer.drawDrones(engine.drones, gameTime);
        }

        // 4. Boss Nanovalen (if boss stage or boss intro)
        if (engine.boss && (engine.stage === 'boss' || engine.stage === 'boss_intro')) {
          renderer.drawBoss(engine.boss, gameTime, engine.player.x, engine.player.y);
        }

        // 5. Catvalen Player (Square cat from Image 1 with floating circular hands)
        renderer.drawPlayer(engine.player, gameTime);

        // 6. Black Flash critical lightning strikes & inverted flash
        renderer.drawBlackFlashStrikes(engine.blackFlashStrikes);

        // 7. Hit particles & rubble sparks
        renderer.drawParticles(engine.particles);

        // 8. Damage numbers & floating text
        renderer.drawDamageNumbers(engine.damageNumbers);

        // 9. Time stop chrono overlay (When Perro Marrón freezes time)
        if (engine.player.timeStopActive) {
          renderer.drawTimeStopOverlay(engine.player.timeStopTimer, engine.player.timeStopMaxDuration, gameTime);
        }
      }

      ctx.restore();

      // Sync stage state if changed internally
      if (engine.stage !== stage && (engine.stage === 'gameover' || engine.stage === 'victory' || engine.stage === 'cinematic_earth_destruction')) {
        setStage(engine.stage);
      }

      // HUD re-render trigger (throttled at ~30fps for minimal React overhead)
      hudTimer += delta;
      if (hudTimer >= 0.033) {
        hudTimer = 0;
        setTick(t => t + 1);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      soundManager.stopMusic();
    };
  }, []);

  const handleSelectSkin = useCallback((skinId: CharacterSkinId) => {
    setSelectedSkin(skinId);
    if (engineRef.current) {
      engineRef.current.selectSkin(skinId);
    }
  }, []);

  const handleSetWins = useCallback((wins: number) => {
    setNanovalenWinsState(wins);
    if (engineRef.current) {
      engineRef.current.setNanovalenWins(wins);
    }
  }, []);

  const handleToggleAdminUnlockAll = useCallback((unlocked: boolean) => {
    setAdminUnlockAllState(unlocked);
    saveAdminUnlockAll(unlocked);
    if (engineRef.current) {
      engineRef.current.setAdminUnlockAll(unlocked);
    }
  }, []);

  const handleJumpStage = useCallback((targetStage: GameStage) => {
    if (!engineRef.current) return;
    if (targetStage === 'start') {
      engineRef.current.resetToMenu();
      setStage('start');
    } else {
      engineRef.current.jumpToStage(targetStage);
      setStage(targetStage);
    }
  }, []);

  const handleStartGame = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.selectSkin(selectedSkin);
    engineRef.current.resetGame();
    setStage('city');
  }, [selectedSkin]);

  const handleRetry = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.selectSkin(selectedSkin);
    engineRef.current.resetGame();
    setStage('city');
  }, [selectedSkin]);

  const handleReturnToMenu = useCallback(() => {
    soundManager.stopMusic();
    soundManager.stopGammaSound();
    if (engineRef.current) {
      engineRef.current.resetToMenu();
      setNanovalenWinsState(engineRef.current.nanovalenWins);
      setSelectedSkin(engineRef.current.currentSkin);
    }
    setStage('start');
  }, []);

  const handleRematchBoss = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.player = {
      ...engineRef.current.player,
      hp: engineRef.current.player.maxHp,
      shieldActive: false,
      shieldCooldown: 0,
    };
    engineRef.current.startStage('boss');
    setStage('boss');
  }, []);

  const [nextLevelNotice, setNextLevelNotice] = useState<string | null>(null);

  const handleNextLevel = useCallback(() => {
    setNextLevelNotice('🚀 ¡Siguiente Nivel preparado! Listo para que me indiques qué deseas implementar a continuación.');
    setTimeout(() => {
      setNextLevelNotice(null);
    }, 4500);
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-game">
      {/* 2D Action Canvas */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair touch-none"
      />

      {/* In-Game HUD */}
      {engineRef.current && (
        <HUD
          engine={engineRef.current}
          onPunch={() => engineRef.current?.performPunch()}
          onFireball={() => engineRef.current?.performFireball()}
          onLightning={() => engineRef.current?.performLightning()}
          onPowerBurst={() => engineRef.current?.performPowerBurst()}
          onShield={() => engineRef.current?.activateShield()}
          onHeal={() => engineRef.current?.performHeal()}
          onSpecial1={() => engineRef.current?.performSpecial1()}
          onSpecial2={() => engineRef.current?.performSpecial2()}
          onOpenAudioModal={() => setIsAudioModalOpen(true)}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Mobile Touch Joystick */}
      {engineRef.current && stage !== 'start' && stage !== 'victory' && stage !== 'gameover' && stage !== 'cinematic_earth_destruction' && (
        <TouchControls engine={engineRef.current} />
      )}

      {/* Welcome / Start Screen with Skin Selector & Admin Button */}
      {stage === 'start' && (
        <StartModal
          onStart={handleStartGame}
          selectedSkin={selectedSkin}
          nanovalenWins={nanovalenWins}
          adminUnlockAll={adminUnlockAll}
          onSelectSkin={handleSelectSkin}
          onSetWins={handleSetWins}
          onOpenAudioModal={() => setIsAudioModalOpen(true)}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
        />
      )}

      {/* Cinematic Earth Destruction Overlay */}
      {stage === 'cinematic_earth_destruction' && (
        <div className="absolute bottom-6 right-6 z-40">
          <button
            onClick={() => {
              soundManager.stopGammaSound();
              engineRef.current?.skipCinematic();
            }}
            className="px-4 py-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl border border-neutral-700 text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer backdrop-blur-md"
          >
            Saltar Cinemática [Espacio] ➔
          </button>
        </div>
      )}

      {/* Victory Screen ("¡Ganaste!") */}
      {stage === 'victory' && engineRef.current && (
        <VictoryModal
          stats={engineRef.current.stats}
          onPlayAgain={handleStartGame}
          onRematchBoss={handleRematchBoss}
          onMainMenu={handleReturnToMenu}
          onNextLevel={handleNextLevel}
        />
      )}

      {/* Siguiente Nivel Toast Notice */}
      {nextLevelNotice && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-cyan-300 font-extrabold text-sm flex items-center gap-3 animate-bounce">
          <span>{nextLevelNotice}</span>
        </div>
      )}

      {/* Game Over Screen */}
      {stage === 'gameover' && (
        <GameOverModal
          stage={engineRef.current?.stage || 'city'}
          deathReason={engineRef.current?.stats.deathReason}
          bossBlackFlashesCount={engineRef.current?.stats.bossBlackFlashesCount}
          onRetry={handleRetry}
          onMainMenu={handleReturnToMenu}
        />
      )}

      {/* Level 1 Audio Customization Modal */}
      <AudioSettingsModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        currentStage={stage}
      />

      {/* Admin Panel Modal (Desbloquear todo, trucos y saltos de nivel) */}
      <AdminPanelModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        engine={engineRef.current}
        adminUnlockAll={adminUnlockAll}
        onToggleAdminUnlockAll={handleToggleAdminUnlockAll}
        nanovalenWins={nanovalenWins}
        onSetWins={handleSetWins}
        selectedSkin={selectedSkin}
        onSelectSkin={handleSelectSkin}
        currentStage={stage}
        onJumpStage={handleJumpStage}
      />
    </div>
  );
}
