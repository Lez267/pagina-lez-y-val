import { useMemo } from 'react';
import './romantic-flowers.css';

interface PetalData {
  id: number;
  left: string;
  size: number;
  driftClass: string;
  duration: string;
  delay: string;
  color: string;
  opacity: number;
}

interface StarData {
  id: number;
  top: string;
  left: string;
  size: number;
  delay: string;
}

function PetalShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 24 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`petal-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff5f7" stopOpacity="0.9" />
          <stop offset="40%" stopColor={color} stopOpacity="0.85" />
          <stop offset="100%" stopColor="#e4597b" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <path
        d="M 12 1 C 18 6, 23 15, 20 25 C 16 31, 8 31, 4 25 C 1 15, 6 6, 12 1 Z"
        fill={`url(#petal-grad-${size})`}
      />
      {/* Vena sutil en el pétalo */}
      <path
        d="M 12 5 C 12.5 14, 12 21, 12 27"
        stroke="rgba(255, 255, 255, 0.45)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CornerBouquet({ className }: { className: string }) {
  return (
    <svg className={`botanical-corner ${className}`} viewBox="0 0 320 320" fill="none" aria-hidden="true">
      <defs>
        {/* Degradados botánicos */}
        <linearGradient id="rose-outer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe6ee" />
          <stop offset="60%" stopColor="#ff9bb3" />
          <stop offset="100%" stopColor="#e9587c" />
        </linearGradient>
        <linearGradient id="rose-mid-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffadc2" />
          <stop offset="70%" stopColor="#f36287" />
          <stop offset="100%" stopColor="#c73259" />
        </linearGradient>
        <linearGradient id="rose-inner-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff85a3" />
          <stop offset="100%" stopColor="#a71940" />
        </linearGradient>
        <linearGradient id="leaf-grad-1" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3d633b" />
          <stop offset="60%" stopColor="#678c64" />
          <stop offset="100%" stopColor="#93b990" />
        </linearGradient>
        <linearGradient id="leaf-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2e4e2c" />
          <stop offset="60%" stopColor="#4f734c" />
          <stop offset="100%" stopColor="#7a9e76" />
        </linearGradient>
        <radialGradient id="pollen-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff3cf" />
          <stop offset="60%" stopColor="#ffc83b" />
          <stop offset="100%" stopColor="#d9891c" />
        </radialGradient>
      </defs>

      {/* 1. Tallos botánicos curvos */}
      <g className="bloom-stem" stroke="#486d45" strokeWidth="3" strokeLinecap="round">
        <path d="M 10 310 C 60 260, 90 200, 150 160" />
        <path d="M 50 280 C 110 240, 160 190, 230 110" />
        <path d="M 120 180 C 170 150, 190 80, 220 40" strokeWidth="2.2" />
        <path d="M 70 240 C 40 180, 50 120, 60 70" strokeWidth="2" />
      </g>

      {/* 2. Hojas de eucalipto y salvia */}
      <g className="bloom-leaf">
        {/* Hojas grandes inferiores */}
        <path
          d="M 60 270 C 40 230, 20 200, 5 180 C 35 185, 65 220, 75 255 Z"
          fill="url(#leaf-grad-1)"
          opacity="0.95"
        />
        <path
          d="M 85 240 C 120 210, 140 180, 150 140 C 120 150, 95 190, 80 225 Z"
          fill="url(#leaf-grad-2)"
          opacity="0.9"
        />
        <path
          d="M 140 170 C 180 150, 210 130, 235 95 C 205 105, 170 135, 135 160 Z"
          fill="url(#leaf-grad-1)"
          opacity="0.88"
        />
        <path
          d="M 175 145 C 195 110, 215 75, 230 40 C 205 55, 185 90, 170 130 Z"
          fill="url(#leaf-grad-2)"
          opacity="0.85"
        />
        {/* Hoja silvestre hacia arriba */}
        <path
          d="M 60 180 C 45 130, 50 85, 65 50 C 75 90, 75 135, 65 170 Z"
          fill="url(#leaf-grad-1)"
          opacity="0.85"
        />
      </g>

      {/* 3. Florecitas pequeñas de acompañamiento (Baby's breath / Jazmín) */}
      <g className="bloom-leaf">
        {/* Flor pequeña 1 */}
        <g transform="translate(225, 38)">
          <circle cx="0" cy="0" r="11" fill="#fff5f8" />
          <circle cx="-6" cy="-4" r="7" fill="#ffd1dd" />
          <circle cx="6" cy="-4" r="7" fill="#ffd1dd" />
          <circle cx="0" cy="6" r="7" fill="#ffd1dd" />
          <circle cx="0" cy="0" r="3.5" fill="#f7b731" />
        </g>
        {/* Flor pequeña 2 */}
        <g transform="translate(62, 65)">
          <circle cx="0" cy="0" r="12" fill="#fff5f8" />
          <circle cx="-6" cy="-5" r="7.5" fill="#ffccd8" />
          <circle cx="6" cy="-5" r="7.5" fill="#ffccd8" />
          <circle cx="0" cy="6.5" r="7.5" fill="#ffccd8" />
          <circle cx="0" cy="0" r="4" fill="#f7b731" />
        </g>
        {/* Capullo silvestre */}
        <g transform="translate(245, 105) rotate(25)">
          <path d="M 0 0 C 10 -15, 22 -15, 26 0 C 22 15, 10 15, 0 0 Z" fill="url(#rose-mid-grad)" />
          <path d="M -2 0 C 6 -8, 14 -8, 18 0" stroke="#486d45" strokeWidth="2" fill="none" />
        </g>
      </g>

      {/* 4. GRAN ROSA INGLESA / PEONÍA PRINCIPAL (CENTRO BOTÁNICO) */}
      <g transform="translate(135, 175)">
        {/* Capa 1: Pétalos exteriores suaves */}
        <g className="bloom-petals-outer">
          <ellipse cx="0" cy="-38" rx="28" ry="36" fill="url(#rose-outer-grad)" opacity="0.92" />
          <ellipse cx="36" cy="-18" rx="28" ry="35" transform="rotate(50 36 -18)" fill="url(#rose-outer-grad)" opacity="0.92" />
          <ellipse cx="32" cy="24" rx="27" ry="34" transform="rotate(110 32 24)" fill="url(#rose-outer-grad)" opacity="0.92" />
          <ellipse cx="-16" cy="36" rx="28" ry="35" transform="rotate(170 -16 36)" fill="url(#rose-outer-grad)" opacity="0.92" />
          <ellipse cx="-38" cy="6" rx="27" ry="34" transform="rotate(230 -38 6)" fill="url(#rose-outer-grad)" opacity="0.92" />
          <ellipse cx="-26" cy="-30" rx="28" ry="35" transform="rotate(295 -26 -30)" fill="url(#rose-outer-grad)" opacity="0.92" />
        </g>

        {/* Capa 2: Pétalos intermedios rizados */}
        <g className="bloom-petals-mid">
          <ellipse cx="0" cy="-24" rx="20" ry="26" fill="url(#rose-mid-grad)" />
          <ellipse cx="23" cy="-10" rx="20" ry="25" transform="rotate(55 23 -10)" fill="url(#rose-mid-grad)" />
          <ellipse cx="20" cy="16" rx="19" ry="25" transform="rotate(120 20 16)" fill="url(#rose-mid-grad)" />
          <ellipse cx="-10" cy="22" rx="20" ry="25" transform="rotate(185 -10 22)" fill="url(#rose-mid-grad)" />
          <ellipse cx="-23" cy="2" rx="19" ry="24" transform="rotate(245 -23 2)" fill="url(#rose-mid-grad)" />
          <ellipse cx="-15" cy="-18" rx="20" ry="25" transform="rotate(305 -15 -18)" fill="url(#rose-mid-grad)" />
        </g>

        {/* Capa 3: Capullo interior aterciopelado */}
        <g className="bloom-petals-inner">
          <path d="M -16 -6 C -12 -22, 12 -22, 16 -6 C 14 12, -14 12, -16 -6 Z" fill="url(#rose-inner-grad)" />
          <path d="M -10 -12 C 0 -22, 16 -12, 12 2 C 0 8, -8 2, -10 -12 Z" fill="#ff7a99" opacity="0.85" />
          <path d="M -4 -8 C 4 -16, 12 -8, 8 2 C 0 6, -4 0, -4 -8 Z" fill="#d92d56" />
        </g>

        {/* Capa 4: Centro dorado radiante */}
        <g className="bloom-core">
          <circle cx="0" cy="-2" r="8" fill="url(#pollen-glow)" />
          {/* Estambres y polen */}
          <circle cx="-3" cy="-5" r="1.5" fill="#fff" />
          <circle cx="3" cy="-4" r="1.5" fill="#fff" />
          <circle cx="4" cy="1" r="1.5" fill="#fff" />
          <circle cx="-3" cy="2" r="1.5" fill="#fff" />
          <circle cx="0" cy="-1" r="1.5" fill="#fff" />
        </g>
      </g>

      {/* 5. Destellos de estrellas doradas mágicas */}
      <g className="bloom-twinkle">
        <path d="M 270 70 L 273 78 L 281 81 L 273 84 L 270 92 L 267 84 L 259 81 L 267 78 Z" fill="#ffeaa7" />
        <path d="M 80 120 L 82 126 L 88 128 L 82 130 L 80 136 L 78 130 L 72 128 L 78 126 Z" fill="#fff3cd" />
        <path d="M 195 235 L 197 240 L 202 242 L 197 244 L 195 249 L 193 244 L 188 242 L 193 240 Z" fill="#ffeaa7" />
      </g>
    </svg>
  );
}

function CornerVineTop({ className }: { className: string }) {
  return (
    <svg className={`botanical-corner ${className}`} viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="top-vine-leaf" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9fc19b" />
          <stop offset="60%" stopColor="#5d855a" />
          <stop offset="100%" stopColor="#375535" />
        </linearGradient>
        <linearGradient id="top-blossom" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#ffb9cb" />
          <stop offset="100%" stopColor="#e4597b" />
        </linearGradient>
      </defs>

      {/* Tallo colgante suave */}
      <path
        d="M 0 0 C 40 40, 75 90, 110 150 M 55 58 C 95 65, 140 90, 175 125"
        stroke="#4f754b"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Hojas colgantes */}
      <path d="M 35 32 C 60 25, 75 35, 80 50 C 65 52, 45 45, 35 32 Z" fill="url(#top-vine-leaf)" opacity="0.9" />
      <path d="M 70 80 C 95 72, 112 85, 118 102 C 100 102, 82 95, 70 80 Z" fill="url(#top-vine-leaf)" opacity="0.88" />
      <path d="M 98 135 C 120 130, 132 142, 136 156 C 122 155, 108 148, 98 135 Z" fill="url(#top-vine-leaf)" opacity="0.85" />
      <path d="M 125 78 C 150 70, 168 82, 172 98 C 155 98, 138 92, 125 78 Z" fill="url(#top-vine-leaf)" opacity="0.88" />

      {/* Florecitas de cerezo / durazno */}
      <g transform="translate(85, 52)">
        <circle cx="0" cy="0" r="10" fill="url(#top-blossom)" />
        <circle cx="-5" cy="-3" r="6" fill="#ffd5df" />
        <circle cx="5" cy="-3" r="6" fill="#ffd5df" />
        <circle cx="0" cy="5" r="6" fill="#ffd5df" />
        <circle cx="0" cy="0" r="3" fill="#ffc107" />
      </g>
      <g transform="translate(142, 92)">
        <circle cx="0" cy="0" r="9" fill="url(#top-blossom)" />
        <circle cx="-4" cy="-3" r="5.5" fill="#ffd5df" />
        <circle cx="4" cy="-3" r="5.5" fill="#ffd5df" />
        <circle cx="0" cy="4.5" r="5.5" fill="#ffd5df" />
        <circle cx="0" cy="0" r="2.5" fill="#ffc107" />
      </g>
      <g transform="translate(108, 146)">
        <circle cx="0" cy="0" r="8" fill="url(#top-blossom)" />
        <circle cx="-4" cy="-2.5" r="5" fill="#ffd5df" />
        <circle cx="4" cy="-2.5" r="5" fill="#ffd5df" />
        <circle cx="0" cy="4" r="5" fill="#ffd5df" />
        <circle cx="0" cy="0" r="2" fill="#ffc107" />
      </g>
    </svg>
  );
}

export default function RomanticFlowers() {
  // 14 pétalos flotantes con trayectorias GPU ultra-fluidas (60fps sin reflow)
  const petals = useMemo<PetalData[]>(() => {
    const colors = ['#ffa4ba', '#ffb9cb', '#f87d9c', '#ffd2dc', '#f58fa8'];
    return Array.from({ length: 14 }, (_, index) => {
      // Distribución horizontal bien espaciada
      const leftPositions = [4, 12, 20, 29, 38, 47, 56, 64, 73, 81, 89, 95, 24, 70];
      const baseLeft = leftPositions[index % leftPositions.length];
      const size = 18 + (index % 3) * 5; // 18px, 23px, 28px
      const duration = `${7.5 + (index % 4) * 1.4}s`;
      // Retrasos negativos para que ya estén en vuelo de forma continua
      const delay = `-${(index * 1.8) % 8}s`;
      const driftClass = `petal-drift-${(index % 4) + 1}`;
      const color = colors[index % colors.length];
      const opacity = 0.8 + (index % 3) * 0.08;

      return {
        id: index,
        left: `${baseLeft}%`,
        size,
        driftClass,
        duration,
        delay,
        color,
        opacity,
      };
    });
  }, []);

  // 8 partículas sutiles de estrellas ambientales
  const stars = useMemo<StarData[]>(() => {
    return [
      { id: 1, top: '16%', left: '12%', size: 4, delay: '0s' },
      { id: 2, top: '24%', left: '86%', size: 3, delay: '0.8s' },
      { id: 3, top: '48%', left: '9%', size: 5, delay: '1.5s' },
      { id: 4, top: '68%', left: '91%', size: 4, delay: '0.4s' },
      { id: 5, top: '82%', left: '18%', size: 3, delay: '1.2s' },
      { id: 6, top: '86%', left: '80%', size: 4, delay: '2s' },
      { id: 7, top: '12%', left: '76%', size: 3, delay: '1.8s' },
      { id: 8, top: '38%', left: '93%', size: 4, delay: '0.6s' },
    ];
  }, []);

  return (
    <div className="romantic-floral-canvas" aria-hidden="true">
      {/* Halo de luz cálida difusa detrás de la carta */}
      <div className="romantic-ambient-glow" />

      {/* Lluvia suave de pétalos flotantes con aceleración GPU pura */}
      <div className="falling-petals-layer">
        {petals.map(petal => (
          <div
            key={petal.id}
            className={`falling-petal ${petal.driftClass}`}
            style={{
              left: petal.left,
              animationDuration: petal.duration,
              animationDelay: petal.delay,
              opacity: petal.opacity,
            }}
          >
            <PetalShape size={petal.size} color={petal.color} />
          </div>
        ))}
      </div>

      {/* Destellos de estrellas suaves en el fondo */}
      <div className="ambient-sparkles-layer">
        {stars.map(star => (
          <div
            key={star.id}
            className="ambient-star"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>

      {/* Ramilletes botánicos en las esquinas inferiores (Enmarcan la carta sin taparla) */}
      <CornerBouquet className="botanical-bottom-left" />
      <CornerBouquet className="botanical-bottom-right" />

      {/* Ramitas florales colgantes en las esquinas superiores */}
      <CornerVineTop className="botanical-top-left" />
      <CornerVineTop className="botanical-top-right" />
    </div>
  );
}
