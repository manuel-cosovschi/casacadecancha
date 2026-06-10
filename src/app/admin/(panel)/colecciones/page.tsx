import { PageHeader } from '@/components/admin/ui';
import { ConfirmAction } from '@/components/admin/ConfirmAction';
import { getAdminCollections } from '@/lib/admin/data';
import { saveCollection, deleteCollection } from '../_crud-actions';

export default async function CollectionsPage() {
  const collections = await getAdminCollections();

  return (
    <div>
      <PageHeader title="Colecciones" description={`${collections.length} colecciones`} />

      <form action={saveCollection} className="card mb-5 p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Nueva colección</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="name" placeholder="Nombre" className="input" required />
          <input name="slug" placeholder="Slug (opcional)" className="input" />
          <input name="image_url" placeholder="Imagen (URL)" className="input sm:col-span-2" />
          <input name="description" placeholder="Descripción" className="input sm:col-span-2" />
          <label className="text-xs">
            <span className="label">Orden</span>
            <input name="sort_order" type="number" defaultValue={collections.length} className="input w-24" />
          </label>
          <label className="flex items-center gap-2 pt-5 text-sm">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4" /> Activa
          </label>
        </div>
        <button type="submit" className="btn-primary mt-3">Crear</button>
      </form>

      <div className="space-y-3">
        {collections.map((c: any) => (
          <form key={c.id} action={saveCollection} className="card flex flex-wrap items-end gap-3 p-4">
            <input type="hidden" name="id" value={c.id} />
            <label className="text-xs">
              <span className="label">Nombre</span>
              <input name="name" defaultValue={c.name} className="input !py-1.5" />
            </label>
            <label className="text-xs">
              <span className="label">Slug</span>
              <input name="slug" defaultValue={c.slug} className="input !py-1.5 w-32" />
            </label>
            <label className="flex-1 text-xs">
              <span className="label">Descripción</span>
              <input name="description" defaultValue={c.description ?? ''} className="input !py-1.5" />
            </label>
            <label className="text-xs">
              <span className="label">Orden</span>
              <input name="sort_order" type="number" defaultValue={c.sort_order} className="input !py-1.5 w-16" />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={c.active} className="h-4 w-4" /> Activa
            </label>
            <button type="submit" className="btn-primary !py-2">Guardar</button>
            <ConfirmAction action={deleteCollection.bind(null, c.id)} confirmText="¿Eliminar colección?" className="pb-2 text-xs font-semibold text-red-600 hover:underline" />
          </form>
        ))}
      </div>
    </div>
  );
}
