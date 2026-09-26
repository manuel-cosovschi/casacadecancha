'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

/**
 * Goat, el que atiende en la página.
 *
 * Cuatro estados, como el boceto:
 *
 *  1. En reposo, en la esquina, con el globito al costado.
 *  2. Al pasarle el cursor o el dedo cambia a la pose festejando.
 *  3. Al tocarlo se abre el chat, con Goat asomado en el borde de arriba.
 *  4. Minimizado queda una píldora chica, con punto rojo si contestó algo
 *     que todavía no leíste.
 *
 * Va abajo a la IZQUIERDA porque el botón de WhatsApp ya está a la derecha.
 * Dos burbujas en la misma esquina se tapan y en el celular no se puede tocar
 * ninguna de las dos.
 */

interface Tarjeta {
  slug: string;
  name: string;
  price: number;
  image: string | null;
  agotado: boolean;
}

interface Mensaje {
  quien: 'persona' | 'goat';
  texto: string;
  hora: string;
  productos?: Tarjeta[];
}

const SALUDO = '¡Hola! 👋 Soy Goat, tu asistente de Casaca de Cancha. ¿En qué puedo ayudarte?';
const MAX_LARGO = 500;

/** Los accesos rápidos del boceto. El texto que mandan es el de la derecha. */
const ATAJOS: { icono: React.ReactNode; label: string; manda: string }[] = [
  { icono: <IconoRemera />, label: 'Ver talles y medidas', manda: '¿Cómo son los talles? ¿Tenés una guía de medidas?' },
  { icono: <IconoCamion />, label: 'Seguimiento de pedido', manda: 'Quiero saber cómo va mi pedido' },
  { icono: <IconoTarjeta />, label: 'Formas de pago', manda: '¿Cómo puedo pagar?' },
  { icono: <IconoCaja />, label: 'Envíos', manda: '¿Cómo son los envíos?' },
  { icono: <IconoEstrella />, label: 'Recomendaciones', manda: '¿Qué camisetas me recomendás?' },
  { icono: <IconoChat />, label: 'Otra consulta', manda: 'Tengo otra consulta' },
];

function ahora(): string {
  // `hour12: false` a propósito: sin eso sale "04:05 a. m.", que ocupa el
  // doble y no es como se escribe la hora en un chat.
  return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function Goat() {
  const [abierto, setAbierto] = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const [activo, setActivo] = useState(false);
  const [sinLeer, setSinLeer] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { quien: 'goat', texto: SALUDO, hora: '' },
  ]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);

  const finRef = useRef<HTMLDivElement>(null);
  const entradaRef = useRef<HTMLInputElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const abiertoRef = useRef(false);

  // La hora del saludo se pone al montar y no al renderizar en el servidor:
  // si se calcula arriba, el HTML del servidor trae una hora y el del
  // navegador otra, y React se queja de que no coinciden.
  useEffect(() => {
    setMensajes((m) => (m[0].hora ? m : [{ ...m[0], hora: ahora() }]));
  }, []);

  const enPantalla = abierto && !minimizado;
  abiertoRef.current = enPantalla;

  useEffect(() => {
    if (enPantalla) entradaRef.current?.focus();
  }, [enPantalla]);

  // Baja al último mensaje, pero no al abrir con el saludo solo: ahí los seis
  // atajos empujan y el scroll deja el "¡Hola!" cortado arriba.
  useEffect(() => {
    if (!enPantalla) return;
    if (mensajes.length <= 1 && !pensando) return;
    finRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [mensajes, pensando, enPantalla]);

  // Marcado en el body para que el popup de bienvenida no salte encima de una
  // charla empezada. Va por el DOM y no por un contexto de React porque son
  // dos componentes hermanos: montar un provider para un booleano es más
  // máquina de la que hace falta.
  useEffect(() => {
    if (enPantalla) document.body.dataset.goatAbierto = '1';
    else delete document.body.dataset.goatAbierto;
    return () => { delete document.body.dataset.goatAbierto; };
  }, [enPantalla]);

  useEffect(() => {
    if (!enPantalla) return;
    function alTeclado(e: KeyboardEvent) {
      if (e.key === 'Escape') { setMinimizado(true); botonRef.current?.focus(); }
    }
    document.addEventListener('keydown', alTeclado);
    return () => document.removeEventListener('keydown', alTeclado);
  }, [enPantalla]);

  function abrir() {
    setAbierto(true);
    setMinimizado(false);
    setSinLeer(false);
  }

  async function preguntar(pregunta: string) {
    const limpio = pregunta.trim().slice(0, MAX_LARGO);
    if (!limpio || pensando) return;

    const conmigo: Mensaje[] = [...mensajes, { quien: 'persona', texto: limpio, hora: ahora() }];
    setMensajes(conmigo);
    setTexto('');
    setPensando(true);

    try {
      const res = await fetch('/api/goat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // El saludo no se manda: lo escribió el navegador, no el modelo, y
        // devolvérselo como suyo es enseñarle a repetirlo.
        body: JSON.stringify({
          turnos: conmigo.slice(1).map((m) => ({ quien: m.quien, texto: m.texto })),
        }),
      });
      const data = await res.json().catch(() => null);
      setMensajes([
        ...conmigo,
        {
          quien: 'goat',
          texto: data?.texto || 'Se me cortó la señal. Probá de nuevo, o escribinos por WhatsApp.',
          hora: ahora(),
          productos: Array.isArray(data?.productos) ? data.productos : [],
        },
      ]);
    } catch {
      setMensajes([
        ...conmigo,
        { quien: 'goat', texto: 'Me quedé sin señal. Probá de nuevo o escribinos por WhatsApp.', hora: ahora() },
      ]);
    } finally {
      setPensando(false);
      // Si contestó mientras estaba minimizado, el punto rojo avisa.
      if (!abiertoRef.current) setSinLeer(true);
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 z-40 flex flex-col items-start p-4 sm:p-5">
      {enPantalla && (
        <div
          role="dialog"
          aria-label="Chat con Goat"
          className="pointer-events-auto relative mb-3 flex h-[min(72vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-navy/10 bg-white shadow-2xl"
        >
          <header className="flex items-center gap-2.5 bg-navy px-3.5 py-3 text-cream">
            <Image
              src="/goat-avatar.webp"
              alt=""
              width={40}
              height={40}
              className="h-9 w-9 shrink-0 rounded-full bg-celeste/25 object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold uppercase leading-tight tracking-wide">Goat</p>
              <p className="truncate text-[11px] text-celeste">Asistente de Casaca de Cancha</p>
            </div>
            <button
              onClick={() => { setMinimizado(true); botonRef.current?.focus(); }}
              aria-label="Minimizar el chat"
              className="flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none text-cream/70 transition hover:bg-cream/15 hover:text-cream"
            >
              −
            </button>
            <button
              onClick={() => { setAbierto(false); setMinimizado(false); botonRef.current?.focus(); }}
              aria-label="Cerrar el chat"
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-cream/70 transition hover:bg-cream/15 hover:text-cream"
            >
              ✕
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-white px-3.5 py-4">
            {mensajes.map((m, i) => (
              <Burbuja key={i} m={m} />
            ))}

            {pensando && (
              <div className="flex items-start gap-2">
                <Avatar />
                <p className="rounded-2xl rounded-bl-md bg-cream px-3.5 py-2.5 text-sm text-navy/50">
                  <span className="goat-puntos">Escribiendo…</span>
                </p>
              </div>
            )}

            {mensajes.length === 1 && !pensando && (
              <div className="space-y-1.5 pt-1">
                {ATAJOS.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => preguntar(a.manda)}
                    className="flex w-full items-center gap-3 rounded-xl border border-navy/10 bg-white px-3.5 py-2.5 text-left text-sm font-medium text-navy transition hover:border-celeste hover:bg-cream/60"
                  >
                    <span className="text-navy/45">{a.icono}</span>
                    {a.label}
                  </button>
                ))}
              </div>
            )}
            <div ref={finRef} />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); preguntar(texto); }}
            className="flex items-center gap-2 border-t border-navy/10 bg-white p-3"
          >
            <input
              ref={entradaRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={MAX_LARGO}
              placeholder="Escribí tu consulta…"
              aria-label="Tu consulta para Goat"
              className="min-w-0 flex-1 rounded-full border border-navy/15 bg-cream/40 px-4 py-2.5 text-sm text-navy outline-none placeholder:text-navy/40 focus:border-celeste"
            />
            <button
              type="submit"
              disabled={pensando || !texto.trim()}
              aria-label="Enviar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-cream transition hover:bg-navy/85 disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-px" fill="currentColor" aria-hidden>
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </button>
          </form>

          <p className="bg-white px-4 pb-3 text-center text-[10px] leading-snug text-navy/40">
            Goat es un asistente automático. Para algo puntual, escribinos por WhatsApp.
          </p>
        </div>
      )}

      {/* Minimizado: la píldora chica del boceto. */}
      {abierto && minimizado && (
        <button
          ref={botonRef}
          onClick={abrir}
          className="pointer-events-auto relative flex items-center gap-2 rounded-full bg-navy py-1.5 pl-1.5 pr-4 text-cream shadow-xl transition hover:bg-navy/90"
        >
          <Image
            src="/goat-avatar.webp"
            alt=""
            width={40}
            height={40}
            className="h-8 w-8 rounded-full bg-celeste/25 object-contain"
          />
          <span className="text-sm font-bold">
            {sinLeer ? '1 mensaje nuevo' : 'Chat con Goat'}
          </span>
          <svg viewBox="0 0 24 24" className="h-4 w-4 rotate-180" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {sinLeer && (
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500" />
          )}
        </button>
      )}

      {/* En reposo: el personaje en la esquina con el globito. */}
      {!abierto && (
        <button
          ref={botonRef}
          onClick={abrir}
          onMouseEnter={() => setActivo(true)}
          onMouseLeave={() => setActivo(false)}
          onFocus={() => setActivo(true)}
          onBlur={() => setActivo(false)}
          // En el celular no hay cursor: el primer toque lo despierta y el
          // segundo abre el chat, así se ve el personaje antes de decidir.
          onTouchStart={() => setActivo(true)}
          aria-label="Abrir el chat con Goat"
          className="pointer-events-auto relative block h-[86px] w-[86px] focus:outline-none"
        >
          <Image
            src={activo ? '/goat-activo.webp' : '/goat-reposo.webp'}
            alt=""
            width={360}
            height={360}
            priority={false}
            className={`goat-flota h-[86px] w-[86px] object-contain drop-shadow-xl transition-transform duration-200 ${
              activo ? 'scale-110' : 'scale-100'
            }`}
          />
          <span
            className={`pointer-events-none absolute left-[78px] top-1 whitespace-nowrap rounded-2xl rounded-bl-md bg-navy px-3 py-1.5 text-[11px] font-bold leading-tight text-cream shadow-lg transition-all duration-200 ${
              activo ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'
            }`}
          >
            ¿Dudas?
            <br />
            Preguntame
          </span>
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Avatar() {
  return (
    <Image
      src="/goat-avatar.webp"
      alt=""
      width={40}
      height={40}
      className="h-7 w-7 shrink-0 rounded-full bg-cream object-contain"
    />
  );
}

function Burbuja({ m }: { m: Mensaje }) {
  if (m.quien === 'persona') {
    return (
      <div className="flex flex-col items-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-celeste px-3.5 py-2.5 text-sm leading-relaxed text-navy">
          {m.texto}
        </p>
        {m.hora && <span className="mt-1 text-[10px] text-navy/35">{m.hora}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <Avatar />
      <div className="min-w-0 flex-1">
        <p className="inline-block max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-cream px-3.5 py-2.5 text-sm leading-relaxed text-navy">
          {m.texto}
        </p>
        {(m.productos?.length ?? 0) > 0 && (
          <div className="mt-2 space-y-2">
            {m.productos!.map((p) => (
              <TarjetaProducto key={p.slug} p={p} />
            ))}
          </div>
        )}
        {m.hora && <p className="mt-1 text-[10px] text-navy/35">{m.hora}</p>}
      </div>
    </div>
  );
}

/** La camiseta con foto, precio y botón, como en el boceto. */
function TarjetaProducto({ p }: { p: Tarjeta }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-navy/10 bg-cream/40">
      <div className="flex gap-3 p-2.5">
        {p.image ? (
          <Image
            src={p.image}
            alt=""
            width={120}
            height={120}
            className="h-16 w-16 shrink-0 rounded-xl bg-white object-cover"
          />
        ) : (
          <div className="h-16 w-16 shrink-0 rounded-xl bg-white" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold leading-tight text-navy">{p.name}</p>
          <p className="mt-0.5 text-sm font-extrabold text-navy">{formatPrice(p.price)}</p>
          {p.agotado && <p className="text-[11px] font-semibold text-red-700">Agotada</p>}
        </div>
      </div>
      <Link
        href={`/producto/${p.slug}`}
        className="block bg-navy py-2 text-center text-xs font-bold uppercase tracking-wide text-cream transition hover:bg-navy/85"
      >
        Ver en la tienda
      </Link>
    </div>
  );
}

/* Íconos de los accesos rápidos. Trazo simple, del mismo grosor. */
function base(children: React.ReactNode) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}
function IconoRemera() { return base(<path d="M8 3 4 5v5h3v11h10V10h3V5l-4-2a4 4 0 0 1-8 0Z" />); }
function IconoCamion() { return base(<><path d="M2 7h11v9H2zM13 10h4l4 3v3h-8z" /><circle cx="6.5" cy="18.5" r="1.8" /><circle cx="17.5" cy="18.5" r="1.8" /></>); }
function IconoTarjeta() { return base(<><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></>); }
function IconoCaja() { return base(<><path d="M3 8l9-4 9 4v9l-9 4-9-4z" /><path d="M3 8l9 4 9-4M12 12v9" /></>); }
function IconoEstrella() { return base(<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />); }
function IconoChat() { return base(<path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-7a8 8 0 0 1 8-8h2a8 8 0 0 1 8 4z" />); }
