import { Award, Crown, Flame, Heart, Sparkles, Star, Trophy, Zap } from 'lucide-react';
import {
  GAME_LEVELS,
  PLAYERS,
  getPlayerOverallStats,
  type GameProgressionStore,
  type PlayerId,
} from '../../lib/game-progression';

interface GameRankingSectionProps {
  store: GameProgressionStore;
  detectedPlayer?: PlayerId | null;
  onSwitchPlayer: (player: PlayerId) => void;
  onGoToGame: (game: 'puzzle' | 'memory' | 'diamond') => void;
}

export function GameRankingSection({
  store,
  detectedPlayer,
  onSwitchPlayer,
  onGoToGame,
}: GameRankingSectionProps) {
  const valeriaStats = getPlayerOverallStats(store.valeria);
  const aleStats = getPlayerOverallStats(store.ale);

  const totalPoints = valeriaStats.totalScore + aleStats.totalScore;
  const valeriaPercent = totalPoints === 0 ? 50 : Math.round((valeriaStats.totalScore / totalPoints) * 100);
  const alePercent = 100 - valeriaPercent;

  let verdictMessage = '';
  let leaderText = '';
  const diff = Math.abs(valeriaStats.totalScore - aleStats.totalScore);

  if (valeriaStats.totalScore > aleStats.totalScore) {
    leaderText = '👑 Val va a la delantera';
    verdictMessage = `¡Val lleva la corona con +${diff} puntos! Ale, es hora de ponerte a prueba en el rompecabezas para alcanzarla 💕`;
  } else if (aleStats.totalScore > valeriaStats.totalScore) {
    leaderText = '⚡ Ale va a la delantera';
    verdictMessage = `¡Ale lleva la delantera con +${diff} puntos! Val, saca tus mejores dotes en memorama y diamantitos para la remontada ✨`;
  } else if (totalPoints > 0) {
    leaderText = '💖 ¡Empate absoluto!';
    verdictMessage = '¡Están exactamente empatados! Tienen la misma agilidad y complicidad en cada juego ♡';
  } else {
    leaderText = '🌟 ¡Que comience el juego!';
    verdictMessage = 'Aún no han registrado partidas. Elijan su perfil arriba y superen el Nivel 1 de cualquier juego para sumar sus primeros puntos.';
  }

  // Determine game leaders
  const puzzleLeader: PlayerId | 'tie' =
    store.valeria.puzzle.totalScore > store.ale.puzzle.totalScore
      ? 'valeria'
      : store.ale.puzzle.totalScore > store.valeria.puzzle.totalScore
      ? 'ale'
      : 'tie';

  const memoryLeader: PlayerId | 'tie' =
    store.valeria.memory.totalScore > store.ale.memory.totalScore
      ? 'valeria'
      : store.ale.memory.totalScore > store.valeria.memory.totalScore
      ? 'ale'
      : 'tie';

  const diamondLeader: PlayerId | 'tie' =
    store.valeria.diamond.totalScore > store.ale.diamond.totalScore
      ? 'valeria'
      : store.ale.diamond.totalScore > store.valeria.diamond.totalScore
      ? 'ale'
      : 'tie';

  const trophies = [
    {
      id: 'puzzle-3',
      name: 'Mente Estratega',
      icon: '🧩',
      desc: 'Alcanzar el Nivel 3 en Rompecabezas',
      valUnlocked: store.valeria.puzzle.unlockedLevel >= 3,
      aleUnlocked: store.ale.puzzle.unlockedLevel >= 3,
    },
    {
      id: 'memory-3',
      name: 'Memoria Fotográfica',
      icon: '🧠',
      desc: 'Alcanzar el Nivel 3 en Memorama',
      valUnlocked: store.valeria.memory.unlockedLevel >= 3,
      aleUnlocked: store.ale.memory.unlockedLevel >= 3,
    },
    {
      id: 'diamond-3',
      name: 'Artista de Diamantes',
      icon: '💎',
      desc: 'Alcanzar el Nivel 3 en Diamantitos 5D',
      valUnlocked: store.valeria.diamond.unlockedLevel >= 3,
      aleUnlocked: store.ale.diamond.unlockedLevel >= 3,
    },
    {
      id: 'stars-10',
      name: 'Lluvia de Estrellas',
      icon: '🌟',
      desc: 'Acumular 10 o más estrellas en total',
      valUnlocked: valeriaStats.totalStars >= 10,
      aleUnlocked: aleStats.totalStars >= 10,
    },
    {
      id: 'score-1500',
      name: 'Superacion',
      icon: '🏆',
      desc: 'Superar los 1,500 puntos',
      valUnlocked: valeriaStats.totalScore >= 1500,
      aleUnlocked: aleStats.totalScore >= 1500,
    },
    {
      id: 'master-5',
      name: 'Leyenda',
      icon: '👑',
      desc: 'Llegar al Nivel 5 en cualquier juego',
      valUnlocked:
        store.valeria.puzzle.unlockedLevel >= 5 ||
        store.valeria.memory.unlockedLevel >= 5 ||
        store.valeria.diamond.unlockedLevel >= 5,
      aleUnlocked:
        store.ale.puzzle.unlockedLevel >= 5 ||
        store.ale.memory.unlockedLevel >= 5 ||
        store.ale.diamond.unlockedLevel >= 5,
    },
  ];

  return (
    <div className="game-ranking-wrapper">
      {/* Selector de perfil solo si no hay sesión de Google iniciada */}
      {!detectedPlayer && (
        <div className="ranking-player-switch-card">
          <div className="ranking-switch-lead">
            <span className="eyebrow">Modo de prueba (sin cuenta de Google)</span>
            <h4>Elige un perfil para probar:</h4>
          </div>
          <div className="ranking-switch-buttons">
            <button
              type="button"
              className={`ranking-player-pill valeria-pill ${store.activePlayer === 'valeria' ? 'is-active-player' : ''}`}
              onClick={() => onSwitchPlayer('valeria')}
            >
              <span className="ranking-player-avatar">{PLAYERS.valeria.avatar}</span>
              <div className="ranking-player-meta">
                <strong>Val</strong>
                <small>{valeriaStats.totalScore} pts · {valeriaStats.totalStars} ⭐</small>
              </div>
              {store.activePlayer === 'valeria' && <span className="ranking-active-tag">Probando</span>}
            </button>

            <button
              type="button"
              className={`ranking-player-pill ale-pill ${store.activePlayer === 'ale' ? 'is-active-player' : ''}`}
              onClick={() => onSwitchPlayer('ale')}
            >
              <span className="ranking-player-avatar">{PLAYERS.ale.avatar}</span>
              <div className="ranking-player-meta">
                <strong>Ale</strong>
                <small>{aleStats.totalScore} pts · {aleStats.totalStars} ⭐</small>
              </div>
              {store.activePlayer === 'ale' && <span className="ranking-active-tag">Probando</span>}
            </button>
          </div>
        </div>
      )}

      {/* Versus Head to Head Cards */}
      <div className="ranking-head-to-head">
        {/* Val Card */}
        <div className={`ranking-duo-card valeria-card ${store.activePlayer === 'valeria' ? 'is-turn' : ''}`}>
          <div className="duo-avatar-badge">
            <span className="duo-avatar-emoji">{PLAYERS.valeria.avatar}</span>
            {valeriaStats.totalScore > aleStats.totalScore && (
              <span className="duo-crown-badge" title="Líder actual">
                <Crown size={18} />
              </span>
            )}
          </div>
          <div className="duo-name-group">
            <h3>Val</h3>
            {PLAYERS.valeria.badge ? <span className="duo-badge-label">{PLAYERS.valeria.badge}</span> : null}
          </div>

          <div className="duo-score-hero">
            <strong>{valeriaStats.totalScore}</strong>
            <small>Puntos</small>
          </div>

          <div className="duo-stats-grid">
            <div className="duo-stat-item">
              <Star size={16} className="star-gold" fill="currentColor" />
              <span>{valeriaStats.totalStars} estrellas</span>
            </div>
            <div className="duo-stat-item">
              <Trophy size={16} />
              <span>{valeriaStats.completedLevels} niveles</span>
            </div>
          </div>
        </div>

        {/* Center Balance & Verdict */}
        <div className="ranking-center-verdict card">
          <div className="ranking-vs-bubble">
            <Heart size={20} fill="#E85D88" color="#E85D88" />
            <span>VS</span>
          </div>

          <div className="ranking-balance-bar-container">
            <div className="ranking-balance-labels">
              <span className="val-label">Val {valeriaPercent}%</span>
              <span className="ale-label">Ale {alePercent}%</span>
            </div>
            <div className="ranking-balance-bar">
              <div
                className="ranking-bar-val"
                style={{ width: `${valeriaPercent}%` }}
                title={`Val: ${valeriaStats.totalScore} pts`}
              />
              <div
                className="ranking-bar-ale"
                style={{ width: `${alePercent}%` }}
                title={`Ale: ${aleStats.totalScore} pts`}
              />
            </div>
          </div>

          <div className="ranking-verdict-box">
            <strong className="ranking-leader-badge">{leaderText}</strong>
            <p className="ranking-verdict-text">{verdictMessage}</p>
          </div>
        </div>

        {/* Ale Card */}
        <div className={`ranking-duo-card ale-card ${store.activePlayer === 'ale' ? 'is-turn' : ''}`}>
          <div className="duo-avatar-badge">
            <span className="duo-avatar-emoji">{PLAYERS.ale.avatar}</span>
            {aleStats.totalScore > valeriaStats.totalScore && (
              <span className="duo-crown-badge" title="Líder actual">
                <Crown size={18} />
              </span>
            )}
          </div>
          <div className="duo-name-group">
            <h3>Ale</h3>
            {PLAYERS.ale.badge ? <span className="duo-badge-label">{PLAYERS.ale.badge}</span> : null}
          </div>

          <div className="duo-score-hero">
            <strong>{aleStats.totalScore}</strong>
            <small>Puntos</small>
          </div>

          <div className="duo-stats-grid">
            <div className="duo-stat-item">
              <Star size={16} className="star-gold" fill="currentColor" />
              <span>{aleStats.totalStars} estrellas</span>
            </div>
            <div className="duo-stat-item">
              <Trophy size={16} />
              <span>{aleStats.completedLevels} niveles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Table by Game */}
      <div className="card ranking-table-card">
        <div className="ranking-table-header">
          <div>
            <span className="eyebrow">Desglose por Juego</span>
            <h3>Nivel Máximo y Récords Alcanzados</h3>
          </div>
        </div>

        <div className="ranking-game-cards-row">
          {/* Puzzle Card */}
          <div className="ranking-game-item">
            <div className="ranking-game-item-top">
              <span className="ranking-game-glyph">🧩</span>
              <div>
                <h4>Rompecabezas</h4>
                <small>Armar fotos pieza por pieza</small>
              </div>
              <button
                type="button"
                className="button button-secondary game-item-play-btn"
                onClick={() => onGoToGame('puzzle')}
              >
                Jugar ➔
              </button>
            </div>

            <div className="ranking-game-comparison">
              <div className="game-comp-player val-side">
                <strong>Valeria</strong>
                <span>Nivel {store.valeria.puzzle.unlockedLevel} / 5</span>
                <small>{store.valeria.puzzle.totalScore} pts · {store.valeria.puzzle.totalStars} ⭐</small>
                {puzzleLeader === 'valeria' && <span className="comp-crown">👑 Líder</span>}
              </div>
              <div className="game-comp-divider">vs</div>
              <div className="game-comp-player ale-side">
                <strong>Ale</strong>
                <span>Nivel {store.ale.puzzle.unlockedLevel} / 5</span>
                <small>{store.ale.puzzle.totalScore} pts · {store.ale.puzzle.totalStars} ⭐</small>
                {puzzleLeader === 'ale' && <span className="comp-crown">👑 Líder</span>}
              </div>
            </div>
          </div>

          {/* Memory Card */}
          <div className="ranking-game-item">
            <div className="ranking-game-item-top">
              <span className="ranking-game-glyph">✨</span>
              <div>
                <h4>Memorama</h4>
                <small>Encontrar parejas de fotos</small>
              </div>
              <button
                type="button"
                className="button button-secondary game-item-play-btn"
                onClick={() => onGoToGame('memory')}
              >
                Jugar ➔
              </button>
            </div>

            <div className="ranking-game-comparison">
              <div className="game-comp-player val-side">
                <strong>Valeria</strong>
                <span>Nivel {store.valeria.memory.unlockedLevel} / 5</span>
                <small>{store.valeria.memory.totalScore} pts · {store.valeria.memory.totalStars} ⭐</small>
                {memoryLeader === 'valeria' && <span className="comp-crown">👑 Líder</span>}
              </div>
              <div className="game-comp-divider">vs</div>
              <div className="game-comp-player ale-side">
                <strong>Ale</strong>
                <span>Nivel {store.ale.memory.unlockedLevel} / 5</span>
                <small>{store.ale.memory.totalScore} pts · {store.ale.memory.totalStars} ⭐</small>
                {memoryLeader === 'ale' && <span className="comp-crown">👑 Líder</span>}
              </div>
            </div>
          </div>

          {/* Diamond Card */}
          <div className="ranking-game-item">
            <div className="ranking-game-item-top">
              <span className="ranking-game-glyph">💎</span>
              <div>
                <h4>Diamantitos 5D</h4>
                <small>Pintura con gemas</small>
              </div>
              <button
                type="button"
                className="button button-secondary game-item-play-btn"
                onClick={() => onGoToGame('diamond')}
              >
                Jugar ➔
              </button>
            </div>

            <div className="ranking-game-comparison">
              <div className="game-comp-player val-side">
                <strong>Valeria</strong>
                <span>Nivel {store.valeria.diamond.unlockedLevel} / 5</span>
                <small>{store.valeria.diamond.totalScore} pts · {store.valeria.diamond.totalStars} ⭐</small>
                {diamondLeader === 'valeria' && <span className="comp-crown">👑 Líder</span>}
              </div>
              <div className="game-comp-divider">vs</div>
              <div className="game-comp-player ale-side">
                <strong>Ale</strong>
                <span>Nivel {store.ale.diamond.unlockedLevel} / 5</span>
                <small>{store.ale.diamond.totalScore} pts · {store.ale.diamond.totalStars} ⭐</small>
                {diamondLeader === 'ale' && <span className="comp-crown">👑 Líder</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Romantic Trophies & Medals */}
      <div className="card ranking-trophies-card">
        <div className="ranking-table-header">
          <div>
            <span className="eyebrow">Muro de Trofeos</span>
            <h3>Insignias de Logros y Destreza en Pareja</h3>
          </div>
        </div>

        <div className="ranking-trophies-grid">
          {trophies.map(trophy => (
            <div key={trophy.id} className="ranking-trophy-item">
              <div className="ranking-trophy-icon">{trophy.icon}</div>
              <div className="ranking-trophy-info">
                <strong>{trophy.name}</strong>
                <p>{trophy.desc}</p>
                <div className="ranking-trophy-holders">
                  <span
                    className={`trophy-badge val ${trophy.valUnlocked ? 'is-unlocked' : 'is-locked'}`}
                    title={trophy.valUnlocked ? 'Valeria lo ha desbloqueado' : 'Valeria aún no lo desbloquea'}
                  >
                    🌸 Valeria {trophy.valUnlocked ? '✓' : '🔒'}
                  </span>
                  <span
                    className={`trophy-badge ale ${trophy.aleUnlocked ? 'is-unlocked' : 'is-locked'}`}
                    title={trophy.aleUnlocked ? 'Ale lo ha desbloqueado' : 'Ale aún no lo desbloquea'}
                  >
                    🌿 Ale {trophy.aleUnlocked ? '✓' : '🔒'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
