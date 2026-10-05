import type { Metadata } from 'next';
import { PaperCard } from '@/components/paper-card';
import { SetPasswordForm } from '@/features/auth/set-password-form';

// The link's token stays out of the Referer of anything this page loads
export const metadata: Metadata = {
  title: 'Invitation',
  referrer: 'no-referrer',
};

export default async function InvitationPage({
  params,
}: PageProps<'/invitation/[token]'>) {
  const { token } = await params;
  return (
    <PaperCard title="Choisissez votre mot de passe">
      <p className="text-pencil">
        Il vous servira à vous connecter à eFactura.
      </p>
      <SetPasswordForm purpose="invite" token={token} />
    </PaperCard>
  );
}
