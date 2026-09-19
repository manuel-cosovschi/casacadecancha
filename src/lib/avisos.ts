import { formatPrice } from '@/lib/utils';

/**
 * Los mails que se le mandan a los suscriptores.
 *
 * La estética sale de un mail que el dueño marcó como referencia: banda de
 * color con la marca arriba, todo centrado, frases cortas con lo importante en
 * negrita, botón grande y ancho, títulos subrayados, y las camisetas como
 * fichas con foto, precio tachado y botón propio.
 *
 * Dos decisiones que no se ven pero sostienen todo:
 *
 *  - Está armado con TABLAS y estilos inline. No es nostalgia: Gmail, Outlook
 *    y compañía tiran a la basura el `<style>` del `<head>` y no entienden
 *    flexbox ni grid. Lo único que renderiza igual en todos lados son tablas.
 *  - Se escribe CLARO y se adapta a oscuro con `prefers-color-scheme`. Al
 *    revés no funciona: un mail escrito oscuro se ve oscuro también para el
 *    que tiene el mail en claro, y ahí queda mal para la mitad de la gente.
 *    Escrito claro, Gmail en modo oscuro lo pasa a oscuro solo — que es
 *    exactamente como se ven las capturas de referencia.
 */

const NAVY = '#0B1F3A';
const CREMA = '#F6F1E8';
const CELESTE = '#8CC8E8';
const GRIS = '#5b6b80';
const TACHADO = '#94a3b8';
const SITE = 'https://casacadecancha.shop';

/** Ancho del mail. 600px es lo que entra sin scroll horizontal en todos lados. */
const ANCHO = 600;

/**
 * El `<style>` del head.
 *
 * Gmail lo ignora casi entero, así que acá NO va nada imprescindible: solo el
 * modo oscuro, que es una mejora y no un requisito. Todo lo que tiene que
 * verse sí o sí está inline en cada etiqueta.
 */
const ESTILOS = `
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    @media (prefers-color-scheme: dark) {
      .cdc-bg   { background: #0A1626 !important; }
      .cdc-card { background: #11294a !important; }
      .cdc-tx   { color: ${CREMA} !important; }
      .cdc-tx2  { color: #b9c4d4 !important; }
      .cdc-hr   { border-color: #24405f !important; }
      .cdc-pie  { background: #081120 !important; }
    }
    @media (max-width: 620px) {
      .cdc-pad { padding-left: 22px !important; padding-right: 22px !important; }
      .cdc-h1  { font-size: 26px !important; }
    }
  </style>`;

const FUENTE =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Banda de marca de arriba. Es texto, no imagen: una imagen bloqueada no deja nada. */
function cabecera(): string {
  return `
  <tr><td style="background:${NAVY};padding:26px 24px;text-align:center">
    <div style="font-family:${FUENTE};font-size:22px;font-weight:800;letter-spacing:3px;color:${CREMA};text-transform:uppercase;line-height:1.2">
      Casaca de Cancha
    </div>
    <div style="font-family:${FUENTE};font-size:11px;font-weight:700;letter-spacing:4px;color:${CELESTE};margin-top:7px;text-transform:uppercase">
      Vestí fútbol
    </div>
  </td></tr>`;
}

/** Botón grande. Va como tabla para que Outlook no lo deforme. */
function boton(texto: string, href: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto">
    <tr><td align="center" bgcolor="${CELESTE}" style="border-radius:8px">
      <a href="${href}" style="display:block;padding:16px 34px;font-family:${FUENTE};font-size:15px;font-weight:800;letter-spacing:.5px;color:${NAVY};text-decoration:none;text-transform:uppercase">
        ${texto}
      </a>
    </td></tr>
  </table>`;
}

/** Título subrayado, como los "¿Cómo funciona?" de la referencia. */
function subtitulo(texto: string): string {
  return `
  <p class="cdc-tx" style="margin:0 0 14px;font-family:${FUENTE};font-size:18px;font-weight:700;color:${NAVY};text-align:center;text-decoration:underline;text-underline-offset:4px">
    ${texto}
  </p>`;
}

function separador(): string {
  return `<hr class="cdc-hr" style="border:0;border-top:1px solid #dfd8cb;margin:30px 0">`;
}

/** Pie con redes y letra chica. */
function pie(): string {
  const redes = [
    ['WhatsApp', 'https://wa.me/5492235383082'],
    ['Instagram', 'https://www.instagram.com/casacadecancha.ar'],
  ]
    .map(
      ([n, u]) =>
        `<a href="${u}" style="display:inline-block;margin:0 7px;padding:9px 16px;border-radius:999px;background:${NAVY};color:${CREMA};font-family:${FUENTE};font-size:12px;font-weight:700;text-decoration:none">${n}</a>`,
    )
    .join('');

  return `
  <tr><td class="cdc-pie cdc-pad" style="background:#ece5da;padding:26px 34px;text-align:center">
    <div style="margin-bottom:16px">${redes}</div>
    <p class="cdc-tx2" style="margin:0 0 6px;font-family:${FUENTE};font-size:12px;font-weight:700;color:${NAVY};letter-spacing:1px">
      CASACA DE CANCHA
    </p>
    <p class="cdc-tx2" style="margin:0;font-family:${FUENTE};font-size:11px;line-height:1.6;color:${GRIS}">
      Somos de Mar del Plata y enviamos a todo el país.<br>
      Cualquier cosa escribinos por WhatsApp y te ayudamos.<br>
      Producto no oficial.
    </p>
  </td></tr>`;
}

/** El armazón: fondo, ancho fijo, cabecera y pie. */
function envoltorio(cuerpo: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="es-AR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
${ESTILOS}</head>
<body class="cdc-bg" style="margin:0;padding:0;background:#ece5da">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="cdc-bg" style="background:#ece5da">
    <tr><td align="center" style="padding:18px 10px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${ANCHO}" style="width:100%;max-width:${ANCHO}px;border-radius:14px;overflow:hidden">
        ${cabecera()}
        <tr><td class="cdc-card" style="background:#ffffff">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${cuerpo}
          </table>
        </td></tr>
        ${pie()}
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/* ------------------------------------------------------------------ */

export interface EjemploPrecio {
  name: string;
  antes: number;
  ahora: number;
}

/**
 * Los ejemplos que van en el mail de baja de precios, con el precio de antes REAL.
 *
 * Están escritos y no calculados a propósito. La baja se redondeó para abajo al
 * múltiplo de $500, así que dividir el precio nuevo por 0,95 no devuelve el
 * viejo: la Japón quedó en $61.500 y esa cuenta da $64.737, no los $65.000 que
 * costaba. Un "antes" inventado en un mail es de las pocas cosas que un cliente
 * puede verificar y no perdonar.
 */
export const EJEMPLOS_BAJA_PRECIOS: EjemploPrecio[] = [
  { name: 'Camiseta Japón Titular 26/27', antes: 65_000, ahora: 61_500 },
  { name: 'Camiseta Boca Titular 25/26 Paredes', antes: 62_000, ahora: 58_500 },
  { name: 'Camiseta Brasil 2002 Ronaldo', antes: 50_000, ahora: 47_500 },
  { name: 'Camiseta Argentina Titular 2026', antes: 45_000, ahora: 42_500 },
];

export const ASUNTO_BAJA_PRECIOS = 'Bajamos los precios 👇';

/** Cuerpo del aviso de baja de precios. */
export function avisoBajaPreciosHtml(nombre: string, ejemplos: EjemploPrecio[]): string {
  const primerNombre = (nombre || '').trim().split(/\s+/)[0] || '';
  const filas = ejemplos
    .map(
      (e) => `<tr>
        <td class="cdc-tx" style="padding:9px 12px 9px 0;font-family:${FUENTE};font-size:14px;color:${NAVY};line-height:1.35">${e.name}</td>
        <td style="padding:9px 0;text-align:right;white-space:nowrap;vertical-align:top">
          <span style="font-family:${FUENTE};font-size:13px;color:${TACHADO};text-decoration:line-through">${formatPrice(e.antes)}</span><br>
          <strong class="cdc-tx" style="font-family:${FUENTE};font-size:16px;color:${NAVY}">${formatPrice(e.ahora)}</strong>
        </td>
      </tr>`,
    )
    .join('');

  const cuerpo = `
    <tr><td class="cdc-pad" style="padding:32px 34px 0;text-align:center">
      <p class="cdc-tx2" style="margin:0 0 6px;font-family:${FUENTE};font-size:11px;letter-spacing:2px;color:${GRIS}">BAJAMOS EL PRECIO</p>
      <h1 class="cdc-tx cdc-h1" style="margin:0 0 16px;font-family:${FUENTE};font-size:30px;font-weight:800;color:${NAVY};line-height:1.15;text-transform:uppercase">
        Bajamos los precios${primerNombre ? `, ${primerNombre}` : ''}
      </h1>
      <p class="cdc-tx2" style="margin:0 0 26px;font-family:${FUENTE};font-size:16px;line-height:1.65;color:${GRIS}">
        Bajamos el precio de <strong class="cdc-tx" style="color:${NAVY}">todas las camisetas</strong> de la página.
        No es una promo con fecha ni un descuento que se vence: <strong class="cdc-tx" style="color:${NAVY}">es el precio nuevo</strong>, y queda así.
      </p>
      ${boton('Ver todas las camisetas', `${SITE}/camisetas`)}
    </td></tr>

    <tr><td class="cdc-pad" style="padding:30px 34px 0">
      ${subtitulo('Algunos ejemplos')}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${filas}</table>
    </td></tr>

    <tr><td class="cdc-pad" style="padding:0 34px 34px">
      ${separador()}
      <p class="cdc-tx2" style="margin:0;font-family:${FUENTE};font-size:14px;line-height:1.65;color:${GRIS};text-align:center">
        Si tenés tu código de bienvenida sin usar, ahora <strong class="cdc-tx" style="color:${NAVY}">se suma</strong> al
        precio nuevo y también a las camisetas que estén en promo.
      </p>
    </td></tr>`;

  return envoltorio(cuerpo, 'Bajamos el precio de todas las camisetas. Es el precio nuevo, no una promo.');
}

/* ------------------------------------------------------------------ */

/** Una camiseta como sale en el mail, con su ficha. */
export interface ItemPromoMail {
  name: string;
  /**
   * El precio anterior, para el tachado. Puede no haber: si no se sabe cuánto
   * costaba antes, se muestra solo el precio de hoy.
   *
   * Nunca se calcula. Ya me pasó una vez de querer sacarlo dividiendo el precio
   * nuevo por el descuento, y no vuelve: la Japón quedó en $61.500 y esa cuenta
   * da $64.737, no los $65.000 que costaba. Un "antes" inventado es de las
   * pocas cosas que un cliente puede verificar y no perdonar.
   */
  antes?: number | null;
  ahora: number;
  talles: string;
  /** Foto principal. Sin foto la ficha sale igual, solo que sin imagen. */
  image?: string | null;
  /** Link a la ficha del producto, para que el botón lleve justo ahí. */
  slug?: string | null;
}

/** La ficha de una camiseta: foto, nombre, precio y su propio botón. */
function ficha(i: ItemPromoMail): string {
  const href = i.slug ? `${SITE}/producto/${i.slug}` : `${SITE}/camisetas`;
  // El `alt` con estilo no es adorno: Gmail bloquea las imágenes de un
  // remitente nuevo hasta que le dan "mostrar", así que el primer mail que
  // recibe alguien lo ve SIN fotos. Sin esto quedaba el nombre en azul
  // subrayado gigante, como un link roto. Así queda un recuadro prolijo con el
  // nombre de la camiseta adentro.
  // 330px y no el ancho entero: las fotos son verticales, y a 530 cada ficha
  // medía 700px de alto. Tres camisetas daban un mail de 3 metros que nadie
  // baja hasta el final.
  const foto = i.image
    ? `<a href="${href}" style="text-decoration:none"><img src="${i.image}" width="330" alt="${i.name}"
         style="display:block;width:100%;max-width:330px;height:auto;margin:0 auto;border-radius:12px;border:0;background:#ece5da;font-family:${FUENTE};font-size:13px;font-weight:700;color:${GRIS};text-decoration:none;text-align:center;line-height:1.5"></a>`
    : '';
  const tachado =
    i.antes && i.antes > i.ahora
      ? `<span style="font-family:${FUENTE};font-size:17px;color:${TACHADO};text-decoration:line-through;margin-right:10px">${formatPrice(i.antes)}</span>`
      : '';

  return `
  <tr><td class="cdc-pad" style="padding:0 34px 26px;text-align:center">
    ${foto}
    <p class="cdc-tx" style="margin:14px 0 8px;font-family:${FUENTE};font-size:15px;font-weight:800;color:${NAVY};text-transform:uppercase;letter-spacing:.4px;line-height:1.3">
      ${i.name}
    </p>
    <p style="margin:0 0 4px">
      ${tachado}<strong class="cdc-tx" style="font-family:${FUENTE};font-size:25px;font-weight:800;color:${NAVY}">${formatPrice(i.ahora)}</strong>
    </p>
    ${
      i.talles
        ? `<p class="cdc-tx2" style="margin:0 0 14px;font-family:${FUENTE};font-size:13px;color:${GRIS}">Talles ${i.talles}</p>`
        : '<div style="height:14px"></div>'
    }
    ${boton('Comprar', href)}
  </td></tr>`;
}

/**
 * El mail de una promo, una baja puntual o un cupón.
 *
 * Sirve para los tres casos porque son el mismo mail con distinta volanta. Los
 * datos entran ya resueltos desde la acción, que los lee de la fuente de verdad
 * de cada una: escribir los precios acá a mano sería pedir que un lunes salga
 * un mail con el precio de la semana pasada.
 */
export function promoSemanaHtml(p: {
  nombre: string;
  /** El renglón chico de arriba de todo: "ESTA SEMANA", "BAJAMOS EL PRECIO"… */
  volanta?: string;
  label: string;
  bajada: string;
  /** Vacío cuando el aviso no vence: una baja de precio no tiene fecha. */
  hasta?: string;
  items?: ItemPromoMail[];
  codigo?: string;
  monto?: number;
  minimo?: number;
  /** Los "Además sumás" de abajo. Salen de la configuración real de la tienda. */
  extras?: string[];
}): string {
  const primerNombre = (p.nombre || '').trim().split(/\s+/)[0] || '';

  const bloqueCupon = p.codigo
    ? `
    <tr><td class="cdc-pad" style="padding:0 34px 26px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${NAVY};border-radius:14px">
        <tr><td style="padding:24px;text-align:center">
          <p style="margin:0 0 8px;font-family:${FUENTE};font-size:11px;letter-spacing:2px;color:rgba(246,241,232,.65)">PONELO AL FINALIZAR LA COMPRA</p>
          <p style="margin:0 0 10px;font-family:${FUENTE};font-size:30px;font-weight:800;letter-spacing:4px;color:${CELESTE}">${p.codigo}</p>
          <p style="margin:0;font-family:${FUENTE};font-size:15px;color:${CREMA};line-height:1.5">
            ${p.monto ? `<strong>${formatPrice(p.monto)}</strong> de descuento` : 'Descuento'}${p.minimo ? ` en compras desde ${formatPrice(p.minimo)}` : ''}
          </p>
        </td></tr>
      </table>
    </td></tr>`
    : '';

  const fichas = (p.items ?? []).map(ficha).join('');

  const bloqueFichas = fichas
    ? `
    <tr><td class="cdc-pad" style="padding:6px 34px 22px;text-align:center">
      <p class="cdc-tx2" style="margin:0;font-family:${FUENTE};font-size:16px;color:${GRIS}">
        Te dejamos algunas para tentarte…
      </p>
    </td></tr>
    ${fichas}`
    : '';

  const bloqueExtras =
    p.extras && p.extras.length
      ? `
    <tr><td class="cdc-pad" style="padding:0 34px">
      ${separador()}
      ${subtitulo('Además sumás:')}
      ${p.extras
        .map(
          (e) =>
            `<p class="cdc-tx" style="margin:0 0 10px;font-family:${FUENTE};font-size:16px;font-weight:700;color:${NAVY};text-align:center;line-height:1.5">• ${e}</p>`,
        )
        .join('')}
    </td></tr>`
      : '';

  const cuerpo = `
    <tr><td class="cdc-pad" style="padding:32px 34px 0;text-align:center">
      <p class="cdc-tx2" style="margin:0 0 6px;font-family:${FUENTE};font-size:11px;letter-spacing:2px;color:${GRIS}">${p.volanta ?? 'ESTA SEMANA'}</p>
      <h1 class="cdc-tx cdc-h1" style="margin:0 0 16px;font-family:${FUENTE};font-size:32px;font-weight:800;color:${NAVY};line-height:1.12;text-transform:uppercase">
        ${p.label}
      </h1>
      <p class="cdc-tx2" style="margin:0 0 26px;font-family:${FUENTE};font-size:16px;line-height:1.65;color:${GRIS}">
        ${primerNombre ? `${primerNombre}, ` : ''}${p.bajada}${
          p.hasta ? ` Termina el <strong class="cdc-tx" style="color:${NAVY}">${p.hasta}</strong>.` : ''
        }
      </p>
      ${boton('Ver las camisetas', `${SITE}/camisetas`)}
    </td></tr>

    <tr><td style="height:30px"></td></tr>
    ${bloqueCupon}
    ${bloqueFichas}
    ${bloqueExtras}

    <tr><td class="cdc-pad" style="padding:26px 34px 34px;text-align:center">
      ${boton('Ir a la tienda', `${SITE}/camisetas`)}
    </td></tr>`;

  return envoltorio(cuerpo, `${p.label}. ${p.bajada}`);
}
