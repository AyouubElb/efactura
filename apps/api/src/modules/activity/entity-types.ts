export const ENTITY_TYPES = [
  'invoice',
  'quote',
  'credit_note',
  'purchase_invoice',
  'client',
  'product',
  'supplier',
  'user',
  'settings',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

// A person's or the settings' history is for admins only
export const ADMIN_ONLY_HISTORY: readonly EntityType[] = ['user', 'settings'];
