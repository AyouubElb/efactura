import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Devis' };

export default function QuotesPage() {
  return <ComingSoon crumb="Ventes" title="Devis" />;
}
