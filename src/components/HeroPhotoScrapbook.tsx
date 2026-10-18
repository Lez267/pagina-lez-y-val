'use client';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Heart } from 'lucide-react';
import type { Memory } from '../data/types';

interface HeroPhotoScrapbookProps {
  cover?: string;
  example: boolean;
  memories?: Memory[];
}

function Botanical({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path d="M10 110C35 85 55 55 90 20M35 85C20 70 15 50 18 35C30 40 45 55 55 70M60 55C50 35 55 18 68 10C73 25 75 40 70 58M85 30C82 15 90 5 105 2C106 18 98 28 88 35" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const DEFAULT_HERO_PHOTOS = [
  { url: '/images/memory-2.jpg', caption: 'mi lugar favorito en el mundo eres tú ♡' },
  { url: '/images/memory-1.jpg', caption: 'nuestras sonrisas ♡' },
  { url: '/images/memory-3.jpg', caption: 'juntitos siempre ♡' },
  { url: '/images/memory-4.jpg', caption: 'cada instante contigo ♡' },
  { url: '/images/memory-5.jpg', caption: 'nuestra historia de amor ♡' },
  { url: '/images/memory-6.jpg', caption: 'abrazaditos es mejor ♡' },
];

export interface HeroPhotoItem {
  url: string;
  caption: string;
  publicationId: string;
}

export default function HeroPhotoScrapbook({ cover, example, memories }: HeroPhotoScrapbookProps) {
  // Construir banco de fotos agrupado y etiquetado por publicación única
  const photoPool = useMemo<HeroPhotoItem[]>(() => {
    const pool: HeroPhotoItem[] = [];
    const usedUrls = new Set<string>();

    if (cover) {
      pool.push({
        url: cover,
        caption: 'mi lugar favorito en el mundo eres tú ♡',
        publicationId: 'pub-cover',
      });
      usedUrls.add(cover);
    }

    if (memories && memories.length > 0) {
      // Tomar una foto representativa por cada publicación (para que cada cambio sea de una publicación distinta)
      for (const mem of memories) {
        const photoMedia = mem.media?.find(m => m.type === 'image' && m.url && !usedUrls.has(m.url));
        if (photoMedia) {
          pool.push({
            url: photoMedia.url,
            caption: mem.title ? `${mem.title.slice(0, 32)} ♡` : 'recuerdo de nosotros ♡',
            publicationId: mem.id,
          });
          usedUrls.add(photoMedia.url);
        }
      }
    }

    // Default hero photos (cada una tratada como una publicación distinta)
    DEFAULT_HERO_PHOTOS.forEach((item, idx) => {
      if (!usedUrls.has(item.url)) {
        pool.push({
          ...item,
          publicationId: `pub-default-${idx}`,
        });
        usedUrls.add(item.url);
      }
    });

    return pool;
  }, [cover, memories]);

  // Índices independientes para cada polaroid asegurando que pertenezcan a publicaciones distintas
  const [frontIndex, setFrontIndex] = useState(0);
  const [backIndex, setBackIndex] = useState(() => (photoPool.length > 1 ? 1 : 0));
  const [isFrontFading, setIsFrontFading] = useState(false);
  const [isBackFading, setIsBackFading] = useState(false);

  // Turno para alternar: cambia una polaroid primero, y tras otro intervalo cambia la otra
  const turnRef = useRef<'front' | 'back'>('front');
  const frontIndexRef = useRef(frontIndex);
  const backIndexRef = useRef(backIndex);
  frontIndexRef.current = frontIndex;
  backIndexRef.current = backIndex;

  // Estado para la animación de dispersión inspirada en Gionatan Nese
  // Inicia listo (is-ready) para evitar cualquier parpadeo al abrir la web en móvil
  const [isScattered, setIsScattered] = useState(true);
  const [isReshuffling, setIsReshuffling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax interactivo 3D con lerp suave (exclusivo para desktop con ratón)
  const mouseTarget = useRef({ x: 0, y: 0 });
  const mouseCurrent = useRef({ x: 0, y: 0 });
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    // En móviles y tablets táctiles, no ejecutar bucle rAF para evitar micro-parpadeos de capas GPU y ahorro de batería
    const hasHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!hasHover) return;

    let active = true;
    const loop = () => {
      if (!active) return;
      const ease = 0.08;
      const dx = mouseTarget.current.x - mouseCurrent.current.x;
      const dy = mouseTarget.current.y - mouseCurrent.current.y;
      mouseCurrent.current.x += dx * ease;
      mouseCurrent.current.y += dy * ease;

      if (containerRef.current && (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001)) {
        containerRef.current.style.setProperty('--tilt-x', mouseCurrent.current.x.toFixed(4));
        containerRef.current.style.setProperty('--tilt-y', mouseCurrent.current.y.toFixed(4));
      }

      animFrameId.current = requestAnimationFrame(loop);
    };

    animFrameId.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, []);

  // Intervalo que cambia una imagen a la vez cada 4.5 segundos asegurando SIEMPRE distinta publicación

  useEffect(() => {
    if (photoPool.length < 2) return;

    const interval = setInterval(() => {
      if (turnRef.current === 'front') {
        setIsFrontFading(true);
        setTimeout(() => {
          const currentBackPub = photoPool[backIndexRef.current]?.publicationId;
          const currentFrontPub = photoPool[frontIndexRef.current]?.publicationId;
          
          let next = (frontIndexRef.current + 1) % photoPool.length;
          let attempts = 0;
          // Buscar una foto que sea de una publicación diferente a la frontal Y diferente a la trasera
          while (
            attempts < photoPool.length &&
            (next === backIndexRef.current ||
              photoPool[next]?.publicationId === currentFrontPub ||
              photoPool[next]?.publicationId === currentBackPub)
          ) {
            next = (next + 1) % photoPool.length;
            attempts++;
          }

          setFrontIndex(next);
          setTimeout(() => {
            setIsFrontFading(false);
          }, 60);
        }, 450);
        turnRef.current = 'back';
      } else {
        setIsBackFading(true);
        setTimeout(() => {
          const currentFrontPub = photoPool[frontIndexRef.current]?.publicationId;
          const currentBackPub = photoPool[backIndexRef.current]?.publicationId;

          let next = (backIndexRef.current + 1) % photoPool.length;
          let attempts = 0;
          // Buscar una foto que sea de una publicación diferente a la trasera Y diferente a la frontal
          while (
            attempts < photoPool.length &&
            (next === frontIndexRef.current ||
              photoPool[next]?.publicationId === currentBackPub ||
              photoPool[next]?.publicationId === currentFrontPub)
          ) {
            next = (next + 1) % photoPool.length;
            attempts++;
          }

          setBackIndex(next);
          setTimeout(() => {
            setIsBackFading(false);
          }, 60);
        }, 450);
        turnRef.current = 'front';
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [photoPool]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseTarget.current = { x: x * 2, y: y * 2 };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseTarget.current = { x: 0, y: 0 };
  }, []);

  // Interacción al hacer clic: juntar, barajar fotos y volver a dispersar garantizando publicaciones distintas
  const triggerReshuffle = useCallback(() => {
    if (isReshuffling || photoPool.length < 2) return;
    setIsReshuffling(true);
    setIsScattered(false);
    setTimeout(() => {
      setIsScattered(true);
      const nextFront = Math.floor(Math.random() * photoPool.length);
      let nextBack = (nextFront + 1) % photoPool.length;
      let attempts = 0;
      while (
        attempts < photoPool.length &&
        (nextBack === nextFront || photoPool[nextBack]?.publicationId === photoPool[nextFront]?.publicationId)
      ) {
        nextBack = (nextBack + 1) % photoPool.length;
        attempts++;
      }
      setFrontIndex(nextFront);
      setBackIndex(nextBack);
      setTimeout(() => {
        setIsReshuffling(false);
      }, 1100);
    }, 280);
  }, [isReshuffling, photoPool]);

  const frontItem = photoPool[frontIndex] || photoPool[0];
  const backItem = photoPool[backIndex] || photoPool[1] || photoPool[0];

  return (
    <div
      ref={containerRef}
      className={`hero-art hero-art-gn-space ${isReshuffling ? (isScattered ? 'is-scattered' : 'is-stacked') : 'is-ready'}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}

      onClick={triggerReshuffle}
      title="Toca para juntar y barajar nuestras fotos ♡"
      role="region"
      aria-label="Álbum fotográfico de nuestros recuerdos"
    >
      {/* Auria y brillos ambientales de fondo */}
      <div className="hero-aura aura-one" />
      <div className="hero-aura aura-two" />
      <Botanical className="hero-botanical" />

      {/* Estrellas y corazones flotantes */}
      <span className="art-star art-star-one">✧</span>
      <span className="art-star art-star-two">✦</span>
      <span className="art-star art-star-three">❀</span>
      <span className="floating-heart-doodle doodle-one">❤</span>
      <span className="floating-heart-doodle doodle-two">♡</span>

      {/* Escena 3D contenedora de las polaroids y papelería */}
      <div className="hero-polaroid-stage">
        {/* 1. Polaroid trasera (izquierda) */}
        <div className="polaroid polaroid-back polaroid-gn-item">
          <div className="washi-tape tape-gold" />
          <div className="polaroid-photo-wrapper">
            <img
              src={backItem.url}
              alt="Un recuerdo de nuestra historia"
              className={`polaroid-animated-img ${isBackFading ? 'is-fading' : 'is-visible'}`}
            />
          </div>
          <span className={`polaroid-caption ${isBackFading ? 'is-fading' : 'is-visible'}`}>
            {backItem.caption}
          </span>
        </div>

        {/* 2. Polaroid delantera (derecha, protagonista) */}
        <div className="polaroid polaroid-front polaroid-gn-item">
          <div className="washi-tape tape-pink" />
          <div className="polaroid-photo polaroid-photo-wrapper">
            <img
              src={frontItem.url}
              alt="Nuestro recuerdo favorito"
              className={`polaroid-animated-img ${isFrontFading ? 'is-fading' : 'is-visible'}`}
            />
          </div>
          <span className={`polaroid-caption ${isFrontFading ? 'is-fading' : 'is-visible'}`}>
            {frontItem.caption} <Heart size={13} fill="currentColor" />
          </span>
        </div>

        {/* 3. Sello vintage de amor */}
        <div className="love-stamp stamp-gn-item" aria-hidden="true">
          <div className="stamp-inner">
            <Heart size={15} fill="currentColor" />
            <span>17·04</span>
            <small>A & V · 2026</small>
          </div>
        </div>

        {/* 4. Nota adhesiva escrita a mano */}
        <div className="handwritten-note note-gn-item">
          tú, yo<br />& todo lo bonito ♡
          <svg viewBox="0 0 70 45" aria-hidden="true">
            <path d="M3 3C34 36 46 3 64 35M53 31L64 35L65 24" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </div>
      </div>
    </div>
  );
}
