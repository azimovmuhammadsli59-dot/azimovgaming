import { ALL_GAMES, WORLD_METADATA, getGamesForAgeGroup } from '../games/catalog.js';
import { ACHIEVEMENT_CATALOG, DEFAULT_SETTINGS } from '../storage.js';
import { audioEngine } from '../audio.js';
import { escapeHtml, formatDateUz } from './helpers.js';

const AGE_GROUPS = ['3-5', '6-9', '10-15', '16-20'];

const NAV_ITEMS = [
  { id: 'home', label: 'Bosh sahifa' },
  { id: 'all', label: 'Barcha o‘yinlar' },
  { id: 'fps', label: 'FPS o‘yinlar' },
  { id: 'profile', label: 'Profilim' },
  { id: 'settings', label: 'Sozlamalar' },
];

const CATALOG_TABS = [
  { id: 'home', label: 'Bosh sahifa' },
  { id: 'all', label: 'Barcha o‘yinlar' },
  { id: 'fps', label: 'FPS o‘yinlar' },
  { id: 'new', label: 'Yangi o‘yinlar' },
  { id: 'popular', label: 'Mashhur o‘yinlar' },
  { id: 'favorites', label: 'Sevimli o‘yinlar' },
];

const QUALITY_OPTIONS = [
  { id: 'low', label: 'Past (Tezkor)' },
  { id: 'medium', label: 'O‘rtacha (Tavsiya)' },
  { id: 'high', label: 'Yuqori (HD Soyalar)' },
];

const DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'Oson' },
  { id: 'medium', label: 'O‘rtacha' },
  { id: 'hard', label: 'Qiyin' },
];

export function mountPortal(rootEl, initialProfile, callbacks) {
  let profile = initialProfile;
  let activeTab = 'home';
  let searchQuery = '';
  let editingProfile = false;
  let editName = profile.name;
  let editAge = profile.ageGroup;
  let editError = '';
  let confirmReset = false;

  function renderGameCard(game) {
    const world = WORLD_METADATA[game.ageGroup];
    const stat = profile.gameStats[game.id];
    const isFav = profile.favorites.includes(game.id);
    const bestScore = stat ? stat.bestScore : 0;
    const plays = stat ? stat.plays : 0;

    return `
      <article class="game-card">
        <div class="game-thumb" data-play="${escapeHtml(game.id)}">
          <img src="${escapeHtml(world.coverImage)}" alt="${escapeHtml(game.title)}" loading="lazy" />
          <div class="game-thumb-tint" style="background: linear-gradient(145deg, ${escapeHtml(game.accentColor)}33, transparent 70%)"></div>
          <svg class="game-thumb-iso" viewBox="0 0 80 56" fill="none" aria-hidden="true">
            <polygon points="40,6 74,22 40,38 6,22" fill="${escapeHtml(game.accentColor)}" fill-opacity="0.35" stroke="${escapeHtml(game.accentColor)}" stroke-width="1.5"/>
            <polygon points="6,22 40,38 40,52 6,36" fill="${escapeHtml(game.accentColor)}" fill-opacity="0.22" stroke="${escapeHtml(game.accentColor)}" stroke-width="1.2"/>
            <polygon points="74,22 40,38 40,52 74,36" fill="${escapeHtml(game.accentColor)}" fill-opacity="0.16" stroke="${escapeHtml(game.accentColor)}" stroke-width="1.2"/>
          </svg>
          <div class="game-thumb-bottom">
            <div style="min-width:0">
              <div class="game-thumb-meta">${escapeHtml(game.mapName)} · ${escapeHtml(game.categoryLabel)}</div>
              <h3 class="game-thumb-title">${game.number}. ${escapeHtml(game.title)}</h3>
            </div>
            <div class="play-badge-btn" style="background:${escapeHtml(game.accentColor)}">▶</div>
          </div>
        </div>
        <div class="game-card-body">
          <p class="game-card-desc">${escapeHtml(game.shortDesc)}</p>
          <div class="game-card-foot">
            <span class="game-card-stats font-mono-num">
              ${plays > 0 ? `Eng yaxshi: ${bestScore} · ${plays}x` : escapeHtml(game.victoryRule)}
            </span>
            <div class="game-card-actions">
              <button
                type="button"
                class="fav-btn ${isFav ? 'active' : ''}"
                data-fav="${escapeHtml(game.id)}"
                title="${isFav ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo‘shish'}"
                aria-label="Sevimli"
              >${isFav ? '♥' : '♡'}</button>
              <button type="button" class="play-card-btn" data-play="${escapeHtml(game.id)}">
                O‘ynash
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderProfileView() {
    const world = WORLD_METADATA[profile.ageGroup];
    const worldGames = getGamesForAgeGroup(profile.ageGroup);
    const totalWins = Object.values(profile.gameStats).reduce((s, x) => s + x.wins, 0);
    const unlockedIds = new Set(profile.achievements.map((a) => a.id));
    const favoriteGames = worldGames.filter((g) => profile.favorites.includes(g.id));
    const recentGames = profile.recentlyPlayed
      .map((id) => ALL_GAMES.find((g) => g.id === id))
      .filter((g) => g && g.ageGroup === profile.ageGroup)
      .slice(0, 4);

    return `
      <section class="panel-card anim-enter">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
          <div>
            <p style="font-size:12px;color:var(--accent-amber);font-weight:700;text-transform:uppercase;letter-spacing:0.08em">
              O‘yinchi Profili
            </p>
            <h2 class="font-display" style="font-size:1.75rem;color:#fff;margin-top:4px">
              ${escapeHtml(profile.name)}
            </h2>
            <p style="font-size:13.5px;color:#94a3b8;margin-top:4px">
              Tanlangan olam: <strong style="color:${escapeHtml(world.accentColor)}">${escapeHtml(world.title)} (${escapeHtml(world.subtitle)})</strong> · Qo‘shilgan: ${escapeHtml(formatDateUz(profile.createdAt))}
            </p>
          </div>
          <button type="button" id="toggle-edit-profile-btn" class="btn-secondary">
            ${editingProfile ? 'Bekor qilish' : 'Profilni tahrirlash'}
          </button>
        </div>

        ${
          editingProfile
            ? `
          <form id="edit-profile-form" style="margin-top:22px;padding-top:22px;border-top:1px solid var(--border-subtle);display:grid;gap:16px;max-width:620px">
            <div>
              <label for="edit-name-input" class="field-label">Ismingiz</label>
              <input id="edit-name-input" type="text" maxlength="24" class="text-input" value="${escapeHtml(editName)}" />
            </div>
            <div>
              <span class="field-label">Yosh oralig‘i (O‘yin olamini almashtirish)</span>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">
                ${AGE_GROUPS.map((ag) => {
                  const w = WORLD_METADATA[ag];
                  const active = editAge === ag;
                  return `
                    <button
                      type="button"
                      class="option-tile ${active ? 'active' : ''}"
                      data-edit-age="${ag}"
                    >
                      <div style="font-weight:700;font-size:14px">${escapeHtml(w.title)}</div>
                      <div style="font-size:11.5px;color:#94a3b8;margin-top:3px">${escapeHtml(w.subtitle)}</div>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
            ${editError ? `<p class="error-msg">${escapeHtml(editError)}</p>` : ''}
            <div>
              <button type="submit" class="btn-primary">Saqlash</button>
            </div>
          </form>
        `
            : ''
        }

        <div class="stats-grid-4">
          <div class="stat-tile">
            <div class="stat-tile-label">Jami o‘yinlar</div>
            <div class="stat-tile-value">${profile.totalGamesPlayed}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Umumiy ball</div>
            <div class="stat-tile-value" style="color:var(--accent-amber)">${profile.totalScore}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">G‘alabalar</div>
            <div class="stat-tile-value" style="color:var(--accent-emerald)">${totalWins}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Sevimli o‘yinlar</div>
            <div class="stat-tile-value" style="color:var(--accent-sky)">${favoriteGames.length}</div>
          </div>
        </div>
      </section>

      <section class="panel-card">
        <div class="section-head">
          <div>
            <h3 class="section-title">Yutuqlar</h3>
            <p class="section-sub">${profile.achievements.length} / ${ACHIEVEMENT_CATALOG.length} ta yutuq ochildi</p>
          </div>
        </div>
        <div class="ach-grid">
          ${ACHIEVEMENT_CATALOG.map((ach) => {
            const isUnlocked = unlockedIds.has(ach.id);
            return `
              <div class="ach-item ${isUnlocked ? 'unlocked' : 'locked'}">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                  <strong style="font-size:14px;color:#fff">${escapeHtml(ach.title)}</strong>
                  <span style="font-size:12px;font-weight:700;color:${isUnlocked ? 'var(--accent-amber)' : 'var(--text-muted)'}">
                    ${isUnlocked ? '★ Ochildi' : 'Yopiq'}
                  </span>
                </div>
                <p style="font-size:12.5px;color:#94a3b8;margin-top:6px;line-height:1.45">
                  ${escapeHtml(ach.description)}
                </p>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <div class="two-col-grid">
        <section class="panel-card">
          <h3 class="section-title" style="margin-bottom:14px">Oxirgi o‘ynalgan o‘yinlar</h3>
          ${
            recentGames.length === 0
              ? '<p style="font-size:13px;color:#64748b">Hali birorta o‘yin o‘ynalmagan. O‘yin tanlab boshlang!</p>'
              : `<div style="display:grid;gap:10px">
                  ${recentGames
                    .map(
                      (g) => `
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:10px;background:var(--bg-canvas);border:1px solid var(--border-subtle)">
                      <div>
                        <div style="font-weight:600;font-size:13.5px;color:#fff">${escapeHtml(g.title)}</div>
                        <div style="font-size:11.5px;color:#94a3b8">${escapeHtml(g.mapName)}</div>
                      </div>
                      <button type="button" class="play-card-btn" data-play="${escapeHtml(g.id)}">O‘ynash</button>
                    </div>
                  `,
                    )
                    .join('')}
                </div>`
          }
        </section>

        <section class="panel-card">
          <h3 class="section-title" style="margin-bottom:14px">O‘yinlar statistikasi (${escapeHtml(world.title)})</h3>
          <div style="overflow-x:auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>O‘yin</th>
                  <th>O‘ynalgan</th>
                  <th>G‘alaba</th>
                  <th>Rekord</th>
                </tr>
              </thead>
              <tbody>
                ${worldGames
                  .map((g) => {
                    const st = profile.gameStats[g.id];
                    return `
                      <tr>
                        <td style="color:#f8fafc;font-weight:500">${escapeHtml(g.title)}</td>
                        <td class="font-mono-num">${st ? st.plays : 0}</td>
                        <td class="font-mono-num" style="color:var(--accent-emerald)">${st ? st.wins : 0}</td>
                        <td class="font-mono-num" style="color:var(--accent-amber)">${st ? st.bestScore : 0}</td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  function renderSettingsView() {
    const s = profile.settings;
    return `
      <section class="panel-card anim-enter" style="max-width:860px">
        <h2 class="section-title" style="font-size:1.55rem">O‘yin sozlamalari</h2>
        <p class="section-sub" style="margin-bottom:24px">
          3D grafika sifati, boshqaruv sezgirligi va tovush balandligini moslang.
        </p>

        <div style="display:grid;gap:24px">
          <div>
            <span class="field-label">3D Grafika sifati</span>
            <div class="settings-row-grid">
              ${QUALITY_OPTIONS.map(
                (opt) => `
                <button
                  type="button"
                  class="option-tile ${s.graphicsQuality === opt.id ? 'active' : ''}"
                  data-quality="${opt.id}"
                >
                  <div style="font-weight:700;font-size:13.5px">${escapeHtml(opt.label)}</div>
                </button>
              `,
              ).join('')}
            </div>
          </div>

          <div>
            <span class="field-label">Qiyinchilik darajasi</span>
            <div class="settings-row-grid">
              ${DIFFICULTY_OPTIONS.map(
                (opt) => `
                <button
                  type="button"
                  class="option-tile ${s.difficulty === opt.id ? 'active' : ''}"
                  data-difficulty="${opt.id}"
                >
                  <div style="font-weight:700;font-size:13.5px">${escapeHtml(opt.label)}</div>
                </button>
              `,
              ).join('')}
            </div>
          </div>

          <div class="two-col-grid">
            <div class="stat-tile">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <label for="sfx-range" style="font-size:13.5px;font-weight:600">Tovush effekti balandligi</label>
                <span class="font-mono-num" style="font-size:13px;color:var(--accent-amber)">${Math.round(s.sfxVolume * 100)}%</span>
              </div>
              <input id="sfx-range" type="range" min="0" max="1" step="0.05" value="${s.sfxVolume}" style="width:100%" />
              <div style="margin-top:12px">
                <button type="button" id="toggle-sound-btn" class="btn-secondary">
                  ${s.soundEnabled ? 'Tovush: Yoqilgan' : 'Tovush: O‘chirilgan'}
                </button>
              </div>
            </div>

            <div class="stat-tile">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <label for="sens-range" style="font-size:13.5px;font-weight:600">Sichqoncha sezgirligi</label>
                <span class="font-mono-num" style="font-size:13px;color:var(--accent-amber)">${s.mouseSensitivity.toFixed(1)}x</span>
              </div>
              <input id="sens-range" type="range" min="0.4" max="2.4" step="0.1" value="${s.mouseSensitivity}" style="width:100%" />
              <p style="font-size:11.5px;color:#64748b;margin-top:10px">
                FPS o‘yinlarda kamera burilish tezligini belgilaydi.
              </p>
            </div>
          </div>

          <div style="padding-top:20px;border-top:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
            <div>
              <div style="font-weight:600;color:#fff;font-size:14px">Boshlang‘ich ekranga qaytish</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:2px">
                Profil va statistikani tozalab, yosh tanlash ekranini qayta ochish.
              </div>
            </div>
            ${
              confirmReset
                ? `<div style="display:flex;gap:8px;align-items:center">
                    <span style="font-size:12.5px;color:#fb7185">Ishonchingiz komilmi?</span>
                    <button type="button" id="confirm-reset-yes" class="btn-primary" style="background:#ef4444;color:#fff">Ha, tozalash</button>
                    <button type="button" id="confirm-reset-no" class="btn-secondary">Yo‘q</button>
                  </div>`
                : `<button type="button" id="reset-profile-btn" class="btn-secondary" style="color:#fb7185;border-color:rgba(239,68,68,0.4)">
                    Profilni tozalash
                  </button>`
            }
          </div>
        </div>
      </section>
    `;
  }

  function renderCatalogView() {
    const world = WORLD_METADATA[profile.ageGroup];
    const ageGames = getGamesForAgeGroup(profile.ageGroup);
    const featuredGame = ageGames[0];

    let filtered = ageGames;
    if (activeTab === 'fps') {
      filtered = ageGames.filter((g) => g.isFps || g.defaultCamera === 'fps');
    } else if (activeTab === 'new') {
      filtered = ageGames.filter((g) => g.isNew);
    } else if (activeTab === 'popular') {
      filtered = ageGames.filter((g) => g.isPopular);
    } else if (activeTab === 'favorites') {
      filtered = ageGames.filter((g) => profile.favorites.includes(g.id));
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.shortDesc.toLowerCase().includes(q) ||
          g.mapName.toLowerCase().includes(q),
      );
    }

    const showHero = activeTab === 'home' && !q;
    const recentGames = profile.recentlyPlayed
      .map((id) => ageGames.find((g) => g.id === id))
      .filter(Boolean)
      .slice(0, 3);

    return `
      ${
        showHero
          ? `
        <section class="hero-banner anim-enter">
          <div class="hero-content">
            <div>
              <p class="hero-meta">
                Xush kelibsiz, <strong>${escapeHtml(profile.name)}</strong> · ${escapeHtml(world.title)} · ${escapeHtml(world.subtitle)}
              </p>
              <h1 class="hero-title">${escapeHtml(featuredGame.title)}</h1>
              <p class="hero-desc">${escapeHtml(world.description)} ${escapeHtml(world.safetyNote)}</p>
            </div>
            <div class="hero-actions">
              <button type="button" class="btn-primary" data-play="${escapeHtml(featuredGame.id)}">
                ▶ Hoziroq o‘ynash
              </button>
              <button type="button" class="btn-secondary" data-tab="all">
                Barcha 10 ta o‘yinni ko‘rish
              </button>
            </div>
          </div>
          <div class="hero-media">
            <img src="/src/assets/images/hero_arena_banner_1795240850833.jpg" alt="AQL ARENA 3D" />
            <div class="hero-media-scrim"></div>
          </div>
        </section>
      `
          : ''
      }

      ${
        showHero && recentGames.length > 0
          ? `
        <section>
          <div class="section-head">
            <div>
              <h2 class="section-title">Davom ettirish</h2>
              <p class="section-sub">Oxirgi o‘ynalgan 3D missiyalaringiz</p>
            </div>
          </div>
          <div class="games-grid-3">
            ${recentGames.map(renderGameCard).join('')}
          </div>
        </section>
      `
          : ''
      }

      <section>
        <div class="catalog-toolbar">
          <div class="filter-tabs" role="tablist">
            ${CATALOG_TABS.map(
              (t) => `
              <button
                type="button"
                role="tab"
                class="filter-tab ${activeTab === t.id ? 'active' : ''}"
                data-tab="${t.id}"
              >${escapeHtml(t.label)}</button>
            `,
            ).join('')}
          </div>
          <div class="search-wrap">
            <span class="search-icon" aria-hidden="true">⌕</span>
            <input
              id="catalog-search-input"
              type="search"
              class="search-input"
              placeholder="O‘yin yoki xarita qidirish..."
              value="${escapeHtml(searchQuery)}"
            />
          </div>
        </div>

        <div class="section-head" style="margin-top:20px">
          <div>
            <h2 class="section-title">
              ${escapeHtml(world.title)} — ${escapeHtml(CATALOG_TABS.find((t) => t.id === activeTab)?.label || 'O‘yinlar')}
            </h2>
            <p class="section-sub">
              Sizning yoshingizga mos ${filtered.length} ta 3D o‘yin ko‘rsatilmoqda (jami olamda 10 ta o‘yin)
            </p>
          </div>
          <button type="button" class="link-action" data-nav="profile">
            Yosh olamini almashtirish →
          </button>
        </div>

        ${
          filtered.length === 0
            ? `<div class="panel-card" style="text-align:center;padding:40px 20px">
                <p style="color:#94a3b8;font-size:14.5px;margin-bottom:14px">
                  So‘rovingiz bo‘yicha o‘yin topilmadi.
                </p>
                <button type="button" id="clear-filters-btn" class="btn-secondary">
                  Barcha o‘yinlarni ko‘rsatish
                </button>
              </div>`
            : `<div class="games-grid-4">
                ${filtered.map(renderGameCard).join('')}
              </div>`
        }
      </section>
    `;
  }

  function render() {
    const world = WORLD_METADATA[profile.ageGroup];
    const ageGames = getGamesForAgeGroup(profile.ageGroup);
    const quickGame = ageGames[0];

    const bodyHtml =
      activeTab === 'profile'
        ? renderProfileView()
        : activeTab === 'settings'
        ? renderSettingsView()
        : renderCatalogView();

    rootEl.innerHTML = `
      <div class="portal-shell">
        <header class="topbar">
          <div class="topbar-inner">
            <button type="button" class="brand-wordmark" data-nav="home">
              AQL ARENA
            </button>
            <nav class="topbar-nav" aria-label="Asosiy menyu">
              ${NAV_ITEMS.map(
                (item) => `
                <button
                  type="button"
                  class="nav-link ${activeTab === item.id ? 'active' : ''}"
                  data-nav="${item.id}"
                >${escapeHtml(item.label)}</button>
              `,
              ).join('')}
            </nav>
            <div style="display:flex;align-items:center;gap:12px;flex-shrink:0">
              <button
                type="button"
                class="nav-link"
                data-nav="profile"
                style="border-bottom:none;font-size:13px;color:#cbd5e1"
              >${escapeHtml(profile.name)} · ${escapeHtml(world.title)}</button>
              <button type="button" class="btn-primary" data-play="${escapeHtml(quickGame.id)}">
                Tezkor o‘yin
              </button>
            </div>
          </div>
          <nav class="mobile-subnav" aria-label="Mobil menyu">
            ${NAV_ITEMS.map(
              (item) => `
              <button
                type="button"
                class="${activeTab === item.id ? 'active' : ''}"
                data-nav="${item.id}"
              >${escapeHtml(item.label)}</button>
            `,
            ).join('')}
          </nav>
        </header>

        <main class="portal-main">
          ${bodyHtml}
        </main>

        <footer class="portal-footer">
          AQL ARENA · 4 ta yosh olami · 40 ta original 3D o‘yin · To‘liq O‘zbek tilida
        </footer>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    rootEl.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => {
        audioEngine.playUiClick();
        activeTab = el.getAttribute('data-nav') || 'home';
        editingProfile = false;
        confirmReset = false;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    rootEl.querySelectorAll('[data-tab]').forEach((el) => {
      el.addEventListener('click', () => {
        audioEngine.playUiClick();
        activeTab = el.getAttribute('data-tab') || 'home';
        render();
      });
    });

    rootEl.querySelectorAll('[data-play]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const gameId = el.getAttribute('data-play');
        const game = ALL_GAMES.find((g) => g.id === gameId);
        if (game) {
          audioEngine.playUiClick();
          callbacks.onPlayGame(game);
        }
      });
    });

    rootEl.querySelectorAll('[data-fav]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const gameId = el.getAttribute('data-fav');
        if (!gameId) return;
        audioEngine.playUiClick();
        const exists = profile.favorites.includes(gameId);
        const nextFavs = exists
          ? profile.favorites.filter((id) => id !== gameId)
          : [...profile.favorites, gameId];
        profile = { ...profile, favorites: nextFavs, updatedAt: Date.now() };
        callbacks.onUpdateProfile(profile);
        render();
      });
    });

    const searchInput = rootEl.querySelector('#catalog-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        const pos = e.target.selectionStart;
        searchQuery = val;
        render();
        const nextInput = rootEl.querySelector('#catalog-search-input');
        if (nextInput) {
          nextInput.focus();
          if (typeof pos === 'number') {
            nextInput.setSelectionRange(pos, pos);
          }
        }
      });
    }

    rootEl.querySelector('#clear-filters-btn')?.addEventListener('click', () => {
      activeTab = 'all';
      searchQuery = '';
      render();
    });

    // Profile handlers
    rootEl.querySelector('#toggle-edit-profile-btn')?.addEventListener('click', () => {
      audioEngine.playUiClick();
      editingProfile = !editingProfile;
      editName = profile.name;
      editAge = profile.ageGroup;
      editError = '';
      render();
    });

    rootEl.querySelectorAll('[data-edit-age]').forEach((btn) => {
      btn.addEventListener('click', () => {
        audioEngine.playUiClick();
        const nameInput = rootEl.querySelector('#edit-name-input');
        if (nameInput) editName = nameInput.value;
        editAge = btn.getAttribute('data-edit-age') || profile.ageGroup;
        render();
      });
    });

    rootEl.querySelector('#edit-profile-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = rootEl.querySelector('#edit-name-input');
      const trimmed = (nameInput?.value || editName || '').trim();
      if (trimmed.length < 2) {
        editError = 'Ism kamida 2 ta harfdan iborat bo‘lishi kerak.';
        render();
        return;
      }
      audioEngine.playCollect();
      profile = {
        ...profile,
        name: trimmed,
        ageGroup: editAge,
        updatedAt: Date.now(),
      };
      editingProfile = false;
      editError = '';
      callbacks.onUpdateProfile(profile);
      render();
    });

    // Settings handlers
    rootEl.querySelectorAll('[data-quality]').forEach((btn) => {
      btn.addEventListener('click', () => {
        audioEngine.playUiClick();
        const q = btn.getAttribute('data-quality');
        profile = {
          ...profile,
          settings: { ...DEFAULT_SETTINGS, ...profile.settings, graphicsQuality: q },
          updatedAt: Date.now(),
        };
        callbacks.onUpdateProfile(profile);
        render();
      });
    });

    rootEl.querySelectorAll('[data-difficulty]').forEach((btn) => {
      btn.addEventListener('click', () => {
        audioEngine.playUiClick();
        const d = btn.getAttribute('data-difficulty');
        profile = {
          ...profile,
          settings: { ...DEFAULT_SETTINGS, ...profile.settings, difficulty: d },
          updatedAt: Date.now(),
        };
        callbacks.onUpdateProfile(profile);
        render();
      });
    });

    rootEl.querySelector('#toggle-sound-btn')?.addEventListener('click', () => {
      const nextEnabled = !profile.settings.soundEnabled;
      profile = {
        ...profile,
        settings: { ...profile.settings, soundEnabled: nextEnabled },
        updatedAt: Date.now(),
      };
      audioEngine.configure(nextEnabled, profile.settings.sfxVolume);
      if (nextEnabled) audioEngine.playUiClick();
      callbacks.onUpdateProfile(profile);
      render();
    });

    rootEl.querySelector('#sfx-range')?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      profile = {
        ...profile,
        settings: { ...profile.settings, sfxVolume: val },
        updatedAt: Date.now(),
      };
      audioEngine.configure(profile.settings.soundEnabled, val);
      callbacks.onUpdateProfile(profile);
      const label = e.target.parentElement?.querySelector('span');
      if (label) label.textContent = `${Math.round(val * 100)}%`;
    });

    rootEl.querySelector('#sens-range')?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      profile = {
        ...profile,
        settings: { ...profile.settings, mouseSensitivity: val },
        updatedAt: Date.now(),
      };
      callbacks.onUpdateProfile(profile);
      const label = e.target.parentElement?.querySelector('span');
      if (label) label.textContent = `${val.toFixed(1)}x`;
    });

    rootEl.querySelector('#reset-profile-btn')?.addEventListener('click', () => {
      audioEngine.playUiClick();
      confirmReset = true;
      render();
    });

    rootEl.querySelector('#confirm-reset-no')?.addEventListener('click', () => {
      confirmReset = false;
      render();
    });

    rootEl.querySelector('#confirm-reset-yes')?.addEventListener('click', () => {
      audioEngine.playUiClick();
      callbacks.onResetProfile();
    });
  }

  render();

  return {
    updateProfile(nextProfile) {
      profile = nextProfile;
      render();
    },
    destroy() {
      rootEl.innerHTML = '';
    },
  };
}
