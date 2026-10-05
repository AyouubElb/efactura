import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Achats' };

export default function PurchasesPage() {
  return <ComingSoon title="Achats" />;
}
