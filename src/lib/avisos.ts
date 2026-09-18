import { formatPrice } from '@/lib/utils';

/**
 * El aviso de que bajaron los precios.
 *
 * Vive acá y no adentro de la acción para que se pueda mostrar en pantalla
 * exactamente lo mismo que se manda: el que aprieta el botón ve el mail que
 * van a recibir 18 personas, no una aproximación.
 */

const BRAND = '#0B1F3A';
const SITE = 'https://casacadecancha.shop';

export interface EjemploPrecio {
  name: string;
  antes: number;
  ahora: number;
}

/**
 * Los ejemplos que van en el mail, con el precio de antes REAL.
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

/**
 * Cuerpo del aviso.
 *
 * Dice lo que pasó y nada más: los precios bajaron y quedan así. No se anuncia
 * como una promoción ni se le pone una fecha de vencimiento, porque no la
 * tiene — y prometer una urgencia que no existe es la forma más rápida de que
 * la próxima vez no te crean.
 */
export function avisoBajaPreciosHtml(nombre: string, ejemplos: EjemploPrecio[]): string {
  const primerNombre = (nombre || '').trim().split(/\s+/)[0] || '';
  const filas = ejemplos
    .map(
      (e) => `<tr>
        <td style="padding:7px 0;color:#0B1F3A">${e.name}</td>
        <td style="padding:7px 0;text-align:right;white-space:nowrap">
          <span style="color:#94a3b8;text-decoration:line-through">${formatPrice(e.antes)}</span>
          <strong style="color:#0B1F3A;margin-left:8px">${formatPrice(e.ahora)}</strong>
        </td>
      </tr>`,
    )
    .join('');

  return `<div style="font-family:system-ui,-apple-system,sans-serif;color:${BRAND};max-width:540px;margin:0 auto">
    <h1 style="font-size:22px;margin:0 0 6px">Bajamos los precios${primerNombre ? `, ${primerNombre}` : ''}</h1>
    <p style="color:#444;line-height:1.6;margin:0 0 18px">
      Bajamos el precio de todas las camisetas de la página. No es una promoción
      con fecha ni un descuento que se vence: <strong>es el precio nuevo</strong>,
      y queda así.
    </p>

    <div style="background:#F6F1E8;border-radius:16px;padding:18px 20px;margin:0 0 20px">
      <p style="margin:0 0 10px;font-size:11px;letter-spacing:2px;color:#64748b">ALGUNOS EJEMPLOS</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${filas}</table>
    </div>

    <p style="margin:0 0 22px">
      <a href="${SITE}/camisetas"
         style="background:${BRAND};color:#fff;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block">
        Ver todas las camisetas
      </a>
    </p>

    <p style="color:#444;line-height:1.6;margin:0 0 18px;font-size:14px">
      Si tenés tu código de bienvenida sin usar, ahora <strong>se suma</strong> al
      precio nuevo y también a las camisetas que estén en promo.
    </p>

    <p style="color:#888;font-size:12px;line-height:1.5;margin:0;border-top:1px solid #e5e7eb;padding-top:14px">
      Somos de Mar del Plata y enviamos a todo el país. Cualquier cosa nos
      escribís por WhatsApp y te ayudamos.
    </p>
  </div>`;
}

/* ------------------------------------------------------------------ */

/** Una camiseta como sale en el mail de la promo. */
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
}

/**
 * El mail de la promo de la semana.
 *
 * Sirve para los dos tipos de promo que corren en la tienda:
 *
 *  - Las de precio fijo, que viven en el calendario de `promo-linea.ts` y
 *    bajan camisetas puntuales. Ahí van los productos con su precio.
 *  - Las de cupón, que viven en `promotions` y descuentan un monto sobre el
 *    carrito. Ahí va el código y el mínimo.
 *
 * Los datos entran ya resueltos desde la acción, que los lee de la fuente de
 * verdad de cada una. Escribir los precios acá a mano sería pedir que un lunes
 * salga un mail con el precio de la semana pasada.
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
}): string {
  const primerNombre = (p.nombre || '').trim().split(/\s+/)[0] || '';

  const filas = (p.items ?? [])
    .map(
      // Los talles van en su propio renglón y no al lado del nombre: pegados
      // atrás de un nombre largo el renglón se parte en cualquier lado y el
      // precio se amontona contra el texto.
      (i) => `<tr>
        <td style="padding:9px 12px 9px 0;color:#0B1F3A;line-height:1.35">
          ${i.name}
          ${i.talles ? `<br><span style="color:#94a3b8;font-size:12px">Talles ${i.talles}</span>` : ''}
        </td>
        <td style="padding:9px 0;text-align:right;white-space:nowrap;vertical-align:top">
          ${
            i.antes && i.antes > i.ahora
              ? `<span style="color:#94a3b8;text-decoration:line-through">${formatPrice(i.antes)}</span><br>`
              : ''
          }
          <strong style="color:#0B1F3A;font-size:15px">${formatPrice(i.ahora)}</strong>
        </td>
      </tr>`,
    )
    .join('');

  const bloqueItems = filas
    ? `<div style="background:#F6F1E8;border-radius:16px;padding:18px 20px;margin:0 0 20px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">${filas}</table>
      </div>`
    : '';

  const bloqueCupon = p.codigo
    ? `<div style="background:${BRAND};border-radius:16px;padding:20px;margin:0 0 20px;text-align:center">
        <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;color:rgba(246,241,232,.65)">TU CÓDIGO</p>
        <p style="margin:0 0 10px;font-size:26px;font-weight:800;letter-spacing:3px;color:#C7A76B">${p.codigo}</p>
        <p style="margin:0;color:#F6F1E8;font-size:14px">
          ${p.monto ? `<strong>${formatPrice(p.monto)}</strong> de descuento` : 'Descuento'}
          ${p.minimo ? ` en compras desde ${formatPrice(p.minimo)}` : ''}
        </p>
      </div>`
    : '';

  return `<div style="font-family:system-ui,-apple-system,sans-serif;color:${BRAND};max-width:540px;margin:0 auto">
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#94a3b8">${p.volanta ?? 'ESTA SEMANA'}</p>
    <h1 style="font-size:24px;margin:0 0 6px;text-transform:uppercase">${p.label}</h1>
    <p style="color:#444;line-height:1.6;margin:0 0 18px">
      ${primerNombre ? `${primerNombre}, ` : ''}${p.bajada}
      ${p.hasta ? `Termina el <strong>${p.hasta}</strong>.` : ''}
    </p>

    ${bloqueCupon}
    ${bloqueItems}

    <p style="margin:0 0 22px">
      <a href="${SITE}/camisetas"
         style="background:${BRAND};color:#fff;padding:13px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block">
        Ver las camisetas
      </a>
    </p>

    <p style="color:#888;font-size:12px;line-height:1.5;margin:0;border-top:1px solid #e5e7eb;padding-top:14px">
      Somos de Mar del Plata y enviamos a todo el país. Cualquier cosa nos
      escribís por WhatsApp y te ayudamos. Producto no oficial.
    </p>
  </div>`;
}
