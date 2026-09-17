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
