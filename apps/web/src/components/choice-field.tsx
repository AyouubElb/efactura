'use client';

import {
  Controller,
  type Control,
  type FieldPathByValue,
  type FieldValues,
} from 'react-hook-form';
import {
  FieldDescription,
  FieldError,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export interface Choice {
  value: string;
  label: string;
}

export function ChoiceField<T extends FieldValues>({
  control,
  name,
  legend,
  choices,
  help,
}: {
  control: Control<T>;
  name: FieldPathByValue<T, string>;
  legend: string;
  choices: Choice[];
  help?: React.ReactNode;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FieldSet data-invalid={fieldState.invalid} className="gap-2">
          <FieldLegend variant="label" className="mb-0">
            {legend}
          </FieldLegend>
          <RadioGroup
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            aria-label={legend}
            aria-invalid={fieldState.invalid}
          >
            {choices.map((choice) => (
              <RadioGroupItem key={choice.value} value={choice.value}>
                {choice.label}
              </RadioGroupItem>
            ))}
          </RadioGroup>
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : (
            help && <FieldDescription>{help}</FieldDescription>
          )}
        </FieldSet>
      )}
    />
  );
}
