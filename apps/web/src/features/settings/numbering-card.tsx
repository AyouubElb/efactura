'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { usePanelSubmit } from '@/components/panel-form';
import { SubmitButton } from '@/components/submit-button';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field';
import { WakingBanner } from '@/components/waking-banner';
import { setNumberingStart } from './settings.actions';
import { numberingSchema, type NumberingInput } from './settings.schemas';
import type { SeriesCounter, Series } from './settings.types';

const SERIES: Record<Series, { list: string; next: string; title: string }> = {
  FA: {
    list: 'Factures',
    next: 'La prochaine facture portera le numéro',
    title: 'Prochain numéro de facture',
  },
  DV: {
    list: 'Devis',
    next: 'Le prochain devis portera le numéro',
    title: 'Prochain numéro de devis',
  },
  AV: {
    list: 'Avoirs',
    next: 'Le prochain avoir portera le numéro',
    title: "Prochain numéro d'avoir",
  },
};

// FA-2026-0143: four digits at least, as the API numbers them
function documentNumber(series: Series, year: number, n: number): string {
  return `${series}-${year}-${String(n).padStart(4, '0')}`;
}

export function NumberingCard({ counters }: { counters: SeriesCounter[] }) {
  // The series stays while the dialog closes, so its title doesn't empty mid-animation
  const [editing, setEditing] = useState<SeriesCounter | null>(null);
  const [open, setOpen] = useState(false);
  const year = counters[0]?.year;

  return (
    <section
      aria-labelledby="settings-numbering"
      className="grid gap-3 rounded-md border border-line bg-card p-4"
    >
      <h2 id="settings-numbering" className="caps text-pencil">
        Numérotation {year}
      </h2>
      <ul className="grid gap-2">
        {counters.map((counter) => (
          <li
            key={counter.series}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
          >
            <span>{SERIES[counter.series].list}</span>
            <span className="flex items-center gap-2">
              <span className="ref font-semibold">{counter.nextNumber}</span>
              <Button
                type="button"
                variant="quiet"
                size="sm"
                aria-label={`Modifier le prochain numéro des ${SERIES[counter.series].list.toLowerCase()}`}
                onClick={() => {
                  setEditing(counter);
                  setOpen(true);
                }}
              >
                Modifier
              </Button>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-pencil">
        Le prochain numéro de chaque série. Une boutique qui a déjà émis 142
        factures cette année continue à FA-{year}-0143.
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby="numbering-help">
          {editing && (
            <NumberingForm
              key={editing.series}
              counter={editing}
              onSaved={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function NumberingForm({
  counter,
  onSaved,
}: {
  counter: SeriesCounter;
  onSaved: () => void;
}) {
  const labels = SERIES[counter.series];
  const form = useForm<NumberingInput>({
    resolver: zodResolver(numberingSchema),
    defaultValues: { startAt: String(counter.lastNumber + 1) },
  });
  const startAt = useWatch({ control: form.control, name: 'startAt' });
  const { onSubmit, pending, formError } = usePanelSubmit(
    form,
    (values) => setNumberingStart(counter.series, counter.year, values),
    ({ nextNumber }) => {
      toast.success(`${labels.title} : ${nextNumber}.`);
      onSaved();
    },
  );
  const typed = /^\d{1,6}$/.test(startAt.trim()) ? Number(startAt) : null;

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="grid gap-3">
      <DialogHeader>
        <DialogTitle>{labels.title}</DialogTitle>
        <DialogDescription id="numbering-help">
          {typed && typed >= 1
            ? `${labels.next} ${documentNumber(counter.series, counter.year, typed)}.`
            : 'Saisissez le numéro que portera le prochain document.'}
        </DialogDescription>
      </DialogHeader>
      <TextField
        control={form.control}
        name="startAt"
        id="numbering-start"
        label="Prochain numéro"
        inputMode="numeric"
        autoComplete="off"
        className="max-w-32"
      />
      {formError && <FieldError>{formError}</FieldError>}
      {pending && <WakingBanner />}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Fermer
          </Button>
        </DialogClose>
        <SubmitButton pending={pending} pendingLabel="Enregistrement en cours">
          Enregistrer le numéro
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
