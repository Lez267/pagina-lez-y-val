import { useState, useRef } from 'react';
import { CalendarHeart, Flower2, Heart, LoaderCircle, Sparkles, Upload } from 'lucide-react';
import { RELATIONSHIP_START } from '../data/demo';
import { daysSince, dateLabel } from '../lib/dates';
import { Botanical } from './Botanical';
import './studio.css';

interface LoginPageProps {
  onLogin: () => Promise<void>;
  loading: boolean;
  error: string;
  magic: boolean;
  setMagic: (magic: boolean) => void;
  onImportFile?: (file?: File) => Promise<void>;
}

const ROMANTIC_PARTICLES = [
  { symbol: '❤', size: 14, left: '6%', delay: '0s', duration: '14s' },
  { symbol: '✧', size: 12, left: '16%', delay: '3s', duration: '11s' },
  { symbol: '❀', size: 15, left: '26%', delay: '7s', duration: '16s' },
  { symbol: '♡', size: 16, left: '36%', delay: '1.5s', duration: '13s' },
  { symbol: '✦', size: 11, left: '46%', delay: '8s', duration: '12s' },
  { symbol: '❤', size: 13, left: '56%', delay: '4s', duration: '15s' },
  { symbol: '✿', size: 14, left: '66%', delay: '9s', duration: '17s' },
  { symbol: '✧', size: 12, left: '76%', delay: '5.5s', duration: '12s' },
  { symbol: '♡', size: 15, left: '86%', delay: '2s', duration: '14s' },
  { symbol: '❤', size: 13, left: '94%', delay: '6.5s', duration: '15s' },
];

export default function LoginPage({
  onLogin,
  loading,
  error,
  magic,
  setMagic,
  onImportFile,
}: LoginPageProps) {
  const [showBackup, setShowBackup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`login-page-shell ${magic ? '' : 'magic-off'}`}>
      {/* Fondo animado romántico: nubes de ensueño, ramas botánicas y partículas */}
      <div className="ambient-garden" aria-hidden="true">
        <div className="ambient-cloud ambient-cloud-1" />
        <div className="ambient-cloud ambient-cloud-2" />
        <div className="ambient-cloud ambient-cloud-3" />
        <Botanical className="ambient-branch" />
        {ROMANTIC_PARTICLES.map((particle, i) => (
          <span
            key={i}
            className="romantic-particle"
            style={{
              left: particle.left,
              fontSize: `${particle.size}px`,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          >
            {particle.symbol}
          </span>
        ))}
      </div>

      {/* Botón flotante para pausar/activar magia de animaciones */}
      <div className="login-top-bar">
        <button
          className="icon-button magic-toggle"
          onClick={() => setMagic(!magic)}
          aria-label={magic ? 'Pausar animaciones románticas' : 'Activar animaciones románticas'}
          title={magic ? 'Pausar animaciones' : 'Activar animaciones'}
        >
          <Sparkles size={17} />
        </button>
      </div>

      {/* Contenedor central con tarjeta de Login premium */}
      <main className="login-main-container">
        <div className="login-card">
          {/* Badge romántico superior */}
          <div className="login-badge-wrap">
            <span className="login-pill-badge">
              <Flower2 size={13} />
              <span>Login · Nuestro pequeño universo</span>
            </span>
          </div>

          {/* Título de la página de Val y Lez */}
          <h1 className="login-title">
            <span>Página de Val y Lez</span>
            <span className="login-heart-symbol" aria-hidden="true">
              ❤
            </span>
          </h1>

          <p className="login-subtitle">
            Un rinconcito creado con todo el amor para guardar nuestros recuerdos, cartas, música,
            cartelera de cine y cada momento bonito que pasamos juntos.
          </p>

          {/* Tarjeta de días de novios */}
          <div className="login-counter-card">
            <div className="login-counter-header">
              <span className="counter-calendar-icon">
                <CalendarHeart size={20} />
              </span>
              <span className="counter-anniversary-date">
                Novios desde el {dateLabel(RELATIONSHIP_START)}
              </span>
            </div>

            <div className="login-counter-body">
              <span className="counter-big-number">{daysSince(RELATIONSHIP_START)}</span>
              <div className="counter-text-group">
                <strong className="counter-days-word">días juntos</strong>
                <span className="counter-sweet-text">haciéndome la persona más feliz ♡</span>
              </div>
            </div>

            <div className="login-counter-footer">
              <span className="counter-heart-beat">❤</span>
              <span>y contando cada segundo a tu lado</span>
            </div>
          </div>

          {/* Botón principal de Iniciar Sesión con Google */}
          <div className="login-cta-section">
            <button
              type="button"
              className="button button-google login-google-btn"
              onClick={onLogin}
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle size={20} className="spinning" />
                  <span>Abriendo nuestro rinconcito…</span>
                </>
              ) : (
                <>
                  <svg className="google-icon" viewBox="0 0 24 24" width="22" height="22">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Iniciar sesión con Google</span>
                </>
              )}
            </button>

            {error && (
              <div className="login-error-alert" role="alert">
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Acceso opcional a respaldo JSON local */}
          {onImportFile && (
            <div className="login-backup-access">
              {!showBackup ? (
                <button
                  type="button"
                  className="login-backup-toggle"
                  onClick={() => setShowBackup(true)}
                >
                  ¿Tienes un archivo de respaldo JSON?
                </button>
              ) : (
                <div className="login-backup-box">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    hidden
                    onChange={e => void onImportFile(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    className="button button-secondary login-backup-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    <Upload size={15} />
                    <span>Abrir respaldo local</span>
                  </button>
                  <button
                    type="button"
                    className="text-link"
                    style={{ fontSize: '12px' }}
                    onClick={() => setShowBackup(false)}
                  >
                    Ocultar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Pie de tarjeta íntimo */}
          <div className="login-card-footer">
            <Heart size={14} fill="currentColor" className="login-footer-heart" />
            <span>Hecho con todo el amor para Valeria</span>
          </div>
        </div>
      </main>
    </div>
  );
}
