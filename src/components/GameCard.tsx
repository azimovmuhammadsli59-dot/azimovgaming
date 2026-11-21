import React from 'react';
import { Heart, Play, Trophy } from 'lucide-react';
import { GameDefinition, GameStatsRecord } from '../types/game';
import { WORLD_METADATA } from '../games/catalog';

interface GameCardProps {
  game: GameDefinition;
  isFavorite: boolean;
  stats?: GameStatsRecord;
  onPlay: (game: GameDefinition) => void;
  onToggleFavorite: (gameId: string) => void;
}

export function GameCard({
  game,
  isFavorite,
  stats,
  onPlay,
  onToggleFavorite,
}: GameCardProps) {
  const world = WORLD_METADATA[game.ageGroup];

  return (
    <article className="group rounded-xl bg-[#131823] border border-slate-800/90 hover:border-slate-600 transition-colors overflow-hidden flex flex-col">
      {/* 3D Thumbnail Visual Header */}
      <div
        onClick={() => onPlay(game)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPlay(game);
          }
        }}
        className="relative aspect-[16/10] w-full overflow-hidden cursor-pointer bg-[#0B0E14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        {/* World cover backdrop with unique per-game palette tint */}
        <img
          src={world.coverImage}
          alt={game.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-55 group-hover:scale-105 transition-transform duration-500"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${game.mapPalette.skyTop}cc 0%, transparent 55%, #0B0E14ee 100%)`,
          }}
        />

        {/* Subtle geometric 3D map silhouette watermark icon (distinct per mechanic) */}
        <svg
          viewBox="0 0 120 80"
          className="absolute right-3 top-3 w-16 h-12 opacity-60 pointer-events-none"
          aria-hidden="true"
        >
          <polygon
            points="60,8 106,28 60,48 14,28"
            fill={game.accentColor}
            fillOpacity="0.28"
            stroke={game.accentColor}
            strokeWidth="2"
          />
          <polygon
            points="14,28 60,48 60,72 14,52"
            fill={game.mapPalette.wallColor}
            fillOpacity="0.32"
          />
          <polygon
            points="106,28 60,48 60,72 106,52"
            fill={game.mapPalette.trimColor}
            fillOpacity="0.4"
          />
        </svg>

        {/* Bottom scrim & map title */}
        <div className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/75 to-transparent flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] text-slate-300 truncate">
              {game.mapName} · {game.ageGroup} yosh
            </div>
            <h3 className="text-base font-display font-bold text-white truncate">
              {game.title}
            </h3>
          </div>
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-950 shrink-0 transition-transform group-hover:scale-105"
            style={{ backgroundColor: game.accentColor }}
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
          {game.shortDesc}
        </p>

        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0 truncate">
            <span>{game.categoryLabel}</span>
            {stats && stats.bestScore > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-amber-400 font-mono-num">
                  <Trophy className="w-3 h-3" /> {stats.bestScore}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onToggleFavorite(game.id)}
              aria-label={isFavorite ? 'Sevimlilardan olish' : 'Sevimlilarga qo‘shish'}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                isFavorite
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                  : 'border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => onPlay(game)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              O‘ynash
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
