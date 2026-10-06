'use client';

import {
  Controller,
  type Control,
  type FieldPathByValue,
  type FieldValues,
} from 'react-hook-form';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

// Label above, the control, then the error or the help below
export function TextField<T extends FieldValues>({
  control,
  name,
  id,
  label,
  help,
  as: InputControl = Input,
  ...inputProps
}: {
  control: Control<T>;
  name: FieldPathByValue<T, string>;
  id: string;
  label: string;
  help?: React.ReactNode;
  as?: typeof Input;
} & Omit<
  React.ComponentProps<typeof Input>,
  'name' | 'id' | 'value' | 'defaultValue' | 'onChange' | 'onBlur'
>) {
  const helpId = `${id}-help`;
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <InputControl
            {...inputProps}
            {...field}
            id={id}
            aria-invalid={fieldState.invalid}
            aria-describedby={help ? helpId : undefined}
          />
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : (
            help && (
              <FieldDescription id={helpId} aria-live="polite">
                {help}
              </FieldDescription>
            )
          )}
        </Field>
      )}
    />
  );
}
