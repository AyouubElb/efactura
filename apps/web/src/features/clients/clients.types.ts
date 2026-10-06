export type ClientType = 'company' | 'individual';

export interface Client {
  id: string;
  type: ClientType;
  name: string;
  ice: string | null;
  address: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  paymentDays: number;
  archivedAt: string | null;
}
