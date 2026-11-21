import * as THREE from 'three';
import { WORLD_METADATA } from '../games/catalog.js';
import { audioEngine } from '../audio.js';
import { escapeHtml } from './helpers.js';

const AGE_ORDER = ['3-5', '6-9', '10-15', '16-20'];

function mountEmblem3D(mountEl) {
  if (!mountEl) return () => {};
  let renderer;
  let scene;
  let camera;
  let group;
  let coreGeo;
  let ringGeo1;
  let ringGeo2;
  let coreMat;
  let ringMat1;
  let ringMat2;
  let rafId = 0;
  let timerId = 0;
  let disposed = false;

  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return () => {};
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isSoftwareGl });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(120, 120);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountEl.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 30);
    camera.position.set(0, 0.35, 4.2);

    const ambient = new THREE.AmbientLight('#ffffff', 0.8);
    const keyLight = new THREE.DirectionalLight('#fbbf24', 1.8);
    keyLight.position.set(3, 4, 4);
    const rimLight = new THREE.DirectionalLight('#38bdf8', 1.1);
    rimLight.position.set(-4, -2, 2);
    scene.add(ambient, keyLight, rimLight);

    group = new THREE.Group();
    coreGeo = new THREE.OctahedronGeometry(0.86, 0);
    coreMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      metalness: 0.45,
      roughness: 0.25,
      emissive: '#78350f',
      emissiveIntensity: 0.35,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);

    ringGeo1 = new THREE.TorusGeometry(1.22, 0.055, 10, 36);
    ringMat1 = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      metalness: 0.5,
      roughness: 0.2,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;

    ringGeo2 = new THREE.TorusGeometry(1.42, 0.04, 10, 36);
    ringMat2 = new THREE.MeshStandardMaterial({
      color: '#10b981',
      metalness: 0.4,
      roughness: 0.3,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 4;

    group.add(coreMesh, ring1, ring2);
    scene.add(group);

    let lastTime = performance.now();
    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      coreMesh.rotation.y += dt * 1.15;
      coreMesh.rotation.x += dt * 0.45;
      ring1.rotation.z += dt * 0.9;
      ring2.rotation.x -= dt * 0.7;
      group.position.y = Math.sin(now * 0.0024) * 0.08;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        timerId = window.setTimeout(tick, 90);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      timerId = window.setTimeout(tick, 40);
    } else {
      rafId = requestAnimationFrame(tick);
    }
  } catch {
    return () => {};
  }

  return () => {
    disposed = true;
    cancelAnimationFrame(rafId);
    clearTimeout(timerId);
    coreGeo?.dispose();
    ringGeo1?.dispose();
    ringGeo2?.dispose();
    coreMat?.dispose();
    ringMat1?.dispose();
    ringMat2?.dispose();
    renderer?.dispose();
    if (renderer?.domElement?.parentNode === mountEl) {
      mountEl.removeChild(renderer.domElement);
    }
  };
}

export function mountOnboarding(rootEl, onComplete) {
  let step = 'age'; // 'age' | 'name' | 'welcome'
  let selectedAge = null;
  let playerName = '';
  let errorText = '';
  let disposeEmblem = () => {};

  rootEl.innerHTML = `
    <div class="onboarding-page">
      <main class="onboarding-main">
        <header class="onboarding-header anim-enter">
          <div class="emblem-mount" aria-hidden="true"></div>
          <p class="kicker-text">AQL ARENA · 3D O‘YIN OLAMI</p>
          <h1 class="onboarding-title">
            Xush kelibsiz! AQL ARENA olamiga kirishga tayyormisiz?
          </h1>
        </header>
        <div id="onboarding-step-host"></div>
      </main>
      <footer class="portal-footer">
        AQL ARENA · O‘zbek tilidagi 3D o‘yinlar platformasi · 40 ta original o‘yin
      </footer>
    </div>
  `;

  const emblemMount = rootEl.querySelector('.emblem-mount');
  disposeEmblem = mountEmblem3D(emblemMount);
  const stepHost = rootEl.querySelector('#onboarding-step-host');

  function renderStep() {
    if (step === 'age') {
      const cardsHtml = AGE_ORDER.map((key, idx) => {
        const w = WORLD_METADATA[key];
        return `
          <button
            type="button"
            class="age-card anim-enter"
            data-age="${w.ageGroup}"
            style="animation-delay: ${idx * 65}ms"
          >
            <div class="age-card-media">
              <img src="${escapeHtml(w.coverImage)}" alt="${escapeHtml(w.title)}" />
              <div class="age-card-scrim"></div>
              <div class="age-card-overlay-title">
                <strong>${escapeHtml(w.title)}</strong>
                <span style="color:${escapeHtml(w.accentColor)}">10 o‘yin</span>
              </div>
            </div>
            <div class="age-card-body">
              <div>
                <div class="age-card-sub">${escapeHtml(w.subtitle)}</div>
                <p class="age-card-desc">${escapeHtml(w.description)}</p>
              </div>
              <div class="age-card-foot">
                <span>${escapeHtml(w.badgeText)}</span>
                <span class="age-card-cta" style="color:${escapeHtml(w.accentColor)}">Tanlash →</span>
              </div>
            </div>
          </button>
        `;
      }).join('');

      stepHost.innerHTML = `
        <section class="anim-enter">
          <div class="age-section-header">
            <h2>Yosh oralig‘ingizni tanlang</h2>
            <span class="age-section-hint">Har bir yosh guruhi uchun alohida 10 ta 3D o‘yin</span>
          </div>
          <div class="age-grid">${cardsHtml}</div>
        </section>
      `;

      stepHost.querySelectorAll('.age-card').forEach((btn) => {
        btn.addEventListener('click', () => {
          audioEngine.playUiClick();
          selectedAge = btn.getAttribute('data-age');
          errorText = '';
          step = 'name';
          renderStep();
        });
      });
      return;
    }

    if (step === 'name') {
      const world = WORLD_METADATA[selectedAge];
      stepHost.innerHTML = `
        <section class="name-card anim-scale">
          <button type="button" class="back-link-btn" id="onboarding-back-btn">
            ← Yosh oralig‘ini o‘zgartirish
          </button>
          <div class="selected-world-preview">
            <img src="${escapeHtml(world.coverImage)}" alt="${escapeHtml(world.title)}" />
            <div>
              <div style="font-size:12px;font-weight:700;color:${escapeHtml(world.accentColor)}">
                ${escapeHtml(world.title)}
              </div>
              <div style="font-size:15px;font-weight:700;color:#fff;margin-top:2px">
                ${escapeHtml(world.subtitle)}
              </div>
            </div>
          </div>

          <form id="onboarding-name-form">
            <label for="player-name-input" class="field-label">Ismingizni kiriting</label>
            <input
              id="player-name-input"
              type="text"
              maxlength="24"
              class="text-input"
              placeholder="Masalan: Jasur, Madina, Sardor..."
              value="${escapeHtml(playerName)}"
              autocomplete="nickname"
            />
            ${errorText ? `<p class="error-msg">${escapeHtml(errorText)}</p>` : ''}
            <button type="submit" class="btn-primary btn-full" style="margin-top:16px">
              Boshlash →
            </button>
          </form>
        </section>
      `;

      const inputEl = stepHost.querySelector('#player-name-input');
      inputEl?.focus();

      stepHost.querySelector('#onboarding-back-btn')?.addEventListener('click', () => {
        audioEngine.playUiClick();
        step = 'age';
        renderStep();
      });

      stepHost.querySelector('#onboarding-name-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const trimmed = (inputEl?.value || '').trim();
        if (trimmed.length < 2) {
          errorText = 'Iltimos, kamida 2 ta harfdan iborat ism kiriting.';
          renderStep();
          return;
        }
        playerName = trimmed;
        errorText = '';
        audioEngine.playCollect();
        step = 'welcome';
        renderStep();
      });
      return;
    }

    if (step === 'welcome') {
      const world = WORLD_METADATA[selectedAge];
      stepHost.innerHTML = `
        <section class="welcome-confirm-card anim-scale">
          <div class="welcome-check-badge">✓</div>
          <h2 class="font-display" style="font-size:1.75rem;color:#fff;margin-bottom:8px">
            Xush kelibsiz, ${escapeHtml(playerName)}!
          </h2>
          <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin-bottom:22px">
            Siz uchun <strong style="color:${escapeHtml(world.accentColor)}">${escapeHtml(world.title)} (${escapeHtml(world.subtitle)})</strong> olami va 10 ta 3D o‘yin tayyorlandi.
          </p>
          <button type="button" id="enter-arena-btn" class="btn-primary btn-full">
            Arenaga kirish →
          </button>
        </section>
      `;

      const timeoutId = window.setTimeout(() => {
        onComplete(playerName, selectedAge);
      }, 2200);

      stepHost.querySelector('#enter-arena-btn')?.addEventListener('click', () => {
        window.clearTimeout(timeoutId);
        audioEngine.playUiClick();
        onComplete(playerName, selectedAge);
      });
    }
  }

  renderStep();

  return () => {
    disposeEmblem();
    rootEl.innerHTML = '';
  };
}
