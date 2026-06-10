import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

// Ícono PWA (logo Casaca de Cancha: navy + 3 franjas, la 3ra celeste).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#0B1F3A',
        }}
      >
        <svg width="512" height="512" viewBox="0 0 40 40">
          <polygon points="6,31 12,31 20,9 14,9" fill="#F6F1E8" />
          <polygon points="14,31 20,31 28,9 22,9" fill="#F6F1E8" />
          <polygon points="22,31 28,31 36,9 30,9" fill="#8CC8E8" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
