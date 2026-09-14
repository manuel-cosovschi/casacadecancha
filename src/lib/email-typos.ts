/**
 * Sugerencia de corrección para mails mal tipeados.
 *
 * No es cosmético: un mail con el dominio mal escrito rebota y esa persona
 * nunca recibe su código. Ya pasó — un suscriptor cargó `@gamil.com` y quedó
 * inalcanzable. Como el formulario no puede saber si `gamil.com` existe, lo
 * único honesto es preguntar, nunca corregir solo ni bloquear el alta: si la
 * persona insiste, el mail se guarda como lo escribió.
 */

/** Dominios que sí existen y no hay que tocar nunca. */
const CONOCIDOS = [
  'gmail.com',
  'hotmail.com',
  'hotmail.com.ar',
  'hotmail.es',
  'outlook.com',
  'outlook.com.ar',
  'outlook.es',
  'live.com',
  'live.com.ar',
  'yahoo.com',
  'yahoo.com.ar',
  'yahoo.es',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
  'speedy.com.ar',
  'fibertel.com.ar',
  'ciudad.com.ar',
  'arnet.com.ar',
];

const CONOCIDOS_SET = new Set(CONOCIDOS);

/** Distancia de edición, cortada apenas supera el máximo que nos interesa. */
function distancia(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const fila = [i];
    let mejor = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, fila[j - 1] + 1, prev[j - 1] + costo);
      fila.push(v);
      if (v < mejor) mejor = v;
    }
    if (mejor > max) return max + 1;
    prev = fila;
  }
  return prev[b.length];
}

/**
 * El mail con el dominio corregido, o null si está bien (o no sabemos).
 *
 * Solo mira el dominio: el nombre de usuario es de quien lo escribe y no hay
 * forma de adivinarlo.
 */
export function sugerirEmail(entrada: string): string | null {
  const email = (entrada || '').trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at <= 0 || at === email.length - 1) return null;

  const usuario = email.slice(0, at);
  const dominio = email.slice(at + 1);
  if (CONOCIDOS_SET.has(dominio)) return null;

  // Un solo caso se corrige por forma y no por parecido: `.con` y `.cmo` en
  // lugar de `.com` son el error de tipeo más común y no dependen del dominio.
  const porTld = dominio.replace(/\.(con|cmo|clm|co)$/, '.com');
  if (porTld !== dominio && CONOCIDOS_SET.has(porTld)) {
    return `${usuario}@${porTld}`;
  }

  // El resto, por parecido contra los dominios que conocemos. Un dominio corto
  // se parece a todo, así que pedimos que la distancia sea chica en relación al
  // largo: para `me.com` solo vale 1.
  let mejor: string | null = null;
  let mejorDist = Infinity;
  for (const candidato of CONOCIDOS) {
    const max = candidato.length <= 8 ? 1 : 2;
    const d = distancia(dominio, candidato, max);
    if (d >= 1 && d <= max && d < mejorDist) {
      mejor = candidato;
      mejorDist = d;
    }
  }

  return mejor ? `${usuario}@${mejor}` : null;
}
