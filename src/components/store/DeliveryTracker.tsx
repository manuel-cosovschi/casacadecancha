import { deliverySteps, deliveryStepIndex, carrierTrackingUrl, isMdpDelivery } from '@/lib/delivery';
import { CopyButton } from './CopyButton';

/** Barra de pasos del seguimiento + (para envíos nacionales) el código del correo. */
export function DeliveryTracker({
  shippingMethod,
  deliveryStatus,
  carrier,
  trackingCode,
}: {
  shippingMethod: string | null;
  deliveryStatus: string | null;
  carrier: string | null;
  trackingCode: string | null;
}) {
  const steps = deliverySteps(shippingMethod);
  const current = Math.max(0, deliveryStepIndex(deliveryStatus));
  const nacional = !isMdpDelivery(shippingMethod);
  const dispatched = current >= 1; // en_camino (despachado) o entregado
  const url = carrierTrackingUrl(carrier);

  return (
    <div>
      <ol className="mt-4 space-y-4">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={step.key} className="flex items-start gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                  active
                    ? 'bg-celeste text-navy ring-4 ring-celeste/25'
                    : done
                      ? 'bg-green-100 text-green-700'
                      : 'bg-navy/10 text-navy/40'
                }`}
              >
                {done ? '✓' : step.emoji}
              </div>
              <div className={active || done ? '' : 'opacity-50'}>
                <p className="text-sm font-semibold text-navy">{step.label}</p>
                {active && <p className="text-sm text-navy/60">{step.desc}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {nacional && dispatched && trackingCode && (
        <div className="mt-5 rounded-xl border border-navy/10 bg-celeste/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">
            Seguimiento {carrier || 'del correo'}
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="font-mono text-lg font-bold text-navy">{trackingCode}</span>
            <CopyButton value={trackingCode} label="Copiar código" />
          </div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-bold text-navy underline-offset-4 hover:underline"
            >
              Rastrear en {carrier || 'el correo'} →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
