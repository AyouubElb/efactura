import type { Request } from 'express';
import type { Role } from '../../generated/prisma/client.js';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  sessionId: string;
}

export interface AccessTokenClaims {
  sub: string;
  sid: string;
}

export type AuthenticatedRequest = Request & { user: AuthUser };

// Next.js forwards the visitor's IP; trusted only after the internal key
export function clientIp(request: Request): string {
  const forwarded = request.header('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.ip || 'unknown';
}
