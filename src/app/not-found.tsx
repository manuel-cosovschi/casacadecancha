import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy px-4 text-center text-cream">
      <p className="text-6xl font-extrabold text-celeste">404</p>
      <h1 className="text-2xl font-bold">Esta página se fue de gira</h1>
      <p className="text-cream/70">No encontramos lo que buscabas.</p>
      <Link href="/" className="btn-celeste mt-2">Volver al inicio</Link>
    </div>
  );
}
