'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';
import {
  fromZod,
  GONE,
  toActionError,
  type ActionResult,
} from '@/lib/action-result';
import { apiSend } from '@/lib/api-server';
import { orNull, withoutSpaces } from '@/lib/form-rules';
import {
  numberingSchema,
  settingsSchema,
  type NumberingInput,
  type SettingsInput,
} from './settings.schemas';
import type { SeriesCounter, Settings } from './settings.types';

const IDENTITY = [
  'legalName',
  'address',
  'city',
  'phone',
  'email',
  'ice',
  'ifNumber',
  'tpNumber',
  'rcNumber',
  'rcCity',
  'bankName',
  'rib',
] as const;

// The API nests the identity: "identity.ice" is the form's "ice"
const NESTED = Object.fromEntries(
  IDENTITY.map((field) => [`identity.${field}`, field]),
);

export async function saveSettings(
  input: SettingsInput,
): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  const values = parsed.data;
  const result = await apiSend<Settings>('PUT', '/settings', {
    identity: {
      legalName: values.legalName,
      address: values.address,
      city: values.city,
      phone: orNull(values.phone),
      email: orNull(values.email),
      ice: withoutSpaces(values.ice),
      ifNumber: values.ifNumber,
      tpNumber: values.tpNumber,
      rcNumber: values.rcNumber,
      rcCity: values.rcCity,
      bankName: orNull(values.bankName),
      rib: orNull(withoutSpaces(values.rib)),
    },
    defaultPaymentDays: Number(values.defaultPaymentDays),
    defaultQuoteValidityDays: Number(values.defaultQuoteValidityDays),
    priceRiseThresholdPercent: values.priceRiseThresholdPercent,
    tvaRatesBp: values.tvaRatesBp,
  });
  if (!result.ok) {
    return toActionError(result.error, { fields: NESTED });
  }
  refresh();
  return { ok: true };
}

const seriesSchema = z.enum(['FA', 'DV', 'AV']);

export async function setNumberingStart(
  series: string,
  year: number,
  input: NumberingInput,
): Promise<ActionResult<{ nextNumber: string }>> {
  const parsed = numberingSchema.safeParse(input);
  if (!parsed.success) {
    return fromZod(parsed.error);
  }
  const checkedSeries = seriesSchema.safeParse(series);
  if (!checkedSeries.success || !Number.isInteger(year)) {
    return GONE;
  }
  const result = await apiSend<SeriesCounter[]>('PUT', '/settings/numbering', {
    series: checkedSeries.data,
    year,
    startAt: Number(parsed.data.startAt),
  });
  if (!result.ok) {
    return toActionError(result.error, {
      conflicts: { NUMBERING_TOO_LOW: 'startAt' },
    });
  }
  refresh();
  const counter = result.data.find((row) => row.series === checkedSeries.data);
  return { ok: true, data: { nextNumber: counter?.nextNumber ?? '' } };
}
