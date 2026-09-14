'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/components/cart/CartProvider';
import { track, type Stage } from '@/lib/traffic';

/** Cada cuánto avisa que sigue ahí. */
const LATIDO_MS = 20_000;

/**
 * En qué parte del camino está, mirando nada más que la ruta y el carrito.
 *
 * Que sea así de simple importa: el panel muestra esto en vivo, y una persona
 * parada en el checkout con plata en el carrito es la que hay que mirar.
 */
function etapa(path: string, items: number): Stage {
  if (path.startsWith('/pedido/')) return 'compro';
  if (path.startsWith('/checkout')) return 'checkout';
  if (items > 0) return 'carrito';
  return 'mirando';
}

/**
 * Cuenta las visitas para el panel "En vivo".
 *
 * Va dentro del `CartProvider` porque el carrito es lo que distingue a alguien
 * que está mirando de alguien que está por comprar.
 *
 * El latido solo corre con la pestaña a la vista: quien deja la página abierta
 * en otra solapa no está en la tienda, y contarlo como presente haría que el
 * número de "ahora" no signifique nada.
 */
export function TrafficTracker() {
  const pathname = usePathname();
  const { count, subtotal } = useCart();

  // El latido lee siempre lo último sin tener que reprogramarse a cada cambio.
  const estado = useRef({ path: pathname || '/', count, subtotal });
  estado.current = { path: pathname || '/', count, subtotal };

  // Una visita por página. El título tarda un instante en actualizarse después
  // de navegar, así que se espera: si no, todas las fichas se llamarían igual
  // que la página anterior.
  useEffect(() => {
    const path = pathname || '/';
    const t = setTimeout(() => {
      const { count: n, subtotal: s } = estado.current;
      track({
        kind: 'visita',
        path,
        stage: etapa(path, n),
        cart_items: n,
        cart_value: s,
      });
      // Una ficha de producto es la señal más útil del embudo, así que va
      // como evento propio además de como visita.
      if (path.startsWith('/producto/')) {
        track({ kind: 'producto', path, stage: etapa(path, n), cart_items: n, cart_value: s });
      }
      if (path.startsWith('/checkout')) {
        track({ kind: 'checkout', path, stage: 'checkout', cart_items: n, cart_value: s });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [pathname]);

  // Latido: sin kind, solo corre el reloj.
  useEffect(() => {
    const latir = () => {
      if (document.visibilityState !== 'visible') return;
      const { path, count: n, subtotal: s } = estado.current;
      track({ path, stage: etapa(path, n), cart_items: n, cart_value: s });
    };
    const id = setInterval(latir, LATIDO_MS);
    // Al volver a la pestaña avisa enseguida, sin esperar el próximo latido.
    document.addEventListener('visibilitychange', latir);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', latir);
    };
  }, []);

  return null;
}
