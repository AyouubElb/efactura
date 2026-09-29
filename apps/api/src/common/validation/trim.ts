import { Transform } from 'class-transformer';

// "  Atlas " → "Atlas"; an empty text becomes null, so "" clears an optional field
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  );
