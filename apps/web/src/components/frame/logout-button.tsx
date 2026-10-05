'use client';

import { useFormStatus } from 'react-dom';
import { logout } from '@/features/auth/auth.actions';

// A form, so it works before the page's JavaScript has loaded
export function LogoutButton() {
  return (
    <form action={logout}>
      <LogoutSubmit />
    </form>
  );
}

function LogoutSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="link mt-1 cursor-pointer text-xs disabled:cursor-wait"
    >
      {pending ? 'Déconnexion en cours' : 'Se déconnecter'}
    </button>
  );
}
