import { PaperPage } from '@/components/paper-card';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PaperPage>{children}</PaperPage>;
}
