import { isValidIceFormat } from '@efactura/shared';
import { ValidateBy } from 'class-validator';

// The same rule as the web forms, from @efactura/shared
export const IsIce = () =>
  ValidateBy({
    name: 'isIce',
    validator: {
      validate: (value) => typeof value === 'string' && isValidIceFormat(value),
    },
  });
