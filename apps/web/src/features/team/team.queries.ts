import 'server-only';
import { apiGet } from '@/lib/api-server';
import type { TeamMember } from './team.types';

export function listTeam() {
  return apiGet<TeamMember[]>('/users');
}
