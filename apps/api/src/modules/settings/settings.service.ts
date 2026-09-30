import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { ShopSettings } from '../../generated/prisma/client.js';
import { ActivityService } from '../activity/activity.service.js';
import { changes } from '../activity/changes.js';
import { PdfService } from '../pdf/pdf.service.js';
import { StorageService } from '../storage/storage.service.js';
import {
  MAX_LOGO_BYTES,
  type LogoUploadDto,
  type LogoUploadRequestDto,
  type SetLogoDto,
} from './dto/logo.dto.js';
import type { SettingsDto, UpdateSettingsDto } from './dto/settings.dto.js';

// The database defaults, served before the admin fills the settings
const DEFAULTS = {
  defaultPaymentDays: 60,
  defaultQuoteValidityDays: 30,
  priceRiseThresholdPercent: 10,
  tvaRatesBp: [2000, 1000, 0],
};

export const SETTINGS_ID = 1;

const UPLOAD_LINK_MS = 300_000;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly storage: StorageService,
    private readonly pdf: PdfService,
  ) {}

  async get(): Promise<SettingsDto> {
    const row = await this.current();
    if (!row) {
      return {
        configured: false,
        identity: null,
        ...DEFAULTS,
        logoUrl: null,
        updatedAt: null,
      };
    }
    return this.toDto(row);
  }

  // The row as saved, null before the first save
  current(): Promise<ShopSettings | null> {
    return this.prisma.shopSettings.findUnique({ where: { id: SETTINGS_ID } });
  }

  // The whole form every time: the first save creates the row
  async update(dto: UpdateSettingsDto, admin: AuthUser): Promise<SettingsDto> {
    const { identity } = dto;
    const data: SettingsData = {
      legalName: identity.legalName,
      address: identity.address,
      city: identity.city,
      phone: identity.phone ?? null,
      email: identity.email ?? null,
      ice: identity.ice,
      ifNumber: identity.ifNumber,
      tpNumber: identity.tpNumber,
      rcNumber: identity.rcNumber,
      rcCity: identity.rcCity,
      bankName: identity.bankName ?? null,
      rib: identity.rib ?? null,
      defaultPaymentDays: dto.defaultPaymentDays,
      defaultQuoteValidityDays: dto.defaultQuoteValidityDays,
      priceRiseThresholdPercent: dto.priceRiseThresholdPercent,
      tvaRatesBp: dto.tvaRatesBp,
    };

    const row = await this.prisma.$transaction(async (tx) => {
      // Two saves at once: the second waits and reads the first one's values
      await tx.$queryRaw`SELECT 1 FROM shop_settings WHERE id = ${SETTINGS_ID} FOR UPDATE`;
      const before = await tx.shopSettings.findUnique({
        where: { id: SETTINGS_ID },
      });
      const saved = await tx.shopSettings.upsert({
        where: { id: SETTINGS_ID },
        create: { id: SETTINGS_ID, ...data },
        update: data,
      });

      const changed = changes(before, data);
      if (changed) {
        await this.activity.record(
          tx,
          admin,
          'settings.updated',
          { type: 'settings', id: String(SETTINGS_ID) },
          before
            ? 'a modifié les paramètres de la boutique'
            : 'a rempli les paramètres de la boutique',
          changed,
        );
      }
      return saved;
    });
    return this.toDto(row);
  }

  // A new name for every logo: sent documents keep the one they were sent with
  async logoUploadLink({
    fileType,
    fileSize,
  }: LogoUploadRequestDto): Promise<LogoUploadDto> {
    const key = `logos/${randomUUID()}.${fileType === 'image/png' ? 'png' : 'jpg'}`;
    return {
      uploadUrl: await this.storage.linkToUpload(key, fileType, fileSize),
      key,
      expiresAt: new Date(Date.now() + UPLOAD_LINK_MS),
    };
  }

  async setLogo({ key }: SetLogoDto, admin: AuthUser): Promise<SettingsDto> {
    const file = await this.storage.check(key);
    if (!file) {
      throw new ConflictException({
        code: 'LOGO_NOT_UPLOADED',
        message: "Le logo n'a pas été reçu : envoyez le fichier puis réessayez",
      });
    }
    // The upload link fixes the size and type; the bytes are checked here
    const bytes = file.size > MAX_LOGO_BYTES ? null : await this.storage.read(key);
    if (!bytes || !isImage(bytes, key)) {
      throw invalidLogo('Le fichier n’est pas une image PNG ou JPEG');
    }
    // Drawn once now, so a damaged image never reaches a document
    const type = key.endsWith('.png') ? 'image/png' : 'image/jpeg';
    if (!(await this.pdf.canDraw(bytes, type))) {
      throw invalidLogo(
        'Ce fichier ne peut pas être imprimé : enregistrez-le à nouveau en PNG ou JPEG',
      );
    }

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM shop_settings WHERE id = ${SETTINGS_ID} FOR UPDATE`;
      const before = await tx.shopSettings.findUnique({
        where: { id: SETTINGS_ID },
      });
      if (!before) {
        throw new ConflictException({
          code: 'SETTINGS_MISSING',
          message: "Remplissez d'abord les paramètres de la boutique",
        });
      }
      if (before.logoKey === key) {
        return before;
      }
      const saved = await tx.shopSettings.update({
        where: { id: SETTINGS_ID },
        data: { logoKey: key },
      });
      await this.activity.record(
        tx,
        admin,
        'settings.logo_changed',
        { type: 'settings', id: String(SETTINGS_ID) },
        before.logoKey
          ? 'a changé le logo de la boutique'
          : 'a ajouté le logo de la boutique',
        { before: { logoKey: before.logoKey }, after: { logoKey: key } },
      );
      return saved;
    });
    return this.toDto(row);
  }

  private async toDto(row: ShopSettings): Promise<SettingsDto> {
    return {
      configured: true,
      identity: {
        legalName: row.legalName,
        address: row.address,
        city: row.city,
        phone: row.phone,
        email: row.email,
        ice: row.ice,
        ifNumber: row.ifNumber,
        tpNumber: row.tpNumber,
        rcNumber: row.rcNumber,
        rcCity: row.rcCity,
        bankName: row.bankName,
        rib: row.rib,
      },
      defaultPaymentDays: row.defaultPaymentDays,
      defaultQuoteValidityDays: row.defaultQuoteValidityDays,
      priceRiseThresholdPercent: row.priceRiseThresholdPercent,
      tvaRatesBp: row.tvaRatesBp,
      logoUrl: row.logoKey ? await this.storage.linkToRead(row.logoKey) : null,
      updatedAt: row.updatedAt,
    };
  }
}

type SettingsData = Omit<ShopSettings, 'id' | 'logoKey' | 'updatedAt'>;

// The first bytes of every PNG and JPEG file
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff]);

function isImage(bytes: Buffer, key: string): boolean {
  const start = key.endsWith('.png') ? PNG : JPEG;
  return bytes.subarray(0, start.length).equals(start);
}

function invalidLogo(message: string) {
  return new BadRequestException({
    code: 'VALIDATION_FAILED',
    message: 'Données invalides',
    fields: { key: message },
  });
}
