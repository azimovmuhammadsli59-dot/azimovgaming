import React, { useState } from 'react';
import { Monitor, RotateCcw, Sliders, Volume2 } from 'lucide-react';
import { AppSettings, DifficultyLevel, GraphicsQuality } from '../types/game';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  onResetProfile: () => void;
}

export function SettingsView({
  settings,
  onUpdateSettings,
  onResetProfile,
}: SettingsViewProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  const setQuality = (graphicsQuality: GraphicsQuality) => {
    onUpdateSettings({ ...settings, graphicsQuality });
  };

  const setDifficulty = (difficulty: DifficultyLevel) => {
    onUpdateSettings({ ...settings, difficulty });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-[#131823] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">
            Platforma sozlamalari
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Qurilmangiz unumdorligiga mos 3D grafika, ovoz va boshqaruv sozlamalarini tanlang.
          </p>
        </div>

        {/* Graphics Quality */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Monitor className="w-4 h-4 text-amber-400" /> 3D Grafika sifati
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { id: 'low', label: 'Past', desc: 'Tez FPS, kuchsiz qurilmalar uchun' },
                { id: 'medium', label: 'O‘rta', desc: 'Muvozanatli soyalar va silliqlik' },
                { id: 'high', label: 'Yuqori', desc: 'Maksimal aniqlik va soyalar' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setQuality(opt.id)}
                className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  settings.graphicsQuality === opt.id
                    ? 'bg-amber-500/12 border-amber-400 text-white'
                    : 'bg-[#0B0E14] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs text-slate-400 mt-1">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Sliders className="w-4 h-4 text-sky-400" /> Qiyinlik darajasi
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { id: 'easy', label: 'Oson' },
                { id: 'medium', label: 'O‘rta' },
                { id: 'hard', label: 'Qiyin' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDifficulty(opt.id)}
                className={`py-2.5 px-4 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                  settings.difficulty === opt.id
                    ? 'bg-sky-500/15 border-sky-400 text-white'
                    : 'bg-[#0B0E14] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audio */}
        <div className="pt-4 border-t border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Volume2 className="w-4 h-4 text-emerald-400" /> Ovoz effektlari
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  soundEnabled: !settings.soundEnabled,
                })
              }
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                settings.soundEnabled
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.soundEnabled ? 'Yoqilgan' : 'O‘chirilgan'}
            </button>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Ovoz balandligi</span>
              <span className="font-mono-num">
                {Math.round(settings.sfxVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.sfxVolume}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  sfxVolume: parseFloat(e.target.value),
                })
              }
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Sichqoncha sezgirligi</span>
              <span className="font-mono-num">
                {settings.mouseSensitivity.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.4}
              max={2.4}
              step={0.1}
              value={settings.mouseSensitivity}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  mouseSensitivity: parseFloat(e.target.value),
                })
              }
              className="w-full accent-amber-500"
            />
          </div>
        </div>

        {/* Reset Profile */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">
              Profil va natijalarni tozalash
            </div>
            <div className="text-xs text-slate-400">
              Boshlang‘ich yosh tanlash ekraniga qaytish uchun.
            </div>
          </div>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Profilni tiklash
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onResetProfile}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
              >
                Tasdiqlash
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Bekor
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
