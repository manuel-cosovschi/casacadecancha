import { CartProvider } from '@/components/cart/CartProvider';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { AnnouncementBar } from '@/components/store/AnnouncementBar';
import { Header } from '@/components/store/Header';
import { Footer } from '@/components/store/Footer';
import { WhatsAppButton } from '@/components/store/WhatsAppButton';
import { UtmCapture } from '@/components/store/UtmCapture';
import { getAllSettings } from '@/lib/settings';

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getAllSettings();
  const transferDiscount = settings.payments_transfer?.active
    ? settings.payments_transfer.discount_percent || 0
    : 0;

  return (
    <CartProvider>
      <UtmCapture />
      <AnnouncementBar data={settings.announcement_bar} />
      <Header />
      <main className="min-h-[60vh]">{children}</main>
      <Footer data={settings.footer} />
      <WhatsAppButton data={settings.whatsapp} />
      <CartDrawer transferDiscount={transferDiscount} />
    </CartProvider>
  );
}
