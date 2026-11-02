/**
 * Professional Real-Time Procedural Distortion Shader Pipeline (WebGL)
 * Features:
 * - Gravitational Lensing (Black Hole relativistic spacetime curvature & Einstein ring)
 * - Space warping & orbital frame-dragging
 * - Reality tears / dimension slashes spacetime fragmentation
 * - Chromatic aberration & quantum glitch displacement
 * - Leaves HTML/React UI un-distorted (runs exclusively as post-process on the game world canvas)
 */

export interface BlackHoleShaderUniforms {
  active: boolean;
  screenX: number; // in pixels
  screenY: number; // in pixels
  radius: number;  // event horizon in pixels
  mass: number;    // bending strength (e.g. 1.2 to 2.5)
}

export interface HollowPurpleShaderUniforms {
  active: boolean;
  screenX: number; // in pixels
  screenY: number; // in pixels
  radius: number;  // in pixels
}

export interface RealitySlashShaderUniforms {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  intensity: number;
}

export interface WormholeShaderUniforms {
  active: boolean;
  speed: number;
  centerScreenX: number;
  centerScreenY: number;
  hueShift: number;
}

export interface ImplosionShaderUniforms {
  active: boolean;
  screenX: number;
  screenY: number;
  progress: number; // 0.0 to 1.0
  radius: number;
}

export class DistortionShaderPipeline {
  private glCanvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private quadBuffer: WebGLBuffer | null = null;

  // Uniform locations
  private uResolutionLoc: WebGLUniformLocation | null = null;
  private uTimeLoc: WebGLUniformLocation | null = null;
  private uBlackHoleActiveLoc: WebGLUniformLocation | null = null;
  private uBlackHolePosLoc: WebGLUniformLocation | null = null;
  private uBlackHoleRadiusLoc: WebGLUniformLocation | null = null;
  private uBlackHoleMassLoc: WebGLUniformLocation | null = null;
  private uPurpleActiveLoc: WebGLUniformLocation | null = null;
  private uPurplePosLoc: WebGLUniformLocation | null = null;
  private uPurpleRadiusLoc: WebGLUniformLocation | null = null;
  private uGlitchStrengthLoc: WebGLUniformLocation | null = null;
  private uSlashCountLoc: WebGLUniformLocation | null = null;
  private uSlashesLoc: WebGLUniformLocation | null = null;
  private uWormholeActiveLoc: WebGLUniformLocation | null = null;
  private uWormholeSpeedLoc: WebGLUniformLocation | null = null;
  private uWormholeCenterLoc: WebGLUniformLocation | null = null;
  private uWormholeHueLoc: WebGLUniformLocation | null = null;
  private uImplosionActiveLoc: WebGLUniformLocation | null = null;
  private uImplosionPosLoc: WebGLUniformLocation | null = null;
  private uImplosionProgressLoc: WebGLUniformLocation | null = null;
  private uImplosionRadiusLoc: WebGLUniformLocation | null = null;

  private isSupported: boolean = false;

  constructor(width: number, height: number) {
    this.glCanvas = document.createElement('canvas');
    this.glCanvas.width = width;
    this.glCanvas.height = height;

    try {
      this.gl = this.glCanvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
      if (this.gl) {
        this.initShaders();
        this.initBuffersAndTexture();
        this.isSupported = true;
      }
    } catch (e) {
      console.warn('WebGL Distortion Shader not supported, fallback to 2D:', e);
      this.isSupported = false;
    }
  }

  public resize(width: number, height: number) {
    this.glCanvas.width = width;
    this.glCanvas.height = height;
    if (this.gl) {
      this.gl.viewport(0, 0, width, height);
    }
  }

  public getCanvas(): HTMLCanvasElement {
    return this.glCanvas;
  }

  public isAvailable(): boolean {
    return this.isSupported && this.gl !== null && this.program !== null;
  }

  private initShaders() {
    const gl = this.gl!;

    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = (a_position + 1.0) * 0.5;
        // Flip Y for texture coordinates
        v_uv.y = 1.0 - v_uv.y;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      varying vec2 v_uv;
      uniform sampler2D u_texture;
      uniform vec2 u_resolution;
      uniform float u_time;

      // Gravitational Lensing (Black Hole)
      uniform float u_blackHoleActive;
      uniform vec2 u_blackHolePos; // normalized 0..1
      uniform float u_blackHoleRadius; // normalized
      uniform float u_blackHoleMass;

      // Hollow Purple (Kyoshiki Murasaki) Spacetime Distortion
      uniform float u_purpleActive;
      uniform vec2 u_purplePos; // normalized 0..1
      uniform float u_purpleRadius; // normalized

      // Reality Glitch & Dimension Slashes
      uniform float u_glitchStrength;
      uniform int u_slashCount;
      uniform vec4 u_slashes[6]; // (x1, y1, x2, y2) normalized

      // Psychedelic Fractal Wormhole Tunnel
      uniform float u_wormholeActive;
      uniform float u_wormholeSpeed;
      uniform vec2 u_wormholeCenter;
      uniform float u_wormholeHue;

      // Cosmic Defeat Implosion (Spacetime Singularity Contraction)
      uniform float u_implosionActive;
      uniform vec2 u_implosionPos;
      uniform float u_implosionProgress;
      uniform float u_implosionRadius;

      void main() {
        vec2 uv = v_uv;
        vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);

        // 0. Psychedelic Fractal Wormhole Hyperspace Tunnel
        vec3 wormholeGlow = vec3(0.0);
        if (u_wormholeActive > 0.01) {
          vec2 wCenter = u_wormholeCenter;
          vec2 wP = (uv - wCenter) * aspect;
          float wDist = length(wP);
          float wAngle = atan(wP.y, wP.x);

          // Relativistic hyperbolic tunnel mapping
          float wZ = (0.28 / (wDist + 0.002)) + u_time * u_wormholeSpeed * 2.2;
          
          // Kaleidoscope fractal spiral
          float fractalPattern = sin(wZ * 7.0 + wAngle * 5.0) * cos(wZ * 3.5 - wAngle * 3.0);
          fractalPattern += sin(wZ * 14.0 - wAngle * 7.0) * 0.35;
          
          // Vibrant shifting rainbow spectrum
          float hue = fract(wZ * 0.12 + wAngle / 6.28318 + u_wormholeHue + u_time * 0.3);
          vec3 rainbow = clamp(abs(mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
          
          // Neon cosmic contrast
          rainbow = mix(rainbow, vec3(1.0), 0.28 + 0.28 * fractalPattern);
          float depthFade = smoothstep(0.008, 0.65, wDist);
          wormholeGlow = rainbow * depthFade * (0.65 + 0.35 * sin(wZ * 8.0)) * u_wormholeActive;

          // Clear out wormhole glare around black hole so its singularity & accretion disk are crystal clear
          if (u_blackHoleActive > 0.5) {
            vec2 bhDistDiff = (uv - u_blackHolePos) * aspect;
            float bhDist = length(bhDistDiff);
            float bhCarve = smoothstep(u_blackHoleRadius * 0.7, u_blackHoleRadius * 2.8, bhDist);
            wormholeGlow *= bhCarve;
          }
          
          // Swirl texture coordinates along the tunnel
          float tunnelSwirl = sin(wZ * 4.0) * 0.015 * u_wormholeActive;
          uv += vec2(cos(wAngle), sin(wAngle)) * tunnelSwirl;
        }

        // 1. Spacetime Distortion by Dimension Slashes
        if (u_slashCount > 0) {
          for (int i = 0; i < 6; i++) {
            if (i >= u_slashCount) break;
            vec4 s = u_slashes[i];
            vec2 a = s.xy * aspect;
            vec2 b = s.zw * aspect;
            vec2 p = uv * aspect;

            vec2 pa = p - a;
            vec2 ba = b - a;
            float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
            float d = length(pa - ba * h);

            float slashThresh = 0.035;
            if (d < slashThresh) {
              float factor = (1.0 - d / slashThresh);
              vec2 n = normalize(vec2(-ba.y, ba.x));
              float side = sign(dot(pa - ba * h, n));
              uv += (n / aspect) * side * factor * 0.045 * sin(u_time * 20.0 + d * 50.0);
            }
          }
        }

        // 2. Gravitational Lensing from Black Hole
        // Curving spacetime around the singularity (General Relativity Einstein ring approximation)
        vec3 photonHalo = vec3(0.0);
        if (u_blackHoleActive > 0.5) {
          vec2 diff = (uv - u_blackHolePos) * aspect;
          float dist = length(diff);
          float horizon = u_blackHoleRadius;
          float lensRadius = horizon * 3.8;

          if (dist < horizon) {
            // Inside Event Horizon: pure cosmic void
            float coreEdge = smoothstep(0.0, horizon, dist);
            gl_FragColor = vec4(vec3(0.002, 0.001, 0.005), 1.0);
            return;
          } else if (dist < lensRadius) {
            // Relativistic deflection angle: alpha = 4GM / c^2 r
            float deflection = (horizon * horizon / (dist * dist + 0.0001)) * u_blackHoleMass * 0.18;
            vec2 dir = normalize(diff);

            // Relativistic frame dragging swirl
            float swirlAng = atan(diff.y, diff.x) + deflection * 1.8 + u_time * 1.5;
            vec2 swirledDir = vec2(cos(swirlAng), sin(swirlAng));

            // Deflect texture coordinates inwards towards the singularity
            uv -= (mix(dir, swirledDir, 0.35) / aspect) * deflection;

            // Einstein ring bright photon sphere edge glow
            float ringIntensity = smoothstep(horizon * 1.01, horizon * 1.18, dist) * (1.0 - smoothstep(horizon * 1.18, horizon * 1.55, dist));
            photonHalo = vec3(1.0, 0.65, 0.25) * ringIntensity * 2.2;
            // Blue relativistic Doppler shift on one edge
            if (dir.x > 0.0) {
              photonHalo += vec3(0.2, 0.5, 1.0) * ringIntensity * 1.2;
            }
          }
        }

        // 2.5 Hollow Purple Spacetime Vortex (Imaginary Mass Gravitational Distortion)
        vec3 purpleHalo = vec3(0.0);
        if (u_purpleActive > 0.5) {
          vec2 pDiff = (uv - u_purplePos) * aspect;
          float pDist = length(pDiff);
          float pRad = u_purpleRadius;
          float pField = pRad * 3.6;

          if (pDist < pRad * 0.65) {
            // Singularity of Hollow Purple: intense violet matter erasure
            float coreEdge = smoothstep(0.0, pRad * 0.65, pDist);
            gl_FragColor = vec4(vec3(0.18, 0.02, 0.32) * coreEdge, 1.0);
            return;
          } else if (pDist < pField) {
            // Spacetime vortex warping
            float pWarp = (pRad * pRad / (pDist * pDist + 0.0001)) * 0.18;
            vec2 pDir = normalize(pDiff);
            float pAngle = atan(pDiff.y, pDiff.x) + pWarp * 3.2 - u_time * 4.5;
            vec2 pSwirl = vec2(cos(pAngle), sin(pAngle));
            uv -= (mix(pDir, pSwirl, 0.55) / aspect) * pWarp;

            float pIntensity = smoothstep(pRad * 0.65, pRad * 1.15, pDist) * (1.0 - smoothstep(pRad * 1.15, pField, pDist));
            purpleHalo = vec3(0.85, 0.12, 1.0) * pIntensity * 2.6 + vec3(0.25, 0.45, 1.0) * pIntensity * 1.3;
          }
        }

        // 2.8 Cosmic Implosion Singularity Contraction
        vec3 implosionGlow = vec3(0.0);
        if (u_implosionActive > 0.01) {
          vec2 iDiff = (uv - u_implosionPos) * aspect;
          float iDist = length(iDiff);
          float iRad = u_implosionRadius;
          if (iDist < iRad) {
            float normD = iDist / iRad;
            // Spacetime suction inwards: coordinates pulled towards singularity as progress increases
            float pull = pow(u_implosionProgress, 1.9) * (1.0 - normD) * 0.48;
            float swirlAng = atan(iDiff.y, iDiff.x) + u_implosionProgress * 12.0 + (1.0 - normD) * 6.28;
            vec2 swirlVec = vec2(cos(swirlAng), sin(swirlAng));
            uv -= (mix(normalize(iDiff), swirlVec, 0.45) / aspect) * pull;

            // Intense white/cyan/violet cosmic accretion ripples
            float ripple = sin((1.0 - normD) * 35.0 - u_implosionProgress * 28.0);
            float coreBright = pow(1.0 - normD, 2.0) * u_implosionProgress * 3.2;
            implosionGlow = vec3(0.75, 0.88, 1.0) * coreBright + vec3(0.9, 0.35, 1.0) * max(0.0, ripple) * u_implosionProgress * 0.9;
          }
        }

        // 3. Reality Glitch & Chromatic Aberration
        if (u_glitchStrength > 0.02) {
          // Horizontal scanline slice distortion
          float glitchJitter = step(0.94, sin(uv.y * 65.0 + u_time * 22.0));
          float chromaticOffset = (sin(uv.y * 40.0 + u_time * 12.0) * 0.007 + glitchJitter * 0.016) * u_glitchStrength;

          vec4 colR = texture2D(u_texture, clamp(vec2(uv.x + chromaticOffset, uv.y), 0.0, 1.0));
          vec4 colG = texture2D(u_texture, clamp(uv, 0.0, 1.0));
          vec4 colB = texture2D(u_texture, clamp(vec2(uv.x - chromaticOffset, uv.y), 0.0, 1.0));

          vec3 finalColor = vec3(colR.r, colG.g, colB.b) + photonHalo + purpleHalo + wormholeGlow + implosionGlow;
          gl_FragColor = vec4(finalColor, 1.0);
        } else {
          vec4 baseColor = texture2D(u_texture, clamp(uv, 0.0, 1.0));
          vec3 finalColor = baseColor.rgb + photonHalo + purpleHalo + implosionGlow;
          if (u_wormholeActive > 0.01) {
            finalColor = mix(finalColor, wormholeGlow + finalColor * 0.85, u_wormholeActive * 0.75);
          }
          gl_FragColor = vec4(finalColor, baseColor.a);
        }
      }
    `;

    const vs = this.compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    this.program = gl.createProgram();
    if (!this.program) return;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Shader link error:', gl.getProgramInfoLog(this.program));
      this.program = null;
      return;
    }

    // Lookup uniforms
    this.uResolutionLoc = gl.getUniformLocation(this.program, 'u_resolution');
    this.uTimeLoc = gl.getUniformLocation(this.program, 'u_time');
    this.uBlackHoleActiveLoc = gl.getUniformLocation(this.program, 'u_blackHoleActive');
    this.uBlackHolePosLoc = gl.getUniformLocation(this.program, 'u_blackHolePos');
    this.uBlackHoleRadiusLoc = gl.getUniformLocation(this.program, 'u_blackHoleRadius');
    this.uBlackHoleMassLoc = gl.getUniformLocation(this.program, 'u_blackHoleMass');
    this.uPurpleActiveLoc = gl.getUniformLocation(this.program, 'u_purpleActive');
    this.uPurplePosLoc = gl.getUniformLocation(this.program, 'u_purplePos');
    this.uPurpleRadiusLoc = gl.getUniformLocation(this.program, 'u_purpleRadius');
    this.uGlitchStrengthLoc = gl.getUniformLocation(this.program, 'u_glitchStrength');
    this.uSlashCountLoc = gl.getUniformLocation(this.program, 'u_slashCount');
    this.uSlashesLoc = gl.getUniformLocation(this.program, 'u_slashes');
    this.uWormholeActiveLoc = gl.getUniformLocation(this.program, 'u_wormholeActive');
    this.uWormholeSpeedLoc = gl.getUniformLocation(this.program, 'u_wormholeSpeed');
    this.uWormholeCenterLoc = gl.getUniformLocation(this.program, 'u_wormholeCenter');
    this.uWormholeHueLoc = gl.getUniformLocation(this.program, 'u_wormholeHue');
    this.uImplosionActiveLoc = gl.getUniformLocation(this.program, 'u_implosionActive');
    this.uImplosionPosLoc = gl.getUniformLocation(this.program, 'u_implosionPos');
    this.uImplosionProgressLoc = gl.getUniformLocation(this.program, 'u_implosionProgress');
    this.uImplosionRadiusLoc = gl.getUniformLocation(this.program, 'u_implosionRadius');
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl!;
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private initBuffersAndTexture() {
    const gl = this.gl!;
    // Fullscreen quad
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Dynamic texture
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  /**
   * Post-processes the 2D world canvas through WebGL with real-time procedural distortion shaders
   */
  public render(
    source2DCanvas: HTMLCanvasElement,
    time: number,
    blackHole?: BlackHoleShaderUniforms,
    glitchStrength: number = 0,
    slashes: RealitySlashShaderUniforms[] = [],
    hollowPurple?: HollowPurpleShaderUniforms,
    wormhole?: WormholeShaderUniforms,
    implosion?: ImplosionShaderUniforms
  ) {
    if (!this.gl || !this.program || !this.texture || !this.quadBuffer) return;
    const gl = this.gl;

    gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
    gl.useProgram(this.program);

    // Upload source 2D canvas frame into texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source2DCanvas);

    // Bind full-screen quad
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const aPosLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

    // Set uniforms
    if (this.uResolutionLoc) {
      gl.uniform2f(this.uResolutionLoc, this.glCanvas.width, this.glCanvas.height);
    }
    if (this.uTimeLoc) {
      gl.uniform1f(this.uTimeLoc, time);
    }

    // Wormhole Hyperspace Tunnel uniforms
    if (wormhole && wormhole.active) {
      if (this.uWormholeActiveLoc) gl.uniform1f(this.uWormholeActiveLoc, 1.0);
      if (this.uWormholeSpeedLoc) gl.uniform1f(this.uWormholeSpeedLoc, wormhole.speed || 1.0);
      if (this.uWormholeCenterLoc) {
        gl.uniform2f(
          this.uWormholeCenterLoc,
          wormhole.centerScreenX / this.glCanvas.width,
          wormhole.centerScreenY / this.glCanvas.height
        );
      }
      if (this.uWormholeHueLoc) gl.uniform1f(this.uWormholeHueLoc, wormhole.hueShift || 0.0);
    } else {
      if (this.uWormholeActiveLoc) gl.uniform1f(this.uWormholeActiveLoc, 0.0);
    }

    // Cosmic Implosion Singularity uniforms
    if (implosion && implosion.active) {
      if (this.uImplosionActiveLoc) gl.uniform1f(this.uImplosionActiveLoc, 1.0);
      if (this.uImplosionPosLoc) {
        gl.uniform2f(
          this.uImplosionPosLoc,
          implosion.screenX / this.glCanvas.width,
          implosion.screenY / this.glCanvas.height
        );
      }
      if (this.uImplosionProgressLoc) {
        gl.uniform1f(this.uImplosionProgressLoc, implosion.progress);
      }
      if (this.uImplosionRadiusLoc) {
        gl.uniform1f(this.uImplosionRadiusLoc, implosion.radius / this.glCanvas.height);
      }
    } else {
      if (this.uImplosionActiveLoc) gl.uniform1f(this.uImplosionActiveLoc, 0.0);
    }

    // Black Hole Gravitational Lensing uniforms
    if (blackHole && blackHole.active) {
      if (this.uBlackHoleActiveLoc) gl.uniform1f(this.uBlackHoleActiveLoc, 1.0);
      if (this.uBlackHolePosLoc) {
        gl.uniform2f(
          this.uBlackHolePosLoc,
          blackHole.screenX / this.glCanvas.width,
          blackHole.screenY / this.glCanvas.height
        );
      }
      if (this.uBlackHoleRadiusLoc) {
        gl.uniform1f(this.uBlackHoleRadiusLoc, blackHole.radius / this.glCanvas.height);
      }
      if (this.uBlackHoleMassLoc) {
        gl.uniform1f(this.uBlackHoleMassLoc, blackHole.mass);
      }
    } else {
      if (this.uBlackHoleActiveLoc) gl.uniform1f(this.uBlackHoleActiveLoc, 0.0);
    }

    // Hollow Purple Spacetime Vortex uniforms
    if (hollowPurple && hollowPurple.active) {
      if (this.uPurpleActiveLoc) gl.uniform1f(this.uPurpleActiveLoc, 1.0);
      if (this.uPurplePosLoc) {
        gl.uniform2f(
          this.uPurplePosLoc,
          hollowPurple.screenX / this.glCanvas.width,
          hollowPurple.screenY / this.glCanvas.height
        );
      }
      if (this.uPurpleRadiusLoc) {
        gl.uniform1f(this.uPurpleRadiusLoc, hollowPurple.radius / this.glCanvas.height);
      }
    } else {
      if (this.uPurpleActiveLoc) gl.uniform1f(this.uPurpleActiveLoc, 0.0);
    }

    // Glitch strength
    if (this.uGlitchStrengthLoc) {
      gl.uniform1f(this.uGlitchStrengthLoc, glitchStrength);
    }

    // Reality slashes
    const activeSlashes = slashes.slice(0, 6);
    if (this.uSlashCountLoc) {
      gl.uniform1i(this.uSlashCountLoc, activeSlashes.length);
    }
    if (this.uSlashesLoc && activeSlashes.length > 0) {
      const slashArray: number[] = [];
      activeSlashes.forEach(s => {
        slashArray.push(
          s.x1 / this.glCanvas.width,
          s.y1 / this.glCanvas.height,
          s.x2 / this.glCanvas.width,
          s.y2 / this.glCanvas.height
        );
      });
      // Pad to 24 floats (6 * 4)
      while (slashArray.length < 24) slashArray.push(0);
      gl.uniform4fv(this.uSlashesLoc, new Float32Array(slashArray));
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
