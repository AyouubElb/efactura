import { randomUUID } from 'node:crypto';
import { GoneException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { hashToken, shareToken } from '../../common/auth/token-hash.js';
import { lockRow } from '../../common/prisma/lock-row.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import type {
  DocumentType,
  ShareLink,
} from '../../generated/prisma/client.js';
import { ActivityService } from '../activity/activity.service.js';
import { StorageService } from '../storage/storage.service.js';
import {
  DocumentFilesService,
  ofDocument,
} from './document-files.service.js';
import type { ResolvedLinkDto, ShareLinkDto } from './dto/delivery.dto.js';

const LINK_DAYS = 90;
const DAY_MS = 86_400_000;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

@Injectable()
export class ShareLinksService {
  private readonly appUrl: string;
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: DocumentFilesService,
    private readonly storage: StorageService,
    private readonly activity: ActivityService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/$/, '');
    this.secret = config.get('LINK_SECRET', { infer: true });
  }

  // One link per document, reused while it works: its opens add up
  async forDocument(
    kind: DocumentType,
    id: string,
    user: AuthUser,
  ): Promise<string> {
    const link =
      (await this.current(kind, id)) ??
      (await this.create(kind, id, user));
    return this.url(link.id);
  }

  async currentDto(kind: DocumentType, id: string): Promise<ShareLinkDto | null> {
    const link = await this.current(kind, id);
    return link ? this.toDto(link) : null;
  }

  // /d/<token>: whoever holds the link reads the PDF for five minutes
  async resolve(token: string): Promise<ResolvedLinkDto> {
    const gone = new GoneException({
      code: 'LINK_EXPIRED',
      message: 'Lien expiré ou invalide',
    });
    if (!TOKEN.test(token)) {
      throw gone;
    }
    const link = await this.prisma.shareLink.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    const now = new Date();
    if (!link || link.revokedAt || link.expiresAt <= now) {
      throw gone;
    }
    const key = await this.files.ensure(link.documentType, link.documentId);
    await this.prisma.shareLink.update({
      where: { id: link.id },
      data: { openCount: { increment: 1 }, lastOpenedAt: now },
    });
    return { url: await this.storage.linkToRead(key) };
  }

  async revoke(linkId: string, admin: AuthUser): Promise<ShareLinkDto> {
    const link = await this.prisma.$transaction(async (tx) => {
      await lockRow(tx, 'share_links', linkId);
      const current = await tx.shareLink.findUniqueOrThrow({
        where: { id: linkId },
      });
      if (current.revokedAt) {
        return current;
      }
      const revoked = await tx.shareLink.update({
        where: { id: linkId },
        data: { revokedAt: new Date() },
      });
      const { number } = await this.files.describe(
        current.documentType,
        current.documentId,
      );
      await this.activity.record(
        tx,
        admin,
        'share_link.revoked',
        { type: current.documentType, id: current.documentId },
        `a désactivé le lien de partage ${ofDocument(current.documentType, number ?? '')}`,
      );
      return revoked;
    });
    return this.toDto(link);
  }

  private current(kind: DocumentType, id: string) {
    return this.prisma.shareLink.findFirst({
      where: {
        documentType: kind,
        documentId: id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // The id is chosen first: the token is built from it, and only its hash is stored
  private create(kind: DocumentType, id: string, user: AuthUser) {
    const linkId = randomUUID();
    return this.prisma.shareLink.create({
      data: {
        id: linkId,
        tokenHash: hashToken(shareToken(this.secret, linkId)),
        documentType: kind,
        documentId: id,
        expiresAt: new Date(Date.now() + LINK_DAYS * DAY_MS),
        createdById: user.id,
      },
    });
  }

  private url(linkId: string): string {
    return `${this.appUrl}/d/${shareToken(this.secret, linkId)}`;
  }

  private toDto(link: ShareLink): ShareLinkDto {
    return {
      id: link.id,
      url: this.url(link.id),
      openCount: link.openCount,
      lastOpenedAt: link.lastOpenedAt,
      expiresAt: link.expiresAt,
      revokedAt: link.revokedAt,
    };
  }
}
