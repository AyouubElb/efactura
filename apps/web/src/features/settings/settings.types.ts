export interface ShopIdentity {
  legalName: string;
  address: string;
  city: string;
  phone: string | null;
  email: string | null;
  ice: string;
  ifNumber: string;
  tpNumber: string;
  rcNumber: string;
  rcCity: string;
  bankName: string | null;
  rib: string | null;
}

export interface Settings {
  configured: boolean;
  identity: ShopIdentity | null;
  defaultPaymentDays: number;
  defaultQuoteValidityDays: number;
  priceRiseThresholdPercent: number;
  tvaRatesBp: number[];
  logoUrl: string | null;
}

export type Series = 'FA' | 'DV' | 'AV';

export interface SeriesCounter {
  series: Series;
  year: number;
  lastNumber: number;
  nextNumber: string;
}
