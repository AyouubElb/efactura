import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import argon2 from 'argon2';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { normalizeEmail } from '../../common/auth/email.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';
import { EmailQueue } from '../email/email.queue.js';
import type { LoginDto } from './dto/login.dto.js';
import type { LoginResponseDto, MeDto } from './dto/auth-responses.dto.js';
import type { ForgotPasswordDto, SetPasswordDto } from './dto/password.dto.js';
import {
  INVALID_LINK,
  OneTimeTokensService,
} from './one-time-tokens.service.js';
import { TokensService } from './tokens.service.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // An unknown email still runs argon2: the answer time reveals nothing
  private readonly dummyHash = argon2.hash(randomBytes(16).toString('hex'));

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly oneTime: OneTimeTokensService,
    private readonly emailQueue: EmailQueue,
    private readonly activity: ActivityService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
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

  async acceptInvite({ token, password }: SetPasswordDto): Promise<null> {
    const passwordHash = await argon2.hash(password);
    await this.prisma.$transaction(async (tx) => {
      const userId = await this.oneTime.use(tx, token, 'invite');
      const activated = await tx.user.updateMany({
        where: { id: userId, status: 'invited' },
        data: { passwordHash, status: 'active' },
      });
      if (activated.count === 0) {
        throw new BadRequestException(INVALID_LINK);
      }
      await this.activity.record(
        tx,
        { id: userId },
        'user.activated',
        { type: 'user', id: userId },
        "a accepté l'invitation",
      );
    });
    return null;
  }

  // Answers at once whatever the email: neither the answer nor its timing reveal an account
  forgotPassword({ email }: ForgotPasswordDto): null {
    void this.sendResetLink(email).catch((error: unknown) =>
      this.logger.error(
        `Reset email not queued: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    return null;
  }

  async resetPassword({ token, password }: SetPasswordDto): Promise<null> {
    const passwordHash = await argon2.hash(password);
    await this.prisma.$transaction(async (tx) => {
      const userId = await this.oneTime.use(tx, token, 'reset');
      const updated = await tx.user.updateMany({
        where: { id: userId, status: 'active' },
        data: { passwordHash },
      });
      if (updated.count === 0) {
        throw new BadRequestException(INVALID_LINK);
      }
      // Whoever knew the old password is logged out too
      await this.tokens.revokeAllForUser(userId, tx);
      await this.activity.record(
        tx,
        { id: userId },
        'user.password_reset',
        { type: 'user', id: userId },
        'a réinitialisé son mot de passe',
      );
    });
    return null;
  }

  private async sendResetLink(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
      select: { id: true, status: true },
    });
    if (user?.status !== 'active') {
      return;
    }
    const tokenId = await this.prisma.$transaction((tx) =>
      this.oneTime.create(tx, user.id, 'reset'),
    );
    await this.emailQueue.sendOneTimeLink(tokenId);
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
