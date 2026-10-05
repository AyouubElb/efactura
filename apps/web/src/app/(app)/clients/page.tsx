import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Clients' };

export default function ClientsPage() {
  return <ComingSoon crumb="Catalogue" title="Clients" />;
}
