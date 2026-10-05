import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Activité' };

export default function ActivityPage() {
  return <ComingSoon crumb="Administration" title="Activité" />;
}
