import React, { useState } from 'react';
import { Award, Check, Edit3, Heart, History, Trophy } from 'lucide-react';
import { AgeGroup, GameDefinition, PlayerProfile } from '../types/game';
import { ACHIEVEMENT_CATALOG } from '../services/storageService';
import { ALL_GAMES, WORLD_METADATA } from '../games/catalog';

interface ProfileViewProps {
  profile: PlayerProfile;
  onUpdateProfile: (name: string, ageGroup: AgeGroup) => void;
  onPlayGame: (game: GameDefinition) => void;
}

const AGE_GROUPS: AgeGroup[] = ['3-5', '6-9', '10-15', '16-20'];

export function ProfileView({
  profile,
  onUpdateProfile,
  onPlayGame,
}: ProfileViewProps) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [ageInput, setAgeInput] = useState<AgeGroup>(profile.ageGroup);

  const statsList = Object.values(profile.gameStats).sort(
    (a, b) => b.bestScore - a.bestScore,
  );
  const totalWins = statsList.reduce((acc, s) => acc + s.wins, 0);
  const bestSingleScore = statsList.length > 0 ? statsList[0].bestScore : 0;

  const favoriteGames = ALL_GAMES.filter((g) => profile.favorites.includes(g.id));
  const recentGames = profile.recentlyPlayed
    .map((id) => ALL_GAMES.find((g) => g.id === id))
    .filter((g): g is GameDefinition => Boolean(g));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) return;
    onUpdateProfile(trimmed, ageInput);
    setEditing(false);
  };

  return (
    <div className="space-y-8">
      {/* Header & Edit Profile */}
      <section className="bg-[#131823] border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400">
              Shaxsiy o‘yinchi profili · {WORLD_METADATA[profile.ageGroup].title}
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mt-1">
              {profile.name}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {WORLD_METADATA[profile.ageGroup].subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white transition-colors self-start cursor-pointer"
          >
            <Edit3 className="w-4 h-4" /> Profilni tahrirlash
          </button>
        </div>

        {editing && (
          <form
            onSubmit={handleSave}
            className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                O‘yinchi ismi
              </label>
              <input
                type="text"
                maxLength={24}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Yosh oralig‘i
              </label>
              <select
                value={ageInput}
                onChange={(e) => setAgeInput(e.target.value as AgeGroup)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E14] border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
              >
                {AGE_GROUPS.map((ag) => (
                  <option key={ag} value={ag}>
                    {WORLD_METADATA[ag].title} — {WORLD_METADATA[ag].subtitle}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Saqlash
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm cursor-pointer"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        )}

        {/* 4-column summary metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="p-4 rounded-xl bg-[#0B0E14] border border-slate-800/80">
            <div className="text-xs text-slate-400">Jami o‘ynalgan</div>
            <div className="text-2xl font-mono-num font-bold text-white mt-1">
              {profile.totalGamesPlayed}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0B0E14] border border-slate-800/80">
            <div className="text-xs text-slate-400">Umumiy ball</div>
            <div className="text-2xl font-mono-num font-bold text-amber-400 mt-1">
              {profile.totalScore}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0B0E14] border border-slate-800/80">
            <div className="text-xs text-slate-400">Eng yaxshi natija</div>
            <div className="text-2xl font-mono-num font-bold text-emerald-400 mt-1">
              {bestSingleScore}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0B0E14] border border-slate-800/80">
            <div className="text-xs text-slate-400">G‘alabalar</div>
            <div className="text-2xl font-mono-num font-bold text-sky-400 mt-1">
              {totalWins}
            </div>
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="bg-[#131823] border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" /> Yutuqlar
          </h3>
          <span className="text-xs font-mono-num text-slate-400">
            {profile.achievements.length} / {ACHIEVEMENT_CATALOG.length} ochilgan
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACHIEVEMENT_CATALOG.map((ach) => {
            const unlocked = profile.achievements.find((a) => a.id === ach.id);
            return (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border ${
                  unlocked
                    ? 'bg-amber-500/8 border-amber-500/40'
                    : 'bg-[#0B0E14] border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">
                    {ach.title}
                  </div>
                  <Trophy
                    className={`w-4 h-4 shrink-0 ${
                      unlocked ? 'text-amber-400' : 'text-slate-600'
                    }`}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">{ach.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Favorites & Recently Played */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-[#131823] border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-display font-bold text-white flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-rose-400" /> Sevimli o‘yinlar
          </h3>
          {favoriteGames.length === 0 ? (
            <p className="text-sm text-slate-400">
              Hali sevimli o‘yinlar qo‘shilmagan. O‘yin kartasidagi yurak belgisini bosing.
            </p>
          ) : (
            <div className="space-y-2.5">
              {favoriteGames.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0B0E14] border border-slate-800"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {g.title}
                    </div>
                    <div className="text-xs text-slate-400">
                      {g.mapName} · {g.ageGroup} yosh
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPlayGame(g)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold cursor-pointer"
                  >
                    O‘ynash
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-[#131823] border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-display font-bold text-white flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-sky-400" /> Yaqinda o‘ynalganlar
          </h3>
          {recentGames.length === 0 ? (
            <p className="text-sm text-slate-400">
              Hali o‘yin sessiyalari mavjud emas. Istalgan 3D o‘yinni ishga tushiring!
            </p>
          ) : (
            <div className="space-y-2.5">
              {recentGames.map((g) => {
                const st = profile.gameStats[g.id];
                return (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#0B0E14] border border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {g.title}
                      </div>
                      <div className="text-xs text-slate-400 font-mono-num">
                        Eng yaxshi: {st?.bestScore ?? 0} · O‘ynalgan: {st?.plays ?? 0}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPlayGame(g)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      Qayta
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Detailed Statistics Table */}
      {statsList.length > 0 && (
        <section className="bg-[#131823] border border-slate-800 rounded-2xl p-6 overflow-x-auto">
          <h3 className="text-lg font-display font-bold text-white mb-4">
            O‘yin statistikasi
          </h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400">
                <th className="pb-3 font-medium">O‘yin</th>
                <th className="pb-3 font-medium">O‘ynalgan</th>
                <th className="pb-3 font-medium">G‘alabalar</th>
                <th className="pb-3 font-medium">Eng yaxshi ball</th>
                <th className="pb-3 font-medium">Oxirgi ball</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {statsList.map((st) => {
                const game = ALL_GAMES.find((g) => g.id === st.gameId);
                return (
                  <tr key={st.gameId}>
                    <td className="py-3 font-medium text-white">
                      {game?.title || st.gameId}
                    </td>
                    <td className="py-3 font-mono-num text-slate-300">{st.plays}</td>
                    <td className="py-3 font-mono-num text-emerald-400">{st.wins}</td>
                    <td className="py-3 font-mono-num text-amber-400">{st.bestScore}</td>
                    <td className="py-3 font-mono-num text-slate-300">{st.lastScore}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
