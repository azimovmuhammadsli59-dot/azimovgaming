import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Crosshair,
  Gamepad2,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import {
  AppSettings,
  GameDefinition,
  HudSnapshot,
} from '../types/game';
import { FpsEngine } from '../engine/FpsEngine';
import { WEAPONS } from '../games/weapons';
import { audioEngine } from '../engine/AudioEngine';

interface GameViewportProps {
  game: GameDefinition;
  settings: AppSettings;
  onExit: () => void;
  onCompleteSession: (won: boolean, score: number) => void;
}

export function GameViewport({
  game,
  settings,
  onExit,
  onCompleteSession,
}: GameViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FpsEngine | null>(null);
  const completedRef = useRef(false);

  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [showTouchPad, setShowTouchPad] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  // Virtual joystick state
  const joyRef = useRef<HTMLDivElement>(null);
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });
  const lookTouchRef = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    audioEngine.configure(settings.soundEnabled, settings.sfxVolume);
  }, [settings.soundEnabled, settings.sfxVolume]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    completedRef.current = false;

    const engine = new FpsEngine({
      container,
      game,
      quality: settings.graphicsQuality,
      difficulty: settings.difficulty,
      sensitivity: settings.mouseSensitivity,
      onHudUpdate: (snapshot) => setHud(snapshot),
      onGameEnd: (won, score) => {
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteSession(won, score);
        }
      },
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [game.id, settings.graphicsQuality, settings.difficulty, settings.mouseSensitivity]);

  const handleResume = () => {
    audioEngine.playUiClick();
    engineRef.current?.setPaused(false);
    engineRef.current?.requestPointerLock();
  };

  const handleRestart = () => {
    audioEngine.playUiClick();
    completedRef.current = false;
    engineRef.current?.restartMatch();
    engineRef.current?.requestPointerLock();
  };

  // Virtual Joystick Touch Handlers
  const handleJoyMove = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.4;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setJoyKnob({ x: dx, y: dy });
    engineRef.current?.setMobileMove(dx / maxR, dy / maxR);
  };

  const resetJoy = () => {
    setJoyKnob({ x: 0, y: 0 });
    engineRef.current?.setMobileMove(0, 0);
  };

  // Right-side Touch Look Zone
  const handleLookTouchStart = (e: React.TouchEvent) => {
    if (lookTouchRef.current || e.changedTouches.length === 0) return;
    const t = e.changedTouches[0];
    lookTouchRef.current = { id: t.identifier, x: t.clientX, y: t.clientY };
  };

  const handleLookTouchMove = (e: React.TouchEvent) => {
    if (!lookTouchRef.current) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchRef.current.id) {
        const dx = t.clientX - lookTouchRef.current.x;
        const dy = t.clientY - lookTouchRef.current.y;
        lookTouchRef.current.x = t.clientX;
        lookTouchRef.current.y = t.clientY;
        engineRef.current?.addLookDelta(dx * 1.4, dy * 1.4);
      }
    }
  };

  const handleLookTouchEnd = (e: React.TouchEvent) => {
    const active = lookTouchRef.current;
    if (!active) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === active.id) {
        lookTouchRef.current = null;
      }
    }
  };

  const now = performance.now();
  const showHitMarker = hud ? now - hud.hitMarkerAt < 180 : false;
  const showDamageFlash = hud ? now - hud.damageFlashAt < 260 : false;
  const isKidFriendly = game.ageGroup === '3-5';

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0E14] select-none overflow-hidden">
      {/* Isolated WebGL Canvas Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Damage Flash Vignette */}
      {showDamageFlash && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow: 'inset 0 0 90px rgba(239, 68, 68, 0.72)',
          }}
        />
      )}

      {/* Sniper Optical Scope Overlay */}
      {hud?.isScoped && hud.status === 'playing' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                'radial-gradient(circle at center, transparent 30%, rgba(5, 8, 14, 0.95) 36%)',
            }}
          >
            <div className="w-[56vmin] h-[56vmin] rounded-full border-2 border-slate-300/70 relative flex items-center justify-center">
              <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200/50" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-200/50" />
              <div className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
          </div>
        </div>
      )}

      {/* Standard Crosshair */}
      {hud && !hud.isScoped && hud.status === 'playing' && !hud.isPaused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative w-7 h-7 flex items-center justify-center">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isKidFriendly ? 'bg-amber-300 w-2.5 h-2.5' : 'bg-white'
              }`}
            />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-white/85" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-white/85" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-2 bg-white/85" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 w-2 bg-white/85" />
            {showHitMarker && (
              <div className="absolute inset-0 border-2 border-amber-400 rotate-45 scale-75" />
            )}
          </div>
        </div>
      )}

      {/* Touch Look Zone on Mobile/Tablet */}
      {showTouchPad && hud?.status === 'playing' && !hud.isPaused && (
        <div
          className="absolute inset-y-16 right-0 w-1/2 z-10"
          onTouchStart={handleLookTouchStart}
          onTouchMove={handleLookTouchMove}
          onTouchEnd={handleLookTouchEnd}
        />
      )}

      {/* TOP HUD BAR */}
      {hud && (
        <div className="pointer-events-none absolute top-3 inset-x-3 sm:top-4 sm:inset-x-5 z-20 flex items-start justify-between gap-3">
          {/* Top-Left: Mini-Map Radar */}
          <div className="pointer-events-auto flex items-start gap-3">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-[#0B0E14]/90 border border-slate-700/80 relative overflow-hidden shrink-0">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:12px_12px]" />
              {/* Mini-map entities */}
              {hud.entitiesMinimap.map((ent, idx) => {
                const relX = (ent.x - hud.playerPos.x) * 1.6;
                const relZ = (ent.z - hud.playerPos.z) * 1.6;
                const clampedX = Math.max(-50, Math.min(50, relX));
                const clampedY = Math.max(-50, Math.min(50, relZ));
                const colorClass =
                  ent.kind === 'enemy'
                    ? 'bg-rose-500'
                    : ent.kind === 'ally'
                    ? 'bg-sky-400'
                    : ent.kind === 'objective'
                    ? 'bg-amber-400'
                    : 'bg-emerald-400';
                return (
                  <div
                    key={idx}
                    className={`absolute w-2 h-2 rounded-full ${colorClass} -translate-x-1/2 -translate-y-1/2`}
                    style={{
                      left: `calc(50% + ${clampedX}px)`,
                      top: `calc(50% + ${clampedY}px)`,
                    }}
                  />
                );
              })}
              {/* Player center marker */}
              <div
                className="absolute left-1/2 top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2"
                style={{ transform: `translate(-50%, -50%) rotate(${-hud.playerPos.yaw}rad)` }}
              >
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] border-b-white mx-auto" />
              </div>
              <div className="absolute bottom-1 left-2 text-[10px] font-mono text-slate-400">
                RADAR
              </div>
            </div>

            {/* Mission Card */}
            <div className="hidden md:block bg-[#0B0E14]/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 max-w-xs">
              <div className="text-xs font-semibold text-amber-400">
                {game.title} · {game.mapName}
              </div>
              <div className="text-xs text-slate-200 mt-0.5 leading-snug">
                {hud.missionText}
              </div>
              {hud.targetColorHint && (
                <div className="mt-1.5 text-xs font-bold text-white bg-slate-800 px-2.5 py-1 rounded">
                  Kerakli rang: <span className="text-amber-300">{hud.targetColorHint}</span>
                </div>
              )}
            </div>
          </div>

          {/* Top-Center: Round Timer & Goal */}
          <div className="bg-[#0B0E14]/90 border border-slate-700/80 rounded-xl px-4 py-2 flex items-center gap-4 text-center">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Vaqt</div>
              <div className="text-lg sm:text-xl font-mono-num font-bold text-white">
                {formatTime(hud.timeRemaining)}
              </div>
            </div>
            <div className="h-7 w-px bg-slate-700" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Maqsad</div>
              <div className="text-lg sm:text-xl font-mono-num font-bold text-amber-400">
                {hud.goalProgress}/{hud.goalTarget}
              </div>
            </div>
            {hud.roundsTotal > 1 && (
              <>
                <div className="h-7 w-px bg-slate-700 hidden sm:block" />
                <div className="hidden sm:block">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Bosqich</div>
                  <div className="text-lg font-mono-num font-bold text-sky-400">
                    {hud.round}/{hud.roundsTotal}
                  </div>
                </div>
              </>
            )}
            {hud.bombState === 'planted' && (
              <>
                <div className="h-7 w-px bg-slate-700" />
                <div>
                  <div className="text-[10px] text-rose-400 uppercase tracking-wider">Zaryad</div>
                  <div className="text-lg font-mono-num font-bold text-rose-500">
                    {hud.bombTimer}s
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Top-Right: Score & Controls */}
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-3 bg-[#0B0E14]/90 border border-slate-700/80 rounded-xl px-3.5 py-2">
              <div className="text-right">
                <div className="text-[10px] text-slate-400">Ball</div>
                <div className="text-base font-mono-num font-bold text-emerald-400">
                  {hud.score}
                </div>
              </div>
              {!isKidFriendly && (
                <div className="text-right border-l border-slate-700 pl-3">
                  <div className="text-[10px] text-slate-400">Raqib</div>
                  <div className="text-base font-mono-num font-bold text-white">
                    {hud.kills}
                  </div>
                </div>
              )}
            </div>

            {game.allowCameraToggle && (
              <button
                type="button"
                onClick={() => engineRef.current?.toggleCameraMode()}
                title="Kamera (V)"
                className="p-2.5 rounded-xl bg-[#0B0E14]/90 border border-slate-700 text-slate-200 hover:text-white hover:border-slate-500 cursor-pointer"
              >
                <Camera className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowTouchPad((v) => !v)}
              title="Sensor boshqaruv"
              className={`p-2.5 rounded-xl border cursor-pointer ${
                showTouchPad
                  ? 'bg-amber-500 border-amber-400 text-slate-950'
                  : 'bg-[#0B0E14]/90 border-slate-700 text-slate-200 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => engineRef.current?.setPaused(!hud.isPaused)}
              title="Pauza (ESC)"
              className="p-2.5 rounded-xl bg-[#0B0E14]/90 border border-slate-700 text-slate-200 hover:text-white hover:border-slate-500 cursor-pointer"
            >
              <Pause className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={onExit}
              title="Chiqish"
              className="p-2.5 rounded-xl bg-[#0B0E14]/90 border border-slate-700 text-rose-400 hover:text-rose-300 hover:border-rose-500/60 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Kill / Event Feed */}
      {hud && hud.killFeed.length > 0 && (
        <div className="pointer-events-none absolute top-24 right-4 z-20 flex flex-col items-end gap-1.5">
          {hud.killFeed.map((item) => (
            <div
              key={item.id}
              className="px-3 py-1 rounded-lg bg-[#0B0E14]/88 border border-slate-800 text-xs font-medium"
              style={{ color: item.color }}
            >
              {item.text}
            </div>
          ))}
        </div>
      )}

      {/* Interact Prompt */}
      {hud?.interactPrompt && hud.status === 'playing' && !hud.isPaused && (
        <div className="pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm shadow-lg">
          {hud.interactPrompt}
        </div>
      )}

      {/* BOTTOM HUD (Health, Armor, Weapon, Ammo) */}
      {hud && (
        <div className="pointer-events-none absolute bottom-3 inset-x-3 sm:bottom-5 sm:inset-x-5 z-20 flex items-end justify-between gap-4">
          {/* Health & Armor */}
          {!isKidFriendly ? (
            <div className="bg-[#0B0E14]/90 border border-slate-700/80 rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                <div>
                  <div className="text-[10px] text-slate-400">Jon</div>
                  <div className="text-xl font-mono-num font-bold text-white">
                    {hud.health}
                  </div>
                </div>
              </div>
              {hud.maxArmor > 0 && (
                <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
                  <Shield className="w-5 h-5 text-sky-400" />
                  <div>
                    <div className="text-[10px] text-slate-400">Zirh</div>
                    <div className="text-xl font-mono-num font-bold text-sky-300">
                      {hud.armor}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#0B0E14]/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-300">
              Ball: <span className="font-mono-num text-lg text-white">{hud.score}</span>
            </div>
          )}

          {/* Desktop Controls Hint */}
          {!showTouchPad && (
            <div className="hidden lg:block bg-[#0B0E14]/85 border border-slate-800 rounded-lg px-3.5 py-1.5 text-[11px] text-slate-400">
              WASD: Yurish · Sichqoncha: Nishon/Otish · R: Qayta o‘qlash · Shift: Yugurish · C: O‘tirish · Space: Sakrash · ESC: Pauza
            </div>
          )}

          {/* Weapon & Ammo */}
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            {game.weapons.length > 1 && (
              <div className="flex items-center gap-1.5">
                {game.weapons.map((wId, idx) => (
                  <button
                    key={wId}
                    type="button"
                    onClick={() => engineRef.current?.switchWeapon(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono border cursor-pointer ${
                      hud.weaponId === wId
                        ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                        : 'bg-[#0B0E14]/90 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {idx + 1}. {WEAPONS[wId].id.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            <div className="bg-[#0B0E14]/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-right min-w-[165px]">
              <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                {hud.weaponName}
              </div>
              {hud.reloading ? (
                <div className="mt-1">
                  <div className="text-xs font-semibold text-amber-400">
                    Qayta o‘qlanmoqda...
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${Math.round(hud.reloadProgress * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-2xl font-mono-num font-bold text-white">
                  {hud.ammo}{' '}
                  <span className="text-sm text-slate-400">/ {hud.reserveAmmo}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE / TOUCH VIRTUAL JOYSTICK & BUTTONS */}
      {showTouchPad && hud?.status === 'playing' && !hud.isPaused && (
        <>
          {/* Left Virtual Joystick */}
          <div
            ref={joyRef}
            onTouchStart={(e) => {
              const t = e.changedTouches[0];
              if (t) handleJoyMove(t.clientX, t.clientY);
            }}
            onTouchMove={(e) => {
              const t = e.changedTouches[0];
              if (t) handleJoyMove(t.clientX, t.clientY);
            }}
            onTouchEnd={resetJoy}
            onTouchCancel={resetJoy}
            className="absolute bottom-24 left-6 z-30 w-32 h-32 rounded-full bg-slate-900/75 border-2 border-slate-600/80 flex items-center justify-center touch-none"
          >
            <div
              className="w-12 h-12 rounded-full bg-amber-400/90 border-2 border-white shadow-lg"
              style={{
                transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
              }}
            />
          </div>

          {/* Right Action Buttons */}
          <div className="absolute bottom-24 right-5 z-30 flex flex-col items-end gap-2.5">
            <div className="flex items-center gap-2">
              {!isKidFriendly && (
                <>
                  <button
                    type="button"
                    onTouchStart={() => engineRef.current?.triggerScope()}
                    onClick={() => engineRef.current?.triggerScope()}
                    className="w-12 h-12 rounded-full bg-slate-900/90 border border-slate-600 text-white text-xs font-semibold flex items-center justify-center"
                  >
                    <Crosshair className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onTouchStart={() => engineRef.current?.triggerReload()}
                    onClick={() => engineRef.current?.triggerReload()}
                    className="w-12 h-12 rounded-full bg-slate-900/90 border border-slate-600 text-white text-xs font-bold"
                  >
                    R
                  </button>
                </>
              )}
              <button
                type="button"
                onTouchStart={() => engineRef.current?.triggerJump()}
                onClick={() => engineRef.current?.triggerJump()}
                className="w-12 h-12 rounded-full bg-slate-900/90 border border-slate-600 text-white text-xs font-semibold"
              >
                Sakrash
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onTouchStart={() => engineRef.current?.triggerInteract(true)}
                onTouchEnd={() => engineRef.current?.triggerInteract(false)}
                onClick={() => engineRef.current?.triggerInteract(true)}
                className="w-12 h-12 rounded-full bg-emerald-600/90 border border-emerald-400 text-white text-xs font-bold"
              >
                E
              </button>
              <button
                type="button"
                onTouchStart={() => engineRef.current?.triggerFire(true)}
                onTouchEnd={() => engineRef.current?.triggerFire(false)}
                onMouseDown={() => engineRef.current?.triggerFire(true)}
                onMouseUp={() => engineRef.current?.triggerFire(false)}
                className="w-20 h-20 rounded-full bg-amber-500 border-2 border-amber-300 text-slate-950 font-bold text-sm shadow-xl active:scale-95"
              >
                OTISH
              </button>
            </div>
          </div>
        </>
      )}

      {/* Click-to-Lock Mouse Prompt (Desktop) */}
      {hud &&
        !hud.isPointerLocked &&
        !hud.isPaused &&
        hud.status === 'playing' &&
        !showTouchPad && (
          <div
            onClick={() => engineRef.current?.requestPointerLock()}
            className="absolute inset-0 z-25 bg-[#0B0E14]/55 flex items-center justify-center cursor-pointer"
          >
            <div className="bg-[#131823] border border-amber-400/60 rounded-2xl px-7 py-6 text-center max-w-md mx-4 shadow-2xl">
              <Target className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h3 className="text-xl font-display font-bold text-white">
                {game.title}
              </h3>
              <p className="text-sm text-slate-300 mt-1.5">
                {game.missionDesc}
              </p>
              <div className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm">
                <Play className="w-4 h-4" /> O‘yinni boshlash uchun bosing
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Yoki mobil rejim uchun yuqoridagi geympad tugmasini yoqing
              </p>
            </div>
          </div>
        )}

      {/* PAUSE MODAL */}
      {hud?.isPaused && hud.status === 'playing' && (
        <div className="absolute inset-0 z-40 bg-[#0B0E14]/85 flex items-center justify-center p-4">
          <div className="bg-[#131823] border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-2xl font-display font-bold text-white">
              O‘yin to‘xtatildi
            </h3>
            <p className="text-sm text-slate-400 mt-1">{game.title}</p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handleResume}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" /> Davom etish
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Qayta boshlash
              </button>
              <button
                type="button"
                onClick={onExit}
                className="w-full py-3 rounded-xl border border-slate-700 hover:border-rose-500/60 text-rose-400 font-semibold cursor-pointer"
              >
                Portalga qaytish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* END OF MATCH MODAL (WON / LOST) */}
      {hud && hud.status !== 'playing' && (
        <div className="absolute inset-0 z-40 bg-[#0B0E14]/90 flex items-center justify-center p-4">
          <div className="bg-[#131823] border border-slate-700 rounded-2xl p-7 sm:p-8 max-w-md w-full text-center shadow-2xl">
            <div
              className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
                hud.status === 'won'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-rose-500/15 text-rose-400'
              }`}
            >
              <Trophy className="w-8 h-8" />
            </div>

            <h3 className="text-3xl font-display font-bold text-white">
              {hud.status === 'won' ? 'G‘alaba!' : 'Missiya tugadi'}
            </h3>
            <p className="text-sm text-slate-300 mt-2">{hud.endReason}</p>

            <div className="grid grid-cols-3 gap-3 mt-6 py-4 border-y border-slate-800">
              <div>
                <div className="text-xs text-slate-400">Ball</div>
                <div className="text-xl font-mono-num font-bold text-amber-400">
                  {hud.score}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Maqsad</div>
                <div className="text-xl font-mono-num font-bold text-white">
                  {hud.goalProgress}/{hud.goalTarget}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Zarba</div>
                <div className="text-xl font-mono-num font-bold text-emerald-400">
                  {hud.kills}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleRestart}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Qayta o‘ynash
              </button>
              <button
                type="button"
                onClick={onExit}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
              >
                Portalga qaytish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
