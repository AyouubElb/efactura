import type { Role } from '@/features/auth/auth.types';

export type MemberStatus = 'invited' | 'active' | 'off';

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: MemberStatus;
  lastLoginAt: string | null;
  inviteEmail: {
    status: 'queued' | 'sent' | 'failed' | 'expired';
    expiresAt: string;
  } | null;
}
