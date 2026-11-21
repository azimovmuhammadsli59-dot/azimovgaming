import { FpsEngine } from '../engine/fpsEngine.js';
import { WEAPONS } from '../weapons.js';
import { audioEngine } from '../audio.js';
import { escapeHtml, formatSeconds } from './helpers.js';

export function mountGameViewport(rootEl, { game, settings, onRecordOutcome, onExit }) {
  const isTouchInitial =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  let touchMode = isTouchInitial;
  let recordedOutcome = false;

  const isKidWorld = game.ageGroup === '3-5';
  const weaponButtonsHtml = game.weapons
    .map((wId, idx) => {
      const spec = WEAPONS[wId];
      const shortName = spec ? spec.nameUz.split(' ')[0] : wId;
      return `<button type="button" class="weapon-slot-btn ${idx === 0 ? 'active' : ''}" data-weapon-idx="${idx}">${idx + 1}: ${escapeHtml(shortName)}</button>`;
    })
    .join('');

  rootEl.innerHTML = `
    <div class="game-viewport" id="game-viewport-root">
      <div class="canvas-mount" id="fps-canvas-mount"></div>

      <div class="damage-vignette hidden" id="hud-damage-vignette"></div>

      <div class="scope-overlay hidden" id="hud-scope-overlay">
        <div class="scope-ring">
          <div class="scope-line-h"></div>
          <div class="scope-line-v"></div>
          <div class="scope-dot"></div>
        </div>
      </div>

      <div class="crosshair-wrap" id="hud-crosshair-wrap">
        <div class="crosshair">
          <div class="crosshair-dot ${isKidWorld ? 'kid' : ''}"></div>
          ${
            isKidWorld
              ? ''
              : `<div class="crosshair-tick t"></div>
                 <div class="crosshair-tick b"></div>
                 <div class="crosshair-tick l"></div>
                 <div class="crosshair-tick r"></div>`
          }
          <div class="hitmarker hidden" id="hud-hitmarker"></div>
        </div>
      </div>

      <div class="hud-top">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div class="hud-card minimap-box" id="hud-minimap">
            <div class="minimap-grid"></div>
            <div id="hud-minimap-dots"></div>
            <div class="minimap-player" id="hud-minimap-player" style="transform:translate(-50%,-50%) rotate(0deg)"></div>
            <span class="minimap-label">${escapeHtml(game.mapName)}</span>
          </div>

          <div class="hud-card hud-mission-box">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--accent-amber)">
              ${escapeHtml(game.title)}
            </div>
            <p style="font-size:12px;color:#e2e8f0;margin-top:3px;line-height:1.4">
              ${escapeHtml(game.missionDesc)}
            </p>
            <div id="hud-color-hint" class="hidden" style="margin-top:6px;font-size:12px;font-weight:700;color:#fde047"></div>
          </div>
        </div>

        <div class="hud-card hud-center-bar">
          <div>
            <div style="font-size:10px;color:var(--text-secondary)">VAQT</div>
            <div class="font-mono-num" id="hud-timer" style="font-size:1.1rem;font-weight:700;color:#fff">
              ${formatSeconds(game.durationSeconds)}
            </div>
          </div>
          <div class="hud-divider"></div>
          <div>
            <div style="font-size:10px;color:var(--text-secondary)">MAQSAD</div>
            <div class="font-mono-num" id="hud-goal" style="font-size:1.1rem;font-weight:700;color:var(--accent-amber)">
              0/${game.targetGoal}
            </div>
          </div>
          ${
            game.roundsTotal > 1
              ? `<div class="hud-divider"></div>
                 <div>
                   <div style="font-size:10px;color:var(--text-secondary)">BOSQICH</div>
                   <div class="font-mono-num" id="hud-round" style="font-size:1.1rem;font-weight:700;color:var(--accent-sky)">1/${game.roundsTotal}</div>
                 </div>`
              : ''
          }
          <div class="hud-divider hidden" id="hud-bomb-divider"></div>
          <div class="hidden" id="hud-bomb-box">
            <div style="font-size:10px;color:#fb7185">ZARYAD</div>
            <div class="font-mono-num" id="hud-bomb-timer" style="font-size:1.1rem;font-weight:700;color:#ef4444">40s</div>
          </div>
          <div class="hud-divider"></div>
          <div>
            <div style="font-size:10px;color:var(--text-secondary)">BALL</div>
            <div class="font-mono-num" id="hud-score" style="font-size:1.1rem;font-weight:700;color:var(--accent-emerald)">0</div>
          </div>
        </div>

        <div class="hud-actions">
          ${
            game.allowCameraToggle
              ? `<button type="button" class="hud-icon-btn" id="btn-cam-toggle" title="Kamera (V)" style="width:auto;padding:0 12px;font-size:12px;font-weight:700">1-shaxs</button>`
              : ''
          }
          <button type="button" class="hud-icon-btn ${touchMode ? 'active' : ''}" id="btn-touch-toggle" title="Mobil boshqaruv">🎮</button>
          <button type="button" class="hud-icon-btn" id="btn-pause" title="Pauza (ESC)">⏸</button>
          <button type="button" class="hud-icon-btn danger" id="btn-exit-top" title="Chiqish">✕</button>
        </div>
      </div>

      <div class="kill-feed" id="hud-kill-feed"></div>

      <div class="interact-banner hidden" id="hud-interact-banner"></div>

      <div class="pointer-lock-prompt hidden" id="hud-pointer-prompt">
        <div class="modal-box anim-scale" style="max-width:390px">
          <p class="kicker-text" style="margin-bottom:6px">${escapeHtml(game.mapName)}</p>
          <h2 class="font-display" style="font-size:1.55rem;color:#fff;margin-bottom:10px">
            ${escapeHtml(game.title)}
          </h2>
          <p style="font-size:13.5px;color:#cbd5e1;line-height:1.5;margin-bottom:18px">
            ${escapeHtml(game.missionDesc)}
          </p>
          <div class="btn-primary btn-full">Boshlash uchun bosing</div>
          <p style="font-size:11.5px;color:#94a3b8;margin-top:12px">
            WASD: Yurish · Sichqoncha: Nishon va otish · R: O‘qlash · ESC: Pauza
          </p>
        </div>
      </div>

      <!-- Mobile Touch Controls -->
      <div class="touch-look-zone ${touchMode ? '' : 'hidden'}" id="touch-look-zone"></div>
      <div class="touch-joystick ${touchMode ? '' : 'hidden'}" id="touch-joystick">
        <div class="touch-joy-knob" id="touch-joy-knob"></div>
      </div>
      <div class="touch-buttons-pad ${touchMode ? '' : 'hidden'}" id="touch-buttons-pad">
        <div class="touch-btn-row">
          <button type="button" class="touch-circle-btn" id="tbtn-interact">E</button>
          <button type="button" class="touch-circle-btn" id="tbtn-scope">Nishon</button>
          <button type="button" class="touch-circle-btn" id="tbtn-crouch">O‘tir</button>
        </div>
        <div class="touch-btn-row">
          <button type="button" class="touch-circle-btn" id="tbtn-reload">O‘q</button>
          <button type="button" class="touch-circle-btn" id="tbtn-jump">Sakra</button>
          <button type="button" class="touch-fire-btn" id="tbtn-fire">OTISH</button>
        </div>
      </div>

      <div class="hud-bottom">
        <div class="hud-card hud-vitals">
          <div>
            <div style="font-size:10px;color:var(--text-secondary)">JON</div>
            <div class="font-mono-num" id="hud-health" style="font-size:1.35rem;font-weight:700;color:#fff">100</div>
          </div>
          <div class="hud-divider hidden" id="hud-armor-divider"></div>
          <div class="hidden" id="hud-armor-box">
            <div style="font-size:10px;color:var(--text-secondary)">ZIRH</div>
            <div class="font-mono-num" id="hud-armor" style="font-size:1.35rem;font-weight:700;color:var(--accent-sky)">0</div>
          </div>
        </div>

        <div class="hud-card hud-controls-hint">
          WASD: Yurish · Shift: Yugurish · C: O‘tirish · Space: Sakrash · R: Qayta o‘qlash · F/O‘ng tugma: Yaqinlashtirish · E: Ta’sir · ESC: Pauza
        </div>

        <div class="hud-weapons-col">
          ${game.weapons.length > 1 ? `<div class="weapon-slots" id="hud-weapon-slots">${weaponButtonsHtml}</div>` : ''}
          <div class="hud-card hud-ammo-box">
            <div id="hud-weapon-name" style="font-size:11px;color:var(--text-secondary)"></div>
            <div class="font-mono-num" id="hud-ammo" style="font-size:1.3rem;font-weight:700;color:#fff;margin-top:2px">30 / 150</div>
            <div class="reload-track hidden" id="hud-reload-track">
              <div class="reload-fill" id="hud-reload-fill" style="width:0%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pause Modal -->
      <div class="viewport-modal-backdrop hidden" id="modal-pause">
        <div class="modal-box anim-scale">
          <h2 class="font-display" style="font-size:1.65rem;color:#fff;margin-bottom:8px">O‘yin to‘xtatildi</h2>
          <p style="font-size:13.5px;color:#94a3b8;margin-bottom:22px">${escapeHtml(game.title)} · ${escapeHtml(game.mapName)}</p>
          <div style="display:grid;gap:10px">
            <button type="button" class="btn-primary btn-full" id="btn-resume">Davom etish</button>
            <button type="button" class="btn-secondary btn-full" id="btn-restart-pause">Qayta boshlash</button>
            <button type="button" class="btn-secondary btn-full" id="btn-exit-pause">Portalga qaytish</button>
          </div>
        </div>
      </div>

      <!-- Result Modal -->
      <div class="viewport-modal-backdrop hidden" id="modal-result">
        <div class="modal-box anim-scale">
          <div id="res-badge" style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px"></div>
          <h2 class="font-display" id="res-title" style="font-size:1.85rem;color:#fff;margin-bottom:8px"></h2>
          <p id="res-reason" style="font-size:13.5px;color:#cbd5e1;line-height:1.5"></p>
          <div class="modal-stats-row">
            <div>
              <div style="font-size:11px;color:#94a3b8">BALL</div>
              <div class="font-mono-num" id="res-score" style="font-size:1.3rem;font-weight:700;color:var(--accent-amber)">0</div>
            </div>
            <div>
              <div style="font-size:11px;color:#94a3b8">MAQSAD</div>
              <div class="font-mono-num" id="res-goal" style="font-size:1.3rem;font-weight:700;color:var(--accent-emerald)">0/0</div>
            </div>
            <div>
              <div style="font-size:11px;color:#94a3b8">NATIJA</div>
              <div class="font-mono-num" id="res-kills" style="font-size:1.3rem;font-weight:700;color:var(--accent-sky)">0</div>
            </div>
          </div>
          <div style="display:grid;gap:10px">
            <button type="button" class="btn-primary btn-full" id="btn-play-again">Yana o‘ynash</button>
            <button type="button" class="btn-secondary btn-full" id="btn-exit-result">Portalga qaytish</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Cache HUD DOM elements (never touches canvasMount!)
  const canvasMount = rootEl.querySelector('#fps-canvas-mount');
  const damageVignette = rootEl.querySelector('#hud-damage-vignette');
  const scopeOverlay = rootEl.querySelector('#hud-scope-overlay');
  const crosshairWrap = rootEl.querySelector('#hud-crosshair-wrap');
  const hitmarker = rootEl.querySelector('#hud-hitmarker');
  const minimapDots = rootEl.querySelector('#hud-minimap-dots');
  const minimapPlayer = rootEl.querySelector('#hud-minimap-player');
  const colorHint = rootEl.querySelector('#hud-color-hint');
  const timerEl = rootEl.querySelector('#hud-timer');
  const goalEl = rootEl.querySelector('#hud-goal');
  const roundEl = rootEl.querySelector('#hud-round');
  const bombDivider = rootEl.querySelector('#hud-bomb-divider');
  const bombBox = rootEl.querySelector('#hud-bomb-box');
  const bombTimerEl = rootEl.querySelector('#hud-bomb-timer');
  const scoreEl = rootEl.querySelector('#hud-score');
  const camToggleBtn = rootEl.querySelector('#btn-cam-toggle');
  const touchToggleBtn = rootEl.querySelector('#btn-touch-toggle');
  const killFeedEl = rootEl.querySelector('#hud-kill-feed');
  const interactBanner = rootEl.querySelector('#hud-interact-banner');
  const pointerPrompt = rootEl.querySelector('#hud-pointer-prompt');
  const healthEl = rootEl.querySelector('#hud-health');
  const armorDivider = rootEl.querySelector('#hud-armor-divider');
  const armorBox = rootEl.querySelector('#hud-armor-box');
  const armorEl = rootEl.querySelector('#hud-armor');
  const weaponNameEl = rootEl.querySelector('#hud-weapon-name');
  const ammoEl = rootEl.querySelector('#hud-ammo');
  const reloadTrack = rootEl.querySelector('#hud-reload-track');
  const reloadFill = rootEl.querySelector('#hud-reload-fill');
  const weaponSlotBtns = rootEl.querySelectorAll('[data-weapon-idx]');
  const pauseModal = rootEl.querySelector('#modal-pause');
  const resultModal = rootEl.querySelector('#modal-result');
  const touchLookZone = rootEl.querySelector('#touch-look-zone');
  const touchJoystick = rootEl.querySelector('#touch-joystick');
  const touchJoyKnob = rootEl.querySelector('#touch-joy-knob');
  const touchButtonsPad = rootEl.querySelector('#touch-buttons-pad');

  let latestHud = null;

  function updateTouchVisibility() {
    touchToggleBtn?.classList.toggle('active', touchMode);
    touchLookZone?.classList.toggle('hidden', !touchMode);
    touchJoystick?.classList.toggle('hidden', !touchMode);
    touchButtonsPad?.classList.toggle('hidden', !touchMode);
    if (latestHud) {
      const showPrompt =
        latestHud.status === 'playing' &&
        !latestHud.isPaused &&
        !latestHud.isPointerLocked &&
        !touchMode;
      pointerPrompt?.classList.toggle('hidden', !showPrompt);
    }
  }

  function updateHud(hud) {
    latestHud = hud;
    const now = performance.now();

    damageVignette?.classList.toggle('hidden', now - hud.damageFlashAt > 260);
    scopeOverlay?.classList.toggle('hidden', !hud.isScoped);
    crosshairWrap?.classList.toggle('hidden', hud.isScoped || hud.status !== 'playing');
    hitmarker?.classList.toggle('hidden', now - hud.hitMarkerAt > 170);

    if (timerEl) {
      timerEl.textContent = formatSeconds(hud.timeRemaining);
      timerEl.style.color = hud.timeRemaining <= 15 ? '#fb7185' : '#ffffff';
    }
    if (goalEl) goalEl.textContent = `${hud.goalProgress}/${hud.goalTarget}`;
    if (roundEl) roundEl.textContent = `${hud.round}/${hud.roundsTotal}`;
    if (scoreEl) scoreEl.textContent = String(hud.score);

    const showBomb = hud.bombState === 'planted';
    bombDivider?.classList.toggle('hidden', !showBomb);
    bombBox?.classList.toggle('hidden', !showBomb);
    if (bombTimerEl && showBomb) {
      bombTimerEl.textContent = `${hud.bombTimer}s`;
    }

    if (colorHint) {
      if (hud.targetColorHint) {
        colorHint.classList.remove('hidden');
        colorHint.textContent = `Nishon rangi: ${hud.targetColorHint}`;
      } else {
        colorHint.classList.add('hidden');
      }
    }

    if (camToggleBtn) {
      camToggleBtn.textContent = hud.cameraMode === 'fps' ? '1-shaxs' : '3-shaxs';
    }

    if (healthEl) {
      healthEl.textContent = String(hud.health);
      healthEl.style.color = hud.health <= 30 ? '#fb7185' : '#ffffff';
    }

    const hasArmor = hud.maxArmor > 0;
    armorDivider?.classList.toggle('hidden', !hasArmor);
    armorBox?.classList.toggle('hidden', !hasArmor);
    if (armorEl && hasArmor) armorEl.textContent = String(hud.armor);

    if (weaponNameEl) weaponNameEl.textContent = hud.weaponName;
    if (ammoEl) {
      ammoEl.textContent = hud.reloading
        ? 'O‘qlanmoqda...'
        : `${hud.ammo} / ${hud.reserveAmmo}`;
    }
    reloadTrack?.classList.toggle('hidden', !hud.reloading);
    if (reloadFill) {
      reloadFill.style.width = `${Math.round(hud.reloadProgress * 100)}%`;
    }

    weaponSlotBtns.forEach((btn) => {
      const idx = Number(btn.getAttribute('data-weapon-idx'));
      btn.classList.toggle('active', game.weapons[idx] === hud.weaponId);
    });

    if (interactBanner) {
      if (hud.interactPrompt && hud.status === 'playing' && !hud.isPaused) {
        interactBanner.classList.remove('hidden');
        interactBanner.textContent = hud.interactPrompt;
      } else {
        interactBanner.classList.add('hidden');
      }
    }

    if (killFeedEl) {
      killFeedEl.innerHTML = (hud.killFeed || [])
        .map(
          (item) =>
            `<div class="kill-feed-item" style="color:${escapeHtml(item.color || '#f8fafc')}">${escapeHtml(item.text)}</div>`,
        )
        .join('');
    }

    if (minimapPlayer) {
      const deg = (-hud.playerPos.yaw * 180) / Math.PI;
      minimapPlayer.style.transform = `translate(-50%, -50%) rotate(${deg.toFixed(1)}deg)`;
    }

    if (minimapDots) {
      const scale = 1.65;
      const cx = 59;
      const cy = 59;
      minimapDots.innerHTML = (hud.entitiesMinimap || [])
        .map((e) => {
          const dx = (e.x - hud.playerPos.x) * scale;
          const dz = (e.z - hud.playerPos.z) * scale;
          const left = Math.max(6, Math.min(112, cx + dx));
          const top = Math.max(6, Math.min(112, cy + dz));
          const color =
            e.kind === 'enemy'
              ? '#ef4444'
              : e.kind === 'ally'
              ? '#38bdf8'
              : e.kind === 'objective'
              ? '#10b981'
              : '#fbbf24';
          return `<span class="minimap-dot" style="left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;background:${color}"></span>`;
        })
        .join('');
    }

    const showPrompt =
      hud.status === 'playing' && !hud.isPaused && !hud.isPointerLocked && !touchMode;
    pointerPrompt?.classList.toggle('hidden', !showPrompt);
    pauseModal?.classList.toggle('hidden', !hud.isPaused || hud.status !== 'playing');
  }

  function showResultModal(won, finalScore, reason) {
    resultModal?.classList.remove('hidden');
    pointerPrompt?.classList.add('hidden');
    pauseModal?.classList.add('hidden');

    const badge = rootEl.querySelector('#res-badge');
    const title = rootEl.querySelector('#res-title');
    const reasonEl = rootEl.querySelector('#res-reason');
    const scoreOut = rootEl.querySelector('#res-score');
    const goalOut = rootEl.querySelector('#res-goal');
    const killsOut = rootEl.querySelector('#res-kills');

    if (badge) {
      badge.textContent = won ? 'G‘ALABA' : 'MISSYA YAKUNLANDI';
      badge.style.color = won ? 'var(--accent-emerald)' : '#fb7185';
    }
    if (title) {
      title.textContent = won ? 'Ajoyib g‘alaba!' : 'Yana urinib ko‘ring!';
    }
    if (reasonEl) reasonEl.textContent = reason;
    if (scoreOut) scoreOut.textContent = String(finalScore);
    if (goalOut && latestHud) {
      goalOut.textContent = `${latestHud.goalProgress}/${latestHud.goalTarget}`;
    }
    if (killsOut && latestHud) {
      killsOut.textContent = String(latestHud.kills);
    }
  }

  const engine = new FpsEngine({
    container: canvasMount,
    game,
    quality: settings.graphicsQuality,
    difficulty: settings.difficulty,
    sensitivity: settings.mouseSensitivity,
    onHudUpdate: updateHud,
    onGameEnd: (won, finalScore, reason) => {
      if (!recordedOutcome) {
        recordedOutcome = true;
        onRecordOutcome(game.id, finalScore, won);
      }
      showResultModal(won, finalScore, reason);
    },
  });

  // Button bindings
  pointerPrompt?.addEventListener('click', () => {
    audioEngine.ensureContext();
    engine.requestPointerLock();
  });

  camToggleBtn?.addEventListener('click', () => {
    audioEngine.playUiClick();
    engine.toggleCameraMode();
  });

  touchToggleBtn?.addEventListener('click', () => {
    audioEngine.playUiClick();
    touchMode = !touchMode;
    updateTouchVisibility();
  });

  rootEl.querySelector('#btn-pause')?.addEventListener('click', () => {
    audioEngine.playUiClick();
    engine.setPaused(true);
  });

  rootEl.querySelector('#btn-resume')?.addEventListener('click', () => {
    audioEngine.playUiClick();
    engine.setPaused(false);
    if (!touchMode) engine.requestPointerLock();
  });

  function handleRestart() {
    audioEngine.playUiClick();
    recordedOutcome = false;
    resultModal?.classList.add('hidden');
    pauseModal?.classList.add('hidden');
    engine.restartMatch();
    if (!touchMode) engine.requestPointerLock();
  }

  rootEl.querySelector('#btn-restart-pause')?.addEventListener('click', handleRestart);
  rootEl.querySelector('#btn-play-again')?.addEventListener('click', handleRestart);

  function handleExit() {
    audioEngine.playUiClick();
    onExit();
  }

  rootEl.querySelector('#btn-exit-top')?.addEventListener('click', handleExit);
  rootEl.querySelector('#btn-exit-pause')?.addEventListener('click', handleExit);
  rootEl.querySelector('#btn-exit-result')?.addEventListener('click', handleExit);

  weaponSlotBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-weapon-idx'));
      engine.switchWeapon(idx);
    });
  });

  // Mobile Joystick Touch Handlers
  let joyTouchId = null;
  let joyCenter = { x: 0, y: 0 };

  const onJoyStart = (e) => {
    const t = e.changedTouches[0];
    if (!t || joyTouchId !== null) return;
    joyTouchId = t.identifier;
    const rect = touchJoystick.getBoundingClientRect();
    joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  const onJoyMove = (e) => {
    if (joyTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyTouchId) {
        const maxR = 42;
        const dx = t.clientX - joyCenter.x;
        const dy = t.clientY - joyCenter.y;
        const dist = Math.hypot(dx, dy);
        const clamped = Math.min(dist, maxR);
        const angle = Math.atan2(dy, dx);
        const nx = dist > 2 ? (Math.cos(angle) * clamped) / maxR : 0;
        const ny = dist > 2 ? (Math.sin(angle) * clamped) / maxR : 0;
        if (touchJoyKnob) {
          touchJoyKnob.style.transform = `translate(${(nx * maxR).toFixed(1)}px, ${(ny * maxR).toFixed(1)}px)`;
        }
        engine.setMobileMove(nx, ny);
      }
    }
  };

  const onJoyEnd = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId) {
        joyTouchId = null;
        if (touchJoyKnob) touchJoyKnob.style.transform = 'translate(0px, 0px)';
        engine.setMobileMove(0, 0);
      }
    }
  };

  touchJoystick?.addEventListener('touchstart', onJoyStart, { passive: true });
  touchJoystick?.addEventListener('touchmove', onJoyMove, { passive: true });
  touchJoystick?.addEventListener('touchend', onJoyEnd, { passive: true });
  touchJoystick?.addEventListener('touchcancel', onJoyEnd, { passive: true });

  // Mobile Look Zone Touch Handlers
  let lookTouch = null;
  touchLookZone?.addEventListener(
    'touchstart',
    (e) => {
      const t = e.changedTouches[0];
      if (!t || lookTouch) return;
      lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
    },
    { passive: true },
  );

  touchLookZone?.addEventListener(
    'touchmove',
    (e) => {
      if (!lookTouch) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === lookTouch.id) {
          engine.addLookDelta(t.clientX - lookTouch.x, t.clientY - lookTouch.y);
          lookTouch.x = t.clientX;
          lookTouch.y = t.clientY;
        }
      }
    },
    { passive: true },
  );

  const onLookEnd = (e) => {
    if (!lookTouch) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouch.id) {
        lookTouch = null;
      }
    }
  };
  touchLookZone?.addEventListener('touchend', onLookEnd, { passive: true });
  touchLookZone?.addEventListener('touchcancel', onLookEnd, { passive: true });

  // Mobile Action Buttons
  const fireBtn = rootEl.querySelector('#tbtn-fire');
  fireBtn?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    engine.triggerFire(true);
  });
  fireBtn?.addEventListener('touchend', () => engine.triggerFire(false));
  fireBtn?.addEventListener('mousedown', () => engine.triggerFire(true));
  fireBtn?.addEventListener('mouseup', () => engine.triggerFire(false));

  const interactBtn = rootEl.querySelector('#tbtn-interact');
  interactBtn?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    engine.triggerInteract(true);
  });
  interactBtn?.addEventListener('touchend', () => engine.triggerInteract(false));
  interactBtn?.addEventListener('click', () => engine.triggerInteract(true));

  rootEl.querySelector('#tbtn-jump')?.addEventListener('click', () => engine.triggerJump());
  rootEl.querySelector('#tbtn-reload')?.addEventListener('click', () => engine.triggerReload());
  rootEl.querySelector('#tbtn-crouch')?.addEventListener('click', () => engine.triggerCrouch());
  rootEl.querySelector('#tbtn-scope')?.addEventListener('click', () => engine.triggerScope());

  return () => {
    engine.dispose();
    rootEl.innerHTML = '';
  };
}
