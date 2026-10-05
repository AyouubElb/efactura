import type { Metadata } from 'next';
import { PaperCard } from '@/components/paper-card';
import { SetPasswordForm } from '@/features/auth/set-password-form';

// The link's token stays out of the Referer of anything this page loads
export const metadata: Metadata = {
  title: 'Nouveau mot de passe',
  referrer: 'no-referrer',
};

export default async function ResetPasswordPage({
  params,
}: PageProps<'/reset-password/[token]'>) {
  const { token } = await params;
  return (
    <PaperCard title="Nouveau mot de passe">
      <p className="text-pencil">
        Vos autres sessions se fermeront une fois le mot de passe enregistré.
      </p>
      <SetPasswordForm purpose="reset" token={token} />
    </PaperCard>
  );
}
