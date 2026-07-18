'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';

const SECTIONS: { title: string; items: { label: string; href: string }[] }[] = [
  {
    title: 'General',
    items: [{ label: 'Resumen', href: '/admin' }],
  },
  {
    title: 'Catálogo',
    items: [
      { label: 'Productos', href: '/admin/productos' },
      { label: 'Colecciones', href: '/admin/colecciones' },
      { label: 'Stock', href: '/admin/stock' },
    ],
  },
  {
    title: 'Ventas',
    items: [
      { label: 'Pedidos', href: '/admin/pedidos' },
      { label: 'Envíos', href: '/admin/envios' },
      { label: 'Faltantes', href: '/admin/faltantes' },
      { label: 'Encargos', href: '/admin/encargos' },
      { label: 'Clientes', href: '/admin/clientes' },
      { label: 'Promociones', href: '/admin/promociones' },
      { label: 'Marketing', href: '/admin/marketing' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { label: 'Rentabilidad', href: '/admin/rentabilidad' },
      { label: 'Gastos', href: '/admin/gastos' },
      { label: 'Meta Ads', href: '/admin/ads' },
      { label: 'Analítica', href: '/admin/analitica' },
    ],
  },
  {
    title: 'Contenido',
    items: [
      { label: 'Contenido de la web', href: '/admin/contenido' },
      { label: 'Guía de talles', href: '/admin/talles' },
      { label: 'Preguntas frecuentes', href: '/admin/faq' },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { label: 'Configuración', href: '/admin/configuracion' },
      { label: 'Usuarios', href: '/admin/usuarios' },
      { label: 'Mi cuenta', href: '/admin/cuenta' },
      { label: 'Logs', href: '/admin/logs' },
    ],
  },
];

// Rutas que ve un vendedor (workspace propio). El dueño ve todo.
const SELLER_HREFS = new Set(['/admin', '/admin/encargos', '/admin/rentabilidad', '/admin/cuenta']);

export function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isOwner = role === 'owner' || role === 'admin';

  const sections = isOwner
    ? SECTIONS
    : SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => SELLER_HREFS.has(i.href)) })).filter(
        (s) => s.items.length > 0,
      );

  return (
    <>
      {/* Topbar mobile */}
      <div className="flex items-center justify-between border-b border-white/10 bg-navy px-4 py-3 lg:hidden">
        <Logo theme="dark" />
        <button onClick={() => setOpen((v) => !v)} className="text-cream" aria-label="Menú">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto bg-navy text-cream transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="hidden p-5 lg:block">
          <Logo theme="dark" variant="stacked" />
        </div>
        <nav className="px-3 pb-10">
          {sections.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-celeste/70">
                {section.title}
              </p>
              {section.items.map((item) => {
                const active =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'block rounded-lg px-3 py-2 text-sm font-medium transition',
                      active ? 'bg-celeste text-navy' : 'text-cream/80 hover:bg-white/10',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
