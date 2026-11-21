import { WeaponId } from '../types/game';

export interface WeaponSpec {
  id: WeaponId;
  nameUz: string;
  damage: number;
  fireInterval: number; // seconds between shots
  magSize: number;
  reserveAmmo: number;
  reloadTime: number; // seconds
  recoilKick: number;
  spread: number;
  autoFire: boolean;
  range: number;
  scopeZoom: number; // 1 = no zoom, > 1 = ADS/scope FOV zoom
  beamColor: string;
  muzzleColor: string;
}

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  wand: {
    id: 'wand',
    nameUz: 'Sehrli Nur Tayoqchasi',
    damage: 100,
    fireInterval: 0.28,
    magSize: 99,
    reserveAmmo: 999,
    reloadTime: 0.7,
    recoilKick: 0.015,
    spread: 0.0,
    autoFire: false,
    range: 90,
    scopeZoom: 1,
    beamColor: '#38bdf8',
    muzzleColor: '#fde047',
  },
  blaster: {
    id: 'blaster',
    nameUz: 'Kosmik Lazer Blaster',
    damage: 40,
    fireInterval: 0.2,
    magSize: 24,
    reserveAmmo: 144,
    reloadTime: 1.1,
    recoilKick: 0.025,
    spread: 0.008,
    autoFire: true,
    range: 110,
    scopeZoom: 1.2,
    beamColor: '#22d3ee',
    muzzleColor: '#38bdf8',
  },
  rifle: {
    id: 'rifle',
    nameUz: 'AR-47 Taktik Avtomat',
    damage: 34,
    fireInterval: 0.115,
    magSize: 30,
    reserveAmmo: 150,
    reloadTime: 1.55,
    recoilKick: 0.055,
    spread: 0.014,
    autoFire: true,
    range: 140,
    scopeZoom: 1.35,
    beamColor: '#fbbf24',
    muzzleColor: '#f59e0b',
  },
  smg: {
    id: 'smg',
    nameUz: 'VX-9 Tezkor Pulemyot',
    damage: 24,
    fireInterval: 0.075,
    magSize: 36,
    reserveAmmo: 180,
    reloadTime: 1.25,
    recoilKick: 0.036,
    spread: 0.022,
    autoFire: true,
    range: 95,
    scopeZoom: 1.2,
    beamColor: '#fde047',
    muzzleColor: '#fb923c',
  },
  sniper: {
    id: 'sniper',
    nameUz: 'M-90 Mergan Miltig‘i',
    damage: 115,
    fireInterval: 0.95,
    magSize: 6,
    reserveAmmo: 30,
    reloadTime: 2.0,
    recoilKick: 0.14,
    spread: 0.001,
    autoFire: false,
    range: 220,
    scopeZoom: 3.4,
    beamColor: '#f8fafc',
    muzzleColor: '#fbbf24',
  },
  pistol: {
    id: 'pistol',
    nameUz: 'P-12 Taktik To‘pponcha',
    damage: 32,
    fireInterval: 0.22,
    magSize: 14,
    reserveAmmo: 70,
    reloadTime: 1.05,
    recoilKick: 0.04,
    spread: 0.009,
    autoFire: false,
    range: 90,
    scopeZoom: 1.15,
    beamColor: '#fcd34d',
    muzzleColor: '#f59e0b',
  },
};
