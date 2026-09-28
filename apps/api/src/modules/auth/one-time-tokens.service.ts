import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hashToken, linkToken } from '../../common/auth/token-hash.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import type { Prisma, TokenPurpose } from '../../generated/prisma/client.js';

const LIFETIME_MS: Record<TokenPurpose, number> = {
  invite: 7 * 24 * 60 * 60 * 1000,
  reset: 60 * 60 * 1000,
};

export const INVALID_LINK = {
  code: 'INVALID_LINK',
  message: 'Lien invalide ou expiré',
};

@Injectable()
export class OneTimeTokensService {
  private readonly secret: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.secret = config.get('LINK_SECRET', { infer: true });
  }

  // Only the newest link of each kind works
  async create(
    tx: Prisma.TransactionClient,
    userId: string,
    purpose: TokenPurpose,
  ): Promise<string> {
    const now = new Date();
    await this.expireAll(tx, userId, purpose);
    const id = randomUUID();
    await tx.oneTimeToken.create({
      data: {
        id,
        userId,
        purpose,
        tokenHash: hashToken(linkToken(this.secret, id)),
        expiresAt: new Date(now.getTime() + LIFETIME_MS[purpose]),
      },
    });
    return id;
  }

  // Only one request can use a link, even at the same millisecond
  async use(
    tx: Prisma.TransactionClient,
    token: string,
    purpose: TokenPurpose,
  ): Promise<string> {
    const found = await tx.oneTimeToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, userId: true, purpose: true },
    });
    if (found?.purpose !== purpose) {
      throw new BadRequestException(INVALID_LINK);
    }
    const now = new Date();
    const marked = await tx.oneTimeToken.updateMany({
      where: { id: found.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (marked.count === 0) {
      throw new BadRequestException(INVALID_LINK);
    }
    return found.userId;
  }

  expireAll(
    tx: Prisma.TransactionClient,
    userId: string,
    purpose?: TokenPurpose,
  ) {
    const now = new Date();
    return tx.oneTimeToken.updateMany({
      where: { userId, purpose, usedAt: null, expiresAt: { gt: now } },
      data: { expiresAt: now },
    });
  }
}
