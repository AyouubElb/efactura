export interface Product {
  id: string;
  name: string;
  reference: string | null;
  unit: string;
  priceHtCentimes: number;
  tvaRateBp: number;
  priceTtcCentimes: number;
  lastCostHtCentimes: number | null;
  lastCostAt: string | null;
  lastSupplier: { id: string; name: string } | null;
  earningHtCentimes: number | null;
  archivedAt: string | null;
}
