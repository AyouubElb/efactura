import { ValidateIf } from 'class-validator';

// The field must be sent, but may be null: null skips its other rules, a missing field fails them
export const Nullable = () => ValidateIf((_object, value) => value !== null);
