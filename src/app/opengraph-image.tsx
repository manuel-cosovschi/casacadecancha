import { ImageResponse } from 'next/og';

export const alt = 'Casaca de Cancha — Camisetas de fútbol';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Imagen de previsualización al compartir el link (WhatsApp, iMessage, redes).
// De marca (logo + nombre), no una camiseta puntual: representa toda la tienda.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0B1F3A 0%, #14375f 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <svg width="200" height="200" viewBox="0 0 40 40">
          <polygon points="6,31 12,31 20,9 14,9" fill="#F6F1E8" />
          <polygon points="14,31 20,31 28,9 22,9" fill="#F6F1E8" />
          <polygon points="22,31 28,31 36,9 30,9" fill="#8CC8E8" />
        </svg>
        <div
          style={{
            marginTop: 32,
            fontSize: 84,
            fontWeight: 900,
            letterSpacing: -2,
            color: '#F6F1E8',
            textTransform: 'uppercase',
          }}
        >
          Casaca de Cancha
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 38,
            fontWeight: 600,
            color: '#8CC8E8',
          }}
        >
          Camisetas de fútbol · Envíos a todo el país
        </div>
      </div>
    ),
    { ...size },
  );
}
