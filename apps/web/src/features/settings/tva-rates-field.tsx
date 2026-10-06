'use client';

import { useState } from 'react';
import { formatRate } from '@efactura/shared';
import { XIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  FieldDescription,
  FieldError,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

// "20" → 2000, "5,5" → 550: rates are basis points, 100 % at most
function parseRate(text: string): number | null {
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) {
    return null;
  }
  const bp = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return bp <= 10_000 ? bp : null;
}

export function TvaRatesField({
  value,
  onChange,
  error,
}: {
  value: number[];
  onChange: (rates: number[]) => void;
  error?: string;
}) {
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

  function add() {
    const rate = parseRate(draft);
    if (rate === null) {
      setDraftError('Vérifiez le taux : par exemple 20 ou 5,5.');
      return;
    }
    if (value.includes(rate)) {
      setDraftError('Ce taux est déjà dans la liste.');
      return;
    }
    if (value.length >= 10) {
      setDraftError('Gardez 10 taux au plus.');
      return;
    }
    onChange([...value, rate].sort((a, b) => b - a));
    setDraft('');
    setDraftError(null);
  }

  const message = draftError ?? error;
  return (
    <FieldSet className="gap-2">
      <FieldLegend variant="label" className="mb-0">
        Taux de TVA proposés
      </FieldLegend>
      <ul className="flex flex-wrap gap-2">
        {value.map((rate) => (
          <li
            key={rate}
            className="inline-flex h-8 items-center gap-0.5 rounded-md border-[1.5px] border-field bg-card pl-2.5 text-label font-semibold"
          >
            {formatRate(rate)}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7"
              aria-label={`Retirer le taux ${formatRate(rate)}`}
              onClick={() => onChange(value.filter((kept) => kept !== rate))}
            >
              <XIcon />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="settings-new-rate" className="sr-only">
          Nouveau taux, en pour cent
        </label>
        <Input
          id="settings-new-rate"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setDraftError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
          inputMode="decimal"
          autoComplete="off"
          placeholder="5,5"
          aria-invalid={Boolean(message)}
          className="w-24"
        />
        <Button type="button" variant="secondary" onClick={add}>
          Ajouter le taux
        </Button>
      </div>
      {message ? (
        <FieldError>{message}</FieldError>
      ) : (
        <FieldDescription>
          Un produit garde son taux même si vous le retirez ici.
        </FieldDescription>
      )}
    </FieldSet>
  );
}
