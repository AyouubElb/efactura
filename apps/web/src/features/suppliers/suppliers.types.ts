export interface Supplier {
  id: string;
  name: string;
  ice: string | null;
  ifNumber: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  archivedAt: string | null;
}

// What the supplier picker shows and keeps
export type SupplierOption = Pick<Supplier, 'id' | 'name' | 'ice' | 'city'>;
