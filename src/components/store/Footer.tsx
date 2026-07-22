import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { whatsappLink } from '@/lib/utils';

interface FooterData {
  instagram: string;
  whatsapp: string;
  email: string;
  location: string;
  legal_name: string;
  cuit: string;
}

export function Footer({ data }: { data: FooterData }) {
  const year = new Date().getFullYear();
  return (
    <footer className="gradient-navy relative mt-24 overflow-hidden text-cream">
      <div className="brand-stripes pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      {/* CTA band */}
      <div className="relative border-b border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-10 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="text-2xl font-black uppercase">¿Tenés una duda?</h3>
            <p className="mt-1 text-cream/70">Escribinos por WhatsApp, te respondemos al toque.</p>
          </div>
          <a
            href={whatsappLink(data.whatsapp, 'Hola, quería hacer una consulta.')}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-celeste"
          >
            Consultar por WhatsApp
          </a>
        </div>
      </div>

      <div className="container-page relative grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo theme="dark" variant="stacked" />
          <p className="max-w-xs text-sm text-cream/65">
            Indumentaria de fútbol desde {data.location}. Vestí los colores que te representan.
          </p>
          <div className="flex gap-2.5">
            <SocialLink href={data.instagram} label="Instagram">
              <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5.5-2.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
            </SocialLink>
            <SocialLink
              href={whatsappLink(data.whatsapp, 'Hola, quería hacer una consulta.')}
              label="WhatsApp"
            >
              <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7L7 20.4A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.2 1.1-1.7 1.2-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.5-2.6-1.1-4.3-3.7-4.4-3.9-.1-.2-1-1.3-1-2.5s.6-1.7.8-2c.2-.2.5-.3.6-.3h.5c.2 0 .4 0 .6.5l.7 1.7c.1.2.1.4 0 .5l-.3.5-.3.3c-.1.1-.2.3-.1.5.1.2.6 1 1.3 1.6.9.8 1.6 1 1.8 1.1.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3.1.1.1.5-.1 1z" />
            </SocialLink>
            <SocialLink href={`mailto:${data.email}`} label="Email">
              <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7L4 7v.8l8 5 8-5V7l-8 5z" />
            </SocialLink>
          </div>
        </div>

        <FooterCol title="Tienda" links={[
          ['Camisetas', '/camisetas'],
          ['Niños', '/ninos'],
          ['Buzos', '/buzos'],
          ['Guía de talles', '/guia-de-talles'],
          ['Preguntas frecuentes', '/preguntas-frecuentes'],
        ]} />

        <FooterCol title="Información" links={[
          ['Seguí tu pedido', '/seguimiento'],
          ['Envíos', '/legales/envios'],
          ['Cambios y devoluciones', '/legales/cambios'],
          ['Privacidad', '/legales/privacidad'],
          ['Términos', '/legales/terminos'],
          ['Botón de arrepentimiento', '/legales/arrepentimiento'],
        ]} />

        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-celeste">Contacto</h4>
          <ul className="space-y-2.5 text-sm text-cream/75">
            <li><a href={`mailto:${data.email}`} className="hover:text-celeste">{data.email}</a></li>
            <li>{data.location}</li>
            <li>Envíos a todo el país</li>
          </ul>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-cream/55 sm:flex-row">
          <p>© {year} Casaca de Cancha · Vestí fútbol.</p>
          {data.legal_name && !data.legal_name.includes('[') && (
            <p>
              {data.legal_name}
              {data.cuit && !data.cuit.includes('[') ? ` · CUIT ${data.cuit}` : ''}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-celeste">{title}</h4>
      <ul className="space-y-2.5 text-sm text-cream/75">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="transition hover:text-celeste">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-cream transition hover:border-celeste hover:bg-celeste hover:text-navy"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        {children}
      </svg>
    </a>
  );
}
