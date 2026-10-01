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
import { GameStage } from './types/game';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);

  const [stage, setStage] = useState<GameStage>('start');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);
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
    const renderer = new GameRenderer(ctx, width, height);

    engineRef.current = engine;
    rendererRef.current = renderer;

    engine.setCallbacks(
      () => setStage('gameover'),
      () => setStage('victory')
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

        // 3. Projectiles (Fireballs, lightning, power bursts, boss meteors)
        renderer.drawProjectiles(engine.projectiles, gameTime);

        // 4. Boss Nanovalen (if boss stage or boss intro)
        if (engine.boss && (engine.stage === 'boss' || engine.stage === 'boss_intro')) {
          renderer.drawBoss(engine.boss, gameTime);
        }

        // 5. Catvalen Player (Square cat from Image 1 with floating circular hands)
        renderer.drawPlayer(engine.player, gameTime);

        // 6. Black Flash critical lightning strikes & inverted flash
        renderer.drawBlackFlashStrikes(engine.blackFlashStrikes);

        // 7. Hit particles & rubble sparks
        renderer.drawParticles(engine.particles);

        // 8. Damage numbers & floating text
        renderer.drawDamageNumbers(engine.damageNumbers);
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

  const handleStartGame = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.resetGame();
    setStage('city');
  }, []);

  const handleRetry = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.resetGame();
    setStage('city');
  }, []);

  const handleReturnToMenu = useCallback(() => {
    soundManager.stopMusic();
    soundManager.stopGammaSound();
    if (engineRef.current) {
      engineRef.current.resetToMenu();
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
          onOpenAudioModal={() => setIsAudioModalOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Mobile Touch Joystick */}
      {engineRef.current && stage !== 'start' && stage !== 'victory' && stage !== 'gameover' && stage !== 'cinematic_earth_destruction' && (
        <TouchControls engine={engineRef.current} />
      )}

      {/* Welcome / Start Screen */}
      {stage === 'start' && (
        <StartModal
          onStart={handleStartGame}
          onOpenAudioModal={() => setIsAudioModalOpen(true)}
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
        />
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
    </div>
  );
}
