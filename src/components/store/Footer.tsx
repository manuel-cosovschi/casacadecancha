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
    <footer className="mt-20 bg-navy text-cream">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo theme="dark" variant="stacked" />
          <p className="text-sm text-cream/70">
            Indumentaria de fútbol desde {data.location}. Envíos a todo el país.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-celeste">
            Tienda
          </h4>
          <ul className="space-y-2 text-sm text-cream/80">
            <li><Link href="/camisetas" className="hover:text-celeste">Camisetas</Link></li>
            <li><Link href="/ninos" className="hover:text-celeste">Niños</Link></li>
            <li><Link href="/buzos" className="hover:text-celeste">Buzos</Link></li>
            <li><Link href="/guia-de-talles" className="hover:text-celeste">Guía de talles</Link></li>
            <li><Link href="/preguntas-frecuentes" className="hover:text-celeste">Preguntas frecuentes</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-celeste">
            Información
          </h4>
          <ul className="space-y-2 text-sm text-cream/80">
            <li><Link href="/legales/envios" className="hover:text-celeste">Envíos</Link></li>
            <li><Link href="/legales/cambios" className="hover:text-celeste">Cambios y devoluciones</Link></li>
            <li><Link href="/legales/privacidad" className="hover:text-celeste">Privacidad</Link></li>
            <li><Link href="/legales/terminos" className="hover:text-celeste">Términos</Link></li>
            <li><Link href="/legales/arrepentimiento" className="hover:text-celeste">Botón de arrepentimiento</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-celeste">
            Contacto
          </h4>
          <ul className="space-y-2 text-sm text-cream/80">
            <li>
              <a href={whatsappLink(data.whatsapp, 'Hola, quería hacer una consulta.')} className="hover:text-celeste" target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </li>
            <li>
              <a href={data.instagram} className="hover:text-celeste" target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </li>
            <li>
              <a href={`mailto:${data.email}`} className="hover:text-celeste">{data.email}</a>
            </li>
            <li>{data.location}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-cream/60 sm:flex-row">
          <p>© {year} Casaca de Cancha. Todos los derechos reservados.</p>
          <p>
            {data.legal_name} · CUIT {data.cuit}
          </p>
        </div>
      </div>
    </footer>
  );
}
