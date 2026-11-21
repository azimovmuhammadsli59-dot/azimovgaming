import React, { useMemo, useState } from 'react';
import {
  Flame,
  Gamepad2,
  Heart,
  Play,
  Search,
  Sparkles,
  User,
} from 'lucide-react';
import {
  AgeGroup,
  AppSettings,
  GameDefinition,
  PlayerProfile,
  PortalSection,
} from '../types/game';
import { getGamesForAgeGroup, WORLD_METADATA } from '../games/catalog';
import { GameCard } from './GameCard';
import { ProfileView } from './ProfileView';
import { SettingsView } from './SettingsView';
import { audioEngine } from '../engine/AudioEngine';

interface PortalViewProps {
  profile: PlayerProfile;
  onLaunchGame: (game: GameDefinition) => void;
  onToggleFavorite: (gameId: string) => void;
  onUpdateProfile: (name: string, ageGroup: AgeGroup) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  onResetProfile: () => void;
}

const HERO_IMAGE = '/src/assets/images/hero_arena_banner_1795240850833.jpg';

export function PortalView({
  profile,
  onLaunchGame,
  onToggleFavorite,
  onUpdateProfile,
  onUpdateSettings,
  onResetProfile,
}: PortalViewProps) {
  const [section, setSection] = useState<PortalSection>('home');
  const [searchQuery, setSearchQuery] = useState('');

  const world = WORLD_METADATA[profile.ageGroup];
  const ageGames = useMemo(
    () => getGamesForAgeGroup(profile.ageGroup),
    [profile.ageGroup],
  );

  const featuredGame = useMemo(
    () => ageGames.find((g) => g.isPopular) || ageGames[0],
    [ageGames],
  );

  const popularGames = useMemo(
    () => ageGames.filter((g) => g.isPopular),
    [ageGames],
  );

  const newGames = useMemo(
    () => ageGames.filter((g) => g.isNew),
    [ageGames],
  );

  const fpsGames = useMemo(
    () => ageGames.filter((g) => g.isFps || g.defaultCamera === 'fps'),
    [ageGames],
  );

  const favoriteGames = useMemo(
    () => ageGames.filter((g) => profile.favorites.includes(g.id)),
    [ageGames, profile.favorites],
  );

  const filteredGames = useMemo(() => {
    let base = ageGames;
    if (section === 'fps') base = fpsGames;
    else if (section === 'new') base = newGames.length > 0 ? newGames : ageGames.slice(0, 4);
    else if (section === 'popular') base = popularGames.length > 0 ? popularGames : ageGames.slice(0, 4);
    else if (section === 'favorites') base = favoriteGames;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.mapName.toLowerCase().includes(q) ||
        g.shortDesc.toLowerCase().includes(q),
    );
  }, [ageGames, fpsGames, newGames, popularGames, favoriteGames, section, searchQuery]);

  const navigateTo = (next: PortalSection) => {
    audioEngine.playUiClick();
    setSection(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isCatalogView =
    section === 'home' ||
    section === 'all' ||
    section === 'fps' ||
    section === 'new' ||
    section === 'popular' ||
    section === 'favorites';

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-[#0B0E14]/95 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="text-xl font-display font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            AQL ARENA
          </button>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {(
              [
                { id: 'home', label: 'Bosh sahifa' },
                { id: 'all', label: 'Barcha o‘yinlar' },
                { id: 'fps', label: 'FPS o‘yinlar' },
                { id: 'profile', label: 'Profilim' },
                { id: 'settings', label: 'Sozlamalar' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  section === item.id
                    ? 'text-white border-amber-400'
                    : 'text-slate-400 border-transparent hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (featuredGame) onLaunchGame(featuredGame);
              }}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Tezkor o‘yin
            </button>
          </div>
        </div>

        {/* Mobile/Tablet Secondary Navigation Row */}
        <div className="lg:hidden border-t border-slate-800/70 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium">
          {(
            [
              { id: 'home', label: 'Bosh sahifa' },
              { id: 'all', label: 'Barcha o‘yinlar' },
              { id: 'fps', label: 'FPS o‘yinlar' },
              { id: 'new', label: 'Yangi' },
              { id: 'popular', label: 'Mashhur' },
              { id: 'favorites', label: 'Sevimli' },
              { id: 'profile', label: 'Profilim' },
              { id: 'settings', label: 'Sozlamalar' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.id)}
              className={`whitespace-nowrap shrink-0 py-1 ${
                section === item.id ? 'text-amber-400 font-semibold' : 'text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Hero Banner on Homepage */}
        {section === 'home' && featuredGame && (
          <section className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#131823]">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between gap-6 z-10">
                <div>
                  <div className="text-xs text-slate-400">
                    Xush kelibsiz, <span className="text-amber-400 font-semibold">{profile.name}</span> · {world.title} · {world.subtitle}
                  </div>
                  <h1
                    className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white mt-3 leading-tight"
                    style={{ textWrap: 'balance' }}
                  >
                    {featuredGame.title}
                  </h1>
                  <p className="text-sm sm:text-base text-slate-300 mt-3 max-w-xl leading-relaxed">
                    {featuredGame.missionDesc}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onLaunchGame(featuredGame)}
                    className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" /> Hoziroq o‘ynash
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('profile')}
                    className="px-5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4" /> Profilim ({profile.totalScore} ball)
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-[320px]">
                <img
                  src={HERO_IMAGE}
                  alt={featuredGame.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover lg:h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#131823] via-[#131823]/40 to-transparent lg:block hidden" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#131823] via-transparent to-transparent lg:hidden" />
              </div>
            </div>
          </section>
        )}

        {/* Search & Catalog Filter Bar */}
        {isCatalogView && (
          <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5 p-1 bg-[#131823] border border-slate-800 rounded-xl overflow-x-auto">
              {(
                [
                  { id: 'home', label: 'Bosh sahifa', icon: Gamepad2 },
                  { id: 'all', label: 'Barcha o‘yinlar', icon: Gamepad2 },
                  { id: 'fps', label: 'FPS o‘yinlar', icon: Play },
                  { id: 'new', label: 'Yangi o‘yinlar', icon: Sparkles },
                  { id: 'popular', label: 'Mashhur o‘yinlar', icon: Flame },
                  { id: 'favorites', label: 'Sevimli o‘yinlar', icon: Heart },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => navigateTo(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    section === tab.id
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="O‘yin yoki xarita qidirish..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#131823] border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </section>
        )}

        {/* HOMEPAGE CURATED SECTIONS (Strictly age-appropriate!) */}
        {section === 'home' && !searchQuery.trim() && (
          <div className="space-y-10">
            {/* Popular Games */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
                    Mashhur o‘yinlar
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {world.title} uchun eng ko‘p o‘ynaladigan 3D arenalar
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('popular')}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  Barchasini ko‘rish
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {popularGames.slice(0, 3).map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    isFavorite={profile.favorites.includes(g.id)}
                    stats={profile.gameStats[g.id]}
                    onPlay={onLaunchGame}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            </section>

            {/* All 10 Age-Appropriate Games */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
                    {world.title} olamidagi barcha o‘yinlar ({ageGames.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {world.safetyNote}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('profile')}
                  className="text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Yosh olamini almashtirish
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {ageGames.map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    isFavorite={profile.favorites.includes(g.id)}
                    stats={profile.gameStats[g.id]}
                    onPlay={onLaunchGame}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* FILTERED / SEARCH CATALOG VIEW */}
        {isCatalogView && (section !== 'home' || searchQuery.trim() !== '') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-white">
                {searchQuery.trim()
                  ? `Qidiruv natijalari (${filteredGames.length})`
                  : section === 'all'
                  ? `Barcha o‘yinlar — ${world.title}`
                  : section === 'fps'
                  ? `FPS o‘yinlar — ${world.title}`
                  : section === 'new'
                  ? `Yangi o‘yinlar — ${world.title}`
                  : section === 'popular'
                  ? `Mashhur o‘yinlar — ${world.title}`
                  : 'Sevimli o‘yinlar'}
              </h2>
              <span className="text-xs text-slate-400 font-mono-num">
                {filteredGames.length} ta o‘yin
              </span>
            </div>

            {filteredGames.length === 0 ? (
              <div className="rounded-2xl bg-[#131823] border border-slate-800 p-10 text-center">
                <p className="text-sm text-slate-300">
                  {section === 'favorites'
                    ? 'Hali sevimli o‘yinlar ro‘yxati bo‘sh. Yoqqan o‘yin kartasidagi yurak belgisini bosing.'
                    : 'Tanlangan filtr bo‘yicha o‘yin topilmadi.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredGames.map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    isFavorite={profile.favorites.includes(g.id)}
                    stats={profile.gameStats[g.id]}
                    onPlay={onLaunchGame}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* PROFILE VIEW */}
        {section === 'profile' && (
          <ProfileView
            profile={profile}
            onUpdateProfile={onUpdateProfile}
            onPlayGame={onLaunchGame}
          />
        )}

        {/* SETTINGS VIEW */}
        {section === 'settings' && (
          <SettingsView
            settings={profile.settings}
            onUpdateSettings={onUpdateSettings}
            onResetProfile={onResetProfile}
          />
        )}
      </main>

      <footer className="border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-500">
        AQL ARENA · 4 ta yosh olami · 40 ta 3D o‘yin · Ma’lumotlar brauzerda saqlanadi
      </footer>
    </div>
  );
}
