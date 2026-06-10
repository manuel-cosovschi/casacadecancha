import { PageHeader, EmptyState } from '@/components/admin/ui';
import { ConfirmAction } from '@/components/admin/ConfirmAction';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { getPromotions } from '@/lib/admin/data';
import { getAllSettings } from '@/lib/settings';
import { savePromotion, deletePromotion } from '../_crud-actions';

export default async function PromotionsPage() {
  const [promos, settings] = await Promise.all([getPromotions(), getAllSettings()]);

  return (
    <div className="space-y-5">
      <PageHeader title="Promociones" description="Descuento por transferencia y cupones." />

      <SettingsForm
        settingKey="payments_transfer"
        title="Descuento por transferencia"
        initial={settings.payments_transfer}
        fields={[
          { key: 'active', label: 'Activo', type: 'boolean' },
          { key: 'discount_percent', label: 'Porcentaje (%)', type: 'number' },
          { key: 'text', label: 'Texto visible', full: true },
        ]}
      />

      <form action={savePromotion} className="card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Nuevo cupón</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input name="name" placeholder="Nombre" className="input" required />
          <input name="code" placeholder="Código (ej: MUNDIAL10)" className="input" />
          <select name="type" className="input">
            <option value="coupon">Cupón %</option>
            <option value="fixed">Monto fijo</option>
            <option value="free_shipping">Envío gratis</option>
          </select>
          <input name="percentage" type="number" placeholder="% descuento" className="input" />
          <input name="fixed_amount" type="number" placeholder="Monto fijo" className="input" />
          <input name="minimum_amount" type="number" placeholder="Monto mínimo" className="input" />
          <input name="max_uses" type="number" placeholder="Usos máx." className="input" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4" /> Activo
          </label>
        </div>
        <button type="submit" className="btn-primary mt-3">Crear cupón</button>
      </form>

      {promos.length === 0 ? (
        <EmptyState message="No hay promociones cargadas." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-navy/50">
                <th className="p-3">Nombre</th>
                <th className="p-3">Código</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Estado</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p: any) => (
                <tr key={p.id} className="border-b border-navy/5">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">{p.code || '—'}</td>
                  <td className="p-3">{p.type}</td>
                  <td className="p-3">{p.percentage ? `${p.percentage}%` : p.fixed_amount ? `$${p.fixed_amount}` : '—'}</td>
                  <td className="p-3">{p.active ? <span className="badge bg-green-100 text-green-800">Activo</span> : <span className="badge bg-navy/10 text-navy/60">Inactivo</span>}</td>
                  <td className="p-3 text-right">
                    <ConfirmAction action={deletePromotion.bind(null, p.id)} confirmText="¿Eliminar promoción?" />
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
