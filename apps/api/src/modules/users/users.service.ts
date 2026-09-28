import { ConflictException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { normalizeEmail } from '../../common/auth/email.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { Prisma, Role } from '../../generated/prisma/client.js';
import { ActivityService } from '../activity/activity.service.js';
import { OneTimeTokensService } from '../auth/one-time-tokens.service.js';
import { TokensService } from '../auth/tokens.service.js';
import { EmailQueue } from '../email/email.queue.js';
import type { InviteUserDto, UserDto } from './dto/users.dto.js';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrateur',
  staff: 'Collaborateur',
};

const USER = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  oneTimeTokens: {
    where: { purpose: 'invite' },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { emailSentAt: true, emailFailedAt: true, expiresAt: true },
  },
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof USER }>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly oneTime: OneTimeTokensService,
    private readonly tokens: TokensService,
    private readonly emailQueue: EmailQueue,
  ) {}

  async list(): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({
      select: USER,
      orderBy: { createdAt: 'asc' },
    });
    return users.map(toDto);
  }

  // A person still invited gets a fresh link: that is "Renvoyer l'invitation"
  async invite(dto: InviteUserDto, admin: AuthUser): Promise<UserDto> {
    const email = normalizeEmail(dto.email);
    const { userId, tokenId } = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email },
        select: { id: true, status: true, fullName: true, role: true },
      });
      if (existing?.status === 'off') {
        throw new ConflictException({
          code: 'ACCOUNT_OFF',
          message: "Ce compte est désactivé : réactivez-le depuis l'équipe",
        });
      }
      if (existing?.status === 'active') {
        throw new ConflictException({
          code: 'EMAIL_TAKEN',
          message: 'Cet email est déjà utilisé',
        });
      }
      const data = { fullName: dto.fullName.trim(), role: dto.role };
      const user = existing
        ? await tx.user.update({ where: { id: existing.id }, data })
        : await tx.user.create({ data: { ...data, email } });

      if (existing) {
        const roleChange =
          existing.role === user.role
            ? ''
            : ` (${ROLE_LABEL[existing.role]} → ${ROLE_LABEL[user.role]})`;
        await this.activity.record(
          tx,
          admin,
          'user.invite_resent',
          { type: 'user', id: user.id },
          `a renvoyé l'invitation de ${user.fullName}${roleChange}`,
          changes(existing, user),
        );
      } else {
        await this.activity.record(
          tx,
          admin,
          'user.invited',
          { type: 'user', id: user.id },
          `a invité ${user.fullName} (${ROLE_LABEL[user.role]})`,
        );
      }
      const tokenId = await this.oneTime.create(tx, user.id, 'invite');
      return { userId: user.id, tokenId };
    });

    await this.emailQueue.sendOneTimeLink(tokenId);
    return this.get(userId);
  }

  async changeRole(id: string, role: Role, admin: AuthUser): Promise<UserDto> {
    await this.prisma.$transaction(async (tx) => {
      const activeAdmins = await lockActiveAdmins(tx);
      const user = await tx.user.findUniqueOrThrow({ where: { id } });
      if (user.role === role) {
        return;
      }
      assertNotLastAdmin(activeAdmins, id);
      await tx.user.update({ where: { id }, data: { role } });
      await this.activity.record(
        tx,
        admin,
        'user.role_changed',
        { type: 'user', id },
        `a changé le rôle de ${user.fullName} : ${ROLE_LABEL[user.role]} → ${ROLE_LABEL[role]}`,
        { before: { role: user.role }, after: { role } },
      );
    });
    return this.get(id);
  }

  // Immediate: every session is revoked and AuthGuard reads the status on each request
  async turnOff(id: string, admin: AuthUser): Promise<UserDto> {
    await this.prisma.$transaction(async (tx) => {
      const activeAdmins = await lockActiveAdmins(tx);
      const user = await tx.user.findUniqueOrThrow({ where: { id } });
      if (user.status === 'off') {
        return;
      }
      assertNotLastAdmin(activeAdmins, id);
      await tx.user.update({ where: { id }, data: { status: 'off' } });
      await this.tokens.revokeAllForUser(id, tx);
      await this.oneTime.expireAll(tx, id);
      await this.activity.record(
        tx,
        admin,
        'user.turned_off',
        { type: 'user', id },
        `a désactivé le compte de ${user.fullName}`,
      );
    });
    return this.get(id);
  }

  // Someone who never chose a password goes back to invited, and needs a new invitation
  async turnOn(id: string, admin: AuthUser): Promise<UserDto> {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id } });
      if (user.status !== 'off') {
        return;
      }
      await tx.user.update({
        where: { id },
        data: { status: user.passwordHash ? 'active' : 'invited' },
      });
      await this.activity.record(
        tx,
        admin,
        'user.turned_on',
        { type: 'user', id },
        `a réactivé le compte de ${user.fullName}`,
      );
    });
    return this.get(id);
  }

  private async get(id: string): Promise<UserDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: USER,
    });
    return toDto(user);
  }
}

// Two admins demoting each other at once: the second waits, then sees one admin left
async function lockActiveAdmins(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM users WHERE role = 'admin' AND status = 'active' FOR UPDATE`;
  return rows.map((row) => row.id);
}

function assertNotLastAdmin(activeAdmins: string[], id: string) {
  if (activeAdmins.includes(id) && activeAdmins.length === 1) {
    throw new ConflictException({
      code: 'LAST_ADMIN',
      message: 'Il faut garder au moins un administrateur actif',
    });
  }
}

// The name and role a re-sent invitation changed, before and after
function changes(
  before: { fullName: string; role: Role },
  after: { fullName: string; role: Role },
) {
  const keys = (['fullName', 'role'] as const).filter(
    (key) => before[key] !== after[key],
  );
  if (keys.length === 0) {
    return undefined;
  }
  const pick = (source: typeof before) =>
    Object.fromEntries(keys.map((key) => [key, source[key]]));
  return { before: pick(before), after: pick(after) };
}

function toDto({ oneTimeTokens, ...user }: UserRow): UserDto {
  const invite = oneTimeTokens[0];
  return {
    ...user,
    inviteEmail:
      user.status === 'invited' && invite
        ? { status: inviteStatus(invite), expiresAt: invite.expiresAt }
        : null,
  };
}

function inviteStatus(invite: UserRow['oneTimeTokens'][number]) {
  if (invite.emailFailedAt) {
    return 'failed';
  }
  if (invite.expiresAt <= new Date()) {
    return 'expired';
  }
  return invite.emailSentAt ? 'sent' : 'queued';
}
