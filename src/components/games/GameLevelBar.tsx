import { Lock, Star } from 'lucide-react';
import { GAME_LEVELS, type GameType, type PlayerGameProgress } from '../../lib/game-progression';

interface GameLevelBarProps {
  game: GameType;
  activeLevel: number;
  unlockedLevel: number;
  playerProgress: PlayerGameProgress;
  activePlayerName: string;
  onSelectLevel: (level: number) => void;
}

export function GameLevelBar({
  game,
  activeLevel,
  unlockedLevel,
  playerProgress,
  activePlayerName,
  onSelectLevel,
}: GameLevelBarProps) {
  const levels = GAME_LEVELS[game];
  const currentDef = levels.find(l => l.level === activeLevel) || levels[0];
  const completedCount = Object.keys(playerProgress.levels).length;

  return (
    <div className="game-level-progression-panel" aria-label={`Niveles de ${game}`}>
      <div className="game-level-panel-header">
        <div className="game-level-header-main">
          <h3 className="game-level-heading">Nivel {activeLevel} de 5</h3>
          <p className="game-level-req">
            <strong>Objetivo:</strong> {currentDef.requirement} · <em>{currentDef.subtitle}</em>
          </p>
        </div>

        <div className="game-level-stats-pill">
          <div className="game-level-player-chip">
            <span className="game-level-avatar-dot" />
            <span>Jugando: <strong>{activePlayerName}</strong></span>
          </div>
          <span className="game-level-stars-total">
            <Star size={14} className="star-gold" fill="currentColor" />
            <strong>{playerProgress.totalStars}</strong> estrellas · <strong>{playerProgress.totalScore}</strong> pts
          </span>
        </div>
      </div>

      <div className="game-level-pills-track" role="tablist" aria-label="Seleccionar nivel">
        {levels.map(l => {
          const isUnlocked = l.level <= unlockedLevel;
          const isActive = l.level === activeLevel;
          const record = playerProgress.levels[l.level];
          const starsEarned = record?.stars || 0;

          return (
            <button
              key={l.level}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={!isUnlocked}
              disabled={!isUnlocked}
              onClick={() => isUnlocked && onSelectLevel(l.level)}
              className={`game-level-pill-btn ${isActive ? 'is-active-level' : ''} ${
                !isUnlocked ? 'is-locked-level' : ''
              } ${starsEarned > 0 ? 'is-completed-level' : ''}`}
              title={
                isUnlocked
                  ? `Nivel ${l.level} (${starsEarned} estrellas)`
                  : `Supera el Nivel ${l.level - 1} para desbloquear`
              }
            >
              <div className="game-level-pill-num">
                {isUnlocked ? (
                  <span>Nivel {l.level}</span>
                ) : (
                  <span className="level-lock-wrap">
                    <Lock size={12} /> Nivel {l.level}
                  </span>
                )}
              </div>

              <div className="game-level-pill-title">{l.badge}</div>

              <div className="game-level-pill-stars" aria-label={`${starsEarned} de 3 estrellas`}>
                {[1, 2, 3].map(starIndex => (
                  <Star
                    key={starIndex}
                    size={13}
                    className={starIndex <= starsEarned ? 'star-gold' : 'star-empty'}
                    fill={starIndex <= starsEarned ? 'currentColor' : 'none'}
                  />
                ))}
              </div>

              {record?.bestMetricLabel && (
                <div className="game-level-pill-record">
                  <small>{record.bestMetricLabel}</small>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
