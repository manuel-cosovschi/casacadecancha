import { redirect } from 'next/navigation';

/** /producto sin slug (link incompleto): mandamos al catálogo en vez de 404. */
export default function ProductoIndex() {
  redirect('/camisetas');
}
