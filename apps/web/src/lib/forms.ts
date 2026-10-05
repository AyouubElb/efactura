import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

export function setServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldErrors: Record<string, string[]> | undefined,
): void {
  for (const [name, messages] of Object.entries(fieldErrors ?? {})) {
    if (messages[0]) {
      form.setError(name as Path<T>, { type: 'server', message: messages[0] });
    }
  }
}
