import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenClaims } from '../../common/auth/auth-user.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { Prisma, RefreshToken } from '../../generated/prisma/client.js';
import { ActivityService } from '../activity/activity.service.js';

const REFRESH_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
// Two requests refreshing at the same moment is not a theft
const REUSE_GRACE_MS = 30_000;

const ALREADY_REFRESHED = {
  code: 'ALREADY_REFRESHED',
  message: 'Session déjà renouvelée',
};

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  // A new login starts a new family
  async issue(
    userId: string,
    familyId: string = randomUUID(),
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<TokenPair> {
    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresAt = new Date(Date.now() + REFRESH_LIFETIME_MS);
    await tx.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: hash(refreshToken),
        expiresAt: refreshExpiresAt,
      },
    });
    const claims: AccessTokenClaims = { sub: userId, sid: familyId };
    const accessToken = await this.jwt.signAsync(claims);
    return { accessToken, refreshToken, refreshExpiresAt };
  }

  async rotate(refreshToken: string): Promise<TokenPair> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash(refreshToken) },
      include: { user: { select: { status: true } } },
    });
    if (
      !token ||
      token.revokedAt ||
      token.expiresAt < new Date() ||
      token.user.status !== 'active'
    ) {
      throw new UnauthorizedException();
    }
    if (token.usedAt) {
      return this.refuseReuse(token, token.usedAt);
    }

    return this.prisma.$transaction(async (tx) => {
      // Only one request can mark it used, even at the same millisecond
      const marked = await tx.refreshToken.updateMany({
        where: { id: token.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (marked.count === 0) {
        throw new UnauthorizedException(ALREADY_REFRESHED);
      }
      return this.issue(token.userId, token.familyId, tx);
    });
  }

  revokeFamily(familyId: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async refuseReuse(token: RefreshToken, usedAt: Date): Promise<never> {
    if (Date.now() - usedAt.getTime() <= REUSE_GRACE_MS) {
      throw new UnauthorizedException(ALREADY_REFRESHED);
    }
    // A used token coming back later was copied: the whole session goes
    await this.prisma.$transaction(async (tx) => {
      await this.revokeFamily(token.familyId, tx);
      await this.activity.record(
        tx,
        null,
        'session.revoked',
        { type: 'user', id: token.userId },
        'session révoquée : réutilisation suspecte',
      );
    });
    throw new UnauthorizedException({
      code: 'SESSION_REVOKED',
      message: 'Session révoquée, reconnectez-vous',
    });
  }
}

// Only the hash is stored: a database leak holds no usable token
function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
