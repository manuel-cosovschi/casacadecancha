'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export interface NovedadSlide {
  href: string;
  cta: string;
  title: string;
  tone: 'red' | 'gold' | 'celeste' | 'navy';
  // Slide de "novedad" (forma de comprar): usa emoji + descripción.
  emoji?: string;
  desc?: string;
  // Slide de producto: usa imagen + precio.
  image?: string | null;
  price?: string;
  badge?: string;
}

const TONE: Record<NovedadSlide['tone'], string> = {
  red: 'from-red-100 via-red-50',
  gold: 'from-gold/25 via-gold/10',
  celeste: 'from-celeste/25 via-celeste/10',
  navy: 'from-navy/10 via-navy/5',
};

const INTERVAL = 4500;

export function NovedadesCarousel({ slides }: { slides: NovedadSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [drag, setDrag] = useState(0); // desplazamiento en px mientras se arrastra
  const count = slides.length;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startX = useRef(0);
  const swiped = useRef(false); // true si el último gesto fue un deslizamiento (para no navegar)

  useEffect(() => {
    if (count <= 1 || paused || dragging) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [count, paused, dragging]);

  // Si cambia la cantidad de slides (se agregó/quitó una novedad), no quedar fuera de rango.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (count === 0) return null;

  const go = (i: number) => setIndex(((i % count) + count) % count);

  const onPointerDown = (e: React.PointerEvent) => {
    if (count <= 1) return;
    startX.current = e.clientX;
    swiped.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDrag(e.clientX - startX.current);
  };
  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    const threshold = 45;
    if (dx <= -threshold) {
      swiped.current = true;
      go(index + 1);
    } else if (dx >= threshold) {
      swiped.current = true;
      go(index - 1);
    }
    setDrag(0);
    setDragging(false);
    // Dejar activo "swiped" un instante para cancelar el click que sigue al soltar.
    if (swiped.current) window.setTimeout(() => (swiped.current = false), 60);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex touch-pan-y select-none"
          style={{
            transform: `translateX(calc(-${index * 100}% + ${drag}px))`,
            transition: dragging ? 'none' : 'transform 700ms ease-out',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDragStart={(e) => e.preventDefault()}
        >
          {slides.map((s) => (
            <Link
              key={s.href + s.title}
              href={s.href}
              draggable={false}
              onClick={(e) => {
                if (swiped.current) e.preventDefault();
              }}
              className={`group flex w-full shrink-0 items-center justify-between gap-4 border border-navy/5 bg-gradient-to-br to-white p-6 shadow-card sm:min-h-[208px] sm:p-8 ${TONE[s.tone]}`}
            >
              {s.image ? (
                // Slide de producto
                <>
                  <div className="min-w-0">
                    {s.badge && (
                      <span className="badge bg-navy text-cream">{s.badge}</span>
                    )}
                    <h3 className="mt-2 text-xl font-black uppercase leading-tight tracking-tight text-navy line-clamp-2 sm:text-2xl">
                      {s.title}
                    </h3>
                    {s.price && (
                      <p className="mt-1 text-lg font-extrabold text-navy sm:text-xl">{s.price}</p>
                    )}
                    <span className="btn-primary mt-4 inline-flex">{s.cta} →</span>
                  </div>
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-cream-soft sm:h-40 sm:w-40">
                    <Image
                      src={s.image}
                      alt={s.title}
                      fill
                      sizes="160px"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                </>
              ) : (
                // Slide de novedad (forma de comprar)
                <>
                  <div className="flex items-start gap-4">
                    <span className="text-4xl sm:text-5xl">{s.emoji}</span>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight text-navy sm:text-2xl">
                        {s.title}
                      </h3>
                      {s.desc && (
                        <p className="mt-1.5 max-w-lg text-sm text-navy/70 sm:text-base">
                          {s.desc}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="btn-primary hidden shrink-0 self-center sm:inline-flex">
                    {s.cta} →
                  </span>
                </>
              )}
            </Link>
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => go(index - 1)}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-navy/10 bg-white/90 p-2 text-navy shadow-card transition hover:bg-white sm:flex"
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={() => go(index + 1)}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-navy/10 bg-white/90 p-2 text-navy shadow-card transition hover:bg-white sm:flex"
          >
            <Chevron dir="right" />
          </button>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.href + i}
                type="button"
                aria-label={`Ir a ${s.title}`}
                onClick={() => go(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-6 bg-navy' : 'w-2 bg-navy/25 hover:bg-navy/40'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}
