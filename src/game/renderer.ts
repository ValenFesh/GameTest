import {
  BlackFlashStrike,
  Boss,
  CinematicState,
  DamageNumber,
  GameStage,
  Obstacle,
  Particle,
  Player,
  Projectile,
} from '../types/game';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private stars: { x: number; y: number; size: number; speed: number; alpha: number }[] = [];
  private cityBuildings: { x: number; width: number; height: number; color: string; windows: boolean[][] }[] = [];

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.initBackgrounds();
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

    // --- Green Shield (Escudo Verde) ---
    if (player.shieldActive) {
      ctx.save();
      const shieldRadius = Math.max(w, h) * 0.78 + Math.sin(time * 10) * 3;
      
      // Outer glow
      const shieldGrad = ctx.createRadialGradient(0, 0, shieldRadius * 0.6, 0, 0, shieldRadius);
      shieldGrad.addColorStop(0, 'rgba(52, 211, 153, 0.12)');
      shieldGrad.addColorStop(0.8, 'rgba(16, 185, 129, 0.35)');
      shieldGrad.addColorStop(1, 'rgba(5, 150, 105, 0.85)');
      ctx.fillStyle = shieldGrad;
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
      ctx.fill();

      // Shield ring
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([12, 6]);
      ctx.lineDashOffset = -time * 30;
      ctx.stroke();

      // Inner hex / energy sparks
      ctx.strokeStyle = 'rgba(110, 231, 183, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius * 0.85, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // --- Floating Circular Hands (Manos Circulares de Catvalen) ---
    // User requested: "golpear con sus manos a los enemigos (con sus manos circulares)"
    this.drawPlayerHands(player, time);

    // --- Cat Body (Square Cat from Image 1) ---
    // Grey body (#7c7f86), thick black hand-drawn line (#161616), square with pointy cat ears
    ctx.fillStyle = '#7a7d83';
    ctx.strokeStyle = '#121214';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    // Start at bottom-left corner
    const r = 6; // slightly rounded base
    ctx.moveTo(-halfW + r, halfH);
    // Bottom edge
    ctx.lineTo(halfW - r, halfH);
    ctx.quadraticCurveTo(halfW, halfH, halfW, halfH - r);
    // Right edge going up towards right ear tip
    ctx.lineTo(halfW, -halfH + 18);
    // Right Ear tip: points up sharp
    ctx.lineTo(halfW - 2, -halfH - 12);
    // Ear inner slope down to center dip
    ctx.quadraticCurveTo(halfW * 0.5, -halfH + 8, 0, -halfH + 4);
    // Ear inner slope up to Left Ear tip
    ctx.quadraticCurveTo(-halfW * 0.5, -halfH + 8, -halfW + 2, -halfH - 12);
    // Left edge going down
    ctx.lineTo(-halfW, -halfH + 18);
    ctx.lineTo(-halfW, halfH - r);
    ctx.quadraticCurveTo(-halfW, halfH, -halfW + r, halfH);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // --- Cat Eyes (Black ovals from Image 1) ---
    ctx.fillStyle = '#111111';
    const eyeOffsetX = 12;
    const eyeOffsetY = -2;
    const eyeRadiusX = 6;
    const eyeRadiusY = 7.5;

    if (player.eyeState === 'blink') {
      // Blinking slit
      ctx.beginPath();
      ctx.ellipse(-eyeOffsetX, eyeOffsetY, eyeRadiusX, 1.5, 0, 0, Math.PI * 2);
      ctx.ellipse(eyeOffsetX, eyeOffsetY, eyeRadiusX, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (player.eyeState === 'squint' || player.eyeState === 'hurt') {
      // Squinting angry / fierce
      ctx.beginPath();
      ctx.arc(-eyeOffsetX, eyeOffsetY, eyeRadiusX, 0.2 * Math.PI, 0.8 * Math.PI, false);
      ctx.arc(eyeOffsetX, eyeOffsetY, eyeRadiusX, 0.2 * Math.PI, 0.8 * Math.PI, false);
      ctx.lineWidth = 3.5;
      ctx.stroke();
    } else {
      // Normal cute black oval eyes
      ctx.beginPath();
      ctx.ellipse(-eyeOffsetX, eyeOffsetY, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(eyeOffsetX, eyeOffsetY, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tiny white highlight twinkle
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(-eyeOffsetX - 2, eyeOffsetY - 2.5, 2, 0, Math.PI * 2);
      ctx.arc(eyeOffsetX - 2, eyeOffsetY - 2.5, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Cat Mouth (:3 cute cat smile from Image 1) ---
    ctx.strokeStyle = '#141416';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    // Left curve of :3
    ctx.arc(-5, 12, 5, 0.1 * Math.PI, 0.9 * Math.PI, false);
    // Right curve of :3
    ctx.arc(5, 12, 5, 0.1 * Math.PI, 0.9 * Math.PI, false);
    ctx.stroke();

    // --- Whiskers (from Image 1: 2 curved whiskers on left, 2 on right) ---
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    // Left whiskers
    ctx.moveTo(-18, 9);
    ctx.quadraticCurveTo(-28, 7, -36, 10);
    ctx.moveTo(-17, 16);
    ctx.quadraticCurveTo(-27, 18, -35, 23);

    // Right whiskers
    ctx.moveTo(18, 9);
    ctx.quadraticCurveTo(28, 7, 36, 10);
    ctx.moveTo(17, 16);
    ctx.quadraticCurveTo(27, 18, 35, 23);
    ctx.stroke();

    ctx.restore();
  }

  private drawPlayerHands(player: Player, time: number) {
    const ctx = this.ctx;
    const handRadius = 11;

    // Left and Right hand positions with punch animation offsets
    const leftX = player.leftHand.x + player.leftHand.punchProgress * 42;
    const leftY = player.leftHand.y + Math.sin(time * 8) * 3;

    const rightX = player.rightHand.x + player.rightHand.punchProgress * 42;
    const rightY = player.rightHand.y + Math.cos(time * 8) * 3;

    [
      { x: leftX, y: leftY, punch: player.leftHand.punchProgress },
      { x: rightX, y: rightY, punch: player.rightHand.punchProgress },
    ].forEach((h, idx) => {
      ctx.save();
      // If punching, add speed motion trail
      if (h.punch > 0.1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(h.x - h.punch * 25, h.y);
        ctx.lineTo(h.x, h.y);
        ctx.stroke();
      }

      // Hand circle (matching user's circular hands)
      ctx.fillStyle = '#82868d';
      ctx.strokeStyle = '#121214';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(h.x, h.y, handRadius + h.punch * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Paw pad detail
      ctx.fillStyle = '#63666d';
      ctx.beginPath();
      ctx.arc(h.x, h.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  // --- NANOVALEN (Boss) Drawing (Faithful to Image 2) ---

  public drawBoss(boss: Boss, time: number) {
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

    // --- Nanovalen Energy Shield (Absorbs Catvalen's shots) ---
    // "crear escudos de energia que absorban los disparos del gato"
    if (boss.shieldActive) {
      ctx.save();
      const shieldW = bw * 1.5;
      const shieldH = bh * 1.6;

      ctx.shadowColor = '#818cf8';
      ctx.shadowBlur = 25;
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 4;

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
      shieldGrad.addColorStop(0, 'rgba(99, 102, 241, 0.15)');
      shieldGrad.addColorStop(0.8, 'rgba(129, 140, 248, 0.35)');
      shieldGrad.addColorStop(1, 'rgba(168, 85, 247, 0.7)');
      ctx.fillStyle = shieldGrad;
      ctx.fill();
      ctx.stroke();

      // Shield label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ESCUDO ABSORBENTE', 0, -sRadius - 8);

      ctx.restore();
    }

    ctx.restore();

    // --- Boss Attacks In Progress ---

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
}
