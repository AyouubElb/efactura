import type { Metadata } from 'next';
import { PaperCard } from '@/components/paper-card';
import { ForgotPasswordForm } from '@/features/auth/forgot-password-form';

export const metadata: Metadata = { title: 'Mot de passe oublié' };

export default function ForgotPasswordPage() {
  return (
    <PaperCard title="Mot de passe oublié">
      <ForgotPasswordForm />
    </PaperCard>
  );
}
