import { redirect } from 'next/navigation';

/** /coleccion sin slug (link incompleto): mandamos al catálogo en vez de 404. */
export default function ColeccionIndex() {
  redirect('/camisetas');
}
