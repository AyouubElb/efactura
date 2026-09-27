import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Page } from '../../common/response/page.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { ActivityQueryDto } from './dto/activity-query.dto.js';
import { ADMIN_ONLY_HISTORY, type EntityType } from './entity-types.js';

export interface HistoryEntity {
  type: EntityType;
  id: string;
}

const ENTRY = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  summary: true,
  details: true,
  createdAt: true,
  user: { select: { id: true, fullName: true } },
} satisfies Prisma.ActivityLogSelect;

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  // Call it with the change's transaction: both are saved, or neither
  record(
    tx: Prisma.TransactionClient,
    user: { id: string } | null,
    action: string,
    entity: HistoryEntity,
    summary: string,
    details?: Prisma.InputJsonValue,
  ) {
    return tx.activityLog.create({
      data: {
        userId: user?.id ?? null,
        action,
        entityType: entity.type,
        entityId: entity.id,
        summary,
        details,
      },
    });
  }

  forEntity(entity: HistoryEntity, reader: AuthUser) {
    if (ADMIN_ONLY_HISTORY.includes(entity.type) && reader.role !== 'admin') {
      throw new ForbiddenException({
        code: 'ADMIN_ONLY',
        message: "Action réservée à l'administrateur",
      });
    }
    return this.prisma.activityLog.findMany({
      where: { entityType: entity.type, entityId: entity.id },
      select: ENTRY,
      orderBy: { createdAt: 'desc' },
    });
  }

  async list({ page, pageSize, userId }: ActivityQueryDto) {
    const where = { userId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        select: ENTRY,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.activityLog.count({ where }),
    ]);
    return new Page(items, page, pageSize, total);
  }
}
