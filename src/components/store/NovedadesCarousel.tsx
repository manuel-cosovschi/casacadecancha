'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export interface NovedadSlide {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  cta: string;
  tone: 'red' | 'gold' | 'celeste';
}

const TONE: Record<NovedadSlide['tone'], string> = {
  red: 'from-red-100 via-red-50',
  gold: 'from-gold/25 via-gold/10',
  celeste: 'from-celeste/25 via-celeste/10',
};

const INTERVAL = 4500;

export function NovedadesCarousel({ slides }: { slides: NovedadSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (count <= 1 || paused) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [count, paused]);

  if (count === 0) return null;

  const go = (i: number) => setIndex(((i % count) + count) % count);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s) => (
            <Link
              key={s.href + s.title}
              href={s.href}
              className={`group flex w-full shrink-0 flex-col justify-between gap-4 border border-navy/5 bg-gradient-to-br to-white p-6 shadow-card sm:min-h-[196px] sm:flex-row sm:items-center sm:p-8 ${TONE[s.tone]}`}
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl sm:text-5xl">{s.emoji}</span>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-navy sm:text-2xl">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 max-w-lg text-sm text-navy/70 sm:text-base">{s.desc}</p>
                </div>
              </div>
              <span className="btn-primary shrink-0 self-start sm:self-auto">{s.cta} →</span>
            </Link>
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          {/* Flechas (no navegan: sólo cambian de slide) */}
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

          {/* Puntitos */}
          <div className="mt-4 flex justify-center gap-2">
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
