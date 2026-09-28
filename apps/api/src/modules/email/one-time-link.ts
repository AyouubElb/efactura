import type {
  TokenPurpose,
  UserStatus,
} from '../../generated/prisma/client.js';

// Where each link leads, and who may still receive it
export const ONE_TIME_LINK: Record<
  TokenPurpose,
  { path: string; status: UserStatus; label: string }
> = {
  invite: { path: 'invitation', status: 'invited', label: 'invitation' },
  reset: {
    path: 'mot-de-passe',
    status: 'active',
    label: 'réinitialisation du mot de passe',
  },
};
