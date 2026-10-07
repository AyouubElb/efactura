'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CircleNotchIcon } from '@phosphor-icons/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listHref, type ListParams } from '@/lib/list-params';

const EVERYONE = 'everyone';

export function PersonFilter({
  params,
  people,
}: {
  params: ListParams;
  people: { id: string; fullName: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="activity-person" className="text-label font-semibold">
        Personne
      </label>
      <Select
        value={params.user ?? EVERYONE}
        onValueChange={(value) =>
          startTransition(() => {
            router.replace(
              listHref('/activity', {
                ...params,
                user: value === EVERYONE ? undefined : value,
                page: 1,
              }),
              { scroll: false },
            );
          })
        }
      >
        <SelectTrigger id="activity-person" className="w-auto min-w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EVERYONE}>Toute l&apos;équipe</SelectItem>
          {people.map((person) => (
            <SelectItem key={person.id} value={person.id}>
              {person.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending && (
        <CircleNotchIcon
          aria-hidden
          className="size-3.5 animate-spin text-pencil"
        />
      )}
    </div>
  );
}
