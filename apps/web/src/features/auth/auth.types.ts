export type Role = 'admin' | 'staff';

export interface Me {
  id: string;
  fullName: string;
  email: string;
  role: Role;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  staff: 'Collaborateur',
};
