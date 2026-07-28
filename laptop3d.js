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
  const BASE_W = 460;
  const BASE_D = 300;

  // ---- Lid (screen front + branded back panel), hinged at bottom edge ----
  const lidPivot = new THREE.Object3D();
  lidPivot.position.set(0, 0, 0);
  laptopGroup.add(lidPivot);

  const screenEl = template.content.firstElementChild.cloneNode(true);
  screenEl.style.width = SCREEN_W + 'px';
  screenEl.style.height = SCREEN_H + 'px';
  const screenObject = new CSS3DObject(screenEl);
  screenObject.position.set(0, SCREEN_H / 2, 0);
  lidPivot.add(screenObject);

  const lidBackEl = document.createElement('div');
  lidBackEl.className = 'laptop-panel laptop-panel--lid-back';
  lidBackEl.style.width = SCREEN_W + 'px';
  lidBackEl.style.height = SCREEN_H + 'px';
  lidBackEl.innerHTML = '<img class="laptop-panel-mark" src="assets/icon-watermark.png" alt="" />';
  const lidBackObject = new CSS3DObject(lidBackEl);
  lidBackObject.position.set(0, SCREEN_H / 2, 0);
  lidBackObject.rotation.y = Math.PI;
  lidPivot.add(lidBackObject);

  // Open the lid to a natural "presenting" angle (small backward tilt from vertical)
  lidPivot.rotation.x = THREE.MathUtils.degToRad(-12);

  // ---- Base (keyboard deck + bottom panel) ----
  const baseEl = document.createElement('div');
  baseEl.className = 'laptop-panel laptop-panel--base-top';
  baseEl.style.width = BASE_W + 'px';
  baseEl.style.height = BASE_D + 'px';
  baseEl.innerHTML = `
    <div class="laptop-keyboard">
      <div class="laptop-keys"></div>
      <div class="laptop-trackpad"></div>
    </div>
  `;
  const baseObject = new CSS3DObject(baseEl);
  baseObject.position.set(0, 0, BASE_D / 2);
  baseObject.rotation.x = -Math.PI / 2;
  laptopGroup.add(baseObject);

  const baseBottomEl = document.createElement('div');
  baseBottomEl.className = 'laptop-panel laptop-panel--base-bottom';
  baseBottomEl.style.width = BASE_W + 'px';
  baseBottomEl.style.height = BASE_D + 'px';
  const baseBottomObject = new CSS3DObject(baseBottomEl);
  baseBottomObject.position.set(0, 0, BASE_D / 2);
  baseBottomObject.rotation.x = Math.PI / 2;
  laptopGroup.add(baseBottomObject);

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

    const scale = THREE.MathUtils.clamp(width / REFERENCE_WIDTH, 0.6, 1.7);
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
  const finalScale = THREE.MathUtils.clamp(stage.clientWidth / REFERENCE_WIDTH, 0.6, 1.7);
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
