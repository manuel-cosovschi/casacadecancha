import { PageHeader, EmptyState } from '@/components/admin/ui';
import { ConfirmAction } from '@/components/admin/ConfirmAction';
import { ExportButton } from '@/components/admin/ExportButton';
import { getExpenses } from '@/lib/admin/data';
import { saveExpense, deleteExpense } from '../_crud-actions';
import { formatPrice } from '@/lib/utils';

const CATEGORIES = ['Publicidad', 'Packaging', 'Envíos absorbidos', 'Compra de stock', 'Diseño', 'Dominio', 'Hosting', 'Insumos', 'Impresión', 'Otros'];

export default async function ExpensesPage() {
  const expenses = await getExpenses();
  const total = expenses.reduce((a: number, e: any) => a + Number(e.amount), 0);

  return (
    <div>
      <PageHeader
        title="Gastos"
        description={`Total registrado: ${formatPrice(total)}`}
        action={<ExportButton rows={expenses.map((e: any) => ({ fecha: e.date, categoria: e.category, descripcion: e.description, importe: e.amount }))} filename="gastos" />}
      />

      <form action={saveExpense} className="card mb-5 p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Nuevo gasto</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs">
            <span className="label">Fecha</span>
            <input name="date" type="date" className="input" />
          </label>
          <label className="text-xs">
            <span className="label">Categoría</span>
            <select name="category" className="input">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-xs lg:col-span-2">
            <span className="label">Descripción</span>
            <input name="description" className="input" />
          </label>
          <label className="text-xs">
            <span className="label">Importe</span>
            <input name="amount" type="number" min="0" step="1" className="input" required />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="recurring" className="h-4 w-4" /> Recurrente
          </label>
          <label className="text-xs">
            <span className="label">Campaña relacionada</span>
            <input name="related_campaign" className="input" />
          </label>
        </div>
        <button type="submit" className="btn-primary mt-3">Registrar gasto</button>
      </form>

      {expenses.length === 0 ? (
        <EmptyState message="No registraste gastos todavía." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-navy/50">
                <th className="p-3">Fecha</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Descripción</th>
                <th className="p-3 text-right">Importe</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e: any) => (
                <tr key={e.id} className="border-b border-navy/5">
                  <td className="p-3 text-navy/60">{e.date}</td>
                  <td className="p-3">{e.category}{e.recurring && <span className="badge ml-1 bg-celeste/30 text-navy">Recurrente</span>}</td>
                  <td className="p-3">{e.description}</td>
                  <td className="p-3 text-right font-medium">{formatPrice(e.amount)}</td>
                  <td className="p-3 text-right">
                    <ConfirmAction action={deleteExpense.bind(null, e.id)} confirmText="¿Eliminar este gasto?" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
