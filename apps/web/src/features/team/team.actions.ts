'use server';

import { refresh } from 'next/cache';
import type { Role } from '@/features/auth/auth.types';
import {
  fromZod,
  GONE,
  isRecordId,
  toActionError,
  type ActionFailure,
  type ActionResult,
} from '@/lib/action-result';
import type { ApiError } from '@/lib/api-core';
import { apiSend } from '@/lib/api-server';
import { inviteSchema, roleSchema, type InviteInput } from './team.schemas';
import type { MemberStatus, TeamMember } from './team.types';

const NOT_QUEUED =
  "Invitation enregistrée, mais l'e-mail n'a pas pu partir. Utilisez « Renvoyer l'invitation ».";

function failure(error: ApiError): ActionFailure {
  if (error.code === 'EMAIL_NOT_QUEUED') {
    return { ok: false, error: NOT_QUEUED, code: error.code };
  }
  return toActionError(error, {
    conflicts: { EMAIL_TAKEN: 'email', ACCOUNT_OFF: 'email' },
  });
}

// Inviting someone still invited sends a fresh link: that is "Renvoyer l'invitation"
export async function inviteMember(
  input: InviteInput,
): Promise<ActionResult<{ email: string }>> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  const result = await apiSend<TeamMember>(
    'POST',
    '/users/invite',
    parsed.data,
  );
  if (!result.ok) {
    // The person is saved even when the e-mail couldn't leave
    if (result.error.code === 'EMAIL_NOT_QUEUED') {
      refresh();
    }
    return failure(result.error);
  }
  refresh();
  return { ok: true, data: { email: result.data.email } };
}

export async function changeRole(
  id: string,
  role: Role,
): Promise<ActionResult<{ fullName: string; role: Role }>> {
  if (!isRecordId(id) || !roleSchema.safeParse(role).success) {
    return GONE;
  }
  const result = await apiSend<TeamMember>('PATCH', `/users/${id}`, { role });
  if (!result.ok) {
    return failure(result.error);
  }
  refresh();
  return {
    ok: true,
    data: { fullName: result.data.fullName, role: result.data.role },
  };
}

export async function setMemberOff(
  id: string,
  off: boolean,
): Promise<ActionResult<{ fullName: string; status: MemberStatus }>> {
  if (!isRecordId(id)) {
    return GONE;
  }
  const result = await apiSend<TeamMember>(
    'POST',
    `/users/${id}/${off ? 'turn-off' : 'turn-on'}`,
  );
  if (!result.ok) {
    return failure(result.error);
  }
  refresh();
  return {
    ok: true,
    data: { fullName: result.data.fullName, status: result.data.status },
  };
}
