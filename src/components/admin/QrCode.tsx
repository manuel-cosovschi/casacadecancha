import QRCode from 'qrcode';

/**
 * QR renderizado como SVG en el servidor (sin JS en el cliente).
 * Se escanea con la cámara del celular y abre la URL.
 */
export async function QrCode({
  value,
  size = 220,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const svg = await QRCode.toString(value, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0B1F3A', light: '#FFFFFF' },
  });
  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      // El SVG lo genera la librería a partir de una URL nuestra (no hay input del usuario).
      dangerouslySetInnerHTML={{ __html: svg.replace('<svg', '<svg width="100%" height="100%"') }}
    />
  );
}
