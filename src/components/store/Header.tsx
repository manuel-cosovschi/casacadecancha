'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { useCart } from '@/components/cart/CartProvider';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Inicio', href: '/' },
  { label: 'Camisetas', href: '/camisetas' },
  { label: 'Niños', href: '/ninos' },
  { label: 'Buzos', href: '/buzos' },
  { label: 'Guía de talles', href: '/guia-de-talles' },
  { label: 'Preguntas frecuentes', href: '/preguntas-frecuentes' },
];

export function Header() {
  const { count, open } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-white/10 bg-navy/95 backdrop-blur transition-shadow',
        scrolled && 'shadow-lg',
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <button
          type="button"
          className="text-cream lg:hidden"
          aria-label="Abrir menú"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <BurgerIcon open={menuOpen} />
        </button>

        <Link href="/" className="shrink-0" aria-label="Inicio">
          <Logo theme="dark" />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-cream/90 transition hover:text-celeste"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={open}
          className="relative flex items-center gap-2 text-cream"
          aria-label="Abrir carrito"
        >
          <CartIcon />
          {count > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-celeste px-1 text-xs font-bold text-navy">
              {count}
            </span>
          )}
        </button>
      </div>

      {/* Menú mobile */}
      {menuOpen && (
        <nav className="border-t border-white/10 bg-navy lg:hidden">
          <div className="container-page flex flex-col py-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-white/5 py-3 text-sm font-medium text-cream/90"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 4h2l2.4 12.3A2 2 0 0 0 9.4 18h8.2a2 2 0 0 0 2-1.6L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="20.5" r="1.3" fill="currentColor" />
      <circle cx="17.5" cy="20.5" r="1.3" fill="currentColor" />
    </svg>
  );
}

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}
