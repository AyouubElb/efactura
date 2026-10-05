import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Produits' };

export default function ProductsPage() {
  return <ComingSoon crumb="Catalogue" title="Produits" />;
}
