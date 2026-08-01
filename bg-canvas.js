/* ==========================================================================
   GC One — Generative Background Canvas (WebGL / GLSL)
   A persistent, subtle flow-field shader running behind the entire page —
   the "living growth line" made literal, in brand colors. Falls back to
   nothing (the existing CSS meshes remain) if WebGL is unavailable.
   ========================================================================== */

import * as THREE from 'three';

function initBgCanvas() {
  const container = document.getElementById('bgCanvas');
  if (!container) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
  } catch (e) {
    return; // No WebGL — silently keep the existing CSS mesh backgrounds.
  }
  if (!renderer) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uScroll: { value: 0 },
    uColorA: { value: new THREE.Color('#003B8E') },
    uColorB: { value: new THREE.Color('#12D3E0') }
  };

  const vertexShader = /* glsl */ `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `;

  // Classic Ashima Arts simplex noise (public domain / MIT), used here to
  // build a domain-warped flow field rather than a flat gradient.
  const fragmentShader = /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform float uScroll;
    uniform vec3 uColorA;
    uniform vec3 uColorB;

    vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                          -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
              + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    float flow(vec2 uv, float t){
      vec2 warp = vec2(
        snoise(uv * 1.4 + vec2(0.0, t * 0.06)),
        snoise(uv * 1.4 + vec2(5.2, t * 0.05))
      );
      float n = snoise(uv * 2.1 + warp * 0.6 + vec2(t * 0.035, -t * 0.028));
      return n;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 aspectUv = uv;
      aspectUv.x *= uResolution.x / uResolution.y;

      float t = uTime + uScroll * 4.0;

      vec2 mouseInfluence = (uMouse - 0.5) * 0.12;
      float n1 = flow(aspectUv + mouseInfluence, t);
      float n2 = flow(aspectUv * 1.6 + 3.1 + mouseInfluence * 0.5, t * 1.15);

      float lines = smoothstep(0.94, 1.0, sin(n1 * 6.0) * 0.5 + 0.5);
      lines += smoothstep(0.965, 1.0, sin(n2 * 8.0) * 0.5 + 0.5) * 0.6;

      float glow = smoothstep(0.35, 1.0, n1) * 0.05;

      vec3 color = mix(uColorA, uColorB, clamp(n1 * 0.5 + 0.5, 0.0, 1.0));
      float alpha = lines * 0.05 + glow;

      gl_FragColor = vec4(color, alpha);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader,
    transparent: true, depthTest: false, depthWrite: false
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3
  )); // fullscreen triangle — cheaper than two triangles for a quad
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  /* ---------------------------------------------------------
     Interaction: mouse + scroll drive the uniforms subtly
  --------------------------------------------------------- */
  window.addEventListener('pointermove', (e) => {
    uniforms.uMouse.value.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
  }, { passive: true });

  const updateScroll = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    uniforms.uScroll.value = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  };
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    uniforms.uResolution.value.set(w, h);
  }
  window.addEventListener('resize', resize);

  /* ---------------------------------------------------------
     Render loop — pauses when tab is hidden to save battery,
     and skips time-advance under prefers-reduced-motion.
  --------------------------------------------------------- */
  let rafId;
  const clock = new THREE.Clock();

  function animate() {
    rafId = requestAnimationFrame(animate);
    if (!prefersReducedMotion) {
      uniforms.uTime.value = clock.getElapsedTime();
    }
    renderer.render(scene, camera);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      animate();
    }
  });

  animate();
  container.classList.add('is-ready');
}

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBgCanvas);
  } else {
    initBgCanvas();
  }
} catch (e) {
  console.warn('Fundo generativo indisponível, mantendo o fundo padrão.', e);
}
