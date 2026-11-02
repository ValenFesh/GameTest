import {
  BlackFlashStrike,
  Boss,
  BossDrone,
  Camera,
  CinematicState,
  DamageNumber,
  GameStage,
  Obstacle,
  Particle,
  Player,
  Projectile,
  RealityGlitch,
  RealitySlash,
  RhythmGameState,
  SantiscatBoss,
  SantiscatDefeatCinematicState,
} from '../types/game';
import { MultiplayerPlayer } from '../types/multiplayer';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private stars: { x: number; y: number; size: number; speed: number; alpha: number }[] = [];
  private cityBuildings: { x: number; width: number; height: number; color: string; windows: boolean[][] }[] = [];
  private santiscatImg: HTMLImageElement | null = null;
  private sukunacatImg: HTMLImageElement | null = null;
  private gojocatImg: HTMLImageElement | null = null;
  private shrineImg: HTMLImageElement | null = null;
  private soulImages: Record<string, HTMLImageElement> = {};

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.initBackgrounds();

    if (typeof Image !== 'undefined') {
      this.santiscatImg = new Image();
      this.santiscatImg.src = '/assets/aistudio/santiscat_18f093e7.png';

      this.sukunacatImg = new Image();
      this.sukunacatImg.src = '/assets/aistudio/sukunacat_72a49d1d.png';

      this.gojocatImg = new Image();
      this.gojocatImg.src = '/assets/aistudio/gojocat_296859ad.png';

      this.shrineImg = new Image();
      this.shrineImg.src = '/assets/aistudio/image_c53ec466.png';

      // Preload the 12 Human Souls
      const soulPaths: Record<string, string> = {
        tenacidad: '/assets/aistudio/Tenacidad_ca49aeec.png',
        integridad: '/assets/aistudio/Integridad_ca808672.png',
        justicia: '/assets/aistudio/Justicia_3626915d.png',
        valentia: '/assets/aistudio/Valentia_7a5ea704.png',
        simpatia: '/assets/aistudio/Simpatia_1f6b6d79.png',
        rectitud: '/assets/aistudio/Rectitud_1721dbcd.png',
        determinacion: '/assets/aistudio/Determinacion_b541db8d.png',
        paciencia: '/assets/aistudio/Paciencia_227b909a.png',
        perseverancia: '/assets/aistudio/Perseverancia_74b3517e.png',
        amabilidad: '/assets/aistudio/Amabilidad_2df30abc.png',
        coraje: '/assets/aistudio/Coraje_e2838b81.png',
        entendimiento: '/assets/aistudio/Entendimiento_eb7ff49c.png',
      };
      for (const [id, path] of Object.entries(soulPaths)) {
        const img = new Image();
        img.src = path;
        this.soulImages[id] = img;
      }
    }
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initBackgrounds();
  }

  private initBackgrounds() {
    // Background stars for space & transitions
    this.stars = [];
    for (let i = 0; i < 150; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2.2 + 0.6,
        speed: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
      });
    }

    // Parallax background city silhouettes
    this.cityBuildings = [];
    let curX = 0;
    while (curX < this.width * 2) {
      const bWidth = Math.floor(Math.random() * 80) + 60;
      const bHeight = Math.floor(Math.random() * 220) + 120;
      const floors = Math.floor(bHeight / 25);
      const cols = Math.floor(bWidth / 18);
      const windows: boolean[][] = [];
      for (let f = 0; f < floors; f++) {
        windows[f] = [];
        for (let c = 0; c < cols; c++) {
          windows[f][c] = Math.random() > 0.45;
        }
      }
      this.cityBuildings.push({
        x: curX,
        width: bWidth,
        height: bHeight,
        color: ['#121526', '#171a2e', '#1c2038', '#141829'][Math.floor(Math.random() * 4)],
        windows,
      });
      curX += bWidth + Math.floor(Math.random() * 20);
    }
  }

  public updateBackgrounds(delta: number, stage: GameStage, scrollSpeed: number) {
    // Scroll city silhouette
    if (stage === 'city' || stage === 'start') {
      this.cityBuildings.forEach(b => {
        b.x -= scrollSpeed * 0.4 * delta * 60;
      });
      // wrap around
      const minX = Math.min(...this.cityBuildings.map(b => b.x));
      const maxX = Math.max(...this.cityBuildings.map(b => b.x + b.width));
      this.cityBuildings.forEach(b => {
        if (b.x + b.width < 0) {
          b.x = maxX + Math.random() * 20;
        }
      });
    }

    // Scroll stars
    this.stars.forEach(s => {
      const speedMult = stage === 'transition' ? 6 : 1;
      s.x -= s.speed * speedMult * scrollSpeed * 0.8 * delta * 60;
      if (s.x < 0) {
        s.x = this.width + Math.random() * 20;
        s.y = Math.random() * this.height;
      }
    });
  }

  // --- Background Drawing ---

  public drawBackground(stage: GameStage, gameTime: number) {
    const ctx = this.ctx;

    if (stage === 'city' || stage === 'start') {
      // Twilight / sunset city sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
      skyGrad.addColorStop(0, '#0c0f1d');
      skyGrad.addColorStop(0.4, '#1b1b36');
      skyGrad.addColorStop(0.7, '#382247');
      skyGrad.addColorStop(0.9, '#5c2d49');
      skyGrad.addColorStop(1, '#1b1220');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Distant glow / sun on horizon
      const sunGrad = ctx.createRadialGradient(
        this.width * 0.65, this.height * 0.75, 10,
        this.width * 0.65, this.height * 0.75, 280
      );
      sunGrad.addColorStop(0, 'rgba(255, 130, 80, 0.4)');
      sunGrad.addColorStop(0.5, 'rgba(180, 60, 110, 0.15)');
      sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Distant city skyline layer (parallax)
      this.cityBuildings.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, this.height - b.height, b.width, b.height);

        // Windows glowing
        ctx.fillStyle = '#ffdf78';
        for (let f = 0; f < b.windows.length; f++) {
          for (let c = 0; c < b.windows[f].length; c++) {
            if (b.windows[f][c]) {
              const wx = b.x + 8 + c * 16;
              const wy = this.height - b.height + 14 + f * 22;
              if (wy < this.height - 10) {
                ctx.fillRect(wx, wy, 8, 12);
              }
            }
          }
        }
      });

      // City ground line
      ctx.fillStyle = '#0f121d';
      ctx.fillRect(0, this.height - 40, this.width, 40);
      ctx.strokeStyle = '#28304a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, this.height - 40);
      ctx.lineTo(this.width, this.height - 40);
      ctx.stroke();

    } else if (stage === 'transition') {
      // Stratosphere warp transition into space!
      const transGrad = ctx.createLinearGradient(0, 0, 0, this.height);
      transGrad.addColorStop(0, '#04020a');
      transGrad.addColorStop(0.5, '#120f2e');
      transGrad.addColorStop(1, '#2c1e4a');
      ctx.fillStyle = transGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Hyperspace speed lines
      ctx.save();
      ctx.strokeStyle = 'rgba(150, 200, 255, 0.4)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 47 + gameTime * 600) % (this.width + 200)) - 100;
        const sy = (i * 31) % this.height;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 120, sy);
        ctx.stroke();
      }
      ctx.restore();

    } else if (stage === 'santiscat_boss_wormhole') {
      this.drawWormholeCanvasBackground(gameTime);
    } else if (stage === 'santiscat_boss_universe') {
      this.drawAlternateUniverseBackground(gameTime);
    } else if (stage === 'distorted' || stage === 'rhythm_summon' || stage === 'santiscat_boss') {
      this.drawDistortedBackground(gameTime);
    } else {
      // Space / Boss stage: Deep cosmos nebula
      const spaceGrad = ctx.createRadialGradient(
        this.width * 0.5, this.height * 0.4, 80,
        this.width * 0.5, this.height * 0.5, this.width * 0.8
      );
      if (stage === 'boss' || stage === 'boss_intro') {
        // Menacing dark crimson / violet cosmic atmosphere for Nanovalen
        spaceGrad.addColorStop(0, '#1c0716');
        spaceGrad.addColorStop(0.4, '#13041a');
        spaceGrad.addColorStop(0.8, '#08010d');
        spaceGrad.addColorStop(1, '#020005');
      } else {
        // Deep blue / cyan cosmic nebula
        spaceGrad.addColorStop(0, '#0b162c');
        spaceGrad.addColorStop(0.4, '#090e24');
        spaceGrad.addColorStop(0.8, '#040714');
        spaceGrad.addColorStop(1, '#010208');
      }
      ctx.fillStyle = spaceGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Starfield
      this.stars.forEach(s => {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * (0.6 + 0.4 * Math.sin(gameTime * 3 + s.x))})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Distant planetary body or nebula cloud
      if (stage === 'boss' || stage === 'boss_intro') {
        const bossAuraGrad = ctx.createRadialGradient(
          this.width * 0.8, this.height * 0.35, 20,
          this.width * 0.8, this.height * 0.35, 300
        );
        bossAuraGrad.addColorStop(0, 'rgba(255, 30, 60, 0.15)');
        bossAuraGrad.addColorStop(0.6, 'rgba(100, 10, 80, 0.08)');
        bossAuraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bossAuraGrad;
        ctx.fillRect(0, 0, this.width, this.height);
      }
    }
  }

  // --- CATVALEN (Player) Drawing (Faithful to Image 1) ---

  public drawPlayer(player: Player, time: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(player.x, player.y);

    // Subtle floating bob
    const bob = Math.sin(time * 6) * 3;
    ctx.translate(0, bob);

    // Prompt: "que catvalen pueda voltearse para tirar ataques hacia la izquierda"
    if (player.facing === -1) {
      ctx.scale(-1, 1);
    }

    // Invulnerability blink
    if (player.isInvulnerable && Math.floor(time * 20) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const w = player.width;
    const h = player.height;
    const halfW = w / 2;
    const halfH = h / 2;

    // --- Emerald Healing Glow Aura (When Heal is used) ---
    if (player.healCooldown > 0) {
      ctx.save();
      const healPulse = Math.sin(time * 16) * 4;
      const healRadius = Math.max(w, h) * 0.72 + healPulse;
      const healGrad = ctx.createRadialGradient(0, 0, healRadius * 0.35, 0, 0, healRadius);
      healGrad.addColorStop(0, 'rgba(74, 222, 128, 0.45)');
      healGrad.addColorStop(0.7, 'rgba(34, 197, 94, 0.2)');
      healGrad.addColorStop(1, 'rgba(21, 128, 61, 0)');
      ctx.fillStyle = healGrad;
      ctx.beginPath();
      ctx.arc(0, 0, healRadius, 0, Math.PI * 2);
      ctx.fill();

      // Floating radiant emerald medical cross symbols
      ctx.fillStyle = 'rgba(134, 239, 172, 0.9)';
      for (let i = 0; i < 3; i++) {
        const cx = Math.sin(time * 4 + i * 2.1) * 26;
        const cy = -16 - ((time * 35 + i * 16) % 30);
        ctx.fillRect(cx - 1.5, cy - 5, 3, 10);
        ctx.fillRect(cx - 5, cy - 1.5, 10, 3);
      }
      ctx.restore();
    }

    // --- Character Shield ---
    if (player.shieldActive) {
      ctx.save();
      const shieldRadius = Math.max(w, h) * 0.78 + Math.sin(time * 10) * 3;
      const shieldColor = player.shieldColor || '#10b981';

      // Outer glow
      const shieldGrad = ctx.createRadialGradient(0, 0, shieldRadius * 0.6, 0, 0, shieldRadius);
      shieldGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      shieldGrad.addColorStop(0.8, shieldColor + '40');
      shieldGrad.addColorStop(1, shieldColor + 'dd');
      ctx.fillStyle = shieldGrad;
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
      ctx.fill();

      // Shield ring
      ctx.strokeStyle = shieldColor;
      ctx.lineWidth = 3.5;
      ctx.setLineDash([12, 6]);
      ctx.lineDashOffset = -time * 30;
      ctx.stroke();

      // Inner details
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius * 0.85, 0, Math.PI * 2);
      ctx.stroke();

      // Extra shield ornamentation depending on skin
      if (player.skin === 'perro_marron') {
        // Chrono clock markers
        ctx.fillStyle = '#fbbf24';
        for (let i = 0; i < 8; i++) {
          const cAng = (i * Math.PI * 2) / 8 + time * 2;
          ctx.beginPath();
          ctx.arc(Math.cos(cAng) * shieldRadius * 0.9, Math.sin(cAng) * shieldRadius * 0.9, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (player.skin === 'gato_blanco_manchas') {
        // Light photon flares
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const fAng = (i * Math.PI) / 2 + time * 3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(fAng) * shieldRadius * 0.7, Math.sin(fAng) * shieldRadius * 0.7);
          ctx.lineTo(Math.cos(fAng) * shieldRadius * 1.15, Math.sin(fAng) * shieldRadius * 1.15);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // --- Floating Circular Hands / Paws ---
    this.drawPlayerHands(player, time);

    // --- Character Body Rendering by Skin ---
    const isDog = player.skin === 'perro_rubio' || player.skin === 'perro_marron';

    if (isDog) {
      // --- SQUARE DOG RENDERING (Perro Rubio & Perro Marrón) ---
      const furColor = player.skin === 'perro_rubio' ? '#facc15' : '#78350f';
      const earColor = player.skin === 'perro_rubio' ? '#eab308' : '#5c2b09';
      const snoutColor = player.skin === 'perro_rubio' ? '#fde047' : '#92400e';

      // Wagging tail on left
      const tailWag = Math.sin(time * 18) * 12;
      ctx.save();
      ctx.strokeStyle = furColor;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-halfW + 4, halfH - 12);
      ctx.quadraticCurveTo(-halfW - 14, halfH - 24 + tailWag, -halfW - 20, halfH - 16 + tailWag);
      ctx.stroke();
      ctx.restore();

      // Dog Square Body
      ctx.fillStyle = furColor;
      ctx.strokeStyle = '#141416';
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      const r = 8;
      ctx.roundRect(-halfW, -halfH, w, h, r);
      ctx.fill();
      ctx.stroke();

      // Floppy Dog Ears (Hanging down beside the square head)
      const earFlap = Math.sin(time * 8) * 3;
      // Left Ear
      ctx.fillStyle = earColor;
      ctx.strokeStyle = '#141416';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-halfW + 6, -halfH + 4);
      ctx.quadraticCurveTo(-halfW - 14, -halfH + 8, -halfW - 10, -halfH + 28 + earFlap);
      ctx.quadraticCurveTo(-halfW - 2, -halfH + 34 + earFlap, -halfW + 12, -halfH + 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Ear
      ctx.beginPath();
      ctx.moveTo(halfW - 6, -halfH + 4);
      ctx.quadraticCurveTo(halfW + 14, -halfH + 8, halfW + 10, -halfH + 28 + earFlap);
      ctx.quadraticCurveTo(halfW + 2, -halfH + 34 + earFlap, halfW - 12, -halfH + 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dog Snout / Muzzle
      ctx.fillStyle = snoutColor;
      ctx.beginPath();
      ctx.ellipse(0, 6, 15, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dog Black Nose
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.moveTo(-6, 2);
      ctx.lineTo(6, 2);
      ctx.lineTo(0, 9);
      ctx.closePath();
      ctx.fill();

      // Dog cute mouth line
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 9);
      ctx.lineTo(0, 14);
      ctx.arc(-4, 14, 4, 0, Math.PI * 0.8, false);
      ctx.moveTo(0, 14);
      ctx.arc(4, 14, 4, Math.PI * 0.2, Math.PI, false);
      ctx.stroke();

      // Dog Eyes
      const eyeOffsetX = 12;
      const eyeOffsetY = -5;
      if (player.skin === 'perro_marron') {
        // Chrono Clock Dial Eyes!
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(-eyeOffsetX, eyeOffsetY, 7, 0, Math.PI * 2);
        ctx.arc(eyeOffsetX, eyeOffsetY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Clock hand ticks inside eyes
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        [-eyeOffsetX, eyeOffsetX].forEach(ex => {
          ctx.beginPath();
          ctx.moveTo(ex, eyeOffsetY);
          ctx.lineTo(ex + Math.cos(time * 6) * 4, eyeOffsetY + Math.sin(time * 6) * 4);
          ctx.stroke();
        });
      } else {
        // Loyal round canine eyes
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(-eyeOffsetX, eyeOffsetY, 6, 0, Math.PI * 2);
        ctx.arc(eyeOffsetX, eyeOffsetY, 6, 0, Math.PI * 2);
        ctx.fill();
        // Twinkle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-eyeOffsetX - 2, eyeOffsetY - 2, 2, 0, Math.PI * 2);
        ctx.arc(eyeOffsetX - 2, eyeOffsetY - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }

    } else {
      // --- SQUARE CAT RENDERING (Catvalen, Gata Gris, Gato Negro/Blanco, Gato Blanco Manchas, Gata Azul) ---
      let bodyFill = '#7a7d83';
      let earInner = '#5a5d63';

      if (player.skin === 'gata_gris') {
        bodyFill = '#d1d5db';
        earInner = '#fbcfe8';
      } else if (player.skin === 'gato_negro_blanco') {
        bodyFill = '#171717';
        earInner = '#262626';
      } else if (player.skin === 'gato_blanco_manchas') {
        bodyFill = '#f8fafc';
        earInner = '#fed7aa';
      } else if (player.skin === 'gata_azul_manchas') {
        bodyFill = '#7dd3fc';
        earInner = '#a7f3d0';
      }

      ctx.fillStyle = bodyFill;
      ctx.strokeStyle = '#121214';
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      const r = 6;
      ctx.moveTo(-halfW + r, halfH);
      ctx.lineTo(halfW - r, halfH);
      ctx.quadraticCurveTo(halfW, halfH, halfW, halfH - r);
      ctx.lineTo(halfW, -halfH + 18);
      ctx.lineTo(halfW - 2, -halfH - 12);
      ctx.quadraticCurveTo(halfW * 0.5, -halfH + 8, 0, -halfH + 4);
      ctx.quadraticCurveTo(-halfW * 0.5, -halfH + 8, -halfW + 2, -halfH - 12);
      ctx.lineTo(-halfW, -halfH + 18);
      ctx.lineTo(-halfW, halfH - r);
      ctx.quadraticCurveTo(-halfW, halfH, -halfW + r, halfH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ear Inner Details
      ctx.fillStyle = earInner;
      ctx.beginPath();
      // Left ear inner
      ctx.moveTo(-halfW + 5, -halfH + 12);
      ctx.lineTo(-halfW + 3, -halfH - 6);
      ctx.lineTo(-halfW + 16, -halfH + 7);
      ctx.closePath();
      ctx.fill();
      // Right ear inner
      ctx.beginPath();
      ctx.moveTo(halfW - 5, -halfH + 12);
      ctx.lineTo(halfW - 3, -halfH - 6);
      ctx.lineTo(halfW - 16, -halfH + 7);
      ctx.closePath();
      ctx.fill();

      // Skin-specific spots & patterns
      if (player.skin === 'gato_negro_blanco') {
        // White tuxedo bib / chest patch
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(0, -halfH + 12);
        ctx.lineTo(halfW * 0.65, halfH);
        ctx.lineTo(-halfW * 0.65, halfH);
        ctx.closePath();
        ctx.fill();
        // White chin muzzle
        ctx.beginPath();
        ctx.ellipse(0, 10, 11, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (player.skin === 'gato_blanco_manchas') {
        // Calico orange & brown spots
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.ellipse(-halfW + 12, -halfH + 8, 12, 10, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(halfW - 10, halfH - 12, 14, 11, -0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (player.skin === 'gata_azul_manchas') {
        // Deep turquoise spots
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.ellipse(-halfW + 14, -halfH + 12, 10, 8, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(halfW - 12, halfH - 10, 11, 8, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (player.skin === 'gata_gris') {
        // Cute blush
        ctx.fillStyle = 'rgba(244, 114, 182, 0.55)';
        ctx.beginPath();
        ctx.ellipse(-18, 5, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.ellipse(18, 5, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyes
      let eyeColor = '#111111';
      if (player.skin === 'gato_negro_blanco') eyeColor = '#c084fc';
      if (player.skin === 'gato_blanco_manchas') eyeColor = '#facc15';

      ctx.fillStyle = eyeColor;
      const eyeOffsetX = 12;
      const eyeOffsetY = -2;
      const eyeRadiusX = 6;
      const eyeRadiusY = 7.5;

      if (player.eyeState === 'blink') {
        ctx.beginPath();
        ctx.ellipse(-eyeOffsetX, eyeOffsetY, eyeRadiusX, 1.5, 0, 0, Math.PI * 2);
        ctx.ellipse(eyeOffsetX, eyeOffsetY, eyeRadiusX, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (player.eyeState === 'squint' || player.eyeState === 'hurt') {
        ctx.beginPath();
        ctx.arc(-eyeOffsetX, eyeOffsetY, eyeRadiusX, 0.2 * Math.PI, 0.8 * Math.PI, false);
        ctx.arc(eyeOffsetX, eyeOffsetY, eyeRadiusX, 0.2 * Math.PI, 0.8 * Math.PI, false);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#111111';
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(-eyeOffsetX, eyeOffsetY, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(eyeOffsetX, eyeOffsetY, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);
        ctx.fill();

        // White twinkle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(-eyeOffsetX - 2, eyeOffsetY - 2.5, 2, 0, Math.PI * 2);
        ctx.arc(eyeOffsetX - 2, eyeOffsetY - 2.5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Feminine lashes for Gata Gris & Gata Azul
        if (player.skin === 'gata_gris' || player.skin === 'gata_azul_manchas') {
          ctx.strokeStyle = '#111111';
          ctx.lineWidth = 2;
          ctx.beginPath();
          // Left lashes
          ctx.moveTo(-eyeOffsetX - 4, eyeOffsetY - 6);
          ctx.lineTo(-eyeOffsetX - 8, eyeOffsetY - 9);
          // Right lashes
          ctx.moveTo(eyeOffsetX + 4, eyeOffsetY - 6);
          ctx.lineTo(eyeOffsetX + 8, eyeOffsetY - 9);
          ctx.stroke();
        }
      }

      // Mouth (:3 cute cat smile)
      ctx.strokeStyle = '#141416';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(-5, 12, 5, 0.1 * Math.PI, 0.9 * Math.PI, false);
      ctx.arc(5, 12, 5, 0.1 * Math.PI, 0.9 * Math.PI, false);
      ctx.stroke();

      // Whiskers
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-18, 9);
      ctx.quadraticCurveTo(-28, 7, -36, 10);
      ctx.moveTo(-17, 16);
      ctx.quadraticCurveTo(-27, 18, -35, 23);
      ctx.moveTo(18, 9);
      ctx.quadraticCurveTo(28, 7, 36, 10);
      ctx.moveTo(17, 16);
      ctx.quadraticCurveTo(27, 18, 35, 23);
      ctx.stroke();
    }

    // --- Gata Gris Green Beam Charge FX & Laser Beam ---
    if (player.greenBeamCharging) {
      ctx.save();
      const chargeProgress = Math.min(1, player.greenBeamChargeTimer / player.greenBeamChargeMax);
      const ringRadius = 55 * (1 - chargeProgress) + 18;

      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Electric converging arcs
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + time * 12;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * ringRadius, Math.sin(a) * ringRadius);
        ctx.lineTo(0, 0);
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.65)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Charge bar above head
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-35, -halfH - 24, 70, 8);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-34, -halfH - 23, 68 * chargeProgress, 6);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(-35, -halfH - 24, 70, 8);
      ctx.restore();
    }

    // --- Green Beam Colossal Laser Firing ---
    if (player.greenBeamFiring) {
      ctx.save();
      const beamLen = this.width + 200;
      const beamHeight = 64 + Math.sin(time * 30) * 8;

      // Outer green glow
      const beamGrad = ctx.createLinearGradient(0, -beamHeight / 2, 0, beamHeight / 2);
      beamGrad.addColorStop(0, 'rgba(34, 197, 94, 0)');
      beamGrad.addColorStop(0.25, 'rgba(34, 197, 94, 0.85)');
      beamGrad.addColorStop(0.5, '#ffffff');
      beamGrad.addColorStop(0.75, 'rgba(34, 197, 94, 0.85)');
      beamGrad.addColorStop(1, 'rgba(34, 197, 94, 0)');

      ctx.fillStyle = beamGrad;
      ctx.fillRect(15, -beamHeight / 2, beamLen, beamHeight);

      // Core white laser beam
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(15, -10, beamLen, 20);

      // Energy rings traveling along beam
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 4;
      for (let r = 0; r < 6; r++) {
        const ringX = 40 + ((time * 800 + r * 140) % (beamLen - 80));
        ctx.beginPath();
        ctx.ellipse(ringX, 0, 14, beamHeight * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  public drawRemotePlayer(remotePlayer: MultiplayerPlayer, time: number, isBeingSpectated: boolean = false) {
    const isDead = remotePlayer.isAlive === false || (typeof remotePlayer.hp === 'number' && remotePlayer.hp <= 0);
    if (isDead) {
      // Draw ghost/spectator tombstone
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(remotePlayer.x, remotePlayer.y);
      ctx.globalAlpha = 0.45;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👻', 0, 0);
      ctx.font = '900 11px Orbitron, sans-serif';
      ctx.fillStyle = '#f87171';
      ctx.fillText(`[${remotePlayer.name}] (CAÍDO)`, 0, 20);
      ctx.restore();
      return;
    }

    // Synthesize a Player object compatible with drawPlayer
    const syntheticPlayer: Player = {
      x: remotePlayer.x,
      y: remotePlayer.y,
      vx: remotePlayer.vx,
      vy: remotePlayer.vy,
      width: 58,
      height: 58,
      hp: remotePlayer.hp,
      maxHp: remotePlayer.maxHp,
      shieldActive: remotePlayer.shieldActive,
      shieldTimer: 2.0,
      shieldMaxDuration: 2.8,
      shieldCooldown: 0,
      shieldMaxCooldown: 7.5,
      shieldColor: remotePlayer.shieldColor || '#10b981',
      leftHand: { x: -32, y: 14, punchProgress: 0 },
      rightHand: { x: 32, y: 14, punchProgress: 0 },
      punchCooldown: 0,
      punchMaxCooldown: 0.75,
      fireballCooldown: 0,
      fireballMaxCooldown: 2.2,
      lightningCooldown: 0,
      lightningMaxCooldown: 3.4,
      powerBurstCooldown: 0,
      powerBurstMaxCooldown: 2.6,
      healsRemaining: 10,
      maxHeals: 10,
      healCooldown: 0,
      isInvulnerable: false,
      invulnerableTimer: 0,
      facing: (remotePlayer.facing === -1 ? -1 : 1) as (-1 | 1),
      eyeState: (remotePlayer.eyeState as any) || 'normal',
      animationTime: remotePlayer.animationTime || time,
      skin: remotePlayer.skin || 'catvalen',
      special1Cooldown: 0,
      special1MaxCooldown: 6.0,
      special2Cooldown: 0,
      special2MaxCooldown: 4.0,
      mindControlActive: false,
      mindControlTimer: 0,
      greenBeamCharging: Boolean(remotePlayer.greenBeamCharging),
      greenBeamChargeTimer: 2.0,
      greenBeamChargeMax: 4.0,
      greenBeamFiring: Boolean(remotePlayer.greenBeamFiring),
      greenBeamFiringTimer: 2.0,
      healRegenAccumulator: 0,
      timeStopActive: Boolean(remotePlayer.timeStopActive),
      timeStopTimer: 3.0,
      timeStopMaxDuration: 4.5,
      holdingShield: Boolean(remotePlayer.holdingShield),
    };

    // Draw the teammate character body, skin, ears, paws, and active abilities
    this.drawPlayer(syntheticPlayer, time);

    // Draw Teammate Overhead HUD (Name, Health Bar, Device Icon & Spectating Crown)
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(remotePlayer.x, remotePlayer.y - 48);

    // Spectator highlight indicator
    if (isBeingSpectated) {
      ctx.fillStyle = '#facc15';
      ctx.font = '900 11px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 10;
      ctx.fillText('★ ESPECTANDO ★', 0, -22);
      ctx.shadowBlur = 0;
    }

    // Name tag badge
    const deviceIcon = remotePlayer.device === 'mobile' ? '📱' : '💻';
    const tagText = `${deviceIcon} ${remotePlayer.name}`;
    ctx.font = 'bold 11px Fredoka, sans-serif';
    const textW = ctx.measureText(tagText).width;
    const badgeW = Math.max(54, textW + 14);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = isBeingSpectated ? '#facc15' : 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-badgeW / 2, -18, badgeW, 16, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, 0, -10);

    // Mini Health Bar
    const barW = 44;
    const barH = 5;
    const hpRatio = Math.max(0, Math.min(1, remotePlayer.hp / remotePlayer.maxHp));
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-barW / 2, 2, barW, barH);
    ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(-barW / 2, 2, barW * hpRatio, barH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-barW / 2, 2, barW, barH);

    ctx.restore();
  }

  private drawPlayerHands(player: Player, time: number) {
    const ctx = this.ctx;
    const handRadius = 11;

    const leftX = player.leftHand.x + player.leftHand.punchProgress * 42;
    const leftY = player.leftHand.y + Math.sin(time * 8) * 3;
    const rightX = player.rightHand.x + player.rightHand.punchProgress * 42;
    const rightY = player.rightHand.y + Math.cos(time * 8) * 3;

    let handColor = '#82868d';
    let padColor = '#63666d';

    if (player.skin === 'gata_gris') {
      handColor = '#d1d5db';
      padColor = '#f472b6';
    } else if (player.skin === 'gato_negro_blanco') {
      handColor = '#f8fafc'; // White paws!
      padColor = '#e2e8f0';
    } else if (player.skin === 'gato_blanco_manchas') {
      handColor = '#ffffff';
      padColor = '#fef08a';
    } else if (player.skin === 'gata_azul_manchas') {
      handColor = '#7dd3fc';
      padColor = '#34d399';
    } else if (player.skin === 'perro_rubio') {
      handColor = '#facc15';
      padColor = '#ca8a04';
    } else if (player.skin === 'perro_marron') {
      handColor = '#78350f';
      padColor = '#92400e';
    }

    [
      { x: leftX, y: leftY, punch: player.leftHand.punchProgress },
      { x: rightX, y: rightY, punch: player.rightHand.punchProgress },
    ].forEach((h) => {
      ctx.save();
      if (h.punch > 0.1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(h.x - h.punch * 25, h.y);
        ctx.lineTo(h.x, h.y);
        ctx.stroke();
      }

      ctx.fillStyle = handColor;
      ctx.strokeStyle = '#121214';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(h.x, h.y, handRadius + h.punch * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Paw pad
      ctx.fillStyle = padColor;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  // --- NANOVALEN (Boss) Drawing (Faithful to Image 2) ---

  public drawBoss(boss: Boss, time: number, playerX?: number, playerY?: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(boss.x, boss.y + boss.floatOffset);

    const bw = boss.width;
    const bh = boss.height;
    const halfW = bw / 2;
    const halfH = bh / 2;

    // Menacing Boss Aura
    const auraRadius = Math.max(bw, bh) * 0.75 + Math.sin(time * 6) * 5;
    const auraGrad = ctx.createRadialGradient(0, 0, auraRadius * 0.5, 0, 0, auraRadius);
    auraGrad.addColorStop(0, 'rgba(255, 30, 60, 0.05)');
    auraGrad.addColorStop(0.7, 'rgba(220, 20, 50, 0.25)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    // Floating robotic booster fists on flanks
    const boosterY = Math.sin(time * 5) * 4;
    ctx.fillStyle = '#21242e';
    ctx.strokeStyle = '#141418';
    ctx.lineWidth = 3.5;
    [-halfW - 14, halfW + 14].forEach((bx, i) => {
      ctx.beginPath();
      ctx.arc(bx, boosterY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Red core thruster
      ctx.fillStyle = '#ff223e';
      ctx.beginPath();
      ctx.arc(bx, boosterY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#21242e';
    });

    // --- Nanovalen Helmet & Mask (Exact shape from Image 2) ---
    // 1) Lower jaw/mask: Slate grey-blue (#585f75), rectangular lower half with bottom edge
    ctx.fillStyle = '#596075';
    ctx.strokeStyle = '#111215';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(-halfW, 0);
    // Chevron angle dipping in the center
    ctx.lineTo(0, 10);
    ctx.lineTo(halfW, 0);
    ctx.lineTo(halfW - 2, halfH);
    ctx.lineTo(-halfW + 2, halfH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2) Top Helmet: Black (#18181c) with tall pointy ears and center brow bump
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    // Start at bottom of helmet (the chevron seam with lower mask)
    ctx.moveTo(-halfW, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(halfW, 0);
    // Right side going up
    ctx.lineTo(halfW + 2, -halfH + 10);
    // Right ear tip: tall sharp point pointing upwards
    ctx.lineTo(halfW - 4, -halfH - 24);
    // Slope down from right ear towards center brow
    ctx.lineTo(halfW * 0.35, -halfH + 4);
    // Center brow rounded dome
    ctx.quadraticCurveTo(0, -halfH - 6, -halfW * 0.35, -halfH + 4);
    // Left ear tip: tall sharp point pointing upwards
    ctx.lineTo(-halfW + 4, -halfH - 24);
    // Left side going down
    ctx.lineTo(-halfW - 2, -halfH + 10);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // 3) Menacing Glowing Red Eyes (From Image 2: Slanted almond / demon cat slit)
    const eyePulse = 0.8 + 0.3 * Math.sin(time * 12);
    ctx.save();
    ctx.shadowColor = '#ff1a38';
    ctx.shadowBlur = 18 * boss.eyeGlowIntensity;

    ctx.fillStyle = '#ff2e4b';
    ctx.strokeStyle = '#111113';
    ctx.lineWidth = 3;

    // Left eye (slanted inwards towards nose)
    ctx.beginPath();
    ctx.moveTo(-halfW * 0.65, -8);
    ctx.quadraticCurveTo(-halfW * 0.35, -20, -halfW * 0.12, -4);
    ctx.quadraticCurveTo(-halfW * 0.35, 4, -halfW * 0.65, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right eye (slanted inwards towards nose)
    ctx.beginPath();
    ctx.moveTo(halfW * 0.65, -8);
    ctx.quadraticCurveTo(halfW * 0.35, -20, halfW * 0.12, -4);
    ctx.quadraticCurveTo(halfW * 0.35, 4, halfW * 0.65, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner bright slit
    ctx.fillStyle = '#ffb3bd';
    ctx.beginPath();
    ctx.ellipse(-halfW * 0.36, -8, 5, 2.5, -0.25, 0, Math.PI * 2);
    ctx.ellipse(halfW * 0.36, -8, 5, 2.5, 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // --- Nanovalen Energy Shield (Red Absorbent Shield) ---
    // Prompt: "el escudo de nanovalen debe ser rojo"
    if (boss.shieldActive) {
      ctx.save();
      const shieldW = bw * 1.5;

      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 28;
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 4.5;

      // Hexagonal energy barrier in front of Nanovalen
      ctx.beginPath();
      const sRadius = shieldW * 0.6;
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3 + time * 2;
        const hx = Math.cos(ang) * sRadius;
        const hy = Math.sin(ang) * sRadius;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();

      const shieldGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, sRadius);
      shieldGrad.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
      shieldGrad.addColorStop(0.7, 'rgba(220, 38, 38, 0.45)');
      shieldGrad.addColorStop(1, 'rgba(244, 63, 94, 0.85)');
      ctx.fillStyle = shieldGrad;
      ctx.fill();
      ctx.stroke();

      // Shield label
      ctx.fillStyle = '#ff6b81';
      ctx.font = 'bold 12px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ESCUDO ROJO ABSORBENTE', 0, -sRadius - 8);

      ctx.restore();
    }

    // --- Nanovalen Floating Circular Hands ---
    // Prompt: "nanovalen debe ser capaz de golpear (al igual q el jugador) pero mas lento y con un cierto rango de acercamiento necesario"
    if (boss.leftHand && boss.rightHand) {
      const hands = [
        { hand: boss.leftHand, defaultX: -halfW - 18, isLeft: true },
        { hand: boss.rightHand, defaultX: halfW + 18, isLeft: false },
      ];

      hands.forEach(({ hand, defaultX, isLeft }) => {
        ctx.save();
        // Hand punches forward (to the left towards player)
        const punchDist = hand.punchProgress * 55;
        const hX = defaultX - punchDist;
        const hY = 16 + Math.sin(time * 4 + (isLeft ? 0 : Math.PI)) * 3;

        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = hand.punchProgress > 0 ? 18 : 6;

        // Circular dark robotic fist
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = hand.punchProgress > 0 ? '#ef4444' : '#475569';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(hX, hY, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner glowing red core
        ctx.fillStyle = hand.punchProgress > 0 ? '#ff003b' : '#dc2626';
        ctx.beginPath();
        ctx.arc(hX, hY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Gravity vortex rings if pulling
        if (boss.currentAttack === 'gravity_pull' && !isLeft && boss.pullHandExtended && boss.pullHandExtended > 0) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.lineWidth = 2.5;
          for (let r = 0; r < 3; r++) {
            const vRadius = 18 + r * 14 + (time * 35) % 14;
            ctx.beginPath();
            ctx.arc(hX, hY, vRadius, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
          ctx.beginPath();
          ctx.arc(hX, hY, 22, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });
    }

    // Broken Shield Shattered Indicator (from Gato Negro con Blanco)
    if (boss.shieldDisabledTimer && boss.shieldDisabledTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 6; i++) {
        const sAng = (i * Math.PI * 2) / 6 + time * 3;
        const rad = 50 + Math.sin(time * 12 + i) * 8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sAng) * rad, Math.sin(sAng) * rad);
        ctx.lineTo(Math.cos(sAng) * (rad + 12), Math.sin(sAng) * (rad + 12));
        ctx.stroke();
      }
      ctx.fillStyle = '#d946ef';
      ctx.font = '900 11px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ ESCUDO ROTO ⚡', 0, -halfH - 24);
      ctx.restore();
    }

    // Mind Control Puppet Effect (from Gato Negro con Blanco)
    if (boss.mindControlTimer && boss.mindControlTimer > 0) {
      ctx.save();
      // Puppet strings reaching upwards
      ctx.strokeStyle = '#d946ef';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -time * 20;
      [-25, 0, 25].forEach(sx => {
        ctx.beginPath();
        ctx.moveTo(sx, -halfH);
        ctx.lineTo(sx * 1.5, -this.height);
        ctx.stroke();
      });

      // Swirling psychic crown over Nanovalen's head
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.ellipse(0, -halfH - 18, 28, 8, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#f43f5e';
      ctx.font = '900 12px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🧠 CONTROL MENTAL', 0, -halfH - 32);
      ctx.restore();
    }

    ctx.restore();

    // --- Boss Attacks In Progress ---

    // Gravity Pull Attack Visuals (suction vortex beam & warning)
    if (boss.currentAttack === 'gravity_pull' && playerX !== undefined && playerY !== undefined) {
      this.drawGravityPullAttack(boss, playerX, playerY, time);
    }

    // 1) Laser Warning (1.5s telegraph warning) & Laser Fire
    // "lanzar lasers con un aviso previo de 1.5 segundo"
    if (boss.currentAttack === 'laser_warning') {
      const remainingSec = Math.max(0, (1.5 - boss.attackTimer)).toFixed(1);
      const y = boss.laserY;
      const h = boss.laserHeight;

      ctx.save();
      // Pulsing red danger zone across screen
      const alpha = 0.2 + 0.3 * Math.sin(time * 25);
      ctx.fillStyle = `rgba(255, 30, 60, ${alpha})`;
      ctx.fillRect(0, y - h / 2, this.width, h);

      // Warning border lines
      ctx.strokeStyle = '#ff1a38';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([16, 8]);
      ctx.lineDashOffset = -time * 80;
      ctx.beginPath();
      ctx.moveTo(0, y - h / 2);
      ctx.lineTo(this.width, y - h / 2);
      ctx.moveTo(0, y + h / 2);
      ctx.lineTo(this.width, y + h / 2);
      ctx.stroke();

      // 1.5s Countdown Warning Sign
      ctx.fillStyle = '#ff2244';
      ctx.font = 'bold 15px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚠️ ¡LÁSER EN ${remainingSec}s! ⚠️`, this.width / 2, y - h / 2 - 10);

      // Reticle targeting line from boss eye to warning line
      ctx.strokeStyle = 'rgba(255, 60, 80, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(boss.x - 30, boss.y);
      ctx.lineTo(0, y);
      ctx.stroke();

      ctx.restore();
    } else if (boss.currentAttack === 'laser_fire') {
      const y = boss.laserY;
      const h = boss.laserHeight;

      ctx.save();
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 35;

      // Outer laser core
      const beamGrad = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
      beamGrad.addColorStop(0, 'rgba(255, 20, 60, 0.9)');
      beamGrad.addColorStop(0.3, 'rgba(255, 120, 140, 1)');
      beamGrad.addColorStop(0.5, '#ffffff');
      beamGrad.addColorStop(0.7, 'rgba(255, 120, 140, 1)');
      beamGrad.addColorStop(1, 'rgba(255, 20, 60, 0.9)');

      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, y - h / 2, boss.x, h);

      // Laser sparks along the beam
      ctx.fillStyle = '#ffe0e6';
      for (let i = 0; i < 20; i++) {
        const lx = Math.random() * boss.x;
        const ly = y + (Math.random() - 0.5) * h * 1.4;
        ctx.fillRect(lx, ly, Math.random() * 8 + 3, Math.random() * 8 + 3);
      }

      ctx.restore();
    }

    // 2) Gamma Ray Burst (Explosión de rayos gamma - Final Attack - Uncancelable!)
    // "su ataque final debe ser una explosion de rayos gamma que catvalen debera esquivar, este ataque no puede ser cancelado"
    if (boss.currentAttack === 'gamma_ray_charge' || boss.currentAttack === 'gamma_ray_burst') {
      this.drawGammaRayAttack(boss, time);
    }
  }

  private drawGammaRayAttack(boss: Boss, time: number) {
    const ctx = this.ctx;
    ctx.save();

    const cx = boss.x;
    const cy = boss.y;

    if (boss.currentAttack === 'gamma_ray_charge') {
      // Cosmic charge rings collapsing into Nanovalen with gravitational lensing distortion
      const progress = boss.gammaChargeProgress;
      ctx.shadowColor = '#d946ef';
      ctx.shadowBlur = 45;

      // Uncancelable warning header with alarming red/purple glow
      ctx.fillStyle = '#ff1a4b';
      ctx.font = '900 20px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ ¡ATAQUE FINAL: EXPLOSIÓN DE RAYOS GAMMA! ⚡', this.width / 2, 55);
      ctx.fillStyle = '#fbcfe8';
      ctx.font = '700 13px Fredoka, sans-serif';
      ctx.fillText('(¡POTENCIA TRIPLE! ¡NO SE PUEDE CANCELAR! ¡ESQUIVA LAS ZONAS DE IMPACTO!)', this.width / 2, 80);

      // Rotating charge vortex & relativistic magnetic field loops
      for (let i = 1; i <= 6; i++) {
        const rad = (1 - progress) * 260 + i * 36;
        ctx.strokeStyle = i % 2 === 0 ? `rgba(244, 63, 94, ${0.4 + 0.6 * progress})` : `rgba(217, 70, 239, ${0.4 + 0.6 * progress})`;
        ctx.lineWidth = 3.5;
        ctx.setLineDash([18, 12]);
        ctx.lineDashOffset = (i % 2 === 0 ? 1 : -1) * time * 120;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(10, rad), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Vertical relativistic particle jets charging at Nanovalen's poles
      const jetLength = 120 + progress * 250;
      const jetGrad = ctx.createLinearGradient(cx, cy - jetLength, cx, cy + jetLength);
      jetGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      jetGrad.addColorStop(0.3, 'rgba(244, 63, 94, 0.85)');
      jetGrad.addColorStop(0.5, '#ffffff');
      jetGrad.addColorStop(0.7, 'rgba(217, 70, 239, 0.85)');
      jetGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = jetGrad;
      ctx.fillRect(cx - 8, cy - jetLength, 16, jetLength * 2);

      // Blinding cosmic core light
      const coreGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 80 + progress * 90);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, '#fbcfe8');
      coreGrad.addColorStop(0.6, '#e879f9');
      coreGrad.addColorStop(0.85, '#9333ea');
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 80 + progress * 90, 0, Math.PI * 2);
      ctx.fill();

    } else if (boss.currentAttack === 'gamma_ray_burst') {
      // TRIPLE-POWERED GAMMA RAY BURST: Relativistic pulsar beams + cosmic shockwaves
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 50;

      // Full screen multi-frequency shockwave rings expanding continuously
      for (let ring = 0; ring < 3; ring++) {
        const waveRadius = ((time * 450 + ring * 220) % (this.width * 1.5));
        ctx.strokeStyle = ring === 0 ? 'rgba(255, 255, 255, 0.95)' : ring === 1 ? 'rgba(244, 63, 94, 0.85)' : 'rgba(217, 70, 239, 0.7)';
        ctx.lineWidth = 18 - ring * 4;
        ctx.beginPath();
        ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Sweeping lethal gamma ray beams with designated safe wedges for the player to dodge!
      boss.gammaRays.forEach((ray, rIdx) => {
        const lethalStart = ray.angle;
        const lethalEnd = ray.angle + ray.width;

        // Multi-layered intense lethal gamma plasma sector
        const sectorGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, this.width * 1.5);
        sectorGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        sectorGrad.addColorStop(0.2, 'rgba(244, 63, 94, 0.75)');
        sectorGrad.addColorStop(0.7, 'rgba(217, 70, 239, 0.6)');
        sectorGrad.addColorStop(1, 'rgba(147, 51, 234, 0.35)');

        ctx.fillStyle = sectorGrad;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, this.width * 1.6, lethalStart, lethalEnd);
        ctx.closePath();
        ctx.fill();

        // High intensity neon lethal boundary plasma lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(lethalStart) * this.width * 1.6, cy + Math.sin(lethalStart) * this.width * 1.6);
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(lethalEnd) * this.width * 1.6, cy + Math.sin(lethalEnd) * this.width * 1.6);
        ctx.stroke();

        // Safe dodge zone indicator (vibrant green neon shields indicating the survival corridor!)
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 6;
        ctx.setLineDash([12, 6]);
        ctx.lineDashOffset = -time * 50;
        ctx.beginPath();
        ctx.arc(cx, cy, 190 + rIdx * 10, ray.safeAngleStart, ray.safeAngleEnd);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Central blinding hyper-singularity
      const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 65);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.4, '#fbcfe8');
      coreGrad.addColorStop(0.8, '#ec4899');
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 65, 0, Math.PI * 2);
      ctx.fill();

      // Threat banner text
      ctx.fillStyle = '#ff1a4b';
      ctx.font = '900 18px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💥 ¡ESTALLIDO GAMMA DE POTENCIA TRIPLE ACTIVO! ¡ESQUIVA DENTRO DEL ARCO VERDE! 💥', this.width / 2, 50);
    }

    ctx.restore();
  }

  // --- Gravity Pull Attack Drawing ---
  private drawGravityPullAttack(boss: Boss, playerX: number, playerY: number, time: number) {
    const ctx = this.ctx;
    ctx.save();

    const handX = boss.x - 70;
    const handY = boss.y + 16 + boss.floatOffset;

    // Warning banner at top
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ff1a4b';
    ctx.font = '900 16px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ ¡ATRACCIÓN GRAVITATORIA! ¡ACTIVA TU ESCUDO (SHIFT)! ⚠️', this.width / 2, 55);

    // Gravitational suction cone from hand to player
    const dist = Math.hypot(playerX - handX, playerY - handY);
    const angle = Math.atan2(playerY - handY, playerX - handX);

    // Glowing suction cone
    const grad = ctx.createRadialGradient(handX, handY, 15, handX, handY, dist + 40);
    grad.addColorStop(0, 'rgba(239, 68, 68, 0.55)');
    grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.arc(handX, handY, dist + 40, angle - 0.45, angle + 0.45);
    ctx.closePath();
    ctx.fill();

    // Suction spiral rings flowing towards Nanovalen's hand
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([12, 10]);
    ctx.lineDashOffset = time * 90;
    for (let i = 1; i <= 5; i++) {
      const stepDist = (dist * i) / 5;
      const ringX = handX + Math.cos(angle) * stepDist;
      const ringY = handY + Math.sin(angle) * stepDist;
      ctx.beginPath();
      ctx.ellipse(ringX, ringY, 16 + i * 8, 8 + i * 4, angle, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.restore();
  }

  // --- Boss Combat Drones Drawing ---
  // Prompt: "3 drones alrededor del mapa y que vayan disparando laseres en distintos patrones... tendran 300 HP"
  public drawDrones(drones: BossDrone[], time: number) {
    if (!drones || drones.length === 0) return;
    const ctx = this.ctx;

    drones.forEach(drone => {
      ctx.save();
      ctx.translate(drone.x, drone.y);

      // Drone shadow/glow
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 18;

      // Outer metallic chassis
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, drone.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4 Micro-thrusters
      [-drone.size - 2, drone.size + 2].forEach(tx => {
        [-drone.size * 0.55, drone.size * 0.55].forEach(ty => {
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.arc(tx, ty, 5, 0, Math.PI * 2);
          ctx.fill();

          // Thruster flame glow
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(tx, ty, 2.5 + Math.sin(time * 15 + tx) * 1.2, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // Rotating radar ring
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, drone.size * 0.72, 0, Math.PI * 2);
      ctx.stroke();

      // Central glowing red laser eye
      const eyeGlow = 0.8 + 0.3 * Math.sin(time * 10);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 7 * eyeGlow, 0, Math.PI * 2);
      ctx.fill();

      // Inner white core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      // Pattern indicator badge
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 9px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      const label = drone.pattern === 'sweep' ? 'SWEEP' : drone.pattern === 'pulse' ? 'PULSE' : 'TRACK';
      ctx.fillText(label, 0, drone.size + 14);

      // HP Bar (300 max HP)
      const barW = 42;
      const barH = 5;
      const hpRatio = Math.max(0, drone.hp / drone.maxHp);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-barW / 2, -drone.size - 14, barW, barH);
      ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillRect(-barW / 2, -drone.size - 14, barW * hpRatio, barH);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(-barW / 2, -drone.size - 14, barW, barH);

      // HP text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Fredoka, sans-serif';
      ctx.fillText(`${Math.ceil(drone.hp)} HP`, 0, -drone.size - 17);

      ctx.restore();
    });
  }

  // --- Obstacles Drawing (City Buildings, Meteorites, Asteroids) ---

  public drawObstacles(obstacles: Obstacle[], stage: GameStage, time: number) {
    const ctx = this.ctx;

    obstacles.forEach(obs => {
      ctx.save();
      ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);

      if (obs.type === 'building') {
        // High-rise City Building (Level 1)
        const hw = obs.width / 2;
        const hh = obs.height / 2;

        // Building structure body
        ctx.fillStyle = obs.color || '#2d3748';
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 4;
        ctx.fillRect(-hw, -hh, obs.width, obs.height);
        ctx.strokeRect(-hw, -hh, obs.width, obs.height);

        // Windows
        if (obs.windows) {
          ctx.fillStyle = '#fed7aa';
          for (let f = 0; f < obs.windows.length; f++) {
            for (let c = 0; c < obs.windows[f].length; c++) {
              if (obs.windows[f][c]) {
                const wx = -hw + 8 + c * 16;
                const wy = -hh + 12 + f * 24;
                if (wy < hh - 12) {
                  ctx.fillRect(wx, wy, 8, 12);
                }
              }
            }
          }
        }

        // Rooftop antenna or water tank
        if (obs.antenna) {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, -hh);
          ctx.lineTo(0, -hh - 25);
          ctx.stroke();
          // Blinking red aviation light
          ctx.fillStyle = Math.sin(time * 8) > 0 ? '#ef4444' : '#7f1d1d';
          ctx.beginPath();
          ctx.arc(0, -hh - 25, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Structural damage cracks if damaged
        if (obs.hp < obs.maxHp) {
          const dmgRatio = 1 - obs.hp / obs.maxHp;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-hw * 0.5, -hh + 20);
          ctx.lineTo(-hw * 0.2, 0);
          ctx.lineTo(-hw * 0.4, hh * 0.6);
          ctx.stroke();

          // Smoke puff from cracked building
          if (dmgRatio > 0.4) {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
            ctx.beginPath();
            ctx.arc(-hw * 0.2, -hh + 10, 14, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Building HP bar
        const hpPercent = Math.max(0, obs.hp / obs.maxHp);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(-hw, -hh - 12, obs.width, 6);
        ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(-hw, -hh - 12, obs.width * hpPercent, 6);

      } else {
        // Space Asteroids / Meteorites (Level 2 & Boss)
        ctx.rotate(obs.rotation || 0);
        const rad = obs.width / 2;

        // Meteorite fire trail if fast
        if (obs.vx < -4 || obs.type === 'meteorite') {
          const trailGrad = ctx.createLinearGradient(0, 0, rad * 2.5, 0);
          trailGrad.addColorStop(0, 'rgba(249, 115, 22, 0.8)');
          trailGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.4)');
          trailGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = trailGrad;
          ctx.beginPath();
          ctx.moveTo(rad * 0.5, -rad * 0.8);
          ctx.lineTo(rad * 2.8, 0);
          ctx.lineTo(rad * 0.5, rad * 0.8);
          ctx.closePath();
          ctx.fill();
        }

        // Rocky polygon
        ctx.fillStyle = obs.color || '#64748b';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3.5;

        ctx.beginPath();
        const pts = 8;
        for (let i = 0; i < pts; i++) {
          const ang = (i * Math.PI * 2) / pts;
          const rVar = rad * (0.8 + 0.35 * Math.sin(i * 3 + (obs.rotationSpeed || 1)));
          const px = Math.cos(ang) * rVar;
          const py = Math.sin(ang) * rVar;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Surface craters / magma cracks
        ctx.fillStyle = obs.type === 'meteorite' ? '#f97316' : '#475569';
        ctx.beginPath();
        ctx.arc(-rad * 0.3, -rad * 0.2, rad * 0.22, 0, Math.PI * 2);
        ctx.arc(rad * 0.25, rad * 0.25, rad * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // HP bar for larger asteroids
        if (obs.width > 50) {
          ctx.rotate(-(obs.rotation || 0));
          const hpPercent = Math.max(0, obs.hp / obs.maxHp);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(-rad, -rad - 12, rad * 2, 5);
          ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : '#ef4444';
          ctx.fillRect(-rad, -rad - 12, rad * 2 * hpPercent, 5);
        }
      }

      ctx.restore();
    });
  }

  // --- Projectiles Drawing ---

  public drawProjectiles(projectiles: Projectile[], time: number) {
    const ctx = this.ctx;

    projectiles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);

      // Motion trail
      if (p.trail && p.trail.length > 1) {
        ctx.save();
        for (let i = 0; i < p.trail.length; i++) {
          const t = p.trail[i];
          const tr = p.radius * (i / p.trail.length) * 0.8;
          ctx.fillStyle = p.glowColor;
          ctx.globalAlpha = (i / p.trail.length) * 0.45;
          ctx.beginPath();
          ctx.arc(t.x - p.x, t.y - p.y, tr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (p.type === 'player_fireball') {
        // Bola de fuego
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 20;

        // Fiery outer flare
        const fireGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, p.radius * 1.3);
        fireGrad.addColorStop(0, '#ffffff');
        fireGrad.addColorStop(0.3, '#fef08a');
        fireGrad.addColorStop(0.6, '#f97316');
        fireGrad.addColorStop(1, '#ef4444');

        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Fire sparks
        ctx.fillStyle = '#ffedd5';
        for (let s = 0; s < 3; s++) {
          const sang = time * 20 + (s * Math.PI * 2) / 3;
          ctx.fillRect(Math.cos(sang) * p.radius * 0.7, Math.sin(sang) * p.radius * 0.7, 3, 3);
        }

      } else if (p.type === 'player_lightning') {
        // Rayo (Electric lightning projectile / bolt)
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 22;

        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 4;
        ctx.beginPath();
        // Zig-zag electric spear
        ctx.moveTo(-p.radius * 1.8, 0);
        ctx.lineTo(-p.radius * 0.8, -7);
        ctx.lineTo(0, 7);
        ctx.lineTo(p.radius * 0.8, -5);
        ctx.lineTo(p.radius * 1.8, 0);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'player_burst') {
        // Ráfaga de poder
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 15;

        ctx.fillStyle = '#a5f3fc';
        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 2.5;

        // Elongated power blast bullet
        ctx.beginPath();
        ctx.ellipse(0, 0, p.radius * 1.8, p.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

      } else if (p.type === 'player_light_laser') {
        // Láser Lumínico Amarillo (Gato Blanco con Manchas)
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 24;

        // Golden piercing ray
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.radius * 2.2, p.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // White hot center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.radius * 1.4, p.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'player_magic_orb') {
        // Bolas de poder mágico verde (Gata Azul con Manchas)
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 20;

        const orbGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, p.radius);
        orbGrad.addColorStop(0, '#ffffff');
        orbGrad.addColorStop(0.4, '#6ee7b7');
        orbGrad.addColorStop(0.8, '#10b981');
        orbGrad.addColorStop(1, '#047857');
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting mystic petal sparks
        ctx.fillStyle = '#a7f3d0';
        for (let s = 0; s < 3; s++) {
          const sang = time * 14 + (s * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.arc(Math.cos(sang) * (p.radius + 4), Math.sin(sang) * (p.radius + 4), 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (p.type === 'player_energy_anvil') {
        // Yunque de Energía Cósmica (Dog Fermin) - Massive, visible, with celestial warning beam & ground reticle
        // 1. Celestial Pillar / Beam from the sky
        ctx.save();
        const beamGrad = ctx.createLinearGradient(0, -380, 0, 0);
        beamGrad.addColorStop(0, 'rgba(250, 204, 21, 0)');
        beamGrad.addColorStop(0.6, 'rgba(250, 204, 21, 0.35)');
        beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0.85)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(-32, -450, 64, 450);

        // Core light beam streak
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fillRect(-10, -450, 20, 450);
        ctx.restore();

        // 2. Ground impact target reticle
        if (p.targetY !== undefined) {
          const relGroundY = p.targetY - p.y;
          if (relGroundY > 0) {
            ctx.save();
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 20;

            const pulseRing = 52 + Math.sin(time * 14) * 6;
            ctx.beginPath();
            ctx.ellipse(0, relGroundY, pulseRing, pulseRing * 0.36, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Inner danger crosshair
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-pulseRing * 0.8, relGroundY);
            ctx.lineTo(pulseRing * 0.8, relGroundY);
            ctx.moveTo(0, relGroundY - pulseRing * 0.3);
            ctx.lineTo(0, relGroundY + pulseRing * 0.3);
            ctx.stroke();

            // Ground warning text
            ctx.fillStyle = '#fef08a';
            ctx.font = '900 11px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ ZONA DE IMPACTO', 0, relGroundY + 22);
            ctx.restore();
          }
        }

        // 3. Colossal Golden Anvil
        ctx.save();
        ctx.scale(1.5, 1.5);
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 35;

        // Upward speed lines (showing heavy downward velocity)
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
        ctx.lineWidth = 2;
        [-24, -10, 10, 24].forEach((sx, idx) => {
          ctx.beginPath();
          ctx.moveTo(sx, -25);
          ctx.lineTo(sx, -55 - (idx % 2) * 20);
          ctx.stroke();
        });

        // Golden metallic gradient for body
        const anvilGrad = ctx.createLinearGradient(-30, -20, 30, 24);
        anvilGrad.addColorStop(0, '#ffffff');
        anvilGrad.addColorStop(0.3, '#fde047');
        anvilGrad.addColorStop(0.7, '#eab308');
        anvilGrad.addColorStop(1, '#92400e');
        ctx.fillStyle = anvilGrad;
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 4;

        ctx.beginPath();
        // Top flat striking plate
        ctx.moveTo(-32, -20);
        ctx.lineTo(32, -20);
        ctx.lineTo(26, -5);
        ctx.lineTo(12, 5);
        ctx.lineTo(20, 22);
        ctx.lineTo(-20, 22);
        ctx.lineTo(-12, 5);
        ctx.lineTo(-26, -5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Anvil horn (pointy nose)
        ctx.beginPath();
        ctx.moveTo(32, -20);
        ctx.lineTo(50, -15);
        ctx.lineTo(26, -5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing runic engravings
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(-18, -12);
        ctx.lineTo(18, -12);
        ctx.moveTo(-6, -12);
        ctx.lineTo(0, 12);
        ctx.moveTo(6, -12);
        ctx.lineTo(0, 12);
        ctx.stroke();

        // Arcane spark rings
        ctx.fillStyle = '#ffffff';
        for (let sp = 0; sp < 4; sp++) {
          const spAng = time * 12 + (sp * Math.PI) / 2;
          ctx.beginPath();
          ctx.arc(Math.cos(spAng) * 28, Math.sin(spAng) * 16, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

      } else if (p.type === 'player_energy_blade') {
        // Espadas de Luz Construida (Perro Rubio)
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 18;

        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2.5;

        // Pointy floating sword pointing forward (along motion)
        const angle = Math.atan2(p.vy, p.vx);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(18, 0); // Tip
        ctx.lineTo(6, -6);
        ctx.lineTo(-14, -4);
        ctx.lineTo(-14, 4);
        ctx.lineTo(6, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Sword hilt
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-18, -8, 4, 16);
        ctx.fillRect(-22, -2, 4, 4);

      } else if (p.type === 'boss_meteor') {
        // Nanovalen meteor thrown at player
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 24;

        ctx.fillStyle = '#7f1d1d';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Burning core
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath();
        ctx.arc(-p.radius * 0.3, -p.radius * 0.2, p.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'boss_drone_laser' || p.type === 'boss_pulse_laser') {
        // Red combat drone laser
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 18;

        const angle = Math.atan2(p.vy, p.vx);
        ctx.rotate(angle);

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;

        // Sleek laser bolt
        ctx.beginPath();
        ctx.roundRect(-p.radius * 1.6, -p.radius * 0.45, p.radius * 3.2, p.radius * 0.9, p.radius * 0.4);
        ctx.fill();
        ctx.stroke();

        // Crimson halo
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 1.4, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'santiscat_sun_shot') {
        // Celestial Sun plasma blast
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 22;

        const sunGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, p.radius);
        sunGrad.addColorStop(0, '#ffffff');
        sunGrad.addColorStop(0.4, '#fde047');
        sunGrad.addColorStop(0.8, '#ea580c');
        sunGrad.addColorStop(1, '#ef4444');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

      } else if (p.type === 'santiscat_oneshot_fireball') {
        // Tiny ONE-SHOT Fireball: lethal, dense, high-frequency sinister glow
        ctx.shadowColor = '#ff003b';
        ctx.shadowBlur = 28;

        // Outer dark fire aura
        ctx.fillStyle = '#ff003b';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Inner pitch-black singular core
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Hot pinpoint white center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Subtle skull / danger pulse symbol
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 2.2, time * 12, time * 12 + Math.PI);
        ctx.stroke();

      } else if (p.type === 'santiscat_debris') {
        // Orbiting debris
        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  // --- BLACK FLASH (CRITICAL STRIKE) DRAWING ---
  // User prompt: "una probabilidad de un 2% de que cualquiera de sus ataques sea un black flash (golpe critico)
  // duplicando el daño por 2.5 y haciendo un efecto de rayos de color negro con delineado rojo al golpear"

  public drawBlackFlashStrikes(strikes: BlackFlashStrike[]) {
    const ctx = this.ctx;

    strikes.forEach(strike => {
      ctx.save();
      ctx.translate(strike.x, strike.y);

      const lifeRatio = strike.timer / strike.maxTimer;
      const isBoss = !!strike.isBoss;

      // Inverted distortion shockwave ring
      ctx.save();
      ctx.strokeStyle = isBoss ? '#990022' : '#ff003b';
      ctx.lineWidth = (isBoss ? 6 : 4) * lifeRatio;
      ctx.shadowColor = isBoss ? '#ff0022' : '#ff1a38';
      ctx.shadowBlur = isBoss ? 45 : 30;
      ctx.beginPath();
      ctx.arc(0, 0, (1 - lifeRatio) * (isBoss ? 130 : 90) + 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Deep Black Core with Neon Red Outline
      ctx.save();
      const coreRadius = Math.max(10, (isBoss ? 48 : 32) * lifeRatio);
      const coreGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, coreRadius);
      coreGrad.addColorStop(0, '#000000');
      coreGrad.addColorStop(0.65, '#0d0103');
      coreGrad.addColorStop(1, isBoss ? 'rgba(255, 0, 20, 0.9)' : 'rgba(255, 0, 50, 0.8)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Jagged Black Lightning with Crimson Red Borders!
      // "rayos de color negro con delineado rojo al golpear"
      strike.lightningBranches.forEach(b => {
        // Red outline (pass 1: thicker red line)
        ctx.save();
        ctx.strokeStyle = isBoss ? '#ff002f' : '#ff173d';
        ctx.lineWidth = (isBoss ? 9 : 7) * lifeRatio;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#ff0033';
        ctx.shadowBlur = isBoss ? 30 : 20;
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
        ctx.restore();

        // Pitch black lightning core (pass 2: inner pitch black line)
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = (isBoss ? 5 : 4) * lifeRatio;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
        ctx.restore();
      });

      ctx.restore();
    });
  }

  // --- Cinematic: Earth Destruction by Gamma Ray Burst ---
  // Prompt: "que si mueres en el estallido de rayos gamma haya una cinematica antes de la pantalla de gameover que sea la tierra siendo afectada y destruida por los estallidos"

  public drawEarthDestructionCinematic(cinematic: CinematicState, gameTime: number) {
    const ctx = this.ctx;
    ctx.save();

    // Dark space background with stars
    ctx.fillStyle = '#030107';
    ctx.fillRect(0, 0, this.width, this.height);

    this.stars.forEach(s => {
      ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    const cx = this.width * 0.42;
    const cy = this.height * 0.5;
    const baseR = Math.min(this.width, this.height) * 0.22;

    const timer = cinematic.timer;
    const phase = cinematic.phase;

    // 1. Earth Rendering
    if (phase !== 'shattering_explosion' && phase !== 'extinction') {
      ctx.save();
      ctx.translate(cx, cy);

      // Atmospheric outer glow
      if (cinematic.earthHealth > 0.3) {
        const atmoGrad = ctx.createRadialGradient(0, 0, baseR * 0.9, 0, 0, baseR * 1.15);
        atmoGrad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
        atmoGrad.addColorStop(0.7, 'rgba(14, 165, 233, 0.15)');
        atmoGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = atmoGrad;
        ctx.beginPath();
        ctx.arc(0, 0, baseR * 1.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Planet Ocean Sphere
      const oceanGrad = ctx.createRadialGradient(-baseR * 0.3, -baseR * 0.3, 10, 0, 0, baseR);
      if (cinematic.earthHealth > 0.6) {
        oceanGrad.addColorStop(0, '#38bdf8');
        oceanGrad.addColorStop(0.4, '#0284c7');
        oceanGrad.addColorStop(0.85, '#0369a1');
        oceanGrad.addColorStop(1, '#082f49');
      } else {
        // Oceans boiling into fiery molten magma
        oceanGrad.addColorStop(0, '#f97316');
        oceanGrad.addColorStop(0.4, '#dc2626');
        oceanGrad.addColorStop(0.8, '#7f1d1d');
        oceanGrad.addColorStop(1, '#290606');
      }
      ctx.fillStyle = oceanGrad;
      ctx.beginPath();
      ctx.arc(0, 0, baseR, 0, Math.PI * 2);
      ctx.fill();

      // Earth Continents (Rotated gently over time)
      ctx.save();
      ctx.rotate(gameTime * 0.05);

      const continentColor = cinematic.earthHealth > 0.6 ? '#15803d' : cinematic.earthHealth > 0.3 ? '#ea580c' : '#7f1d1d';
      ctx.fillStyle = continentColor;

      // North America / Europe shape approximation
      ctx.beginPath();
      ctx.ellipse(-baseR * 0.3, -baseR * 0.25, baseR * 0.35, baseR * 0.25, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // South America / Africa approximation
      ctx.beginPath();
      ctx.ellipse(baseR * 0.2, baseR * 0.2, baseR * 0.28, baseR * 0.4, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Asia / Australia approximation
      ctx.beginPath();
      ctx.ellipse(baseR * 0.45, -baseR * 0.15, baseR * 0.25, baseR * 0.2, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Polar Ice caps
      if (cinematic.earthHealth > 0.7) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -baseR * 0.85, baseR * 0.25, 0, Math.PI * 2);
        ctx.arc(0, baseR * 0.85, baseR * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }

      // Swirling atmospheric white clouds
      if (cinematic.earthHealth > 0.5) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.ellipse(-baseR * 0.1, -baseR * 0.1, baseR * 0.5, baseR * 0.12, 0.2, 0, Math.PI * 2);
        ctx.ellipse(baseR * 0.15, baseR * 0.35, baseR * 0.4, baseR * 0.1, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Magma cracks spreading across Earth in Phase 3
      if (phase === 'continents_melt') {
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-baseR * 0.5, -baseR * 0.4);
        ctx.moveTo(0, 0);
        ctx.lineTo(baseR * 0.6, baseR * 0.3);
        ctx.moveTo(0, 0);
        ctx.lineTo(-baseR * 0.3, baseR * 0.6);
        ctx.stroke();
      }

      ctx.restore();
      ctx.restore();
    }

    // 2. Incoming Gamma Ray Superwave (From upper right)
    if (phase === 'incoming_burst' || phase === 'impact_earth' || phase === 'continents_melt') {
      ctx.save();
      const startX = this.width + 100;
      const startY = cy - 220;
      const targetX = cx;
      const targetY = cy;

      // Colossal beam core
      const beamGrad = ctx.createLinearGradient(startX, startY, targetX, targetY);
      beamGrad.addColorStop(0, '#ffffff');
      beamGrad.addColorStop(0.3, '#fbcfe8');
      beamGrad.addColorStop(0.6, '#ec4899');
      beamGrad.addColorStop(1, '#9333ea');

      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 60;
      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = phase === 'incoming_burst' ? Math.min(100, timer * 70) : 120;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      // Inner blinding laser strand
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 35;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      // Impact blast shockwave at Earth's rim
      if (phase === 'impact_earth' || phase === 'continents_melt') {
        const impactR = ((gameTime * 200) % 240);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, impactR, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 3. Shattering Explosion: Earth shatters into fiery planetary shards
    if (phase === 'shattering_explosion' || phase === 'extinction') {
      ctx.save();
      ctx.translate(cx, cy);

      const explodeProg = Math.min(1, (timer - 4.2) / 1.6);

      // Blinding white-hot exposed core
      const coreR = baseR * (1 + explodeProg * 0.8);
      const coreGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, coreR);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, '#fed7aa');
      coreGrad.addColorStop(0.6, '#f97316');
      coreGrad.addColorStop(0.85, '#dc2626');
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, coreR, 0, Math.PI * 2);
      ctx.fill();

      // Outward flying planetary shards & continental crust pieces
      const shardCount = 14;
      for (let i = 0; i < shardCount; i++) {
        const ang = (i * Math.PI * 2) / shardCount;
        const dist = (baseR * 0.7) + explodeProg * (baseR * 1.8 + (i % 3) * 60);
        const sx = Math.cos(ang) * dist;
        const sy = Math.sin(ang) * dist;
        const sSize = 25 + (i % 4) * 8;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(ang + explodeProg * 4);

        // Burning crust
        ctx.fillStyle = '#451a03';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.rect(-sSize / 2, -sSize / 2, sSize, sSize * 0.7);
        ctx.fill();
        ctx.stroke();

        // Trailing magma sparks
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-sSize * 0.3, -sSize * 0.3, 4, 4);
        ctx.restore();
      }

      ctx.restore();
    }

    // 4. Screen Whiteout / Flash Alpha
    if (cinematic.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${cinematic.flashAlpha})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 5. Letterbox black cinematic bars
    const barHeight = Math.max(45, this.height * 0.1);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, barHeight);
    ctx.fillRect(0, this.height - barHeight, this.width, barHeight);

    // 6. Cinematic Dramatic Titles & Subtitles
    ctx.save();
    ctx.textAlign = 'center';

    if (phase === 'incoming_burst') {
      ctx.fillStyle = '#f43f5e';
      ctx.font = '900 20px Orbitron, sans-serif';
      ctx.fillText('⚡ ¡ESTALLIDO DE RAYOS GAMMA EN TRAYECTORIA A LA TIERRA! ⚡', this.width / 2, barHeight - 14);
      ctx.fillStyle = '#fbcfe8';
      ctx.font = '600 13px Fredoka, sans-serif';
      ctx.fillText('La energía cósmica de Nanovalen se propaga a la velocidad de la luz...', this.width / 2, this.height - barHeight + 28);

    } else if (phase === 'impact_earth' || phase === 'continents_melt') {
      ctx.fillStyle = '#ef4444';
      ctx.font = '900 22px Orbitron, sans-serif';
      ctx.fillText('💥 ¡IMPACTO GAMMA TOTAL EN LA ATMÓSFERA! 💥', this.width / 2, barHeight - 14);
      ctx.fillStyle = '#fca5a5';
      ctx.font = '600 13px Fredoka, sans-serif';
      ctx.fillText('Los océanos se evaporan al instante. La corteza terrestre entra en fusión...', this.width / 2, this.height - barHeight + 28);

    } else if (phase === 'shattering_explosion' || phase === 'extinction') {
      ctx.fillStyle = '#ff1a4b';
      ctx.font = '900 22px Orbitron, sans-serif';
      ctx.fillText('💥 LA TIERRA HA SIDO DESTRUIDA POR EL ESTALLIDO 💥', this.width / 2, barHeight - 14);
      ctx.fillStyle = '#fbcfe8';
      ctx.font = '700 14px Fredoka, sans-serif';
      ctx.fillText('Toda la vida en el planeta ha sido erradicada por la radiación gamma.', this.width / 2, this.height - barHeight + 28);

      // Skip / Continue prompt
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 12px Fredoka, sans-serif';
      ctx.fillText('[ Presiona ESPACIO o toca para continuar ]', this.width / 2, this.height - 10);
    }

    ctx.restore();
    ctx.restore();
  }

  // --- Particles & Sparks Drawing ---

  public drawParticles(particles: Particle[]) {
    const ctx = this.ctx;

    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'square') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.shape === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  // --- Damage Numbers & Floating Combat Text ---

  public drawDamageNumbers(damageNumbers: DamageNumber[]) {
    const ctx = this.ctx;

    damageNumbers.forEach(d => {
      ctx.save();
      const alpha = Math.max(0, d.life / d.maxLife);
      ctx.globalAlpha = alpha;

      if (d.isBlackFlash) {
        // Dramatic BLACK FLASH Callout
        ctx.shadowColor = '#ff0033';
        ctx.shadowBlur = 25;

        // Red outer stroke
        ctx.strokeStyle = '#ff1a38';
        ctx.lineWidth = 6;
        ctx.font = `900 ${Math.floor(22 * d.scale)}px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        ctx.strokeText(d.text, d.x, d.y);

        // Black text center
        ctx.fillStyle = '#050102';
        ctx.fillText(d.text, d.x, d.y);

      } else {
        // Standard damage number
        ctx.font = `bold ${Math.floor(16 * d.scale)}px Fredoka, sans-serif`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 3.5;
        ctx.strokeText(d.text, d.x, d.y);
        ctx.fillStyle = d.color;
        ctx.fillText(d.text, d.x, d.y);
      }

      ctx.restore();
    });
  }

  // --- TIME STOP (DETENER EL TIEMPO) CINEMATIC OVERLAY ---
  public drawTimeStopOverlay(timer: number, maxTimer: number, time: number) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Chromatic sepia / negative temporal vignette
    const grad = ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      100,
      this.width / 2,
      this.height / 2,
      this.width * 0.75
    );
    grad.addColorStop(0, 'rgba(217, 119, 6, 0.08)');
    grad.addColorStop(0.6, 'rgba(120, 53, 15, 0.25)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Giant Chrono Clock in Center background
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    const clockR = 140;

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, clockR, 0, Math.PI * 2);
    ctx.stroke();

    // Clock hour marks & Roman numerals
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI * 2) / 12;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (clockR - 12), Math.sin(a) * (clockR - 12));
      ctx.lineTo(Math.cos(a) * clockR, Math.sin(a) * clockR);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = i % 3 === 0 ? 3 : 1.5;
      ctx.stroke();
    }

    // Frozen second / minute hands
    ctx.strokeStyle = 'rgba(253, 230, 138, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(-time * 0.1) * (clockR * 0.7), Math.sin(-time * 0.1) * (clockR * 0.7));
    ctx.stroke();

    ctx.restore();

    // 3. Floating Time Freeze Banner at Top
    ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
    ctx.font = '900 16px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#d97706';
    ctx.shadowBlur = 14;
    ctx.fillText(`⏳ TIEMPO DETENIDO: ${timer.toFixed(1)}s`, this.width / 2, 42);

    ctx.restore();
  }

  // =========================================================================
  // LEVEL 4 RENDERING: DISTORTED REALITY, RHYTHM ALTAR & SANTISCAT BOSS
  // =========================================================================

  public drawDistortedBackground(gameTime: number) {
    const ctx = this.ctx;

    // Deep twisted cosmos void gradient
    const bgGrad = ctx.createRadialGradient(
      this.width * 0.5, this.height * 0.5, 40,
      this.width * 0.5, this.height * 0.5, Math.max(this.width, this.height) * 0.85
    );
    bgGrad.addColorStop(0, '#150826');
    bgGrad.addColorStop(0.35, '#0d061c');
    bgGrad.addColorStop(0.7, '#070210');
    bgGrad.addColorStop(1, '#020005');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Chromatic nebula waves
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const nx = this.width * (0.2 + i * 0.22) + Math.sin(gameTime * 0.4 + i) * 60;
      const ny = this.height * (0.3 + (i % 2) * 0.35) + Math.cos(gameTime * 0.5 + i) * 50;
      const nGrad = ctx.createRadialGradient(nx, ny, 10, nx, ny, 320);
      const isCyan = i % 2 === 0;
      nGrad.addColorStop(0, isCyan ? 'rgba(6, 182, 212, 0.14)' : 'rgba(217, 70, 239, 0.14)');
      nGrad.addColorStop(0.6, isCyan ? 'rgba(14, 116, 144, 0.05)' : 'rgba(134, 25, 143, 0.05)');
      nGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = nGrad;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // Warped Spacetime Grid lines
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.12)';
    ctx.lineWidth = 1.2;
    const gridSize = 140;
    const wave = Math.sin(gameTime * 1.5) * 8;

    for (let x = 0; x <= this.width; x += gridSize) {
      ctx.beginPath();
      for (let y = 0; y <= this.height; y += 20) {
        const xOffset = Math.sin((y + gameTime * 50) * 0.015) * wave;
        if (y === 0) ctx.moveTo(x + xOffset, y);
        else ctx.lineTo(x + xOffset, y);
      }
      ctx.stroke();
    }

    for (let y = 0; y <= this.height; y += gridSize) {
      ctx.beginPath();
      for (let x = 0; x <= this.width; x += 20) {
        const yOffset = Math.cos((x + gameTime * 50) * 0.015) * wave;
        if (x === 0) ctx.moveTo(x, y + yOffset);
        else ctx.lineTo(x, y + yOffset);
      }
      ctx.stroke();
    }

    // Ambient twinkling distorted stars
    this.stars.forEach(s => {
      const flicker = 0.5 + 0.5 * Math.sin(gameTime * 4 + s.x * 0.1);
      ctx.fillStyle = s.x % 2 === 0 ? `rgba(56, 189, 248, ${s.alpha * flicker})` : `rgba(244, 114, 182, ${s.alpha * flicker})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 1.1, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  public drawRealityGlitches(glitches: RealityGlitch[], gameTime: number) {
    const ctx = this.ctx;
    ctx.save();

    glitches.forEach(g => {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.angle);

      const pulse = 0.7 + 0.3 * Math.sin(g.pulseTimer);

      if (g.type === 'fault_line') {
        // Jagged reality fracture with RGB chromatic split
        ctx.strokeStyle = `rgba(236, 72, 153, ${0.85 * pulse})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        const halfW = g.width / 2;
        ctx.moveTo(-halfW, 0);
        ctx.lineTo(-halfW * 0.5, -8);
        ctx.lineTo(0, 10);
        ctx.lineTo(halfW * 0.5, -6);
        ctx.lineTo(halfW, 0);
        ctx.stroke();

        ctx.strokeStyle = `rgba(6, 182, 212, ${0.85 * pulse})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-halfW + 3, 2);
        ctx.lineTo(-halfW * 0.5 + 3, -6);
        ctx.lineTo(3, 12);
        ctx.lineTo(halfW * 0.5 + 3, -4);
        ctx.lineTo(halfW + 3, 2);
        ctx.stroke();

      } else if (g.type === 'chromatic_vortex') {
        // Swirling mini-vortex
        const r = g.width * 0.35 * pulse;
        const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, r);
        grad.addColorStop(0, '#000000');
        grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.6)');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.75, gameTime * 4, gameTime * 4 + Math.PI * 1.3);
        ctx.stroke();

      } else {
        // Quantum Tear: fractured crystal shards
        ctx.fillStyle = `rgba(147, 51, 234, ${0.4 * pulse})`;
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-20, -15);
        ctx.lineTo(15, -25);
        ctx.lineTo(25, 10);
        ctx.lineTo(-10, 20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    });

    ctx.restore();
  }

  public drawSpacetimeAltar(altarX: number, altarY: number, gameTime: number, playerDist: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(altarX, altarY);

    // Glowing base aura
    const baseGrad = ctx.createRadialGradient(0, 0, 30, 0, 0, 240);
    baseGrad.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
    baseGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.2)');
    baseGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 240, 0, Math.PI * 2);
    ctx.fill();

    // Outer Obsidian Platform with Runes
    ctx.fillStyle = '#17122a';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 95, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rotating Runic Rings
    ctx.save();
    ctx.rotate(gameTime * 0.6);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 8, 4, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-gameTime * 0.8);
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6, 2, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Central Cosmic Core Crystal
    const corePulse = 1.0 + 0.15 * Math.sin(gameTime * 5);
    const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 28 * corePulse);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.3, '#38bdf8');
    coreGrad.addColorStop(0.7, '#a855f7');
    coreGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 28 * corePulse, 0, Math.PI * 2);
    ctx.fill();

    // Vertical Light Pillar shooting to the heavens
    const beamGrad = ctx.createLinearGradient(-15, 0, 15, 0);
    beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    beamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
    beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(-18, -400, 36, 400);

    // Interactive Callout if player is near
    if (playerDist < 160) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-120, -135, 240, 34, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 12px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ PRESIONA [ESPACIO / E] ⚡', 0, -114);
    }

    ctx.restore();
  }

  public drawRhythmGameOverlay(rhythm: RhythmGameState, gameTime: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(rhythm.altarX, rhythm.altarY);

    // Central Target Circle (Radius 62)
    const targetPulse = 1.0 + 0.08 * Math.sin(gameTime * 12);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0, 0, 62 * targetPulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Incoming Beat Rings collapsing toward the target circle
    rhythm.beats.forEach(b => {
      if (b.hit || b.missed) return;
      const dt = b.targetTime - rhythm.timer;
      if (dt > 0 && dt < 1.3) {
        const ringRadius = 62 + dt * 170;
        const alpha = Math.max(0.15, 1.0 - dt / 1.3);
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.lineWidth = dt < 0.12 ? 4.5 : 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Score & Combo HUD floating in world space
    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 20px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`BEATS: ${rhythm.totalHits} / ${rhythm.requiredHits}`, 0, 115);

    if (rhythm.combo > 1) {
      ctx.fillStyle = '#facc15';
      ctx.font = '900 16px Orbitron, sans-serif';
      ctx.fillText(`COMBO x${rhythm.combo}!`, 0, 140);
    }

    ctx.restore();
  }

  public drawSantiscat(boss: SantiscatBoss, gameTime: number, playerX: number, playerY: number) {
    const ctx = this.ctx;
    ctx.save();
    const catY = boss.y + boss.floatOffset;

    // 0. Dark Shadowy Portal & Human Souls (when absorbing souls or in Phase 2)
    if (boss.portalScale > 0) {
      this.drawDarkShadowPortal(boss, catY, gameTime);
    }
    if (boss.souls && boss.souls.length > 0) {
      this.drawHumanSouls(boss, catY, gameTime);
    }

    // 1. Cosmic Deity Aura behind Santiscat
    const auraPulse = 1.0 + 0.12 * Math.sin(gameTime * 3);
    const auraGrad = ctx.createRadialGradient(boss.x, catY, 30, boss.x, catY, (boss.bossPhase >= 2 ? 180 : 140) * auraPulse);
    auraGrad.addColorStop(0, boss.bossPhase >= 2 ? 'rgba(236, 72, 153, 0.55)' : 'rgba(168, 85, 247, 0.45)');
    auraGrad.addColorStop(0.5, boss.bossPhase >= 2 ? 'rgba(6, 182, 212, 0.35)' : 'rgba(56, 189, 248, 0.25)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(boss.x, catY, (boss.bossPhase >= 2 ? 180 : 140) * auraPulse, 0, Math.PI * 2);
    ctx.fill();

    // 2. Santiscat Body Sprite (Using loaded asset /assets/aistudio/santiscat_18f093e7.png)
    ctx.save();
    ctx.translate(boss.x, catY);
    if (boss.facing === -1) {
      ctx.scale(-1, 1);
    }

    const drawW = boss.width * (boss.bossPhase >= 2 ? 1.15 : 1.0);
    const drawH = boss.height * (boss.bossPhase >= 2 ? 1.15 : 1.0);

    if (this.santiscatImg && this.santiscatImg.complete && this.santiscatImg.naturalWidth > 0) {
      ctx.drawImage(this.santiscatImg, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      // Fallback procedural square cat matching the doodle
      ctx.fillStyle = boss.bossPhase >= 2 ? '#e2e8f0' : '#9ca3af';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, 12);
      ctx.fill();
      ctx.stroke();

      // Ears
      ctx.beginPath();
      ctx.moveTo(-drawW / 2 + 10, -drawH / 2);
      ctx.lineTo(-drawW / 2 + 25, -drawH / 2 - 28);
      ctx.lineTo(-drawW / 2 + 40, -drawH / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(drawW / 2 - 40, -drawH / 2);
      ctx.lineTo(drawW / 2 - 25, -drawH / 2 - 28);
      ctx.lineTo(drawW / 2 - 10, -drawH / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Eyes & mouth
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-22, -15, 6, 0, Math.PI * 2);
      ctx.arc(22, -15, 6, 0, Math.PI * 2);
      ctx.fill();

      // Mouth :3
      ctx.font = '900 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ω', 0, 22);
    }

    // Glowing Eyes Overlay based on eyeState
    if (boss.eyeState === 'glowing' || boss.bossPhase >= 2) {
      ctx.fillStyle = boss.bossPhase >= 2 ? '#ec4899' : '#facc15';
      ctx.shadowColor = boss.bossPhase >= 2 ? '#db2777' : '#eab308';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(-25, -20, 6, 0, Math.PI * 2);
      ctx.arc(25, -20, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (boss.eyeState === 'menacing') {
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(-25, -20, 6, 0, Math.PI * 2);
      ctx.arc(25, -20, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Floating Circular Paws in front
    const pawBob = Math.sin(gameTime * 4) * 4;
    ctx.fillStyle = '#d1d5db';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;

    // Left Paw
    ctx.beginPath();
    ctx.arc(-boss.leftHand.progress * 30 - 45, 30 + pawBob, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right Paw
    ctx.beginPath();
    ctx.arc(boss.rightHand.progress * 30 + 45, 30 - pawBob, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore(); // restore cat transform

    // 3. Sun Invocation & Black Hole Relativistic Accretion System
    if (boss.blackHole.active || boss.currentAttack === 'black_hole_chase' || boss.currentAttack === 'compress_black_hole' || boss.currentAttack === 'sun_burst') {
      this.drawSunAndBlackHole(boss.blackHole, gameTime);
    }

    // 4. Reality Slashes
    if (boss.slashes && boss.slashes.length > 0) {
      this.drawRealitySlashes(boss.slashes, gameTime);
    }

    // 5. Malevolent Shrine (Fukuma Mizushi)
    if (boss.shrine && boss.shrine.active) {
      this.drawMalevolentShrine(boss.shrine, gameTime);
    }

    // 6. Jujutsu Summons: Sukunacat & Gojocat (Phase 1)
    if (boss.jujutsuSummons && boss.jujutsuSummons.length > 0 && boss.bossPhase === 1) {
      this.drawJujutsuSummons(boss.jujutsuSummons, gameTime, boss.gojoTechniques?.purple?.fusionProgress);
    }

    // 7. Gojo Techniques: Blue, Red & Hollow Purple (Phase 1)
    if (boss.gojoTechniques && boss.bossPhase === 1) {
      this.drawGojoTechniques(boss.gojoTechniques, gameTime);
    }

    // 8. Phase 2 & 2.5 Attacks: Rainbow Energy Blast, Galaxies, Stars & Supernovas, Omega Flowey Save/Load, Refuse to Die
    this.drawRainbowBlast(boss, gameTime);
    this.drawGalaxies(boss, gameTime);
    this.drawGiantStarsAndSupernovas(boss, gameTime);
    this.drawOmegaSaveBox(boss, gameTime);
    this.drawRefusedToDieSequence(boss, gameTime);

    ctx.restore();
  }

  private drawSunAndBlackHole(bh: SantiscatBoss['blackHole'], gameTime: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(bh.x, bh.y);

    if (bh.phase === 'sun_charging' || bh.phase === 'compressing') {
      // Celestial Radiant Sun
      const scale = bh.phase === 'compressing' ? Math.max(0.3, 1.0 - (bh.timer / 1.2) * 0.7) : 1.0;
      const r = 52 * scale;

      // Sun Corona Glow
      const coronaGrad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.2);
      coronaGrad.addColorStop(0, '#ffffff');
      coronaGrad.addColorStop(0.3, '#fde047');
      coronaGrad.addColorStop(0.7, '#ea580c');
      coronaGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = coronaGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Solar flare arcs
      ctx.save();
      ctx.rotate(gameTime * 2);
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.7)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, r * 0.4, 0, Math.PI);
        ctx.stroke();
      }
      ctx.restore();

      // Solid incandescent core
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Relativistic Black Hole with Accretion Disk, Gravity Distortion Field, Photon Sphere & Hazard HUD
      const r = bh.radius || 48;
      const gravRadius = bh.gravityRadius || 380;

      // 1. Gravitational Attraction Field (Pulsing hazard boundary showing the suction danger area)
      ctx.save();
      const gravPulse = 0.5 + 0.3 * Math.sin(gameTime * 4);
      ctx.strokeStyle = `rgba(249, 115, 22, ${0.35 + 0.3 * gravPulse})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 8]);
      ctx.lineDashOffset = -gameTime * 50;
      ctx.beginPath();
      ctx.arc(0, 0, gravRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Inward swirling gravitational suction rays
      for (let s = 0; s < 12; s++) {
        const rayAngle = (s * Math.PI * 2) / 12 + gameTime * 2.2;
        const streamProgress = ((gameTime * 1.8 + s * 0.15) % 1.0);
        const startDist = gravRadius * (1.0 - streamProgress * 0.7);
        const endDist = Math.max(r * 1.5, startDist - 60);
        ctx.strokeStyle = s % 2 === 0 ? 'rgba(56, 189, 248, 0.55)' : 'rgba(249, 115, 22, 0.6)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(rayAngle) * startDist, Math.sin(rayAngle) * startDist);
        ctx.lineTo(Math.cos(rayAngle + 0.22) * endDist, Math.sin(rayAngle + 0.22) * endDist);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Gravitational lensing outer warp halo
      const lensGrad = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 3.6);
      lensGrad.addColorStop(0, 'rgba(251, 146, 60, 0.9)');
      lensGrad.addColorStop(0.3, 'rgba(234, 88, 12, 0.7)');
      lensGrad.addColorStop(0.6, 'rgba(168, 85, 247, 0.45)');
      lensGrad.addColorStop(0.85, 'rgba(56, 189, 248, 0.3)');
      lensGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lensGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 3.6, 0, Math.PI * 2);
      ctx.fill();

      // 3. Glowing swirling relativistic accretion disk (high contrast against wormhole & dark space)
      ctx.save();
      ctx.rotate(gameTime * 4.2);

      // Outer Azure Doppler-shifted ring
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.1, 0, Math.PI * 2);
      ctx.stroke();

      // Blazing superheated thermonuclear plasma ring
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 14;
      ctx.shadowColor = '#ea580c';
      ctx.shadowBlur = 32;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
      ctx.stroke();

      // Inner golden accretion ring
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 5;
      ctx.shadowColor = '#ca8a04';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
      ctx.stroke();

      // 4 Logarithmic Plasma Spirals plunging into singularity
      ctx.lineWidth = 4;
      for (let arm = 0; arm < 4; arm++) {
        const baseA = (arm * Math.PI) / 2;
        ctx.strokeStyle = arm % 2 === 0 ? '#ffedd5' : '#f97316';
        ctx.beginPath();
        for (let st = 0; st <= 20; st++) {
          const tNorm = st / 20;
          const spiralR = r * 1.1 + tNorm * (r * 1.0);
          const spiralA = baseA + tNorm * 1.6;
          const sx = Math.cos(spiralA) * spiralR;
          const sy = Math.sin(spiralA) * spiralR;
          if (st === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.restore();

      // 4. Orbiting absorbed debris caught in the gravitational vortex
      bh.absorbedDebris.forEach(deb => {
        const dx = Math.cos(deb.angle) * deb.dist;
        const dy = Math.sin(deb.angle) * deb.dist;
        ctx.fillStyle = deb.color || '#94a3b8';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(dx, dy, deb.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // 5. Event Horizon: Absolute Pure Void Singularity
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Double Einstein photon ring (Radiant Pure White & Gold)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, r + 1.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 6. Floating Danger Warning Sign Badge
      ctx.save();
      const tagY = -r * 2.3 - 22;
      const tagW = 280;
      const tagH = 32;
      ctx.fillStyle = 'rgba(15, 7, 26, 0.92)';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-tagW / 2, tagY - tagH / 2, tagW, tagH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fecdd3';
      ctx.font = '900 13px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠️ AGUJERO NEGRO CÓSMICO ⚠️', 0, tagY);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawRealitySlashes(slashes: SantiscatBoss['slashes'], gameTime: number) {
    const ctx = this.ctx;
    ctx.save();

    slashes.forEach(s => {
      if (s.phase === 'telegraph') {
        // Red flashing laser warning line
        const pulse = Math.floor(gameTime * 24) % 2 === 0 ? 0.9 : 0.35;
        ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
        ctx.setLineDash([]);

      } else if (s.phase === 'slash') {
        // Dimension-shattering reality tear
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = s.width * 1.1;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();

        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = s.width * 0.6;
        ctx.stroke();
        ctx.shadowBlur = 0;

      } else {
        // Fading residual quantum scar
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  // --- MALEVOLENT SHRINE (TEMPLO DEL MAL / FUKUMA MIZUSHI) RENDERING ---
  private drawMalevolentShrine(shrine: SantiscatBoss['shrine'], gameTime: number) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Fullscreen blood-red atmospheric domain overlay
    // Covers the entire map with crimson darkness
    ctx.fillStyle = `rgba(185, 28, 28, ${0.45 * shrine.redIntensity})`;
    ctx.fillRect(-1000, -1000, 5200, 4400);

    // Vignette blood pulse
    const pulse = 0.12 + Math.sin(gameTime * 6) * 0.05;
    ctx.fillStyle = `rgba(127, 29, 29, ${pulse * shrine.redIntensity})`;
    ctx.fillRect(-1000, -1000, 5200, 4400);

    // 2. Malevolent Shrine Image / Structure manifestation
    ctx.save();
    ctx.translate(shrine.shrineX, shrine.shrineY);

    // Demonic red backlight glow
    const glowGrad = ctx.createRadialGradient(0, 0, 40, 0, 0, 260);
    glowGrad.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
    glowGrad.addColorStop(0.5, 'rgba(185, 28, 28, 0.45)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, -20, 260, 0, Math.PI * 2);
    ctx.fill();

    const shrineW = 380;
    const shrineH = 260;
    if (this.shrineImg && this.shrineImg.complete && this.shrineImg.naturalWidth > 0) {
      // Draw actual Malevolent Shrine reference image provided by user
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 35;
      ctx.drawImage(this.shrineImg, -shrineW / 2, -shrineH / 2 - 40, shrineW, shrineH);
      ctx.shadowBlur = 0;
    } else {
      // Procedural fallback: Demonic Torii Pagoda & skulls
      ctx.fillStyle = '#1c1917';
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Curved pagoda roof horns
      ctx.moveTo(-160, -80);
      ctx.quadraticCurveTo(0, -120, 160, -80);
      ctx.lineTo(130, -50);
      ctx.lineTo(-130, -50);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pillars
      ctx.fillRect(-110, -50, 30, 140);
      ctx.fillRect(80, -50, 30, 140);
      ctx.strokeRect(-110, -50, 30, 140);
      ctx.strokeRect(80, -50, 30, 140);
    }

    // Kanji banner over shrine
    ctx.font = '900 24px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff003b';
    ctx.shadowBlur = 18;
    ctx.fillText('伏魔御廚子 · 領域展開', 0, -shrineH / 2 - 55);
    ctx.shadowBlur = 0;

    ctx.restore();

    // 3. Thousands of razor-sharp cleave cuts sweeping the map
    shrine.cuts.forEach(c => {
      ctx.strokeStyle = `rgba(255, 255, 255, ${c.alpha})`;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(c.x1, c.y1);
      ctx.lineTo(c.x2, c.y2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(220, 38, 38, ${c.alpha * 0.9})`;
      ctx.lineWidth = 6.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    ctx.restore();
  }

  // --- JUJUTSU SUMMONS RENDERING ---
  private drawJujutsuSummons(summons: SantiscatBoss['jujutsuSummons'], gameTime: number, purpleFusionProg: number = 0.5) {
    const ctx = this.ctx;

    summons.forEach(sm => {
      if (!sm.active) return;
      ctx.save();
      ctx.translate(sm.x, sm.y);

      const bob = Math.sin(gameTime * 3.5 + (sm.id === 'sukunacat' ? 0 : Math.PI)) * 6;

      // 1. Cursed Energy Aura
      const auraColor = sm.id === 'sukunacat' ? 'rgba(220, 38, 38, 0.45)' : 'rgba(56, 189, 248, 0.45)';
      const auraGrad = ctx.createRadialGradient(0, bob, sm.width * 0.2, 0, bob, sm.width * 0.85);
      auraGrad.addColorStop(0, auraColor);
      auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, bob, sm.width * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // 2. Sprite drawing (with facing flip)
      ctx.save();
      ctx.translate(0, bob);
      ctx.scale(sm.facing, 1);

      const img = sm.id === 'sukunacat' ? this.sukunacatImg : this.gojocatImg;
      const w = sm.width;
      const h = sm.height;

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.shadowColor = sm.id === 'sukunacat' ? '#dc2626' : '#38bdf8';
        ctx.shadowBlur = 16;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.shadowBlur = 0;
      } else {
        // Procedural fallback
        ctx.fillStyle = sm.id === 'sukunacat' ? '#fca5a5' : '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Ears
        ctx.beginPath();
        ctx.moveTo(-24, -26);
        ctx.lineTo(-38, -50);
        ctx.lineTo(-8, -34);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(24, -26);
        ctx.lineTo(38, -50);
        ctx.lineTo(8, -34);
        ctx.fill();
        ctx.stroke();

        if (sm.id === 'sukunacat') {
          // Sukuna tattoos & four eyes
          ctx.fillStyle = '#000000';
          ctx.fillRect(-12, -18, 24, 4);
          ctx.fillRect(-6, -26, 12, 4);

          // 4 red eyes
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(-14, -8, 3, 0, Math.PI * 2);
          ctx.arc(14, -8, 3, 0, Math.PI * 2);
          ctx.arc(-14, -1, 2.5, 0, Math.PI * 2);
          ctx.arc(14, -1, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Gojo blindfold
          ctx.fillStyle = '#171717';
          ctx.fillRect(-26, -14, 52, 12);
          // Glowing six eyes edge
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#0284c7';
          ctx.shadowBlur = 8;
          ctx.fillRect(-12, -4, 24, 2);
          ctx.shadowBlur = 0;
        }
      }

      ctx.restore(); // restore flip

      // 3. Floating paws
      const pawBob = Math.cos(gameTime * 4) * 4;
      ctx.fillStyle = sm.id === 'sukunacat' ? '#fee2e2' : '#f0f9ff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(-32, bob + 18 + pawBob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(32, bob + 18 - pawBob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Gojo Purple Charging Orbs (Red in left, Blue in right)
      if (sm.id === 'gojocat' && sm.state === 'purple_charge') {
        const prog = purpleFusionProg;

        // Converging distance: from 45 down to 0
        const orbOffset = 45 * (1.0 - prog);

        // Blue orb
        ctx.fillStyle = '#0284c7';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(-orbOffset, bob + 16, 16, 0, Math.PI * 2);
        ctx.fill();

        // Red orb
        ctx.fillStyle = '#dc2626';
        ctx.shadowColor = '#f43f5e';
        ctx.beginPath();
        ctx.arc(orbOffset, bob + 16, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Electric lightning sparks between orbs
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-orbOffset, bob + 16);
        ctx.lineTo(0, bob + 16 + (Math.random() - 0.5) * 12);
        ctx.lineTo(orbOffset, bob + 16);
        ctx.stroke();
      }

      // 4. Overhead HP Bar
      const hpPercent = Math.max(0, sm.hp / sm.maxHp);
      const barW = 76;
      const barH = 7;
      const barY = -sm.height / 2 - 20;

      ctx.fillStyle = '#171717';
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-barW / 2, barY, barW, barH);
      ctx.strokeRect(-barW / 2, barY, barW, barH);

      ctx.fillStyle = sm.id === 'sukunacat' ? '#dc2626' : '#0ea5e9';
      ctx.fillRect(-barW / 2, barY, barW * hpPercent, barH);

      // Name label
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(sm.id === 'sukunacat' ? 'SUKUNACAT' : 'GOJOCAT', 0, barY - 4);
      ctx.shadowBlur = 0;

      // 5. Chant Speech Bubble if active
      if (sm.chantText) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-100, barY - 32, 200, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#fecaca';
        ctx.fillText(sm.chantText, 0, barY - 17);
      }

      ctx.restore();
    });

    // Render independent Sukunacat Cleave / Dismantle slashes
    summons.forEach(sm => {
      if (sm.active && sm.slashes && sm.slashes.length > 0) {
        this.drawSukunacatSlashes(sm.slashes, gameTime);
      }
    });
  }

  private drawSukunacatSlashes(slashes: RealitySlash[], gameTime: number) {
    const ctx = this.ctx;
    ctx.save();

    slashes.forEach(s => {
      if (s.phase === 'telegraph') {
        // Menacing red laser warning line with rapid pulse
        const pulse = Math.floor(gameTime * 28) % 2 === 0 ? 0.95 : 0.4;
        ctx.strokeStyle = `rgba(220, 38, 38, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (s.phase === 'slash') {
        // Brutal Sukuna Cleave: Pure white inner core with crimson cursed aura & black spark
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = s.width * 1.15;
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();

        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = s.width * 0.7;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Cursed black spark accents
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        const midX = (s.x1 + s.x2) / 2;
        const midY = (s.y1 + s.y2) / 2;
        ctx.beginPath();
        ctx.moveTo(midX - 15, midY - 15);
        ctx.lineTo(midX, midY + 12);
        ctx.lineTo(midX + 18, midY - 8);
        ctx.stroke();
      } else {
        // Residual fading blood scar
        ctx.strokeStyle = 'rgba(185, 28, 28, 0.45)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  // --- GOJO TECHNIQUES RENDERING: BLUE, RED & PURPLE ---
  private drawGojoTechniques(gt: SantiscatBoss['gojoTechniques'], gameTime: number) {
    const ctx = this.ctx;

    // 1. Azul (Lapse: Blue / Rotación del Ritual)
    if (gt.blue.active) {
      const b = gt.blue;
      ctx.save();
      ctx.translate(b.x, b.y);

      // Gravitational suction vortex field
      const fieldGrad = ctx.createRadialGradient(0, 0, b.radius * 0.4, 0, 0, b.suctionRadius);
      fieldGrad.addColorStop(0, 'rgba(14, 165, 233, 0.5)');
      fieldGrad.addColorStop(0.5, 'rgba(2, 132, 199, 0.2)');
      fieldGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fieldGrad;
      ctx.beginPath();
      ctx.arc(0, 0, b.suctionRadius, 0, Math.PI * 2);
      ctx.fill();

      // Outer perimeter boundary ring (shows player where suction ends)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, b.suctionRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Swirling suction spiral arms
      ctx.save();
      ctx.rotate(-gameTime * 6);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 3.5;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 1.8, a, a + 1.2);
        ctx.stroke();
      }
      ctx.restore();

      // Intense brilliant electric cyan core
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // White incandescent center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Orbiting suction debris
      b.absorbedDebris.forEach(deb => {
        ctx.save();
        ctx.translate(deb.x - b.x, deb.y - b.y);
        ctx.rotate(deb.angle);
        ctx.fillStyle = deb.color;
        ctx.fillRect(-deb.radius / 2, -deb.radius / 2, deb.radius, deb.radius);
        ctx.restore();
      });

      ctx.restore();
    }

    // 2. Rojo (Reversal: Red / Reversión del Ritual)
    if (gt.red.active) {
      const r = gt.red;
      ctx.save();
      ctx.translate(r.x, r.y);

      // Repulsion shockwave wave
      ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(0, 1.0 - r.radius / r.maxRadius)})`;
      ctx.lineWidth = 8;
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(0, 0, r.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Second outer ring
      ctx.strokeStyle = `rgba(254, 205, 211, ${Math.max(0, 0.8 - r.radius / r.maxRadius)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r.radius * 1.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Flying blasted debris
      r.repelledDebris.forEach(deb => {
        ctx.save();
        ctx.translate(deb.x - r.x, deb.y - r.y);
        ctx.rotate(deb.angle);
        ctx.fillStyle = deb.color;
        ctx.fillRect(-deb.radius / 2, -deb.radius / 2, deb.radius, deb.radius);
        ctx.restore();
      });

      ctx.restore();
    }

    // 3. Vacío Púrpura (Kyoshiki Murasaki / Hollow Purple)
    if (gt.purple.active && gt.purple.phase === 'fired') {
      const pur = gt.purple;
      ctx.save();
      ctx.translate(pur.x, pur.y);

      // Distorted plasma aura
      const pr = pur.radius;
      const purpleGrad = ctx.createRadialGradient(0, 0, pr * 0.4, 0, 0, pr * 2.5);
      purpleGrad.addColorStop(0, 'rgba(168, 85, 247, 0.9)');
      purpleGrad.addColorStop(0.35, 'rgba(217, 70, 239, 0.6)');
      purpleGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.25)');
      purpleGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = purpleGrad;
      ctx.beginPath();
      ctx.arc(0, 0, pr * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Swirling electric rings around Hollow Purple
      ctx.save();
      ctx.rotate(gameTime * 8);
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(0, 0, pr * 1.25, 0, Math.PI * 2);
      ctx.stroke();

      // Inner cyan quantum halo
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, pr * 1.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Pure Void Singularity Core: Erasure of Spacetime
      ctx.fillStyle = '#0f051d';
      ctx.beginPath();
      ctx.arc(0, 0, pr * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Incandescent Violet Energy Edge
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, pr * 0.82, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  // =========================================================================
  // SANTISCAT PHASE 2 & 2.5 RENDERING (PORTAL, 12 SOULS, WORMHOLE, OMEGA SAVE)
  // =========================================================================

  public drawDarkShadowPortal(boss: SantiscatBoss, catY: number, gameTime: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(boss.x, catY);
    ctx.scale(boss.portalScale, boss.portalScale);
    ctx.rotate(boss.portalAngle);

    // Dark swirling vortex disk
    for (let r = 180; r >= 20; r -= 25) {
      const grad = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
      grad.addColorStop(0, '#000000');
      grad.addColorStop(0.5, 'rgba(88, 28, 135, 0.55)');
      grad.addColorStop(0.85, 'rgba(15, 23, 42, 0.7)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shadow tendrils spiraling from portal
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      ctx.beginPath();
      ctx.arc(0, 0, 140, a, a + 0.9);
      ctx.stroke();
    }

    ctx.restore();
  }

  public drawHumanSouls(boss: SantiscatBoss, catY: number, gameTime: number) {
    const ctx = this.ctx;

    boss.souls.forEach((soul, i) => {
      if (soul.absorbed || soul.alpha <= 0.01) return;

      const sx = boss.x + Math.cos(soul.angle) * soul.distance;
      const sy = catY + Math.sin(soul.angle) * soul.distance;

      ctx.save();
      ctx.globalAlpha = soul.alpha;
      ctx.translate(sx, sy);

      // Glowing aura
      const auraR = 32 * soul.scale;
      const soulGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, auraR);
      soulGrad.addColorStop(0, soul.color);
      soulGrad.addColorStop(0.5, soul.glowColor);
      soulGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = soulGrad;
      ctx.beginPath();
      ctx.arc(0, 0, auraR, 0, Math.PI * 2);
      ctx.fill();

      // Draw Soul Heart Sprite (User's provided PNGs)
      const img = this.soulImages[soul.id];
      const soulSize = 38 * soul.scale;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -soulSize / 2, -soulSize / 2, soulSize, soulSize);
      } else {
        // Fallback Undertale style heart
        ctx.fillStyle = soul.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const topCurveHeight = soulSize * 0.3;
        ctx.moveTo(0, topCurveHeight);
        ctx.bezierCurveTo(0, 0, -soulSize / 2, 0, -soulSize / 2, topCurveHeight);
        ctx.bezierCurveTo(-soulSize / 2, (soulSize + topCurveHeight) / 2, 0, (soulSize + topCurveHeight) / 2, 0, soulSize);
        ctx.bezierCurveTo(0, (soulSize + topCurveHeight) / 2, soulSize / 2, (soulSize + topCurveHeight) / 2, soulSize / 2, topCurveHeight);
        ctx.bezierCurveTo(soulSize / 2, 0, 0, 0, 0, topCurveHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Soul Trait Label
      ctx.fillStyle = soul.color;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(soul.trait.toUpperCase(), 0, soulSize * 0.65 + 8);
      ctx.shadowBlur = 0;

      ctx.restore();
    });
  }

  public drawRainbowBlast(boss: SantiscatBoss, gameTime: number) {
    const rb = boss.rainbowBlast;
    if (!rb || !rb.active) return;
    const ctx = this.ctx;

    const beamY = boss.y;
    const beamH = rb.beamWidth;
    const topY = beamY - beamH / 2;

    ctx.save();

    // 1. Telegraph warning phase (showing safe corridor)
    if (rb.timer < rb.chargeDuration) {
      const progress = rb.timer / rb.chargeDuration;
      ctx.globalAlpha = 0.25 + 0.3 * Math.sin(gameTime * 20);

      // Warning lane over entire arena width
      const warnGrad = ctx.createLinearGradient(0, topY, 0, topY + beamH);
      warnGrad.addColorStop(0, 'rgba(239, 68, 68, 0.15)');
      warnGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.35)');
      warnGrad.addColorStop(1, 'rgba(239, 68, 68, 0.15)');
      ctx.fillStyle = warnGrad;
      ctx.fillRect(0, topY, 3200, beamH);

      // Animated diagonal hazard stripes
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 4;
      const stripeSpacing = 60;
      const offset = (gameTime * 120) % stripeSpacing;
      for (let x = -beamH; x < 3200 + beamH; x += stripeSpacing) {
        ctx.beginPath();
        ctx.moveTo(x + offset, topY);
        ctx.lineTo(x + offset - beamH, topY + beamH);
        ctx.stroke();
      }

      // Safe Corridor Indicator Banner
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#22c55e';
      ctx.font = '900 18px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      const safeText = rb.safeSide === 'top' ? '⬇️ ¡ZONA SEGURA ARRIBA! ⬇️' : '⬆️ ¡ZONA SEGURA ABAJO! ⬆️';
      ctx.fillText(safeText, boss.x, rb.safeSide === 'top' ? topY - 30 : topY + beamH + 45);

    } else {
      // 2. GIANT RAINBOW BEAM FIRING!
      const fireTime = rb.timer - rb.chargeDuration;
      const fade = Math.min(1, Math.sin((fireTime / rb.fireDuration) * Math.PI));
      ctx.globalAlpha = fade;

      // Colossal Multi-Color Prismatic Laser Beam across whole arena
      const rainbowGrad = ctx.createLinearGradient(0, topY, 0, topY + beamH);
      rainbowGrad.addColorStop(0, '#ef4444');
      rainbowGrad.addColorStop(0.16, '#f97316');
      rainbowGrad.addColorStop(0.33, '#eab308');
      rainbowGrad.addColorStop(0.5, '#22c55e');
      rainbowGrad.addColorStop(0.66, '#06b6d4');
      rainbowGrad.addColorStop(0.83, '#3b82f6');
      rainbowGrad.addColorStop(1, '#a855f7');

      ctx.fillStyle = rainbowGrad;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 40;
      ctx.fillRect(0, topY, 3200, beamH);

      // White Hot Laser Core
      const coreH = beamH * 0.45;
      const coreGrad = ctx.createLinearGradient(0, beamY - coreH / 2, 0, beamY + coreH / 2);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      coreGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, beamY - coreH / 2, 3200, coreH);
      ctx.shadowBlur = 0;

      // High-energy lightning arcs running through rainbow beam
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        let lx = 0;
        let ly = beamY + (Math.sin(j + gameTime * 12) * beamH * 0.3);
        ctx.moveTo(lx, ly);
        while (lx < 3200) {
          lx += 80 + Math.random() * 60;
          ly = beamY + (Math.sin(lx * 0.01 + gameTime * 15 + j) * beamH * 0.35);
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  public drawGalaxies(boss: SantiscatBoss, gameTime: number) {
    const ctx = this.ctx;

    boss.galaxies.forEach(g => {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rotation);

      // Galactic core
      const coreGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, g.radius * 0.4);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.5, g.color);
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, g.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // 4 Spiral Arms
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = g.color;
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 15;

      for (let arm = 0; arm < 4; arm++) {
        const armAngle = (arm * Math.PI) / 2;
        ctx.beginPath();
        for (let t = 0; t <= Math.PI * 1.5; t += 0.15) {
          const r = (g.radius * t) / (Math.PI * 1.5);
          const px = Math.cos(t + armAngle) * r;
          const py = Math.sin(t + armAngle) * r * 0.65;
          if (t === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  public drawGiantStarsAndSupernovas(boss: SantiscatBoss, gameTime: number) {
    const ctx = this.ctx;

    // 1. Giant Burning Stars with Solar Prominences & Implosion
    boss.giantStars.forEach(st => {
      if (st.exploded) return;
      ctx.save();
      ctx.translate(st.x, st.y);

      // Implosion phase right before supernova detonation
      const isImploding = st.explosionTimer < 0.6;
      const collapseScale = isImploding ? Math.max(0.35, st.explosionTimer / 0.6) : 1.0;
      const pulse = 1.0 + 0.12 * Math.sin(gameTime * 12);
      const curRadius = st.radius * collapseScale * pulse;

      // Gravitational lensing rings if imploding
      if (isImploding) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.5;
        for (let r = 1; r <= 3; r++) {
          const lRadius = curRadius * (1.2 + r * 0.5) * (st.explosionTimer / 0.6);
          ctx.beginPath();
          ctx.arc(0, 0, lRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Outer boiling chromosphere & coronal glow
      const corona = ctx.createRadialGradient(0, 0, curRadius * 0.25, 0, 0, curRadius * 2.2);
      corona.addColorStop(0, '#ffffff');
      corona.addColorStop(0.25, '#fef08a');
      corona.addColorStop(0.55, st.color);
      corona.addColorStop(0.85, '#991b1b');
      corona.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = corona;
      ctx.beginPath();
      ctx.arc(0, 0, curRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Coronal flares (12 radial flares rotating)
      ctx.save();
      ctx.rotate(gameTime * 1.5);
      for (let i = 0; i < 12; i++) {
        const ang = (i * Math.PI * 2) / 12;
        const flareLen = curRadius * (1.4 + 0.4 * Math.sin(gameTime * 15 + i * 2));
        ctx.strokeStyle = st.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * curRadius * 0.8, Math.sin(ang) * curRadius * 0.8);
        ctx.lineTo(Math.cos(ang) * flareLen, Math.sin(ang) * flareLen);
        ctx.stroke();
      }
      ctx.restore();

      // Solar magnetic loops / prominences arcing off surface
      for (let p = 0; p < 4; p++) {
        const baseAng = (p * Math.PI) / 2 + gameTime * 0.8;
        const p1x = Math.cos(baseAng - 0.25) * curRadius;
        const p1y = Math.sin(baseAng - 0.25) * curRadius;
        const p2x = Math.cos(baseAng + 0.25) * curRadius;
        const p2y = Math.sin(baseAng + 0.25) * curRadius;
        const peakX = Math.cos(baseAng) * (curRadius * 1.6);
        const peakY = Math.sin(baseAng) * (curRadius * 1.6);

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = st.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.quadraticCurveTo(peakX, peakY, p2x, p2y);
        ctx.stroke();
      }

      // Blazing dense white-hot core
      const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, curRadius * 0.7);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.5, '#ffffff');
      coreGrad.addColorStop(0.85, '#fef08a');
      coreGrad.addColorStop(1, st.color);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, curRadius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // 2. Colossal, Hyper-Explosive Supernovas
    boss.supernovas.forEach(sn => {
      ctx.save();
      ctx.translate(sn.x, sn.y);

      const alpha = Math.max(0, sn.life / sn.maxLife);
      const progress = 1 - sn.life / sn.maxLife;

      // Layer 1: Blinding Hyper-Core Flash at explosion origin
      if (progress < 0.45) {
        const flashAlpha = (1 - progress / 0.45) * 0.95;
        const flashRadius = Math.min(sn.radius * 0.8, 160);
        const flashGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, flashRadius);
        flashGrad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
        flashGrad.addColorStop(0.4, `rgba(254, 240, 138, ${flashAlpha * 0.8})`);
        flashGrad.addColorStop(0.75, `rgba(249, 115, 22, ${flashAlpha * 0.5})`);
        flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(0, 0, flashRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Layer 2: Expanding Interstellar Nebular Clouds (8 swirling lobes)
      for (let n = 0; n < 8; n++) {
        const nAng = (n * Math.PI * 2) / 8 + gameTime * 0.4 + n * 0.2;
        const nDist = sn.radius * 0.65;
        const nx = Math.cos(nAng) * nDist;
        const ny = Math.sin(nAng) * nDist;
        const nSize = sn.radius * 0.42;

        const nebGrad = ctx.createRadialGradient(nx, ny, 4, nx, ny, nSize);
        const nebColors = ['#a855f7', '#ec4899', '#f59e0b', '#06b6d4'];
        const col = nebColors[n % nebColors.length];
        nebGrad.addColorStop(0, `${col}${Math.floor(alpha * 140).toString(16).padStart(2, '0')}`);
        nebGrad.addColorStop(0.6, `${col}${Math.floor(alpha * 70).toString(16).padStart(2, '0')}`);
        nebGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebGrad;
        ctx.beginPath();
        ctx.arc(nx, ny, nSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Layer 3: 20 Cosmic Star Shards / Relativistic Ejecta hurtling radially
      for (let s = 0; s < 20; s++) {
        const shardAng = (s * Math.PI * 2) / 20 + (s % 3) * 0.15;
        const shardDist = sn.radius * (0.85 + 0.15 * Math.sin(s * 7));
        const sx = Math.cos(shardAng) * shardDist;
        const sy = Math.sin(shardAng) * shardDist;
        const tailLen = 32 * alpha;

        // Cometary tail pointing back to epicenter
        ctx.strokeStyle = `rgba(254, 240, 138, ${alpha * 0.75})`;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - Math.cos(shardAng) * tailLen, sy - Math.sin(shardAng) * tailLen);
        ctx.stroke();

        // Glowing shard diamond head
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(sx, sy, 4.5 * alpha, 0, Math.PI * 2);
        ctx.fill();
      }

      // Layer 4: Primary Relativistic Blast Wave (Thick blinding fire ring)
      ctx.shadowColor = sn.color;
      ctx.shadowBlur = 35;
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 8 * alpha;
      ctx.beginPath();
      ctx.arc(0, 0, sn.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Jagged electric plasma discharge along shockwave perimeter
      ctx.strokeStyle = `rgba(254, 204, 21, ${alpha * 0.9})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (let j = 0; j <= 36; j++) {
        const jAng = (j * Math.PI * 2) / 36;
        const jRadius = sn.radius + Math.sin(j * 8 + gameTime * 25) * 8;
        const jx = Math.cos(jAng) * jRadius;
        const jy = Math.sin(jAng) * jRadius;
        if (j === 0) ctx.moveTo(jx, jy);
        else ctx.lineTo(jx, jy);
      }
      ctx.closePath();
      ctx.stroke();

      // Layer 5: Outer Relativistic Gamma-Ray Wavefront
      ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 0.75})`;
      ctx.lineWidth = 4 * alpha;
      ctx.beginPath();
      ctx.arc(0, 0, sn.radius * 1.15, 0, Math.PI * 2);
      ctx.stroke();

      // Shockwave teeth / radial spikes
      for (let k = 0; k < 16; k++) {
        const kAng = (k * Math.PI * 2) / 16 + gameTime * 0.5;
        const r1 = sn.radius * 0.95;
        const r2 = sn.radius * 1.18;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(kAng) * r1, Math.sin(kAng) * r1);
        ctx.lineTo(Math.cos(kAng) * r2, Math.sin(kAng) * r2);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  public drawOmegaSaveBox(boss: SantiscatBoss, gameTime: number) {
    const os = boss.omegaSave;
    if (!os || !os.active || !os.stateText || os.textTimer <= 0) return;

    const ctx = this.ctx;
    ctx.save();

    // Undertale File Saved / Loaded Box (screen space / near boss)
    const boxW = 280;
    const boxH = 54;
    const bx = boss.x - boxW / 2;
    const by = boss.y - 120;

    // Classic Undertale Dialogue Box
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeRect(bx, by, boxW, boxH);

    // Text: [ FILE 1 SAVED ] / [ FILE 1 LOADED ]
    const isLoaded = os.stateText.includes('LOADED');
    ctx.fillStyle = isLoaded ? '#f43f5e' : '#38bdf8';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(os.stateText, bx + boxW / 2, by + 34);

    ctx.restore();
  }

  public drawRefusedToDieSequence(boss: SantiscatBoss, gameTime: number) {
    const rd = boss.refusedToDie;
    if (!rd || !rd.active) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.translate(rd.heartX, rd.heartY);

    const heartSize = 52;
    const t = rd.timer;

    // Stage 1: Shattering crack
    if (t < 0.45) {
      // Red Heart with cracking line
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;

      // Left piece
      ctx.save();
      ctx.translate(-t * 24, 0);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-heartSize / 2, -heartSize / 2);
      ctx.lineTo(-heartSize / 2, 0);
      ctx.lineTo(0, heartSize / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Right piece
      ctx.save();
      ctx.translate(t * 24, 0);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(heartSize / 2, -heartSize / 2);
      ctx.lineTo(heartSize / 2, 0);
      ctx.lineTo(0, heartSize / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

    } else {
      // Stage 2: Mending with radiant golden/white flash: "But it refused."
      const mendPulse = 1.0 + 0.18 * Math.sin(t * 14);
      ctx.scale(mendPulse, mendPulse);

      // Radiant mending aura
      const mGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, heartSize * 1.8);
      mGrad.addColorStop(0, '#ffffff');
      mGrad.addColorStop(0.4, '#facc15');
      mGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.arc(0, 0, heartSize * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Restored Solid Red Determination Heart
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, -heartSize / 4);
      ctx.bezierCurveTo(0, -heartSize / 2, -heartSize / 2, -heartSize / 2, -heartSize / 2, -heartSize / 4);
      ctx.bezierCurveTo(-heartSize / 2, 0, 0, heartSize / 4, 0, heartSize / 2);
      ctx.bezierCurveTo(0, heartSize / 4, heartSize / 2, 0, heartSize / 2, -heartSize / 4);
      ctx.bezierCurveTo(heartSize / 2, -heartSize / 2, 0, -heartSize / 2, 0, -heartSize / 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Undertale Dialogue text: "* Pero te rehusaste a morir."
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.fillText('* Pero te rehusaste a morir.', 0, heartSize + 30);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  public drawWormholeCanvasBackground(gameTime: number) {
    const ctx = this.ctx;
    ctx.save();

    // Psychedelic fractal wormhole tunnel
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Dark cosmic base
    const baseGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, this.width * 0.75);
    baseGrad.addColorStop(0, '#000000');
    baseGrad.addColorStop(0.4, '#1e052d');
    baseGrad.addColorStop(0.8, '#0b0217');
    baseGrad.addColorStop(1, '#020005');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Zooming concentric tunnel rings with shifting rainbow hues
    const ringCount = 14;
    for (let i = 0; i < ringCount; i++) {
      const p = ((i / ringCount) + (gameTime * 0.45)) % 1.0;
      const r = Math.pow(p, 2.2) * (this.width * 0.85);
      const hue = (i * 28 + gameTime * 90) % 360;

      ctx.strokeStyle = `hsla(${hue}, 95%, 65%, ${0.25 + 0.6 * p})`;
      ctx.lineWidth = 3 + p * 6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.65, gameTime * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Radial warp lines rushing forward
    ctx.lineWidth = 2;
    for (let a = 0; a < 24; a++) {
      const ang = (a * Math.PI * 2) / 24 + Math.sin(gameTime + a) * 0.1;
      const hue = (a * 15 + gameTime * 60) % 360;
      ctx.strokeStyle = `hsla(${hue}, 85%, 60%, 0.3)`;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 40, cy + Math.sin(ang) * 40);
      ctx.lineTo(cx + Math.cos(ang) * (this.width * 0.9), cy + Math.sin(ang) * (this.height * 0.9));
      ctx.stroke();
    }

    ctx.restore();
  }

  public drawAlternateUniverseBackground(gameTime: number) {
    const ctx = this.ctx;
    ctx.save();

    // Surreal alternate cosmos: Inverted nebula and violet filaments
    const univGrad = ctx.createLinearGradient(0, 0, this.width, this.height);
    univGrad.addColorStop(0, '#030009');
    univGrad.addColorStop(0.35, '#120224');
    univGrad.addColorStop(0.7, '#021820');
    univGrad.addColorStop(1, '#060012');
    ctx.fillStyle = univGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Shifting cosmic filaments
    for (let f = 0; f < 5; f++) {
      ctx.strokeStyle = f % 2 === 0 ? 'rgba(236, 72, 153, 0.15)' : 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      const waveY = this.height * (0.2 + f * 0.16);
      ctx.moveTo(0, waveY);
      for (let x = 0; x <= this.width; x += 40) {
        const y = waveY + Math.sin((x * 0.008) + gameTime * 0.8 + f) * 45;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Distant surreal crystal stars
    this.stars.forEach(s => {
      const flicker = 0.5 + 0.5 * Math.sin(gameTime * 5 + s.x);
      ctx.fillStyle = s.x % 3 === 0 ? `rgba(244, 114, 182, ${flicker})` : s.x % 3 === 1 ? `rgba(56, 189, 248, ${flicker})` : `rgba(250, 204, 21, ${flicker})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 1.3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  public drawSantiscatDefeatCinematic(
    cinematic: SantiscatDefeatCinematicState,
    gameTime: number,
    player: Player
  ) {
    const ctx = this.ctx;
    const c = cinematic;

    ctx.save();

    // 1. Cinematic letterbox bars
    const barHeight = 48;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, barHeight);
    ctx.fillRect(0, this.height - barHeight, this.width, barHeight);

    // 2. Cosmic Background: alternate universe surreal nebula
    this.drawAlternateUniverseBackground(gameTime);

    // Screen Center for cinematic focus
    const cx = this.width / 2;
    const cy = this.height / 2 - 25;

    // 3. Draw Santiscat immobilized with glowing divine light rays (if not yet completely disintegrated)
    if (c.phase !== 'giant_explosion' && c.phase !== 'fade_to_victory') {
      ctx.save();
      ctx.translate(cx, cy);

      // Shivering convulsions (destabilizing cosmic body)
      const convulsionStrength = c.phase === 'shield_warning' ? 10 : c.phase === 'shader_implosion' ? 18 : 5;
      const shiverX = (Math.random() - 0.5) * convulsionStrength;
      const shiverY = (Math.random() - 0.5) * convulsionStrength;
      ctx.translate(shiverX, shiverY);

      // Scale down during singularity implosion as matter is compressed
      if (c.phase === 'shader_implosion') {
        const implodeScale = Math.max(0.12, 1.0 - c.implosionProgress * 0.88);
        ctx.scale(implodeScale, implodeScale);
        ctx.rotate(c.implosionProgress * 12.0);
      }

      // Blinding Divine God Rays radiating outwards (360 degrees)
      const rayCount = 20;
      for (let i = 0; i < rayCount; i++) {
        const ang = (i * Math.PI * 2) / rayCount + gameTime * 0.9;
        const rayLen = 500 * (0.4 + c.lightIntensity * 0.6);
        const rayGrad = ctx.createLinearGradient(0, 0, Math.cos(ang) * rayLen, Math.sin(ang) * rayLen);
        rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        rayGrad.addColorStop(0.25, 'rgba(250, 204, 21, 0.7)');
        rayGrad.addColorStop(0.65, 'rgba(192, 132, 252, 0.4)');
        rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang - 0.12) * rayLen, Math.sin(ang - 0.12) * rayLen);
        ctx.lineTo(Math.cos(ang + 0.12) * rayLen, Math.sin(ang + 0.12) * rayLen);
        ctx.closePath();
        ctx.fill();
      }

      // Celestial Aura backdrop
      const auraPulse = 1.0 + 0.15 * Math.sin(gameTime * 4);
      const coreAura = ctx.createRadialGradient(0, 0, 20, 0, 0, 190 * auraPulse);
      coreAura.addColorStop(0, '#ffffff');
      coreAura.addColorStop(0.35, 'rgba(250, 204, 21, 0.85)');
      coreAura.addColorStop(0.7, 'rgba(168, 85, 247, 0.5)');
      coreAura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreAura;
      ctx.beginPath();
      ctx.arc(0, 0, 190 * auraPulse, 0, Math.PI * 2);
      ctx.fill();

      // Size of Santiscat
      const drawW = 180;
      const drawH = 180;

      // Draw Santiscat Sprite with maximum clarity
      if (this.santiscatImg && this.santiscatImg.complete && this.santiscatImg.naturalWidth > 0) {
        ctx.save();
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 35;
        ctx.drawImage(this.santiscatImg, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      } else {
        // Fallback procedural square cat matching the doodle
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.roundRect(-drawW / 2, -drawH / 2, drawW, drawH, 16);
        ctx.fill();
        ctx.stroke();

        // Ears
        ctx.beginPath();
        ctx.moveTo(-drawW / 2 + 15, -drawH / 2);
        ctx.lineTo(-drawW / 2 + 35, -drawH / 2 - 38);
        ctx.lineTo(-drawW / 2 + 55, -drawH / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(drawW / 2 - 55, -drawH / 2);
        ctx.lineTo(drawW / 2 - 35, -drawH / 2 - 38);
        ctx.lineTo(drawW / 2 - 15, -drawH / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Mouth :3
        ctx.font = '900 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        ctx.fillText('ω', 0, 28);
      }

      // Wide glowing defeat eyes (magenta / pink cosmic desperation)
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(-32, -25, 10, 0, Math.PI * 2);
      ctx.arc(32, -25, 10, 0, Math.PI * 2);
      ctx.fill();
      // White inner pupil reflection
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-32, -25, 4, 0, Math.PI * 2);
      ctx.arc(32, -25, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Floating Circular Hands (Paws) shivering
      const pawBob = Math.sin(gameTime * 8) * 6;
      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      // Left Hand
      ctx.beginPath();
      ctx.arc(-drawW / 2 - 25, 30 + pawBob, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Right Hand
      ctx.beginPath();
      ctx.arc(drawW / 2 + 25, 30 - pawBob, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Energy fissures / cosmic cracks leaking bright light
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-40, -50);
      ctx.lineTo(-10, -10);
      ctx.lineTo(15, -25);
      ctx.lineTo(35, 40);
      ctx.stroke();

      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(30, -55);
      ctx.lineTo(5, -15);
      ctx.lineTo(-20, 20);
      ctx.lineTo(-45, 35);
      ctx.stroke();

      // Boss Label & 0 HP Defeated Health Bar
      const barW = 220;
      const barH = 10;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.fillRect(-barW / 2, -drawH / 2 - 35, barW, barH);
      ctx.strokeRect(-barW / 2, -drawH / 2 - 35, barW, barH);

      ctx.fillStyle = '#f43f5e';
      ctx.font = '900 12px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑 SANTISCAT - REY CÓSMICO (0 / 99,999 HP)', 0, -drawH / 2 - 42);

      ctx.restore();
    }

    // 4. Liberated 12 Human Souls spiraling in radiant helices around cx, cy
    c.souls.forEach((s) => {
      const sx = cx + Math.cos(s.angle) * s.distance;
      const sy = cy + Math.sin(s.angle) * s.distance;

      ctx.save();
      ctx.translate(sx, sy);

      // Soul aura
      const sGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 36 * s.scale);
      sGrad.addColorStop(0, '#ffffff');
      sGrad.addColorStop(0.4, s.color);
      sGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 36 * s.scale, 0, Math.PI * 2);
      ctx.fill();

      // Undertale-style heart shape
      ctx.fillStyle = s.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      const hSize = 18 * s.scale;
      ctx.beginPath();
      ctx.moveTo(0, -hSize / 4);
      ctx.bezierCurveTo(0, -hSize / 2, -hSize / 2, -hSize / 2, -hSize / 2, -hSize / 4);
      ctx.bezierCurveTo(-hSize / 2, 0, 0, hSize / 4, 0, hSize / 2);
      ctx.bezierCurveTo(0, hSize / 4, hSize / 2, 0, hSize / 2, -hSize / 4);
      ctx.bezierCurveTo(hSize / 2, -hSize / 2, 0, -hSize / 2, 0, -hSize / 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Soul Name tag in Latin Undertale font
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 8;
      ctx.fillText(s.name, 0, -hSize - 6);
      ctx.shadowBlur = 0;

      ctx.restore();
    });

    // 5. Phase 3: Procedural Inward Vortex Implosion Rings
    if (c.phase === 'shader_implosion' || c.implosionProgress > 0) {
      ctx.save();
      ctx.translate(cx, cy);

      const ringCount = 10;
      for (let r = 0; r < ringCount; r++) {
        const ringProgress = (r / ringCount - c.implosionProgress * 1.5 + 2) % 1.0;
        const ringDist = ringProgress * 420;
        const alpha = (1.0 - ringProgress) * c.implosionProgress;

        ctx.strokeStyle = r % 2 === 0 ? `rgba(255, 255, 255, ${alpha})` : `rgba(168, 85, 247, ${alpha})`;
        ctx.lineWidth = 3 + (1.0 - ringProgress) * 4;
        ctx.beginPath();
        ctx.arc(0, 0, ringDist, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Singularity Black Hole event horizon at center
      const singSize = 25 * (1.0 + c.implosionProgress * 0.5);
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, singSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // 6. Phase 4: Colossal Supernova Explosion Shockwaves
    if (c.phase === 'giant_explosion' && c.explosionRadius > 0) {
      ctx.save();
      ctx.translate(cx, cy);

      // Multiple colored shockwave rings
      const rings = [
        { r: c.explosionRadius, color: 'rgba(255, 255, 255, 0.95)', width: 14 },
        { r: c.explosionRadius * 0.85, color: 'rgba(250, 204, 21, 0.85)', width: 12 },
        { r: c.explosionRadius * 0.68, color: 'rgba(192, 132, 252, 0.75)', width: 10 },
        { r: c.explosionRadius * 0.5, color: 'rgba(56, 189, 248, 0.65)', width: 8 },
      ];

      rings.forEach(ring => {
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = ring.width;
        ctx.beginPath();
        ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Internal stellar blast fire gradient
      const blastGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, c.explosionRadius * 0.9);
      blastGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      blastGrad.addColorStop(0.3, 'rgba(251, 191, 36, 0.7)');
      blastGrad.addColorStop(0.7, 'rgba(239, 68, 68, 0.4)');
      blastGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = blastGrad;
      ctx.beginPath();
      ctx.arc(0, 0, c.explosionRadius * 0.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 7. Fullscreen White / Cosmic Flash
    if (c.flashAlpha > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${c.flashAlpha})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 8. Player Drawing & Emerald Shield Bubble in cinematic
    ctx.save();
    const playerCinematicX = cx - 260;
    const playerCinematicY = cy + 40;
    ctx.translate(playerCinematicX, playerCinematicY);

    const cinematicPlayer: Player = {
      ...player,
      x: 0,
      y: 0,
      facing: 1,
    };
    this.drawPlayer(cinematicPlayer, gameTime);

    // If shield active, draw radiant emerald bubble
    if (player.shieldActive) {
      const shieldPulse = 54 + Math.sin(gameTime * 8) * 4;
      const shGrad = ctx.createRadialGradient(0, 0, 15, 0, 0, shieldPulse);
      shGrad.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
      shGrad.addColorStop(0.7, 'rgba(16, 185, 129, 0.5)');
      shGrad.addColorStop(1, 'rgba(52, 211, 153, 0.95)');
      ctx.fillStyle = shGrad;
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, shieldPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Shield label
      ctx.fillStyle = '#34d399';
      ctx.font = '900 11px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#059669';
      ctx.shadowBlur = 8;
      ctx.fillText('🛡️ ESCUDO ACTIVO', 0, shieldPulse + 18);
      ctx.shadowBlur = 0;
    } else {
      const unshieldedBlink = Math.floor(gameTime * 6) % 2 === 0;
      if (c.phase === 'shield_warning' && unshieldedBlink) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '900 11px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ ¡SIN ESCUDO!', 0, -45);
      }
    }
    ctx.restore();

    // 9. Hazard Alert Text in letterbox bars & overlay
    ctx.textAlign = 'center';
    if (c.phase === 'shining_souls_release') {
      ctx.fillStyle = '#facc15';
      ctx.font = '900 20px Orbitron, sans-serif';
      ctx.fillText('✨ ¡SANTISCAT HA SIDO DERROTADO! ¡LIBERACIÓN CÓSMICA! ✨', this.width / 2, barHeight - 16);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 13px Fredoka, sans-serif';
      ctx.fillText('Las 12 almas humanas absorbidas se desprenden en espirales de luz pura...', this.width / 2, this.height - barHeight + 28);

    } else if (c.phase === 'shield_warning') {
      // Blinking Emergency Alert
      const blink = Math.floor(gameTime * 6) % 2 === 0;
      ctx.fillStyle = blink ? '#ef4444' : '#fbbf24';
      ctx.font = '900 22px Orbitron, sans-serif';
      ctx.fillText('⚠️ ¡ALERTA CÓSMICA! ¡COLAPSO INMINENTE DE SANTISCAT! ⚠️', this.width / 2, barHeight - 16);

      // Warning Subtitle
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 15px Fredoka, sans-serif';
      ctx.fillText('🛡️ ¡ACTIVA TU ESCUDO (SHIFT / K) PARA PROTEGERTE DE LA EXPLOSIÓN GIGANTESCA! 🛡️', this.width / 2, barHeight + 34);

      // Countdown in bottom bar
      const timeLeft = Math.max(0, 7.0 - c.timer).toFixed(1);
      ctx.fillStyle = '#f87171';
      ctx.font = '900 16px Orbitron, sans-serif';
      ctx.fillText(`💥 IMPLOSIÓN EN: ${timeLeft}s | ESTADO DE ESCUDO: ${player.shieldActive ? '🛡️ ACTIVO (PROTEGIDO)' : '⚠️ DESACTIVADO'}`, this.width / 2, this.height - barHeight + 28);

    } else if (c.phase === 'shader_implosion') {
      ctx.fillStyle = '#c084fc';
      ctx.font = '900 22px Orbitron, sans-serif';
      ctx.fillText('🌌 ¡IMPLOSIÓN ESPACIO-TEMPORAL! LA REALIDAD COLAPSA... 🌌', this.width / 2, barHeight - 16);
      ctx.fillStyle = '#e0e7ff';
      ctx.font = '600 14px Fredoka, sans-serif';
      ctx.fillText('Toda la energía cósmica está siendo comprimida en una singularidad...', this.width / 2, this.height - barHeight + 28);

    } else if (c.phase === 'giant_explosion') {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 22px Orbitron, sans-serif';
      ctx.fillText('💥 ¡GRAN ESTALLIDO CÓSMICO DE SUPERNOVA! 💥', this.width / 2, barHeight - 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 14px Fredoka, sans-serif';
      ctx.fillText(player.shieldActive ? '🛡️ ¡Tu escudo soportó la onda expansiva cósmica!' : '¡Santiscat ha sido erradicado del continuo espacio-tiempo!', this.width / 2, this.height - barHeight + 28);
    }

    // Skip cinematic hint
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 11px Fredoka, sans-serif';
    ctx.fillText('[ Presiona ESPACIO para saltar cinemática ]', this.width / 2, this.height - 10);

    ctx.restore();
  }
}

