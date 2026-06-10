import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import { getAllSettings } from '@/lib/settings';
import { Analytics } from '@/components/analytics/Analytics';

// Tipografía deportiva: Barlow (texto) + Barlow Condensed (titulares).
const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-display',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAllSettings();
  const seo = settings.seo;
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: seo.title,
      template: '%s | Casaca de Cancha',
    },
    description: seo.description,
    keywords: [
      'camisetas de fútbol',
      'camiseta Argentina',
      'indumentaria de fútbol',
      'Mar del Plata',
      'Mundial 2026',
    ],
    openGraph: {
      title: seo.title,
      description: seo.description,
      type: 'website',
      locale: 'es_AR',
      siteName: 'Casaca de Cancha',
      url: SITE_URL,
      images: seo.og_image ? [{ url: seo.og_image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
    },
    icons: {
      icon: '/favicon.svg',
    },
    manifest: '/manifest.webmanifest',
    other: settings.analytics?.meta_domain_verification
      ? { 'facebook-domain-verification': settings.analytics.meta_domain_verification }
      : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: '#0B1F3A',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getAllSettings();
  return (
    <html lang="es-AR" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        {children}
        <Analytics analytics={settings.analytics} />
      </body>
    </html>
  );
}
