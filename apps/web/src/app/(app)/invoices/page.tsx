import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Factures' };

export default function InvoicesPage() {
  return <ComingSoon crumb="Ventes" title="Factures" />;
}
