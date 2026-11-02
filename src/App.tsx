/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/gameEngine';
import { GameRenderer } from './game/renderer';
import { DistortionShaderPipeline } from './game/distortionShader';
import { soundManager } from './audio/soundManager';
import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { StartModal } from './components/StartModal';
import { VictoryModal } from './components/VictoryModal';
import { GameOverModal } from './components/GameOverModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { RoomModal } from './components/RoomModal';
import { SpectatorOverlay } from './components/SpectatorOverlay';
import { PlayerHealthScoreboard } from './components/PlayerHealthScoreboard';
import { AchievementsModal } from './components/AchievementsModal';
import { MissionsModal } from './components/MissionsModal';
import { AchievementToast } from './components/AchievementToast';
import { multiplayerClient } from './game/multiplayerClient';
import { GameStage } from './types/game';
import { canAccessAdminPanel } from './game/achievements';
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
  const distortionPipelineRef = useRef<DistortionShaderPipeline | null>(null);

  const [stage, setStage] = useState<GameStage>('start');
  const activeStageRef = useRef<GameStage>('start');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState<boolean>(true);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState<boolean>(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState<boolean>(false);
  const [isMissionsOpen, setIsMissionsOpen] = useState<boolean>(false);
  const [isMultiplayer, setIsMultiplayer] = useState<boolean>(false);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => {
    return (
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (typeof window !== 'undefined' && window.innerWidth < 1024)
    );
  });
  const [selectedSkin, setSelectedSkin] = useState<CharacterSkinId>(() => getSavedSelectedSkin());
  const [nanovalenWins, setNanovalenWinsState] = useState<number>(() => getSavedNanovalenWins());
  const [adminUnlockAll, setAdminUnlockAllState] = useState<boolean>(() => getAdminUnlockAll());
  const [, setTick] = useState<number>(0); // force HUD re-render at smooth cadence

  // Initialize Game Engine, Renderer & WebGL Distortion Pipeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const displayCtx = canvas.getContext('2d', { alpha: false });
    if (!displayCtx) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Offscreen 2D canvas for pristine rendering before shader post-processing
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const offscreenCtx = offscreenCanvas.getContext('2d', { alpha: false });
    if (!offscreenCtx) return;

    const engine = new GameEngine(width, height);
    engine.selectSkin(selectedSkin);
    engine.setNanovalenWins(nanovalenWins);
    engine.setAdminUnlockAll(adminUnlockAll);
    const renderer = new GameRenderer(offscreenCtx, width, height);

    const distortionPipeline = new DistortionShaderPipeline(width, height);
    distortionPipelineRef.current = distortionPipeline;

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
      offscreenCanvas.width = nw;
      offscreenCanvas.height = nh;
      distortionPipeline.resize(nw, nh);
      engine.resize(nw, nh);
      renderer.resize(nw, nh);
    };

    window.addEventListener('resize', handleResize);

    // Keyboard controls
    const onKeyDown = (e: KeyboardEvent) => {
      // Player Health Scoreboard Hotkey (Tab)
      if (e.code === 'Tab') {
        e.preventDefault();
        setIsScoreboardOpen((prev) => !prev);
        return;
      }

      // Admin Panel Hotkey (F1 or Backquote `)
      if (e.code === 'F1' || e.code === 'Backquote') {
        e.preventDefault();
        const isHost = engine.isHostPlayer();
        if (canAccessAdminPanel(isHost)) {
          setIsAdminModalOpen((prev) => !prev);
        } else {
          setIsAchievementsOpen(true);
        }
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

    // Callbacks for immediate stage sync on victory or game over
    engine.onVictoryCallback = () => {
      activeStageRef.current = 'victory';
      setStage('victory');
    };
    engine.onGameOverCallback = () => {
      activeStageRef.current = 'gameover';
      setStage('gameover');
    };

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

      // Render all layers onto offscreen 2D canvas
      offscreenCtx.save();

      // Screen Shake translation
      if (engine.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * engine.screenShake;
        const shakeY = (Math.random() - 0.5) * engine.screenShake;
        offscreenCtx.translate(shakeX, shakeY);
      }

      const gameTime = currentTime / 1000;
      const isLevel4 =
        engine.stage === 'distorted' ||
        engine.stage === 'rhythm_summon' ||
        engine.stage === 'santiscat_boss' ||
        engine.stage === 'santiscat_boss_wormhole' ||
        engine.stage === 'santiscat_boss_universe';

      if (engine.stage === 'cinematic_earth_destruction' && engine.cinematic) {
        // Render apocalyptic Earth Destruction cinematic
        renderer.drawEarthDestructionCinematic(engine.cinematic, gameTime);
      } else if (engine.stage === 'cinematic_santiscat_defeat' && engine.santiscatDefeatCinematic) {
        // Render Santiscat Final Defeat Cinematic (Super bright light, 12 souls, implosion, giant supernova explosion)
        renderer.drawSantiscatDefeatCinematic(engine.santiscatDefeatCinematic, gameTime, engine.player);
      } else {
        // 1. Background (City, Space nebula or Distorted void)
        renderer.drawBackground(engine.stage, gameTime);

        // Apply Camera translation for Level 4 free-roaming world objects
        offscreenCtx.save();
        if (isLevel4) {
          offscreenCtx.translate(-engine.camera.x, -engine.camera.y);
        }

        // Level 4 Altar, Glitches & Rhythm Minigame
        if (isLevel4 && (engine.stage === 'distorted' || engine.stage === 'rhythm_summon')) {
          const distToAltar = Math.hypot(engine.player.x - 1600, engine.player.y - 1200);
          renderer.drawSpacetimeAltar(1600, 1200, gameTime, distToAltar);
          renderer.drawRealityGlitches(engine.glitches, gameTime);
          if (engine.stage === 'rhythm_summon' && engine.rhythmGame) {
            renderer.drawRhythmGameOverlay(engine.rhythmGame, gameTime);
          }
        }

        // 2. Obstacles (Buildings, Asteroids, Cosmic debris)
        renderer.drawObstacles(engine.obstacles, engine.stage, gameTime);

        // 3. Projectiles (Fireballs, lightning, boss attacks, sun blasts, one-shot fireball)
        renderer.drawProjectiles(engine.projectiles, gameTime);

        // 3.5 Boss Combat Drones (300 HP drones)
        if (engine.drones && engine.drones.length > 0) {
          renderer.drawDrones(engine.drones, gameTime);
        }

        // 4. Boss Nanovalen (if boss stage or boss intro)
        if (engine.boss && (engine.stage === 'boss' || engine.stage === 'boss_intro')) {
          renderer.drawBoss(engine.boss, gameTime, engine.player.x, engine.player.y);
        }

        // 4.5 Boss Santiscat (Level 4 Cosmic Boss - Phase 1, Phase 2 Wormhole, Phase 2.5 Universe)
        if (
          engine.santiscat &&
          (engine.stage === 'santiscat_boss' || engine.stage === 'santiscat_boss_wormhole' || engine.stage === 'santiscat_boss_universe')
        ) {
          renderer.drawSantiscat(engine.santiscat, gameTime, engine.player.x, engine.player.y);
        }

        // 5. Catvalen Player
        if (!engine.isSpectating) {
          renderer.drawPlayer(engine.player, gameTime);
        }

        // 5.5 Remote Multiplayer Players
        if (engine.isMultiplayer) {
          engine.remotePlayers.forEach((remPlayer) => {
            renderer.drawRemotePlayer(remPlayer, gameTime, engine.spectatingTargetId === remPlayer.id);
          });
        }

        // 6. Black Flash critical lightning strikes & inverted flash
        renderer.drawBlackFlashStrikes(engine.blackFlashStrikes);

        // 7. Hit particles & rubble sparks
        renderer.drawParticles(engine.particles);

        // 8. Damage numbers & floating text
        renderer.drawDamageNumbers(engine.damageNumbers);

        // 9. Time stop chrono overlay
        if (engine.player.timeStopActive) {
          renderer.drawTimeStopOverlay(engine.player.timeStopTimer, engine.player.timeStopMaxDuration, gameTime);
        }

        offscreenCtx.restore(); // Restore camera translation
      }

      offscreenCtx.restore(); // Restore screen shake

      // --- Post-Processing: Procedural WebGL Distortion Shader Pipeline ---
      // Distorts spacetime around black holes, reality slashes, and chromatic glitches
      // leaves HTML/React UI 100% crisp and un-distorted on top
      let blackHoleUniforms = undefined;
      if (
        engine.santiscat &&
        (engine.santiscat.blackHole.active || engine.santiscat.currentAttack === 'black_hole_chase' || engine.santiscat.currentAttack === 'compress_black_hole') &&
        engine.santiscat.blackHole.phase !== 'sun_charging'
      ) {
        blackHoleUniforms = {
          active: true,
          screenX: engine.santiscat.blackHole.x - engine.camera.x,
          screenY: engine.santiscat.blackHole.y - engine.camera.y,
          radius: (engine.santiscat.blackHole.radius || 48) * 1.5,
          mass: 2.4,
        };
      }

      let hollowPurpleUniforms = undefined;
      if (engine.santiscat?.gojoTechniques?.purple.active && engine.santiscat.gojoTechniques.purple.phase === 'fired') {
        const pur = engine.santiscat.gojoTechniques.purple;
        hollowPurpleUniforms = {
          active: true,
          screenX: pur.x - engine.camera.x,
          screenY: pur.y - engine.camera.y,
          radius: pur.radius * 1.5,
        };
      }

      const slashUniforms = (engine.santiscat?.slashes || [])
        .filter(s => s.phase === 'slash')
        .map(s => ({
          x1: s.x1 - engine.camera.x,
          y1: s.y1 - engine.camera.y,
          x2: s.x2 - engine.camera.x,
          y2: s.y2 - engine.camera.y,
          intensity: 1.0,
        }));

      let glitchStrength = 0;
      if (isLevel4) {
        glitchStrength = 0.012 + (engine.screenShake > 0 ? 0.04 : 0);
      }

      const isWormhole = engine.stage === 'santiscat_boss_wormhole';
      const wormholeUniforms = isWormhole ? {
        active: true,
        speed: 1.8,
        centerScreenX: width / 2,
        centerScreenY: height / 2,
        hueShift: gameTime * 0.12,
      } : undefined;

      let implosionUniforms = undefined;
      if (
        engine.santiscatDefeatCinematic?.active &&
        (engine.santiscatDefeatCinematic.phase === 'shader_implosion' || engine.santiscatDefeatCinematic.implosionProgress > 0)
      ) {
        implosionUniforms = {
          active: true,
          screenX: width / 2,
          screenY: height / 2 - 25,
          progress: engine.santiscatDefeatCinematic.implosionProgress,
          radius: 650,
        };
      }

      const hasDistortion =
        blackHoleUniforms?.active ||
        hollowPurpleUniforms?.active ||
        slashUniforms.length > 0 ||
        isLevel4 ||
        isWormhole ||
        implosionUniforms?.active;

      if (distortionPipeline.isAvailable() && hasDistortion) {
        distortionPipeline.render(
          offscreenCanvas,
          gameTime,
          blackHoleUniforms,
          glitchStrength,
          slashUniforms,
          hollowPurpleUniforms,
          wormholeUniforms,
          implosionUniforms
        );
        displayCtx.drawImage(distortionPipeline.getCanvas(), 0, 0);
      } else {
        displayCtx.drawImage(offscreenCanvas, 0, 0);
      }

      // Sync stage state if changed internally (including transitions to wormhole, universe, victory, gameover)
      if (engine.stage !== activeStageRef.current) {
        activeStageRef.current = engine.stage;
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
    setIsMultiplayer(false);
    setIsRoomModalOpen(false);
    engineRef.current.setupMultiplayer(false, '');
    engineRef.current.selectSkin(selectedSkin);
    engineRef.current.resetGame();
    setStage('city');
  }, [selectedSkin]);

  const handleStartMultiplayerGame = useCallback(() => {
    if (!engineRef.current) return;
    setIsMultiplayer(true);
    setIsRoomModalOpen(false);
    engineRef.current.selectSkin(selectedSkin);
    engineRef.current.setupMultiplayer(true, multiplayerClient.myPlayerId || '');
    engineRef.current.resetGame();
    setStage('city');
  }, [selectedSkin]);

  const handleCloseRoomModalSolo = useCallback(() => {
    setIsRoomModalOpen(false);
    setIsMultiplayer(false);
    if (engineRef.current) {
      engineRef.current.setupMultiplayer(false, '');
    }
  }, []);

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
    setIsRoomModalOpen(true);
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

  const handleNextLevel = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.startStage('distorted');
    setStage('distorted');
  }, []);

  const handleRematchSantiscat = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.rematchSantiscat();
    setStage('santiscat_boss');
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
          onOpenScoreboard={() => setIsScoreboardOpen(true)}
          onOpenAchievements={() => setIsAchievementsOpen(true)}
          onOpenMissions={() => setIsMissionsOpen(true)}
          onRematchSantiscat={handleRematchSantiscat}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          showTouchControls={showTouchControls}
          onToggleTouchControls={() => setShowTouchControls((prev) => !prev)}
        />
      )}

      {/* Spectator Mode Overlay (When player falls in multiplayer) */}
      {engineRef.current && engineRef.current.isSpectating && (
        <SpectatorOverlay
          engine={engineRef.current}
          onNextTarget={() => engineRef.current?.spectateNext()}
          onPrevTarget={() => engineRef.current?.spectatePrev()}
        />
      )}

      {/* Mobile Touch Joystick & Action Buttons */}
      {showTouchControls && engineRef.current && stage !== 'start' && stage !== 'victory' && stage !== 'gameover' && stage !== 'cinematic_earth_destruction' && (
        <TouchControls
          engine={engineRef.current}
          onPunch={() => engineRef.current?.performPunch()}
          onFireball={() => engineRef.current?.performFireball()}
          onLightning={() => engineRef.current?.performLightning()}
          onPowerBurst={() => engineRef.current?.performPowerBurst()}
          onShield={() => engineRef.current?.activateShield()}
          onHeal={() => engineRef.current?.performHeal()}
          onSpecial1={() => engineRef.current?.performSpecial1()}
          onSpecial2={() => engineRef.current?.performSpecial2()}
        />
      )}

      {/* Multiplayer Local Room Lobby Modal (Prior to skin selection / game start) */}
      <RoomModal
        isOpen={isRoomModalOpen && stage === 'start'}
        onCloseSolo={handleCloseRoomModalSolo}
        onGameStart={handleStartMultiplayerGame}
        selectedSkin={selectedSkin}
        onSelectSkin={handleSelectSkin}
      />

      {/* Welcome / Start Screen with Skin Selector & Admin Button (Solo / Offline Play) */}
      {stage === 'start' && !isRoomModalOpen && (
        <StartModal
          onStart={handleStartGame}
          selectedSkin={selectedSkin}
          nanovalenWins={nanovalenWins}
          adminUnlockAll={adminUnlockAll}
          onSelectSkin={handleSelectSkin}
          onSetWins={handleSetWins}
          onOpenAudioModal={() => setIsAudioModalOpen(true)}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
          onOpenRoomModal={() => setIsRoomModalOpen(true)}
          onOpenAchievements={() => setIsAchievementsOpen(true)}
          onOpenMissions={() => setIsMissionsOpen(true)}
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

      {/* Cinematic Santiscat Defeat Overlay & Emergency Shield Prompt */}
      {stage === 'cinematic_santiscat_defeat' && engineRef.current?.santiscatDefeatCinematic && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-40">
          {/* Top Alert Banner */}
          {engineRef.current.santiscatDefeatCinematic.phase === 'shield_warning' && (
            <div className="mx-auto mt-14 max-w-md w-full bg-red-950/90 border-2 border-red-500 rounded-2xl p-3 text-center shadow-2xl backdrop-blur-md pointer-events-auto animate-bounce">
              <div className="text-red-400 font-black text-sm tracking-wide mb-1">
                ⚠️ ¡ALERTA CÓSMICA! COLAPSO INMINENTE ⚠️
              </div>
              <div className="text-white text-xs font-bold mb-2">
                ¡Activa tu escudo para protegerte de la explosión gigantesca!
              </div>
              <button
                onClick={() => {
                  engineRef.current?.activateShield();
                }}
                className={`w-full py-2.5 px-4 rounded-xl font-black text-sm tracking-wider uppercase transition-transform active:scale-95 shadow-lg ${
                  engineRef.current.player.shieldActive
                    ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/40 animate-pulse'
                }`}
              >
                {engineRef.current.player.shieldActive
                  ? '🛡️ ¡ESCUDO ACTIVADO (PROTEGIDO)!'
                  : '🛡️ ¡TOCA AQUÍ PARA ACTIVAR ESCUDO!'}
              </button>
            </div>
          )}

          {/* Bottom Skip button */}
          <div className="self-end mt-auto pointer-events-auto">
            <button
              onClick={() => {
                engineRef.current?.skipSantiscatDefeatCinematic();
              }}
              className="px-4 py-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl border border-neutral-700 text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer backdrop-blur-md"
            >
              Saltar Cinemática [Espacio] ➔
            </button>
          </div>
        </div>
      )}

      {/* Victory Screen ("¡Ganaste!") */}
      {stage === 'victory' && engineRef.current && (
        <VictoryModal
          stats={engineRef.current.stats}
          isSantiscatDefeated={
            (engineRef.current.stats.santiscatWins || 0) > 0 ||
            (engineRef.current.santiscatWins || 0) > 0 ||
            engineRef.current.lastBattleStage === 'santiscat_boss_universe' ||
            engineRef.current.lastBattleStage === 'santiscat_boss_wormhole' ||
            engineRef.current.lastBattleStage === 'santiscat_boss'
          }
          onPlayAgain={handleStartGame}
          onRematchBoss={
            (engineRef.current.stats.santiscatWins || 0) > 0
              ? handleRematchSantiscat
              : handleRematchBoss
          }
          onMainMenu={handleReturnToMenu}
          onNextLevel={handleNextLevel}
        />
      )}

      {/* Game Over Screen */}
      {stage === 'gameover' && (
        <GameOverModal
          stage={engineRef.current?.stage || 'city'}
          deathReason={engineRef.current?.stats.deathReason}
          bossBlackFlashesCount={engineRef.current?.stats.bossBlackFlashesCount}
          isSantiscatBattle={
            engineRef.current?.lastBattleStage === 'santiscat_boss' ||
            engineRef.current?.santiscat !== null ||
            engineRef.current?.stats.deathReason === 'santiscat_oneshot' ||
            engineRef.current?.stats.deathReason === 'black_hole' ||
            engineRef.current?.stats.deathReason === 'reality_tear'
          }
          onRetry={handleRetry}
          onRetrySantiscat={handleRematchSantiscat}
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

      {/* Player Health Scoreboard Modal (Live HP table of all players) */}
      {engineRef.current && (
        <PlayerHealthScoreboard
          isOpen={isScoreboardOpen}
          onClose={() => setIsScoreboardOpen(false)}
          engine={engineRef.current}
        />
      )}

      {/* Achievements System Modal */}
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        isHost={engineRef.current ? engineRef.current.isHostPlayer() : true}
      />

      {/* Secondary Missions System Modal */}
      <MissionsModal
        isOpen={isMissionsOpen}
        onClose={() => setIsMissionsOpen(false)}
        onQuestsUpdated={() => setTick((t) => t + 1)}
      />

      {/* Floating Achievement Unlock Notification Toast */}
      <AchievementToast />
    </div>
  );
}
