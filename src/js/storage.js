const STORAGE_KEY = 'aql_arena_profile_v1';

export const DEFAULT_SETTINGS = {
  graphicsQuality: 'medium',
  soundEnabled: true,
  musicVolume: 0.4,
  sfxVolume: 0.75,
  mouseSensitivity: 1.0,
  difficulty: 'medium',
  showFps: false,
};

export const ACHIEVEMENT_CATALOG = [
  {
    id: 'first_step',
    title: 'Birinchi qadam',
    description: 'AQL ARENA olamida birinchi o‘yiningizni yakunlang.',
  },
  {
    id: 'first_victory',
    title: 'Ilk g‘alaba',
    description: 'Istalgan 3D o‘yinda g‘alaba qozoning.',
  },
  {
    id: 'sharpshooter',
    title: 'Mergan o‘yinchi',
    description: 'Bitta o‘yinda 500 dan ortiq ball to‘plang.',
  },
  {
    id: 'explorer_5',
    title: 'Arena tadqiqotchisi',
    description: 'Kamida 5 ta turli xil o‘yinni sinab ko‘ring.',
  },
  {
    id: 'veteran_15',
    title: 'Tajribali jangchi',
    description: 'Jami 15 ta o‘yin sessiyasini yakunlang.',
  },
  {
    id: 'legend_2500',
    title: 'AQL ARENA chempioni',
    description: 'Umumiy hisobda 2500 ballga yeting.',
  },
];

/**
 * Firebase-ready StorageAdapter abstraction (currently backed by localStorage).
 */
export const storageAdapter = {
  async loadProfile() {
    return loadProfileSync();
  },
  async saveProfile(profile) {
    saveProfileSync(profile);
  },
  async clearProfile() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};

export function loadProfileSync() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.name || !parsed.ageGroup) return null;
    return {
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      recentlyPlayed: Array.isArray(parsed.recentlyPlayed) ? parsed.recentlyPlayed : [],
      gameStats: parsed.gameStats || {},
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
    };
  } catch {
    return null;
  }
}

export function saveProfileSync(profile) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function createInitialProfile(name, ageGroup) {
  const now = Date.now();
  return {
    id: `player_${now.toString(36)}`,
    name: name.trim(),
    ageGroup,
    createdAt: now,
    updatedAt: now,
    totalGamesPlayed: 0,
    totalScore: 0,
    favorites: [],
    recentlyPlayed: [],
    gameStats: {},
    achievements: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function recordGameOutcome(profile, gameId, score, won) {
  const now = Date.now();
  const prevStat = profile.gameStats[gameId] || {
    gameId,
    plays: 0,
    wins: 0,
    bestScore: 0,
    lastScore: 0,
    lastPlayedAt: now,
  };

  const updatedStat = {
    gameId,
    plays: prevStat.plays + 1,
    wins: prevStat.wins + (won ? 1 : 0),
    bestScore: Math.max(prevStat.bestScore, score),
    lastScore: score,
    lastPlayedAt: now,
  };

  const nextRecent = [
    gameId,
    ...profile.recentlyPlayed.filter((id) => id !== gameId),
  ].slice(0, 10);

  const nextStats = {
    ...profile.gameStats,
    [gameId]: updatedStat,
  };

  const nextTotalPlays = profile.totalGamesPlayed + 1;
  const nextTotalScore = profile.totalScore + Math.max(0, score);
  const uniqueGamesCount = Object.keys(nextStats).length;

  const unlockedIds = new Set(profile.achievements.map((a) => a.id));
  const nextAchievements = [...profile.achievements];

  const tryUnlock = (id, condition) => {
    if (condition && !unlockedIds.has(id)) {
      const def = ACHIEVEMENT_CATALOG.find((a) => a.id === id);
      if (def) {
        unlockedIds.add(id);
        nextAchievements.push({ ...def, unlockedAt: now });
      }
    }
  };

  tryUnlock('first_step', nextTotalPlays >= 1);
  tryUnlock('first_victory', won);
  tryUnlock('sharpshooter', score >= 500);
  tryUnlock('explorer_5', uniqueGamesCount >= 5);
  tryUnlock('veteran_15', nextTotalPlays >= 15);
  tryUnlock('legend_2500', nextTotalScore >= 2500);

  const updated = {
    ...profile,
    updatedAt: now,
    totalGamesPlayed: nextTotalPlays,
    totalScore: nextTotalScore,
    recentlyPlayed: nextRecent,
    gameStats: nextStats,
    achievements: nextAchievements,
  };

  saveProfileSync(updated);
  return updated;
}
