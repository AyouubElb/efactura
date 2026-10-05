import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Fournisseurs' };

export default function SuppliersPage() {
  return <ComingSoon crumb="Catalogue" title="Fournisseurs" />;
}
