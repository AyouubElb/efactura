import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Équipe' };

export default function TeamPage() {
  return <ComingSoon crumb="Administration" title="Équipe" />;
}
