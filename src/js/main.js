import {
  createInitialProfile,
  loadProfileSync,
  recordGameOutcome,
  saveProfileSync,
  storageAdapter,
} from './storage.js';
import { audioEngine } from './audio.js';
import { mountOnboarding } from './ui/onboarding.js';
import { mountPortal } from './ui/portal.js';
import { mountGameViewport } from './ui/gameViewport.js';

function bootstrapApp() {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;

  let profile = loadProfileSync();
  let cleanupCurrentView = null;
  let portalApi = null;

  if (profile) {
    audioEngine.configure(profile.settings.soundEnabled, profile.settings.sfxVolume);
  }

  function unmountActive() {
    if (typeof cleanupCurrentView === 'function') {
      cleanupCurrentView();
      cleanupCurrentView = null;
    }
    if (portalApi && typeof portalApi.destroy === 'function') {
      portalApi.destroy();
      portalApi = null;
    }
  }

  function showOnboarding() {
    unmountActive();
    cleanupCurrentView = mountOnboarding(appRoot, (name, ageGroup) => {
      profile = createInitialProfile(name, ageGroup);
      saveProfileSync(profile);
      audioEngine.configure(profile.settings.soundEnabled, profile.settings.sfxVolume);
      showPortal();
    });
  }

  function showPortal() {
    if (!profile) {
      showOnboarding();
      return;
    }
    unmountActive();
    portalApi = mountPortal(appRoot, profile, {
      onUpdateProfile(nextProfile) {
        profile = nextProfile;
        saveProfileSync(profile);
        audioEngine.configure(profile.settings.soundEnabled, profile.settings.sfxVolume);
      },
      onResetProfile() {
        storageAdapter.clearProfile();
        profile = null;
        showOnboarding();
      },
      onPlayGame(game) {
        showGameViewport(game);
      },
    });
  }

  function showGameViewport(game) {
    if (!profile) {
      showOnboarding();
      return;
    }
    unmountActive();
    cleanupCurrentView = mountGameViewport(appRoot, {
      game,
      settings: profile.settings,
      onRecordOutcome(gameId, score, won) {
        if (profile) {
          profile = recordGameOutcome(profile, gameId, score, won);
        }
      },
      onExit() {
        showPortal();
      },
    });
  }

  if (profile) {
    showPortal();
  } else {
    showOnboarding();
  }
}

bootstrapApp();
