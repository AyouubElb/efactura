import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { fontVariables } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: { template: '%s | eFactura', default: 'eFactura' },
  description: 'Devis, factures et achats de la boutique.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fr" className={fontVariables}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
