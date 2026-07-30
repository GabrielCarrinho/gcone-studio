/* ==========================================================================
   GC One — Laptop 3D (CSS3DRenderer + OrbitControls)
   Renders an interactive, fully-orbitable laptop mockup using real DOM
   content on the screen. Pure CSS3D (no WebGL), so it works everywhere
   transform-style:preserve-3d works — which is effectively everywhere.
   ========================================================================== */

import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const REFERENCE_WIDTH = 500; // design reference width (css px) the scene was tuned at

/**
 * Builds a thin rigid "slab" (front face + back face + connecting edge
 * strips) so panels have real geometric thickness instead of being
 * zero-depth planes. Built centered on its own local origin, front face
 * facing local +Z — position/rotate the returned group as a single rigid
 * unit to place it in the scene.
 */
function buildSlab({ width, height, thickness, frontEl, backEl, edgeColor, edges }) {
  const group = new THREE.Group();

  const front = new CSS3DObject(frontEl);
  front.position.z = thickness / 2;
  group.add(front);

  if (backEl) {
    const back = new CSS3DObject(backEl);
    back.position.z = -thickness / 2;
    back.rotation.y = Math.PI;
    group.add(back);
  }

  const edgeSet = edges || ['top', 'bottom', 'left', 'right'];
  const mkEdge = (w, h) => {
    const el = document.createElement('div');
    el.className = 'laptop-edge';
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    if (edgeColor) el.style.background = edgeColor;
    return el;
  };

  if (edgeSet.includes('top')) {
    const obj = new CSS3DObject(mkEdge(width, thickness));
    obj.position.set(0, height / 2, 0);
    obj.rotation.x = -Math.PI / 2;
    group.add(obj);
  }
  if (edgeSet.includes('bottom')) {
    const obj = new CSS3DObject(mkEdge(width, thickness));
    obj.position.set(0, -height / 2, 0);
    obj.rotation.x = Math.PI / 2;
    group.add(obj);
  }
  if (edgeSet.includes('left')) {
    const obj = new CSS3DObject(mkEdge(thickness, height));
    obj.position.set(-width / 2, 0, 0);
    obj.rotation.y = -Math.PI / 2;
    group.add(obj);
  }
  if (edgeSet.includes('right')) {
    const obj = new CSS3DObject(mkEdge(thickness, height));
    obj.position.set(width / 2, 0, 0);
    obj.rotation.y = Math.PI / 2;
    group.add(obj);
  }

  return group;
}

function initLaptop3D() {
  const stage = document.getElementById('laptop3DStage');
  const fallback = document.getElementById('laptopFallback');
  const hint = document.getElementById('laptopDragHint');
  const template = document.getElementById('laptopScreenTemplate');

  if (!stage || !template) return;

  // Feature check — bail to static fallback if 3D transforms aren't supported.
  const supports3D = CSS.supports('transform-style', 'preserve-3d');
  if (!supports3D) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = stage.clientWidth;
  let height = stage.clientHeight;
  if (!width || !height) return;

  /* ---------------------------------------------------------
     Scene / Camera / Renderer
  --------------------------------------------------------- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
  camera.position.set(0, 90, 950);

  const renderer = new CSS3DRenderer();
  renderer.setSize(width, height);
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.inset = '0';
  stage.appendChild(renderer.domElement);

  /* ---------------------------------------------------------
     Laptop group
  --------------------------------------------------------- */
  const laptopGroup = new THREE.Group();
  scene.add(laptopGroup);

  const SCREEN_W = 460;
  const SCREEN_H = 300;
  const LID_THICKNESS = 11;
  const BASE_W = 460;
  const BASE_D = 300;
  const BASE_THICKNESS = 20;
  const ALU_EDGE = 'linear-gradient(180deg, #EEF1F6, #B9C1D0)';

  // ---- Lid (screen front + branded back panel + edges), hinged at bottom ----
  const lidPivot = new THREE.Object3D();
  lidPivot.position.set(0, 0, 0);
  laptopGroup.add(lidPivot);

  const screenEl = template.content.firstElementChild.cloneNode(true);
  screenEl.style.width = SCREEN_W + 'px';
  screenEl.style.height = SCREEN_H + 'px';

  const lidBackEl = document.createElement('div');
  lidBackEl.className = 'laptop-panel laptop-panel--lid-back';
  lidBackEl.style.width = SCREEN_W + 'px';
  lidBackEl.style.height = SCREEN_H + 'px';
  lidBackEl.innerHTML = '<img class="laptop-panel-mark" src="assets/icon-watermark.png" alt="" />';

  const lidSlab = buildSlab({
    width: SCREEN_W, height: SCREEN_H, thickness: LID_THICKNESS,
    frontEl: screenEl, backEl: lidBackEl, edgeColor: '#15181F',
    edges: ['top', 'left', 'right']
  });
  lidSlab.position.set(0, SCREEN_H / 2, 0);
  lidPivot.add(lidSlab);

  // Open the lid to a natural "presenting" angle (small backward tilt from vertical)
  lidPivot.rotation.x = THREE.MathUtils.degToRad(-12);

  // ---- Base (keyboard deck top + bottom + edges) ----
  const baseTopEl = document.createElement('div');
  baseTopEl.className = 'laptop-panel laptop-panel--base-top';
  baseTopEl.style.width = BASE_W + 'px';
  baseTopEl.style.height = BASE_D + 'px';
  baseTopEl.innerHTML = `
    <div class="laptop-keyboard">
      <div class="laptop-keys" id="laptopKeys"></div>
      <div class="laptop-trackpad"></div>
    </div>
  `;

  const baseBottomEl = document.createElement('div');
  baseBottomEl.className = 'laptop-panel laptop-panel--base-bottom';
  baseBottomEl.style.width = BASE_W + 'px';
  baseBottomEl.style.height = BASE_D + 'px';
  baseBottomEl.innerHTML = '<div class="laptop-vents"></div><div class="laptop-foot laptop-foot--l"></div><div class="laptop-foot laptop-foot--r"></div>';

  const baseSlab = buildSlab({
    width: BASE_W, height: BASE_D, thickness: BASE_THICKNESS,
    frontEl: baseTopEl, backEl: baseBottomEl, edgeColor: ALU_EDGE,
    edges: ['bottom', 'left', 'right']
  });
  baseSlab.rotation.x = -Math.PI / 2;
  baseSlab.position.set(0, -BASE_THICKNESS / 2, BASE_D / 2);
  laptopGroup.add(baseSlab);

  // Generate individual keycaps (real grid instead of an abstract texture)
  const keysContainer = baseTopEl.querySelector('#laptopKeys');
  if (keysContainer) {
    const cols = 14, rows = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = document.createElement('span');
        key.className = 'laptop-key';
        keysContainer.appendChild(key);
      }
    }
  }

  // ---- Hinge bar (static — does not rotate with the lid) ----
  const hingeEl = document.createElement('div');
  hingeEl.className = 'laptop-hinge';
  hingeEl.style.width = (SCREEN_W - 40) + 'px';
  hingeEl.style.height = '10px';
  const hingeObject = new CSS3DObject(hingeEl);
  hingeObject.position.set(0, -2, 4);
  hingeObject.rotation.x = -Math.PI / 2;
  laptopGroup.add(hingeObject);

  // ---- Contact shadow beneath the laptop ----
  const shadowEl = document.createElement('div');
  shadowEl.className = 'laptop-contact-shadow';
  shadowEl.style.width = (BASE_W + 140) + 'px';
  shadowEl.style.height = (BASE_D + 100) + 'px';
  const shadowObject = new CSS3DObject(shadowEl);
  shadowObject.position.set(0, -BASE_THICKNESS - 4, BASE_D / 2);
  shadowObject.rotation.x = -Math.PI / 2;
  laptopGroup.add(shadowObject);

  // Tilt the whole assembly slightly for a pleasant resting presentation angle
  laptopGroup.rotation.x = THREE.MathUtils.degToRad(8);
  laptopGroup.rotation.y = THREE.MathUtils.degToRad(-18);

  /* ---------------------------------------------------------
     Controls
  --------------------------------------------------------- */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 70, 0);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.6;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI - 0.12;
  controls.autoRotate = !prefersReducedMotion;
  controls.autoRotateSpeed = 0.9;
  controls.update();

  let userInteracted = false;
  const stopAutoRotate = () => {
    if (userInteracted) return;
    userInteracted = true;
    controls.autoRotate = false;
    if (hint) hint.classList.add('is-hidden');
  };
  controls.addEventListener('start', stopAutoRotate);
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.style.cursor = 'grab';
  renderer.domElement.addEventListener('pointerdown', () => {
    renderer.domElement.style.cursor = 'grabbing';
  });
  window.addEventListener('pointerup', () => {
    renderer.domElement.style.cursor = 'grab';
  });

  /* ---------------------------------------------------------
     Responsive scaling — keep the laptop framed consistently
     across every container width (mobile through desktop).
  --------------------------------------------------------- */
  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);

    const scale = THREE.MathUtils.clamp(width / REFERENCE_WIDTH, 1.2, 1.9);
    laptopGroup.scale.setScalar(scale);
  }
  resize();

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(stage);
  window.addEventListener('resize', resize);

  /* ---------------------------------------------------------
     Entrance animation (GSAP if available, CSS fallback otherwise)
  --------------------------------------------------------- */
  laptopGroup.scale.multiplyScalar(0.001); // start collapsed; resize() above set the target scale
  const targetScale = laptopGroup.scale.length() ? laptopGroup.scale.x : 1;
  const finalScale = THREE.MathUtils.clamp(stage.clientWidth / REFERENCE_WIDTH, 1.2, 1.9);
  laptopGroup.scale.setScalar(finalScale * 0.001);
  laptopGroup.rotation.y += THREE.MathUtils.degToRad(50);

  stage.classList.add('is-ready');

  if (window.gsap) {
    gsap.to(laptopGroup.scale, {
      x: finalScale, y: finalScale, z: finalScale,
      duration: 1.3, ease: 'power3.out', delay: 0.15
    });
    gsap.to(laptopGroup.rotation, {
      y: THREE.MathUtils.degToRad(-18),
      duration: 1.5, ease: 'power3.out', delay: 0.15
    });
  } else {
    laptopGroup.scale.setScalar(finalScale);
    laptopGroup.rotation.y = THREE.MathUtils.degToRad(-18);
  }

  /* ---------------------------------------------------------
     URL bar typing effect (real DOM text — runs once on load)
  --------------------------------------------------------- */
  const urlEl = screenEl.querySelector('.browser-url');
  if (urlEl) {
    const fullText = urlEl.textContent.trim();
    urlEl.textContent = '';
    urlEl.classList.add('is-typing');
    let i = 0;
    const typeNext = () => {
      if (i <= fullText.length) {
        urlEl.textContent = fullText.slice(0, i);
        i++;
        setTimeout(typeNext, 45 + Math.random() * 45);
      } else {
        setTimeout(() => urlEl.classList.remove('is-typing'), 1200);
      }
    };
    setTimeout(typeNext, 900); // let the entrance animation settle first
  }

  /* ---------------------------------------------------------
     Scroll-linked rotation — the laptop settles into a new
     angle as the visitor scrolls past the Hero. Stops for good
     the moment the visitor takes manual control via drag.
  --------------------------------------------------------- */
  if (window.gsap && window.ScrollTrigger) {
    const scrollTween = gsap.to(laptopGroup.rotation, {
      y: THREE.MathUtils.degToRad(-18) + THREE.MathUtils.degToRad(30),
      x: laptopGroup.rotation.x + THREE.MathUtils.degToRad(-5),
      ease: 'none',
      scrollTrigger: {
        trigger: '#inicio',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6
      }
    });
    controls.addEventListener('start', () => {
      if (scrollTween.scrollTrigger) scrollTween.scrollTrigger.kill();
    });
  }

  /* ---------------------------------------------------------
     Render loop
  --------------------------------------------------------- */
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  if (fallback) fallback.style.display = 'none';
}

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLaptop3D);
  } else {
    initLaptop3D();
  }
} catch (e) {
  // Any failure: silently keep the static fallback mockup visible.
  console.warn('Laptop 3D indisponível, mantendo mockup estático.', e);
}
