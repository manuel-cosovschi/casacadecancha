import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Casaca Admin',
  robots: { index: false, follow: false },
  manifest: '/admin.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Casaca Admin',
    statusBarStyle: 'default',
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
