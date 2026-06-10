import { PageHeader, EmptyState } from '@/components/admin/ui';
import { ConfirmAction } from '@/components/admin/ConfirmAction';
import { getAdminFaqs } from '@/lib/admin/data';
import { saveFaq, deleteFaq } from '../_crud-actions';

export default async function FaqAdminPage() {
  const faqs = await getAdminFaqs();

  return (
    <div>
      <PageHeader title="Preguntas frecuentes" description={`${faqs.length} preguntas`} />

      <form action={saveFaq} className="card mb-5 p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Nueva pregunta</h2>
        <div className="grid gap-3">
          <input name="question" placeholder="Pregunta" className="input" required />
          <textarea name="answer" placeholder="Respuesta" className="input min-h-20" required />
          <div className="flex items-center gap-4">
            <label className="text-xs">
              <span className="label">Orden</span>
              <input name="sort_order" type="number" defaultValue={faqs.length} className="input w-24" />
            </label>
            <label className="flex items-center gap-2 pt-5 text-sm">
              <input type="checkbox" name="active" defaultChecked className="h-4 w-4" /> Activa
            </label>
          </div>
        </div>
        <button type="submit" className="btn-primary mt-3">Agregar</button>
      </form>

      {faqs.length === 0 ? (
        <EmptyState message="No hay preguntas cargadas." />
      ) : (
        <div className="space-y-3">
          {faqs.map((f: any) => (
            <form key={f.id} action={saveFaq} className="card p-4">
              <input type="hidden" name="id" value={f.id} />
              <div className="grid gap-2">
                <input name="question" defaultValue={f.question} className="input font-semibold" />
                <textarea name="answer" defaultValue={f.answer} className="input min-h-16" />
                <div className="flex items-center gap-4">
                  <label className="text-xs">
                    <span className="label">Orden</span>
                    <input name="sort_order" type="number" defaultValue={f.sort_order} className="input w-20 !py-1" />
                  </label>
                  <label className="flex items-center gap-2 pt-4 text-sm">
                    <input type="checkbox" name="active" defaultChecked={f.active} className="h-4 w-4" /> Activa
                  </label>
                  <div className="ml-auto flex items-center gap-3 pt-4">
                    <button type="submit" className="text-xs font-semibold text-navy hover:underline">Guardar</button>
                    <ConfirmAction action={deleteFaq.bind(null, f.id)} confirmText="¿Eliminar esta pregunta?" />
                  </div>
                </div>
              </div>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
