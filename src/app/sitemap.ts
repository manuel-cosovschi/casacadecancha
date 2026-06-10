import type { MetadataRoute } from 'next';
import { getActiveProducts, getActiveCollections } from '@/lib/queries';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections] = await Promise.all([
    getActiveProducts(200),
    getActiveCollections(),
  ]);

  const staticPaths = [
    '',
    '/camisetas',
    '/ninos',
    '/buzos',
    '/guia-de-talles',
    '/preguntas-frecuentes',
    '/legales/envios',
    '/legales/cambios',
    '/legales/devoluciones',
    '/legales/privacidad',
    '/legales/terminos',
    '/legales/arrepentimiento',
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.7,
  }));

  const productPaths = products.map((p) => ({
    url: `${SITE_URL}/producto/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const collectionPaths = collections.map((c) => ({
    url: `${SITE_URL}/coleccion/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticPaths, ...productPaths, ...collectionPaths];
}
