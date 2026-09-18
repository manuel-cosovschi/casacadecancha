import { PageHeader, StatCard, EmptyState } from '@/components/admin/ui';
import { ExportButton } from '@/components/admin/ExportButton';
import { getStockNotifications, getAbandonedCarts, getWelcomeSignups } from '@/lib/admin/data';
import { WELCOME } from '@/lib/welcome';
import { AvisoPrecios } from './AvisoPrecios';
import { PromoSemana } from './PromoSemana';
import { AvisarSuscriptores } from './AvisarSuscriptores';
import { promoDeLaSemana, catalogoParaAviso, cuponesParaAviso } from './actions';
import {
  ASUNTO_BAJA_PRECIOS,
  avisoBajaPreciosHtml,
  EJEMPLOS_BAJA_PRECIOS,
  promoSemanaHtml,
} from '@/lib/avisos';
import { formatPrice, whatsappLink } from '@/lib/utils';

/** mailto: con el código adentro, para mandarlo desde tu propio mail. */
function mailtoCodigo(s: {
  name: string;
  email: string;
  code: string | null;
  /** El de esa persona: los que se anotaron antes del cambio tienen 10%. */
  percent: number;
}) {
  const nombre = s.name.trim().split(/\s+/)[0] || '';
  const cuerpo = [
    `¡Hola${nombre ? ` ${nombre}` : ''}!`,
    '',
    `Acá va tu código de ${s.percent}% OFF para tu primera compra: ${s.code ?? ''}`,
    '',
    'Lo ponés en el campo de cupón al finalizar la compra, con este mismo mail.',
    'Se suma a las promos: vale también sobre las camisetas ya rebajadas.',
    '',
    'https://casacadecancha.shop/camisetas',
  ].join('\n');
  return `mailto:${s.email}?subject=${encodeURIComponent(`Tu ${s.percent}% OFF de bienvenida`)}&body=${encodeURIComponent(cuerpo)}`;
}

export default async function MarketingPage() {
  const [stock, carts, suscriptores, promo, catalogo, cupones] = await Promise.all([
    getStockNotifications(),
    getAbandonedCarts(),
    getWelcomeSignups(),
    promoDeLaSemana(),
    catalogoParaAviso(),
    cuponesParaAviso(),
  ]);

  const pendingStock = stock.filter((s: any) => !s.notified);
  const openCarts = carts.filter((c: any) => !c.converted);
  const sinComprar = suscriptores.filter((s) => s.orders === 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Marketing" description="Suscriptores, demanda de stock y carritos abandonados." />

      <PromoSemana
        destinatarios={suscriptores.length}
        label={promo?.label ?? null}
        hasta={promo?.hasta ?? null}
        previewHtml={promo ? promoSemanaHtml({ ...promo, nombre: '' }) : null}
      />

      <AvisarSuscriptores
        destinatarios={suscriptores.length}
        catalogo={catalogo}
        cupones={cupones}
      />

      <AvisoPrecios
        destinatarios={suscriptores.length}
        asunto={ASUNTO_BAJA_PRECIOS}
        previewHtml={avisoBajaPreciosHtml('', EJEMPLOS_BAJA_PRECIOS)}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Suscriptores del popup" value={String(suscriptores.length)} hint={`${sinComprar.length} todavía sin comprar`} />
        <StatCard label="Avisos de stock pendientes" value={String(pendingStock.length)} accent={pendingStock.length > 0 ? 'amber' : 'navy'} />
        <StatCard label="Personas esperando" value={String(new Set(pendingStock.map((s: any) => s.email)).size)} />
        <StatCard label="Carritos abandonados" value={String(openCarts.length)} accent={openCarts.length > 0 ? 'amber' : 'navy'} />
        <StatCard label="Recuperables" value={formatPrice(openCarts.reduce((a: number, c: any) => a + Number(c.subtotal), 0))} />
      </div>

      {/* Suscriptores del popup */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">Suscriptores del popup</h2>
          <ExportButton
            rows={suscriptores.map((s) => ({ nombre: s.name, email: s.email, codigo: s.code, compro: s.orders > 0 ? 'sí' : 'no', fecha: s.created_at }))}
            filename="suscriptores"
          />
        </div>
        <p className="mb-2 text-sm text-navy/60">
          El código de cada uno es el que acepta el checkout. Si a alguien no le llegó el mail,
          mandáselo vos desde acá.
        </p>
        {suscriptores.length === 0 ? (
          <EmptyState message="Todavía nadie dejó su mail en el popup." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-navy/10 text-left text-navy/50">
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Su código</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {suscriptores.map((s) => (
                  <tr key={s.id} className="border-b border-navy/5">
                    <td className="p-3 font-medium">{s.name}</td>
                    <td className="p-3 text-navy/70">{s.email}</td>
                    <td className="p-3">
                      {s.code ? (
                        <code className="select-all rounded bg-navy/5 px-1.5 py-0.5 font-bold text-navy">{s.code}</code>
                      ) : (
                        <span className="text-xs text-red-600">Falta WELCOME_SECRET</span>
                      )}
                    </td>
                    <td className="p-3">
                      {s.orders > 0 ? (
                        <span className="badge bg-green-100 text-green-800">Ya compró</span>
                      ) : (
                        <span className="badge bg-amber-100 text-amber-800">Sin comprar</span>
                      )}
                    </td>
                    <td className="p-3 text-navy/50">{new Date(s.created_at).toLocaleDateString('es-AR')}</td>
                    <td className="p-3 text-right">
                      {s.code && s.orders === 0 && (
                        <a href={mailtoCodigo(s)} className="text-xs font-semibold text-celeste-bright hover:underline">
                          Mandarle el código
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Avisos de stock */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">Avisos de stock (demanda)</h2>
          <ExportButton
            rows={stock.map((s: any) => ({ producto: s.products?.name, talle: s.size, email: s.email, telefono: s.phone, avisado: s.notified ? 'sí' : 'no', fecha: s.created_at }))}
            filename="avisos-stock"
          />
        </div>
        {stock.length === 0 ? (
          <EmptyState message="Todavía nadie pidió aviso de stock." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-navy/10 text-left text-navy/50">
                  <th className="p-3">Producto</th>
                  <th className="p-3">Talle</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s: any) => (
                  <tr key={s.id} className="border-b border-navy/5">
                    <td className="p-3 font-medium">{s.products?.name || '—'}</td>
                    <td className="p-3">{s.size || '—'}</td>
                    <td className="p-3 text-navy/70">{s.email}</td>
                    <td className="p-3">
                      {s.notified ? <span className="badge bg-green-100 text-green-800">Avisado</span> : <span className="badge bg-amber-100 text-amber-800">Esperando</span>}
                    </td>
                    <td className="p-3 text-navy/50">{new Date(s.created_at).toLocaleDateString('es-AR')}</td>
                    <td className="p-3 text-right">
                      {s.phone && (
                        <a href={whatsappLink(s.phone, `Hola! Ya tenemos stock${s.size ? ` del talle ${s.size}` : ''}. ¿Te interesa?`)} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#25D366] hover:underline">WhatsApp</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Carritos abandonados */}
      <div>
        <h2 className="mb-2 text-lg font-bold text-navy">Carritos abandonados</h2>
        {carts.length === 0 ? (
          <EmptyState message="Sin carritos abandonados por ahora." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-navy/10 text-left text-navy/50">
                  <th className="p-3">Email</th>
                  <th className="p-3">Productos</th>
                  <th className="p-3">Subtotal</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {carts.map((c: any) => (
                  <tr key={c.id} className="border-b border-navy/5">
                    <td className="p-3 text-navy/70">{c.email}</td>
                    <td className="p-3">{(c.items_json || []).map((i: any) => `${i.quantity || 1}× ${i.name || ''}`).join(', ') || '—'}</td>
                    <td className="p-3 font-medium">{formatPrice(c.subtotal)}</td>
                    <td className="p-3">
                      {c.converted ? <span className="badge bg-green-100 text-green-800">Compró</span> : c.reminded ? <span className="badge bg-blue-100 text-blue-800">Recordado</span> : <span className="badge bg-amber-100 text-amber-800">Abierto</span>}
                    </td>
                    <td className="p-3 text-navy/50">{new Date(c.updated_at).toLocaleDateString('es-AR')}</td>
                    <td className="p-3 text-right">
                      {c.phone && (
                        <a href={whatsappLink(c.phone, 'Hola! Vi que dejaste productos en el carrito. ¿Te ayudo a terminar la compra?')} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#25D366] hover:underline">WhatsApp</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
