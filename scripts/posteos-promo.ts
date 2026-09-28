/**
 * Arma los posteos de Instagram de la promo que esté vigente.
 *
 *   npx tsx scripts/posteos-promo.ts            → la promo de hoy
 *   npx tsx scripts/posteos-promo.ts 2026-10-06 → la de esa fecha
 *
 * Saca todo de donde ya vive: el calendario de promos (`promo-linea.ts`) para
 * saber qué está en oferta y a cuánto, y la base para los nombres, las fotos y
 * qué talles quedan. No hay nada escrito a mano acá, así que la semana que
 * viene se vuelve a correr y salen los posteos nuevos solos.
 *
 * Y AVISA CUANDO ALGO NO CIERRA: si una camiseta de la promo se agotó, lo dice
 * en vez de generar un posteo que ofrece algo que ya no está. Publicar una
 * oferta agotada es la forma más rápida de quemar la promo.
 *
 * Deja en `posteos/`:
 *   1-portada.jpg        la tapa del carrusel
 *   2..N-<slug>.jpg      una por camiseta, con antes y ahora
 *   N+1-cierre.jpg       el cierre con el sitio
 *   historia.jpg         la misma tapa en vertical, para las historias
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { promoLineaVigente } from '../src/lib/promo-linea';

const NAVY = '#0B1F3A';
const CREMA = '#F6F1E8';
const CELESTE = '#8CC8E8';
const ORO = '#E9B44C';
const GRIS = '#8A93A3';

const LADO = 1080;
const ALTO_HISTORIA = 1920;
const SALIDA = 'posteos';

/* ------------------------------------------------------------------ */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pesos(n: number): string {
  return '$' + n.toLocaleString('es-AR');
}

/**
 * El nombre como se dice, no como está cargado.
 *
 * En el catálogo son "Camiseta Japón 2006 — Importada" porque ahí conviene que
 * diga todo. En un posteo, "Camiseta" y "Importada" los tiene todas: ocupan
 * dos renglones para no decir nada.
 */
function nombreCorto(name: string): string {
  return name
    .replace(/^Camiseta\s+/i, '')
    .replace(/\s*[—–-]\s*(Importada|Nacional|adidas Originals|le coq sportif).*$/i, '')
    .trim();
}

/** Parte el nombre en dos renglones sin cortar palabras. */
function dosRenglones(txt: string, max = 18): string[] {
  const palabras = txt.split(' ');
  if (txt.length <= max) return [txt];
  const lineas: string[] = [];
  let actual = '';
  for (const p of palabras) {
    if ((actual + ' ' + p).trim().length > max && actual) {
      lineas.push(actual.trim());
      actual = p;
    } else {
      actual = (actual + ' ' + p).trim();
    }
  }
  if (actual) lineas.push(actual);
  return lineas.slice(0, 2);
}

/** Las tres barras de la marca, en diagonal. */
function barras(x: number, y: number, alto: number, ancho = 13, sep = 20): string {
  const sesgo = alto * 0.3;
  return [0, 1, 2]
    .map((i) => {
      const dx = x + i * (ancho + sep);
      const color = i === 1 ? CREMA : CELESTE;
      return `<path d="M${dx} ${y + alto} L${dx + sesgo} ${y} h${ancho} L${dx + ancho} ${y + alto} z" fill="${color}"/>`;
    })
    .join('');
}

/** El fondo navy con las rayas diagonales apenas marcadas. */
function fondo(ancho: number, alto: number): string {
  const rayas = Array.from({ length: 26 }, (_, i) => {
    const x = -alto + i * 90;
    return `<path d="M${x} ${alto} L${x + alto * 0.55} 0 h26 L${x + 26} ${alto} z" fill="${CREMA}" opacity="0.032"/>`;
  }).join('');
  return `<rect width="${ancho}" height="${alto}" fill="${NAVY}"/>${rayas}`;
}

const FUENTE = 'Barlow Condensed';
const FUENTE_TX = 'Barlow';

async function svgAJpg(svg: string, destino: string) {
  await sharp(Buffer.from(svg)).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(destino);
}

/* ------------------------------------------------------------------ */

interface Camiseta {
  slug: string;
  nombre: string;
  talles: string;
  antes: number;
  ahora: number;
  foto: string;
}

/** La tapa del carrusel y, en vertical, la historia. */
function portada(p: { label: string; subtitle: string; cuantas: number; hasta: string }, alto: number): string {
  const historia = alto > LADO;
  const cy = alto / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${alto}">
  ${fondo(LADO, alto)}
  ${barras(LADO / 2 - 46, cy - (historia ? 430 : 330), 74)}

  <text x="${LADO / 2}" y="${cy - (historia ? 300 : 200)}" font-family="${FUENTE_TX}" font-weight="500" font-size="34" fill="${CELESTE}" text-anchor="middle" letter-spacing="10">CASACA DE CANCHA</text>

  <text x="${LADO / 2}" y="${cy - (historia ? 130 : 30)}" font-family="${FUENTE}" font-weight="800" font-size="190" fill="${CREMA}" text-anchor="middle" letter-spacing="-2">${esc(p.label)}</text>

  <rect x="${LADO / 2 - 330}" y="${cy - (historia ? 90 : 10) + 20}" width="660" height="4" fill="${ORO}"/>

  <text x="${LADO / 2}" y="${cy + (historia ? 30 : 110)}" font-family="${FUENTE_TX}" font-weight="500" font-size="46" fill="${CREMA}" text-anchor="middle" opacity="0.9">${esc(p.subtitle)}</text>

  <text x="${LADO / 2}" y="${cy + (historia ? 140 : 210)}" font-family="${FUENTE}" font-weight="700" font-size="58" fill="${ORO}" text-anchor="middle">${p.cuantas} CAMISETAS · UNA DE CADA UNA</text>

  <text x="${LADO / 2}" y="${cy + (historia ? 220 : 285)}" font-family="${FUENTE_TX}" font-weight="500" font-size="36" fill="${CELESTE}" text-anchor="middle">Hasta el ${esc(p.hasta)}</text>

  <text x="${LADO / 2}" y="${alto - (historia ? 300 : 90)}" font-family="${FUENTE}" font-weight="700" font-size="44" fill="${CREMA}" text-anchor="middle" opacity="0.65">${historia ? 'MIRÁ EL LINK ↑' : 'DESLIZÁ →'}</text>
</svg>`;
}

/** El cierre del carrusel. */
function cierre(hasta: string): string {
  const cy = LADO / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}">
  ${fondo(LADO, LADO)}
  ${barras(LADO / 2 - 46, cy - 300, 74)}
  <text x="${LADO / 2}" y="${cy - 130}" font-family="${FUENTE}" font-weight="800" font-size="120" fill="${CREMA}" text-anchor="middle">SON ÚNICAS</text>
  <text x="${LADO / 2}" y="${cy - 40}" font-family="${FUENTE_TX}" font-weight="500" font-size="42" fill="${CREMA}" text-anchor="middle" opacity="0.85">De cada una queda un solo talle.</text>
  <text x="${LADO / 2}" y="${cy + 20}" font-family="${FUENTE_TX}" font-weight="500" font-size="42" fill="${CREMA}" text-anchor="middle" opacity="0.85">Cuando se va, se fue.</text>
  <rect x="${LADO / 2 - 300}" y="${cy + 90}" width="600" height="96" rx="48" fill="${CELESTE}"/>
  <text x="${LADO / 2}" y="${cy + 155}" font-family="${FUENTE}" font-weight="800" font-size="52" fill="${NAVY}" text-anchor="middle">CASACADECANCHA.SHOP</text>
  <text x="${LADO / 2}" y="${cy + 265}" font-family="${FUENTE_TX}" font-weight="500" font-size="34" fill="${CELESTE}" text-anchor="middle">Envíos a todo el país · Entrega en Mar del Plata</text>
  <text x="${LADO / 2}" y="${LADO - 70}" font-family="${FUENTE_TX}" font-weight="500" font-size="30" fill="${CREMA}" text-anchor="middle" opacity="0.5">Hasta el ${esc(hasta)} · Producto no oficial</text>
</svg>`;
}

/**
 * La historia vertical.
 *
 * Lleva las camisetas en miniatura abajo. Sin ellas el formato deja media
 * pantalla vacía, y una historia que solo dice "ÚLTIMO TALLE" no le muestra a
 * nadie qué es lo que está en oferta: se pasa de largo en dos segundos.
 */
async function historia(
  p: { label: string; subtitle: string; cuantas: number; hasta: string },
  camisetas: Camiseta[],
  destino: string,
) {
  const MINI = 168;
  const SEP = 16;
  const fila = camisetas.length * MINI + (camisetas.length - 1) * SEP;
  const x0 = (LADO - fila) / 2;
  const yMini = 1275;

  const minis = await Promise.all(
    camisetas.map(async (c) => ({
      input: await sharp(c.foto)
        .resize(MINI, MINI, { fit: 'cover' })
        .composite([
          {
            input: Buffer.from(
              `<svg width="${MINI}" height="${MINI}"><rect width="${MINI}" height="${MINI}" rx="20" fill="#fff"/></svg>`,
            ),
            blend: 'dest-in',
          },
        ])
        .png()
        .toBuffer(),
    })),
  );

  await sharp(Buffer.from(portada(p, ALTO_HISTORIA)))
    .composite(minis.map((m, i) => ({ ...m, left: Math.round(x0 + i * (MINI + SEP)), top: yMini })))
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toFile(destino);
}

/** Una camiseta: foto arriba, nombre, talle, antes y ahora. */
async function slideCamiseta(c: Camiseta, destino: string) {
  const FOTO = 560;
  const foto = await sharp(c.foto)
    .resize(FOTO, FOTO, { fit: 'cover' })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${FOTO}" height="${FOTO}"><rect width="${FOTO}" height="${FOTO}" rx="40" fill="#fff"/></svg>`,
        ),
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();

  // Posiciones fijas y no encadenadas. Antes el precio se calculaba a partir
  // del alto del nombre, así que una camiseta de nombre largo empujaba el
  // precio encima del talle y quedaban los dos ilegibles.
  const lineas = dosRenglones(nombreCorto(c.nombre));
  const dosL = lineas.length === 2;
  const yNombre = dosL ? 748 : 775;
  const nombreSvg = lineas
    .map(
      (l, i) =>
        `<text x="${LADO / 2}" y="${yNombre + i * 56}" font-family="${FUENTE}" font-weight="800" font-size="54" fill="${CREMA}" text-anchor="middle">${esc(l.toUpperCase())}</text>`,
    )
    .join('');
  const yPrecio = 863;

  // El ancho del "antes" se estima para tacharlo: Barlow Condensed a 44px anda
  // en ~0.42 del tamaño por carácter. No hace falta más precisión, es una raya.
  const antesTxt = pesos(c.antes);
  const anchoAntes = antesTxt.length * 44 * 0.42;

  const capa = `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}">
  ${fondo(LADO, LADO)}
  <rect x="${LADO / 2 - 150}" y="58" width="300" height="56" rx="28" fill="${ORO}"/>
  <text x="${LADO / 2}" y="97" font-family="${FUENTE}" font-weight="800" font-size="36" fill="${NAVY}" text-anchor="middle" letter-spacing="2">ÚLTIMO TALLE</text>
  ${nombreSvg}
  <text x="${LADO / 2 - 150}" y="${yPrecio + 42}" font-family="${FUENTE}" font-weight="700" font-size="44" fill="${GRIS}" text-anchor="middle">${esc(antesTxt)}</text>
  <rect x="${LADO / 2 - 150 - anchoAntes / 2}" y="${yPrecio + 26}" width="${anchoAntes}" height="3.5" fill="${GRIS}"/>
  <text x="${LADO / 2 + 110}" y="${yPrecio + 52}" font-family="${FUENTE}" font-weight="800" font-size="88" fill="${ORO}" text-anchor="middle">${esc(pesos(c.ahora))}</text>
  <rect x="${LADO / 2 - 118}" y="948" width="236" height="56" rx="28" fill="none" stroke="${CELESTE}" stroke-width="3"/>
  <text x="${LADO / 2}" y="987" font-family="${FUENTE}" font-weight="800" font-size="36" fill="${CELESTE}" text-anchor="middle" letter-spacing="3">SOLO ${esc(c.talles)}</text>
  <text x="${LADO / 2}" y="1046" font-family="${FUENTE_TX}" font-weight="500" font-size="26" fill="${CREMA}" text-anchor="middle" opacity="0.4">casacadecancha.shop</text>
</svg>`;

  await sharp(Buffer.from(capa))
    .composite([{ input: foto, left: (LADO - FOTO) / 2, top: 136 }])
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toFile(destino);
}

/* ------------------------------------------------------------------ */

async function main() {
  const cuando = process.argv[2] ? new Date(`${process.argv[2]}T12:00:00-03:00`) : new Date();
  const promo = promoLineaVigente(cuando);

  if (!promo) {
    console.error(
      `No hay promo vigente para el ${cuando.toLocaleDateString('es-AR')}. ` +
        'Mirá el calendario en src/lib/promo-linea.ts.',
    );
    process.exit(1);
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const slugs = promo.items.map((i) => i.slug);
  const { data, error } = await sb
    .from('products')
    .select('slug,name,images:product_images(url,is_primary,sort_order),variants:product_variants(size,active,stock_physical,stock_reserved,encargo_reserved)')
    .in('slug', slugs);

  if (error || !data) {
    console.error('No se pudo leer el catálogo:', error?.message);
    process.exit(1);
  }

  const porSlug = new Map(data.map((p) => [p.slug, p]));
  const camisetas: Camiseta[] = [];
  const problemas: string[] = [];

  mkdirSync('/tmp/promo-fotos', { recursive: true });

  for (const item of promo.items) {
    const p = porSlug.get(item.slug);
    if (!p) {
      problemas.push(`${item.slug}: no está en el catálogo`);
      continue;
    }
    const disp = (p.variants ?? [])
      .filter(
        (v: { active: boolean; stock_physical: number; stock_reserved: number; encargo_reserved: number | null }) =>
          v.active && v.stock_physical - v.stock_reserved - (v.encargo_reserved ?? 0) > 0,
      )
      .map((v: { size: string }) => v.size);

    if (disp.length === 0) {
      problemas.push(`${p.name}: SE AGOTÓ — no va al posteo`);
      continue;
    }

    const url = [...(p.images ?? [])].sort(
      (a: { is_primary: boolean; sort_order: number }, b: { is_primary: boolean; sort_order: number }) =>
        Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
    )[0]?.url;
    if (!url) {
      problemas.push(`${p.name}: no tiene foto cargada`);
      continue;
    }

    const local = `/tmp/promo-fotos/${item.slug}.img`;
    if (!existsSync(local)) {
      const res = await fetch(url);
      if (!res.ok) {
        problemas.push(`${p.name}: no se pudo bajar la foto`);
        continue;
      }
      writeFileSync(local, Buffer.from(await res.arrayBuffer()));
    }

    camisetas.push({
      slug: item.slug,
      nombre: p.name,
      talles: disp.join('/'),
      antes: item.compare_price,
      ahora: item.price,
      foto: local,
    });
  }

  if (camisetas.length === 0) {
    console.error('Ninguna camiseta de la promo está disponible. No hay posteo que hacer.');
    problemas.forEach((p) => console.error('  ·', p));
    process.exit(1);
  }

  rmSync(SALIDA, { recursive: true, force: true });
  mkdirSync(SALIDA, { recursive: true });

  // Con la zona puesta a mano. La promo termina a las 23:59 de Argentina, que
  // en UTC ya es el día siguiente: sin esto el posteo decía "hasta el 5" para
  // una promo que se corta el 4, y el que entra el 5 se encuentra los precios
  // de lista.
  const hasta = new Date(promo.ends_at).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
  const tapa = { label: promo.label, subtitle: promo.subtitle, cuantas: camisetas.length, hasta };

  await svgAJpg(portada(tapa, LADO), `${SALIDA}/1-portada.jpg`);
  for (let i = 0; i < camisetas.length; i++) {
    await slideCamiseta(camisetas[i], `${SALIDA}/${i + 2}-${camisetas[i].slug}.jpg`);
  }
  await svgAJpg(cierre(hasta), `${SALIDA}/${camisetas.length + 2}-cierre.jpg`);
  await historia(tapa, camisetas, `${SALIDA}/historia.jpg`);

  console.log(`\n${promo.label} — ${promo.subtitle}`);
  console.log(`Hasta el ${hasta}\n`);
  console.log(`${camisetas.length + 2} imágenes del carrusel + 1 historia, en ${SALIDA}/\n`);
  for (const c of camisetas) {
    console.log(`  ${nombreCorto(c.nombre).padEnd(30)} ${pesos(c.antes)} → ${pesos(c.ahora)}  (${c.talles})`);
  }
  if (problemas.length) {
    console.log('\n⚠  OJO:');
    problemas.forEach((p) => console.log('  ·', p));
  }
  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
