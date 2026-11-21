export type AgeGroup = '3-5' | '6-9' | '10-15' | '16-20';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type CameraPerspective = 'fps' | 'tps';

export type WeaponId = 'wand' | 'blaster' | 'rifle' | 'smg' | 'sniper' | 'pistol';

export type GameplayMechanic =
  | 'target-pop'       // Shoot floating targets / fruits / space rings
  | 'helper-bots'      // Activate & assist friendly robots
  | 'color-match'      // Hit targets matching the requested color
  | 'star-hunt'        // Collect floating stars & boost rings
  | 'maze-checkpoint'  // Navigate maze & activate checkpoints
  | 'station-shield'   // Defend base from harmless meteor/drone toys
  | 'team-skirmish'    // Team vs AI bots with waves & score goal
  | 'bomb-mission'     // Plant or defuse tactical charge at A/B sites
  | 'hostage-rescue'   // Rescue VIP bots & escort to extraction zone
  | 'sniper-overwatch' // Long-range precision scope eliminations
  | 'capture-flag'     // Capture enemy flag & return to base
  | 'survival-waves'   // Survive escalating waves of tactical bots
  | 'tactical-round';  // Multi-round tactical CS-style elimination

export interface MapPalette {
  skyTop: string;
  skyBottom: string;
  fogColor: string;
  groundColor: string;
  groundAccent: string;
  wallColor: string;
  trimColor: string;
  accentColor: string;
  keyLightColor: string;
  hemiSkyColor: string;
  hemiGroundColor: string;
}

export interface MapFeatures {
  isOutdoor: boolean;
  hasDoors?: boolean;
  hasMovingPlatforms?: boolean;
  hasPhysicsCrates?: boolean;
  hasBombSites?: boolean;
  hasHostages?: boolean;
  hasFlags?: boolean;
  hasMaze?: boolean;
  hasCatwalks?: boolean;
  hasWeatherSnow?: boolean;
  hasWaterPlane?: boolean;
}

export interface GameDefinition {
  id: string;
  number: number;
  title: string;
  ageGroup: AgeGroup;
  categoryLabel: string;
  isFps: boolean;
  isNew?: boolean;
  isPopular?: boolean;
  shortDesc: string;
  missionDesc: string;
  victoryRule: string;
  mechanic: GameplayMechanic;
  weapons: WeaponId[];
  defaultCamera: CameraPerspective;
  allowCameraToggle: boolean;
  durationSeconds: number;
  targetGoal: number;
  enemyCount: number;
  allyCount: number;
  roundsTotal: number;
  mapSeed: number;
  mapName: string;
  mapPalette: MapPalette;
  mapFeatures: MapFeatures;
  accentColor: string;
  nonViolent: boolean;
}

export interface GameStatsRecord {
  gameId: string;
  plays: number;
  wins: number;
  bestScore: number;
  lastScore: number;
  lastPlayedAt: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt?: number;
}

export interface AppSettings {
  graphicsQuality: GraphicsQuality;
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  mouseSensitivity: number;
  difficulty: DifficultyLevel;
  showFps: boolean;
}

export interface PlayerProfile {
  id: string;
  name: string;
  ageGroup: AgeGroup;
  createdAt: number;
  updatedAt: number;
  totalGamesPlayed: number;
  totalScore: number;
  favorites: string[];
  recentlyPlayed: string[];
  gameStats: Record<string, GameStatsRecord>;
  achievements: Achievement[];
  settings: AppSettings;
}

export type PortalSection =
  | 'home'
  | 'all'
  | 'fps'
  | 'new'
  | 'popular'
  | 'favorites'
  | 'profile'
  | 'settings';

export interface HudSnapshot {
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  ammo: number;
  maxAmmo: number;
  reserveAmmo: number;
  reloading: boolean;
  reloadProgress: number;
  weaponId: WeaponId;
  weaponName: string;
  score: number;
  kills: number;
  deaths: number;
  goalProgress: number;
  goalTarget: number;
  timeRemaining: number;
  round: number;
  roundsTotal: number;
  allyAlive: number;
  enemyAlive: number;
  missionText: string;
  targetColorHint?: string;
  isScoped: boolean;
  cameraMode: CameraPerspective;
  isPaused: boolean;
  isPointerLocked: boolean;
  bombState: 'none' | 'carried' | 'planted' | 'defused' | 'exploded';
  bombTimer: number;
  interactPrompt: string | null;
  hitMarkerAt: number;
  damageFlashAt: number;
  killFeed: Array<{ id: number; text: string; color: string }>;
  playerPos: { x: number; z: number; yaw: number };
  entitiesMinimap: Array<{
    x: number;
    z: number;
    kind: 'enemy' | 'ally' | 'target' | 'objective';
  }>;
  status: 'playing' | 'won' | 'lost';
  endReason: string;
}
