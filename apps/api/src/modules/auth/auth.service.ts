import { randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import argon2 from 'argon2';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { LoginResponseDto, MeDto } from './dto/auth-responses.dto.js';
import { TokensService } from './tokens.service.js';

@Injectable()
export class AuthService {
  // An unknown email still runs argon2: the answer time reveals nothing
  private readonly dummyHash = argon2.hash(randomBytes(16).toString('hex'));

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    const passwordHash = user?.passwordHash ?? (await this.dummyHash);
    const valid = await argon2.verify(passwordHash, dto.password);

    if (!user || !valid || user.status !== 'active') {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      const pair = await this.tokens.issue(user.id, undefined, tx);
      return { ...pair, user: toMe(user) };
    });
  }

  async logout(user: AuthUser): Promise<null> {
    await this.tokens.revokeFamily(user.sessionId);
    return null;
  }

  me(user: AuthUser): MeDto {
    return toMe(user);
  }
}

function toMe(
  user: Pick<AuthUser, 'id' | 'fullName' | 'email' | 'role'>,
): MeDto {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
}
