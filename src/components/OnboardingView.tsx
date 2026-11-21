import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Check, ChevronLeft, ShieldCheck } from 'lucide-react';
import { AgeGroup } from '../types/game';
import { WORLD_METADATA } from '../games/catalog';
import { audioEngine } from '../engine/AudioEngine';
import { ArenaEmblem3D } from './ArenaEmblem3D';

interface OnboardingViewProps {
  initialName?: string;
  initialAge?: AgeGroup;
  onComplete: (name: string, ageGroup: AgeGroup) => void;
}

const AGE_GROUPS: AgeGroup[] = ['3-5', '6-9', '10-15', '16-20'];

export function OnboardingView({
  initialName = '',
  initialAge,
  onComplete,
}: OnboardingViewProps) {
  const [selectedAge, setSelectedAge] = useState<AgeGroup | null>(initialAge || null);
  const [step, setStep] = useState<'age' | 'name' | 'welcome'>(
    initialAge ? 'name' : 'age',
  );
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');

  const handleAgeSelect = (age: AgeGroup) => {
    audioEngine.playUiClick();
    setSelectedAge(age);
    setStep('name');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Iltimos, kamida 2 ta harfdan iborat ism kiriting.');
      return;
    }
    if (!selectedAge) {
      setStep('age');
      return;
    }
    setError('');
    audioEngine.playCollect();
    setStep('welcome');
    window.setTimeout(() => {
      onComplete(trimmed, selectedAge);
    }, 1500);
  };

  const activeWorld = selectedAge ? WORLD_METADATA[selectedAge] : null;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Subtle architectural gradient backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.14), transparent 55%), radial-gradient(circle at 85% 85%, rgba(56, 189, 248, 0.1), transparent 45%)',
        }}
      />

      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <ArenaEmblem3D accent={activeWorld?.accentColor || '#f59e0b'} />
          <p className="text-xs font-mono tracking-widest text-amber-400 uppercase mt-2">
            AQL ARENA · 3D O‘YIN PLATFORMASI
          </p>
          <h1
            className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-3"
            style={{ textWrap: 'balance' }}
          >
            Xush kelibsiz! AQL ARENA olamiga kirishga tayyormisiz?
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {step === 'age' && (
            <motion.section
              key="step-age"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-100">
                  Yosh oralig‘ingizni tanlang
                </h2>
                <span className="text-xs text-slate-400">
                  Har bir yosh guruhi uchun 10 ta maxsus 3D o‘yin
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {AGE_GROUPS.map((age, idx) => {
                  const world = WORLD_METADATA[age];
                  const isSelected = selectedAge === age;
                  return (
                    <motion.button
                      key={age}
                      type="button"
                      onClick={() => handleAgeSelect(age)}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06, duration: 0.28 }}
                      whileHover={{ y: -6, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className={`group text-left rounded-xl overflow-hidden bg-[#131823] border transition-colors flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        isSelected
                          ? 'border-amber-400 shadow-lg shadow-amber-500/10'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
                        <img
                          src={world.coverImage}
                          alt={world.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#131823] via-black/25 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                          <span className="text-2xl font-display font-bold text-white">
                            {world.title}
                          </span>
                          <span className="text-xs font-mono text-slate-200">
                            10 o‘yin
                          </span>
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-100">
                            {world.subtitle}
                          </div>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                            {world.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <span className="text-slate-400">{world.badgeText}</span>
                          <span
                            className="inline-flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform"
                            style={{ color: world.accentColor }}
                          >
                            Tanlash <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.section>
          )}

          {step === 'name' && activeWorld && (
            <motion.section
              key="step-name"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="max-w-lg mx-auto w-full"
            >
              <div className="bg-[#131823] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
                <button
                  type="button"
                  onClick={() => setStep('age')}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-5 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Yosh oralig‘ini o‘zgartirish
                </button>

                <div className="flex items-center gap-4 mb-6 pb-5 border-b border-slate-800">
                  <img
                    src={activeWorld.coverImage}
                    alt={activeWorld.title}
                    referrerPolicy="no-referrer"
                    className="w-16 h-12 rounded-lg object-cover border border-slate-700"
                  />
                  <div>
                    <div className="text-base font-display font-bold text-white">
                      {activeWorld.title} · {activeWorld.subtitle}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      {activeWorld.safetyNote}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="player-name-input"
                      className="block text-base font-semibold text-white mb-2"
                    >
                      Ismingizni kiriting
                    </label>
                    <input
                      id="player-name-input"
                      type="text"
                      maxLength={24}
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Masalan: Jasur"
                      className="w-full px-4 py-3.5 rounded-xl bg-[#0B0E14] border border-slate-700 text-white placeholder-slate-500 text-base focus:outline-none focus:border-amber-400 transition-colors"
                    />
                    {error && (
                      <p className="text-xs text-rose-400 mt-2">{error}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Boshlash <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.section>
          )}

          {step === 'welcome' && (
            <motion.section
              key="step-welcome"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="max-w-lg mx-auto w-full text-center bg-[#131823] border border-emerald-500/40 rounded-2xl p-8 sm:p-10"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
                Xush kelibsiz, {name.trim()}!
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Shaxsiy 3D o‘yin olamingiz tayyorlanmoqda...
              </p>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 py-5 px-6 text-center text-xs text-slate-500 border-t border-slate-900">
        AQL ARENA · 4 ta yosh olami · 40 ta to‘liq ishlaydigan 3D o‘yinlar
      </footer>
    </div>
  );
}
