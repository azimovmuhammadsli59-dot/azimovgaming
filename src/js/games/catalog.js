import { GAMES_WORLD_3_5 } from './world3_5.js';
import { GAMES_WORLD_6_9 } from './world6_9.js';
import { GAMES_WORLD_10_15 } from './world10_15.js';
import { GAMES_WORLD_16_20 } from './world16_20.js';

export const WORLD_METADATA = {
  '3-5': {
    ageGroup: '3-5',
    title: '3–5 yosh',
    subtitle: 'Rangli va xavfsiz sarguzashtlar',
    description:
      'Quvnoq robotlar, sehrli nurlar, mevalar va yulduzlar olami. Zo‘ravonliksiz, katta boshqaruv tugmalari bilan.',
    badgeText: '100% Xavfsiz · Multfilm 3D',
    accentColor: '#38bdf8',
    coverImage: '/src/assets/images/world_3_5_adventure_1795240850473.jpg',
    safetyNote: 'Hech qanday qurol yoki zarar yo‘q — faqat quvnoq nishonlar!',
  },
  '6-9': {
    ageGroup: '6-9',
    title: '6–9 yosh',
    subtitle: 'Robot jamoaviy missiyalar',
    description:
      'Kosmik lazer blasterlar, ittifoqchi robotlar va 1-shaxs yoki 3-shaxs kamera tanlovi.',
    badgeText: 'Jamoaviy · Kosmik Blaster',
    accentColor: '#10b981',
    coverImage: '/src/assets/images/world_6_9_robots_1795240850533.jpg',
    safetyNote: 'Multfilm robotlar bilan xavfsiz jamoaviy musobaqalar.',
  },
  '10-15': {
    ageGroup: '10-15',
    title: '10–15 yosh',
    subtitle: 'Taktik FPS Arena',
    description:
      'Bomba zararsizlantirish, garovdagilarni qutqarish, merganlik va jamoaviy taktik missiyalar.',
    badgeText: 'Taktik FPS · 10 Xarita',
    accentColor: '#f59e0b',
    coverImage: '/src/assets/images/world_10_15_tactical_1795240850738.jpg',
    safetyNote: 'Qonsiz va zo‘ravonliksiz taktik simulyatsiya.',
  },
  '16-20': {
    ageGroup: '16-20',
    title: '16–20 yosh',
    subtitle: 'Professional Taktik FPS',
    description:
      'Realistik yoritish, qurol tepishi, sprint, o‘tirish, raund tizimi va elit taktik xaritalar.',
    badgeText: 'Pro FPS · Raqobatbardosh',
    accentColor: '#ef4444',
    coverImage: '/src/assets/images/world_16_20_pro_1795240851075.jpg',
    safetyNote: 'Original xaritalar va to‘liq taktik mexanikalar.',
  },
};

export const ALL_GAMES = [
  ...GAMES_WORLD_3_5,
  ...GAMES_WORLD_6_9,
  ...GAMES_WORLD_10_15,
  ...GAMES_WORLD_16_20,
];

export function getGamesForAgeGroup(ageGroup) {
  return ALL_GAMES.filter((g) => g.ageGroup === ageGroup);
}

export function getGameById(id) {
  return ALL_GAMES.find((g) => g.id === id);
}
