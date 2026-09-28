import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { yearInMorocco } from '@efactura/shared';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma, Series } from '../../generated/prisma/client.js';
import { ActivityService } from '../activity/activity.service.js';
import type {
  SeriesCounterDto,
  SetNumberingStartDto,
} from './dto/numbering.dto.js';
import { SETTINGS_ID } from './settings.service.js';

// FA-2026-0143: four digits at least, more after 9999
export function documentNumber(series: Series, year: number, n: number) {
  return `${series}-${year}-${String(n).padStart(4, '0')}`;
}

const DOCUMENTS: Record<Series, string> = {
  FA: 'invoices',
  DV: 'quotes',
  AV: 'credit_notes',
};

// The highest number printed on a real document of this series and year, 0 if none
async function lastPrintedNumber(
  tx: Prisma.TransactionClient,
  series: Series,
  year: number,
) {
  const [{ printed }] = await tx.$queryRaw<{ printed: number }[]>`
    SELECT COALESCE(MAX(split_part(number, '-', 3)::int), 0)::int AS printed
      FROM ${Prisma.raw(DOCUMENTS[series])}
     WHERE number LIKE ${`${series}-${year}-%`}`;
  return printed;
}

@Injectable()
export class NumberingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async list(year = yearInMorocco()): Promise<SeriesCounterDto[]> {
    const rows = await this.prisma.numberCounter.findMany({ where: { year } });
    return Object.values(Series).map((series) => {
      const lastNumber =
        rows.find((row) => row.series === series)?.lastNumber ?? 0;
      return {
        series,
        year,
        lastNumber,
        nextNumber: documentNumber(series, year, lastNumber + 1),
      };
    });
  }

  // "Continue at FA-2026-0143" stores 142. A typo can be undone, a sent document's number can't.
  async setStart(
    { series, year, startAt }: SetNumberingStartDto,
    admin: AuthUser,
  ): Promise<SeriesCounterDto[]> {
    const current = yearInMorocco();
    if (year !== current && year !== current + 1) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Données invalides',
        fields: { year: 'Année en cours ou suivante uniquement' },
      });
    }

    await this.prisma.$transaction(async (tx) => {
      // Two first saves at once: the second one finds the row instead of failing
      await tx.$executeRaw`
        INSERT INTO number_counters (series, year)
        VALUES (${series}::series, ${year})
        ON CONFLICT DO NOTHING`;
      // The same lock as sending a document: no number can slip in between
      const [{ last_number: lastNumber }] = await tx.$queryRaw<
        { last_number: number }[]
      >`
        SELECT last_number FROM number_counters
         WHERE series = ${series}::series AND year = ${year}
           FOR UPDATE`;

      const printed = await lastPrintedNumber(tx, series, year);
      if (startAt <= printed) {
        throw new ConflictException({
          code: 'NUMBERING_TOO_LOW',
          message: `${documentNumber(series, year, printed)} est le dernier numéro émis : choisissez un numéro plus grand`,
        });
      }
      if (startAt === lastNumber + 1) {
        return;
      }
      await tx.numberCounter.update({
        where: { series_year: { series, year } },
        data: { lastNumber: startAt - 1 },
      });
      await this.activity.record(
        tx,
        admin,
        'numbering.start_set',
        { type: 'settings', id: String(SETTINGS_ID) },
        `a fixé le prochain numéro à ${documentNumber(series, year, startAt)}`,
        { before: { lastNumber }, after: { lastNumber: startAt - 1 } },
      );
    });
    return this.list(year);
  }
}
