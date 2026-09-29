import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { ShopSettings } from '../../generated/prisma/client.js';
import { ActivityService } from '../activity/activity.service.js';
import { changes } from '../activity/changes.js';
import type { SettingsDto, UpdateSettingsDto } from './dto/settings.dto.js';

// The database defaults, served before the admin fills the settings
const DEFAULTS = {
  defaultPaymentDays: 60,
  defaultQuoteValidityDays: 30,
  priceRiseThresholdPercent: 10,
  tvaRatesBp: [2000, 1000, 0],
};

export const SETTINGS_ID = 1;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async get(): Promise<SettingsDto> {
    const row = await this.prisma.shopSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    if (!row) {
      return {
        configured: false,
        identity: null,
        ...DEFAULTS,
        updatedAt: null,
      };
    }
    return toDto(row);
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
    return toDto(row);
  }
}

type SettingsData = Omit<ShopSettings, 'id' | 'logoKey' | 'updatedAt'>;

function toDto(row: ShopSettings): SettingsDto {
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
    updatedAt: row.updatedAt,
  };
}
