/**
 * Arte animado por colección (sin imágenes: SVG + CSS).
 * El tema se elige por palabras clave del nombre/slug, así una colección nueva
 * creada desde el admin ya sale con su animación en vez de un fondo azul plano.
 */

type Theme =
  | 'mundial'
  | 'titulares'
  | 'alternativas'
  | 'selecciones'
  | 'retro'
  | 'ninos'
  | 'buzos'
  | 'ofertas'
  | 'cancha';

const KEYWORDS: { theme: Theme; match: RegExp }[] = [
  { theme: 'mundial', match: /mundial|copa|world/ },
  { theme: 'titulares', match: /titular|home|local/ },
  { theme: 'alternativas', match: /alternativ|suplente|away|visitante/ },
  { theme: 'selecciones', match: /selecc|nacional|pais|país|nation/ },
  { theme: 'retro', match: /retro|clasic|clásic|vintage|icon|historic/ },
  { theme: 'ninos', match: /nin|niñ|kids|chico|infantil/ },
  { theme: 'buzos', match: /buzo|abrigo|hoodie|campera|invierno/ },
  { theme: 'ofertas', match: /ofert|promo|sale|descuento|liquidac/ },
];

/** Temas de reserva para colecciones que no matchean ninguna palabra clave. */
const FALLBACKS: Theme[] = ['cancha', 'titulares', 'retro', 'mundial'];

export function themeFor(slug: string, name = ''): Theme {
  const hay = `${slug} ${name}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');
  for (const k of KEYWORDS) if (k.match.test(hay)) return k.theme;
  // Determinista: la misma colección siempre recibe el mismo arte.
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 9973;
  return FALLBACKS[h % FALLBACKS.length];
}

const GRADIENT: Record<Theme, string> = {
  mundial: 'from-[#13315f] via-[#0B1F3A] to-[#1a1230]',
  titulares: 'from-[#0e4a6b] via-[#0B2C46] to-[#071a2b]',
  alternativas: 'from-[#0f5563] via-[#0B2A38] to-[#241a2e]',
  selecciones: 'from-[#12507a] via-[#0B1F3A] to-[#0a2c2c]',
  retro: 'from-[#6b4a22] via-[#2e2113] to-[#140e08]',
  ninos: 'from-[#1f7fa8] via-[#14506e] to-[#0d2740]',
  buzos: 'from-[#33475f] via-[#1c2734] to-[#0d1319]',
  ofertas: 'from-[#8a2028] via-[#4a161b] to-[#1a0a0c]',
  cancha: 'from-[#125c3f] via-[#0a3324] to-[#061511]',
};

/** Resplandor de color para que no quede un plano liso. */
const GLOW: Record<Theme, string> = {
  mundial:
    'radial-gradient(70% 55% at 72% 18%, rgba(199,167,107,.34), transparent 65%), radial-gradient(60% 50% at 15% 85%, rgba(140,200,232,.22), transparent 60%)',
  titulares:
    'radial-gradient(65% 55% at 25% 20%, rgba(140,200,232,.32), transparent 62%), radial-gradient(55% 45% at 85% 90%, rgba(246,241,232,.14), transparent 60%)',
  alternativas:
    'radial-gradient(65% 55% at 80% 25%, rgba(216,190,140,.26), transparent 62%), radial-gradient(60% 50% at 12% 80%, rgba(140,200,232,.26), transparent 60%)',
  selecciones:
    'radial-gradient(70% 50% at 50% 12%, rgba(140,200,232,.30), transparent 65%), radial-gradient(55% 45% at 88% 85%, rgba(199,167,107,.20), transparent 60%)',
  retro:
    'radial-gradient(70% 55% at 30% 20%, rgba(216,190,140,.30), transparent 62%), radial-gradient(55% 50% at 85% 88%, rgba(199,167,107,.18), transparent 60%)',
  ninos:
    'radial-gradient(65% 55% at 70% 18%, rgba(246,241,232,.22), transparent 62%), radial-gradient(60% 50% at 18% 85%, rgba(140,200,232,.30), transparent 60%)',
  buzos:
    'radial-gradient(70% 55% at 30% 22%, rgba(140,200,232,.22), transparent 65%), radial-gradient(55% 45% at 85% 85%, rgba(246,241,232,.10), transparent 60%)',
  ofertas:
    'radial-gradient(70% 55% at 72% 20%, rgba(216,190,140,.30), transparent 62%), radial-gradient(60% 50% at 15% 85%, rgba(246,241,232,.14), transparent 60%)',
  cancha:
    'radial-gradient(70% 55% at 50% 15%, rgba(246,241,232,.16), transparent 65%), radial-gradient(60% 50% at 85% 88%, rgba(140,200,232,.18), transparent 60%)',
};

export function CollectionArt({ slug, name }: { slug: string; name?: string }) {
  const theme = themeFor(slug, name);
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENT[theme]}`} aria-hidden>
      <div className="absolute inset-0" style={{ backgroundImage: GLOW[theme] }} />
      <Art theme={theme} />
    </div>
  );
}

function Art({ theme }: { theme: Theme }) {
  switch (theme) {
    case 'mundial':
      return (
        <>
          <Confetti />
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full scale-[1.35]">
            <g className="cc-spin" style={{ transformOrigin: '50px 46px' }}>
              <circle cx="50" cy="46" r="20" fill="none" stroke="#8CC8E8" strokeWidth="1.1" opacity=".85" />
              <ellipse cx="50" cy="46" rx="8" ry="20" fill="none" stroke="#8CC8E8" strokeWidth=".8" opacity=".6" />
              <ellipse cx="50" cy="46" rx="20" ry="7.5" fill="none" stroke="#8CC8E8" strokeWidth=".8" opacity=".6" />
            </g>
            <g className="cc-orbit" style={{ transformOrigin: '50px 46px' }}>
              <path d="M50 20l1.9 4.1 4.4.5-3.3 3 .9 4.4-3.9-2.2-3.9 2.2.9-4.4-3.3-3 4.4-.5z" fill="#C7A76B" />
            </g>
          </svg>
        </>
      );

    case 'titulares':
      return (
        <>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full scale-[1.35]">
            <Jersey fill="#12365f" stroke="#8CC8E8" pinstripes />
          </svg>
          <Sweep />
        </>
      );

    case 'alternativas':
      return (
        <>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full scale-[1.35]">
            <g className="cc-fade-a">
              <Jersey fill="#0f4d63" stroke="#8CC8E8" />
            </g>
            <g className="cc-fade-b">
              <Jersey fill="#5b1a1f" stroke="#D8BE8C" />
            </g>
          </svg>
          <Sweep />
        </>
      );

    case 'selecciones':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full scale-[1.35]">
          <circle cx="50" cy="50" r="26" fill="none" stroke="#8CC8E8" strokeWidth=".7" opacity=".35" />
          {[
            { x: 22, c: '#8CC8E8', d: '0s' },
            { x: 44, c: '#F6F1E8', d: '.45s' },
            { x: 66, c: '#C7A76B', d: '.9s' },
          ].map((f) => (
            <g key={f.x} className="cc-wave" style={{ animationDelay: f.d, transformOrigin: `${f.x}px 26px` }}>
              <line x1={f.x} y1="24" x2={f.x} y2="76" stroke="#F6F1E8" strokeWidth=".9" opacity=".5" />
              <path d={`M${f.x} 26h16l-4 7 4 7h-16z`} fill={f.c} opacity=".9" />
            </g>
          ))}
        </svg>
      );

    case 'retro':
      return (
        <>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full scale-[1.35]">
            <g className="cc-spin-slow" style={{ transformOrigin: '50px 48px' }}>
              <circle cx="50" cy="48" r="19" fill="#F6F1E8" opacity=".92" />
              <path
                d="M50 33l7.5 5.4-2.9 8.8h-9.2l-2.9-8.8z"
                fill="#241a10"
              />
              <path d="M31.5 48l6-3 3 5.5-4 7.6zM68.5 48l-6-3-3 5.5 4 7.6z" fill="#241a10" opacity=".85" />
              <path d="M43 63l7 4 7-4-2.5-5h-9z" fill="#241a10" opacity=".85" />
            </g>
          </svg>
          <Scanlines />
        </>
      );

    case 'ninos':
      return (
        <>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full scale-[1.35]">
            <g className="cc-bounce" style={{ transformOrigin: '50px 70px' }}>
              <circle cx="50" cy="60" r="11" fill="#F6F1E8" />
              <path d="M50 51l4.5 3.3-1.7 5.3h-5.6l-1.7-5.3z" fill="#0B1F3A" />
            </g>
            <ellipse cx="50" cy="80" rx="13" ry="2.6" fill="#000" opacity=".22" className="cc-shadow" />
            <g opacity=".7">
              <Jersey fill="#1b5573" stroke="#8CC8E8" small />
            </g>
          </svg>
          <Confetti />
        </>
      );

    case 'buzos':
      return (
        <>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full scale-[1.35]">
            <g className="cc-float">
              <path
                d="M34 40c0-7 7-12 16-12s16 5 16 12v30a3 3 0 0 1-3 3H37a3 3 0 0 1-3-3z"
                fill="#2c3d52"
                stroke="#8CC8E8"
                strokeWidth=".8"
              />
              <path d="M38 40c3 6 9 9 12 9s9-3 12-9" fill="none" stroke="#8CC8E8" strokeWidth=".9" opacity=".8" />
              <path d="M46 49v16M54 49v16" stroke="#8CC8E8" strokeWidth=".7" opacity=".5" />
            </g>
          </svg>
          <Drift />
        </>
      );

    case 'ofertas':
      return (
        <>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full scale-[1.35]">
            <g className="cc-swing" style={{ transformOrigin: '50px 22px' }}>
              <line x1="50" y1="18" x2="50" y2="34" stroke="#D8BE8C" strokeWidth="1" />
              <g transform="translate(0,2)">
                <rect x="31" y="34" width="38" height="26" rx="5" fill="#C7A76B" />
                <circle cx="38" cy="41" r="2.2" fill="#3a1216" />
                <text
                  x="52"
                  y="54"
                  textAnchor="middle"
                  fontSize="17"
                  fontWeight="bold"
                  fill="#3a1216"
                  fontFamily="system-ui, sans-serif"
                >
                  %
                </text>
              </g>
            </g>
            <g className="cc-pop" style={{ transformOrigin: '50px 50px' }}>
              <circle cx="50" cy="47" r="27" fill="none" stroke="#D8BE8C" strokeWidth=".6" opacity=".45" />
            </g>
          </svg>
          <Sweep />
        </>
      );

    case 'cancha':
    default:
      return (
        <>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full scale-[1.35]">
            <g stroke="#F6F1E8" strokeWidth=".8" fill="none" opacity=".35">
              <rect x="12" y="16" width="76" height="68" rx="2" />
              <line x1="12" y1="50" x2="88" y2="50" />
              <circle cx="50" cy="50" r="13" />
              <rect x="34" y="16" width="32" height="10" />
              <rect x="34" y="74" width="32" height="10" />
            </g>
            <g className="cc-roll" style={{ transformOrigin: '0px 50px' }}>
              <circle cx="0" cy="50" r="7" fill="#F6F1E8" />
              <path d="M0 44l2.9 2.1-1.1 3.4h-3.6l-1.1-3.4z" fill="#0d3b2a" />
            </g>
          </svg>
          <Stripes />
        </>
      );
  }
}

/* ---------- piezas reutilizables ---------- */

function Jersey({
  fill,
  stroke,
  pinstripes,
  small,
}: {
  fill: string;
  stroke: string;
  pinstripes?: boolean;
  small?: boolean;
}) {
  const t = small ? 'translate(50,54) scale(0.55) translate(-50,-54)' : undefined;
  return (
    <g transform={t}>
      <path
        d="M35 34l9-5h12l9 5 8 6-6 8-3-2v27a3 3 0 0 1-3 3H39a3 3 0 0 1-3-3V46l-3 2-6-8z"
        fill={fill}
        stroke={stroke}
        strokeWidth=".9"
      />
      <path d="M44 29a6 6 0 0 0 12 0" fill="none" stroke={stroke} strokeWidth=".9" />
      {pinstripes && (
        <g stroke={stroke} strokeWidth=".5" opacity=".55">
          <path d="M41 40v34M47 37v37M53 37v37M59 40v34" />
        </g>
      )}
    </g>
  );
}

function Sweep() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="cc-sweep absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/18 to-transparent" />
    </div>
  );
}

function Confetti() {
  const bits = [
    { l: '12%', d: '0s', c: 'bg-celeste', r: '6s' },
    { l: '28%', d: '1.1s', c: 'bg-gold', r: '7.5s' },
    { l: '46%', d: '2.2s', c: 'bg-cream', r: '6.8s' },
    { l: '63%', d: '.6s', c: 'bg-celeste-bright', r: '8s' },
    { l: '80%', d: '1.7s', c: 'bg-gold-soft', r: '6.4s' },
    { l: '91%', d: '3s', c: 'bg-cream', r: '7.2s' },
  ];
  // Cada papelito viaja dentro de una columna de alto completo: así el recorrido
  // se mide contra la tarjeta (los % de translateY son relativos al propio elemento).
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b, i) => (
        <span
          key={i}
          className="cc-fall absolute inset-y-0 w-1.5"
          style={{ left: b.l, animationDelay: b.d, animationDuration: b.r }}
        >
          <span className={`absolute top-0 block h-3 w-1.5 rounded-sm ${b.c} opacity-90 shadow-sm`} />
        </span>
      ))}
    </div>
  );
}

function Scanlines() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
      <div
        className="cc-scan absolute -inset-y-4 inset-x-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(255,255,255,.14) 0 1px, transparent 1px 5px)',
        }}
      />
    </div>
  );
}

function Drift() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[
        { l: '18%', t: '22%', s: 'h-10 w-10', d: '0s' },
        { l: '68%', t: '58%', s: 'h-14 w-14', d: '1.5s' },
        { l: '42%', t: '78%', s: 'h-8 w-8', d: '3s' },
      ].map((c, i) => (
        <span
          key={i}
          className={`cc-drift absolute rounded-full bg-celeste/10 blur-md ${c.s}`}
          style={{ left: c.l, top: c.t, animationDelay: c.d }}
        />
      ))}
    </div>
  );
}

function Stripes() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.06]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(115deg, #F6F1E8 0 8px, transparent 8px 26px)',
      }}
    />
  );
}
