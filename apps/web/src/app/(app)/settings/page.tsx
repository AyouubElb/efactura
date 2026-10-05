import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Paramètres' };

export default function SettingsPage() {
  return <ComingSoon crumb="Administration" title="Paramètres" />;
}
