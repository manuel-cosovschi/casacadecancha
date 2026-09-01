import { CartProvider } from '@/components/cart/CartProvider';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { AnnouncementBar } from '@/components/store/AnnouncementBar';
import { Header } from '@/components/store/Header';
import { Footer } from '@/components/store/Footer';
import { WhatsAppButton } from '@/components/store/WhatsAppButton';
import { UtmCapture } from '@/components/store/UtmCapture';
import { VacationGate, VacationBar } from '@/components/store/VacationGate';
import { SaleStrip, SalePopup } from '@/components/store/SaleBanner';
import { getAllSettings, vacationState } from '@/lib/settings';
import { SITE_SALE, salePercentAt } from '@/lib/sale';
import { MASCOT_URL } from '@/lib/brand';

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getAllSettings();
  const transferDiscount = settings.payments_transfer?.active
    ? settings.payments_transfer.discount_percent || 0
    : 0;
  const vac = vacationState(settings);
  // La promo no se anuncia si los pedidos están pausados por vacaciones.
  const salePct = vac.active ? 0 : salePercentAt();
  const saleUntil = new Date(SITE_SALE.ends_at).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  return (
    <CartProvider>
      <UtmCapture />
      {vac.active ? (
        <>
          <VacationGate
            title={vac.title}
            subtitle={vac.subtitle}
            note={vac.note}
            whatsapp={settings.whatsapp?.number || ''}
            mascot={MASCOT_URL}
          />
          <VacationBar subtitle={vac.subtitle} />
        </>
      ) : (
        <AnnouncementBar data={settings.announcement_bar} />
      )}
      {salePct > 0 && (
        <>
          <SaleStrip percent={salePct} endsAt={SITE_SALE.ends_at} until={saleUntil} />
          <SalePopup percent={salePct} endsAt={SITE_SALE.ends_at} until={saleUntil} />
        </>
      )}
      <Header />
      <main className="min-h-[60vh]">{children}</main>
      <Footer data={settings.footer} />
      <WhatsAppButton data={settings.whatsapp} />
      {!vac.active && <CartDrawer transferDiscount={transferDiscount} />}
    </CartProvider>
  );
}
