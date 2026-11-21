import React, { useState } from 'react';
import { AgeGroup, AppSettings, GameDefinition, PlayerProfile } from './types/game';
import {
  createInitialProfile,
  loadProfileSync,
  recordGameOutcome,
  saveProfileSync,
  storageAdapter,
} from './services/storageService';
import { OnboardingView } from './components/OnboardingView';
import { PortalView } from './components/PortalView';
import { GameViewport } from './components/GameViewport';
import { audioEngine } from './engine/AudioEngine';

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile | null>(() =>
    loadProfileSync(),
  );
  const [activeGame, setActiveGame] = useState<GameDefinition | null>(null);

  const handleCompleteOnboarding = (name: string, ageGroup: AgeGroup) => {
    const next = createInitialProfile(name, ageGroup);
    saveProfileSync(next);
    setProfile(next);
  };

  const handleUpdateProfile = (name: string, ageGroup: AgeGroup) => {
    if (!profile) return;
    const next: PlayerProfile = {
      ...profile,
      name,
      ageGroup,
      updatedAt: Date.now(),
    };
    saveProfileSync(next);
    setProfile(next);
  };

  const handleUpdateSettings = (settings: AppSettings) => {
    if (!profile) return;
    audioEngine.configure(settings.soundEnabled, settings.sfxVolume);
    const next: PlayerProfile = {
      ...profile,
      settings,
      updatedAt: Date.now(),
    };
    saveProfileSync(next);
    setProfile(next);
  };

  const handleToggleFavorite = (gameId: string) => {
    if (!profile) return;
    audioEngine.playUiClick();
    const exists = profile.favorites.includes(gameId);
    const favorites = exists
      ? profile.favorites.filter((id) => id !== gameId)
      : [...profile.favorites, gameId];
    const next: PlayerProfile = {
      ...profile,
      favorites,
      updatedAt: Date.now(),
    };
    saveProfileSync(next);
    setProfile(next);
  };

  const handleLaunchGame = (game: GameDefinition) => {
    audioEngine.playUiClick();
    setActiveGame(game);
  };

  const handleGameComplete = (won: boolean, score: number) => {
    if (!profile || !activeGame) return;
    const updated = recordGameOutcome(profile, activeGame.id, score, won);
    setProfile(updated);
  };

  const handleResetProfile = () => {
    storageAdapter.clearProfile();
    setActiveGame(null);
    setProfile(null);
  };

  if (!profile) {
    return <OnboardingView onComplete={handleCompleteOnboarding} />;
  }

  return (
    <>
      <PortalView
        profile={profile}
        onLaunchGame={handleLaunchGame}
        onToggleFavorite={handleToggleFavorite}
        onUpdateProfile={handleUpdateProfile}
        onUpdateSettings={handleUpdateSettings}
        onResetProfile={handleResetProfile}
      />

      {activeGame && (
        <GameViewport
          game={activeGame}
          settings={profile.settings}
          onExit={() => setActiveGame(null)}
          onCompleteSession={handleGameComplete}
        />
      )}
    </>
  );
}
