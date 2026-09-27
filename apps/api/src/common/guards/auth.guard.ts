import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  AccessTokenClaims,
  AuthenticatedRequest,
} from '../auth/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Checks the access token, then loads the user: a turned-off login fails on its next click
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.header('authorization')?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException();
    }

    const claims = await this.jwt
      .verifyAsync<AccessTokenClaims>(token)
      .catch(() => {
        throw new UnauthorizedException();
      });

    const user = await this.prisma.user.findUnique({
      where: { id: claims.sub },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        // The session lives while one of its refresh tokens isn't revoked
        refreshTokens: {
          where: { familyId: claims.sid, revokedAt: null },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (user?.status !== 'active' || user.refreshTokens.length === 0) {
      throw new UnauthorizedException();
    }

    request.user = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      sessionId: claims.sid,
    };
    return true;
  }
}
