'use client';

import { useState, useTransition } from 'react';
import { CircleNotchIcon } from '@phosphor-icons/react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { WakingBanner } from '@/components/waking-banner';
import { cn } from '@/lib/utils';
import { pdfPath } from './documents.labels';
import type { Delivery, DocumentKind, SendChannel } from './documents.types';

export interface Contact {
  phone: string | null;
  email: string | null;
}

export interface Sent {
  ok: true;
  // "Devis DV-2026-0011 envoyé"
  title: string;
  kind: DocumentKind;
  id: string;
  delivery: Delivery;
}

export type SendOutcome = Sent | { ok: false; error: string; code?: string };

const CHANNELS: SendChannel[] = ['whatsapp', 'email', 'download'];

function isChannel(value: string): value is SendChannel {
  return (CHANNELS as string[]).includes(value);
}

export function ChannelChoice({
  value,
  onChange,
  contact,
  legend,
}: {
  value: SendChannel;
  onChange: (channel: SendChannel) => void;
  contact: Contact;
  legend: string;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => isChannel(next) && onChange(next)}
      aria-label={legend}
      className="grid gap-2"
    >
      <ChannelTile
        value="whatsapp"
        label="WhatsApp"
        detail={
          contact.phone
            ? `au ${contact.phone}`
            : 'Pas de numéro : WhatsApp vous demandera le destinataire.'
        }
      />
      <ChannelTile
        value="email"
        label="E-mail"
        detail={
          contact.email ? `à ${contact.email}` : "Ce client n'a pas d'e-mail."
        }
        disabled={!contact.email}
      />
      <ChannelTile
        value="download"
        label="Télécharger seulement"
        detail="Vous transmettez le PDF vous-même."
      />
    </RadioGroup>
  );
}

function ChannelTile({
  value,
  label,
  detail,
  disabled = false,
}: {
  value: SendChannel;
  label: string;
  detail: string;
  disabled?: boolean;
}) {
  return (
    <RadioGroupItem
      value={value}
      disabled={disabled}
      className="grid h-auto w-full justify-items-start gap-0.5 py-2 text-left"
    >
      <span>{label}</span>
      <span className="text-xs font-normal break-all text-pencil">
        {detail}
      </span>
    </RadioGroupItem>
  );
}

// "Envoyer" gives the number, "Renvoyer" keeps it; both end on the channel's next step
export function SendDialog({
  open,
  onOpenChange,
  title,
  intro,
  submitLabel,
  contact,
  onEditClient,
  send,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  intro: React.ReactNode;
  submitLabel: string;
  contact: Contact;
  onEditClient?: () => void;
  send: (channel: SendChannel) => Promise<SendOutcome>;
  // Once something was sent: draw the page again
  onDone: () => void;
}) {
  const [channel, setChannel] = useState<SendChannel>('whatsapp');
  const [sent, setSent] = useState<Sent | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  // The number was given, only the delivery failed
  const numbered = error?.code === 'DELIVERY_FAILED';

  function changeOpen(next: boolean) {
    if (pending || next) {
      return;
    }
    const changed = sent !== null || numbered;
    onOpenChange(false);
    setSent(null);
    setError(null);
    if (changed) {
      onDone();
    }
  }

  function submit() {
    if (pending) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const outcome = await send(channel);
      startTransition(() => {
        if (outcome.ok) {
          setSent(outcome);
        } else {
          setError({ message: outcome.error, code: outcome.code });
        }
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent showCloseButton={false}>
        {sent ? (
          <SentStep sent={sent} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <DialogDescription asChild className="grid gap-2 text-sm text-ink">
              <div>{intro}</div>
            </DialogDescription>
            {!numbered && (
              <ChannelChoice
                value={channel}
                onChange={setChannel}
                contact={contact}
                legend="Moyen d'envoi"
              />
            )}
            {!contact.email && onEditClient && !numbered && (
              <Button
                variant="quiet"
                className="justify-self-start px-0"
                onClick={() => {
                  changeOpen(false);
                  onEditClient();
                }}
              >
                Ajouter l&apos;e-mail sur la fiche du client
              </Button>
            )}
            {error && <FieldError>{error.message}</FieldError>}
            {pending && <WakingBanner />}
          </>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={pending}>
              Fermer
            </Button>
          </DialogClose>
          {sent ? (
            <NextStep sent={sent} />
          ) : (
            !numbered && (
              <Button
                onClick={submit}
                aria-disabled={pending || undefined}
                className={cn(pending && 'pointer-events-none')}
              >
                {pending && (
                  <CircleNotchIcon className="animate-spin" aria-hidden />
                )}
                {pending ? 'Envoi en cours' : submitLabel}
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SentStep({ sent }: { sent: Sent }) {
  const { channel, emailTo } = sent.delivery;
  return (
    <>
      <DialogHeader>
        <DialogTitle>{sent.title}</DialogTitle>
      </DialogHeader>
      <DialogDescription className="text-sm text-ink">
        {channel === 'whatsapp' &&
          'Le message est prêt : il reste à appuyer sur Envoyer dans WhatsApp.'}
        {channel === 'email' &&
          `L'e-mail part vers ${emailTo ?? 'le client'} avec le PDF.`}
        {channel === 'download' &&
          'Le PDF est prêt : transmettez-le au client.'}
      </DialogDescription>
    </>
  );
}

export function NextStep({ sent }: { sent: Sent }) {
  const { channel, whatsappUrl } = sent.delivery;
  if (channel === 'whatsapp' && whatsappUrl) {
    return (
      <Button asChild>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          Ouvrir WhatsApp
        </a>
      </Button>
    );
  }
  if (channel === 'download') {
    return (
      <Button asChild>
        <a href={pdfPath(sent.kind, sent.id, true)} download>
          Télécharger le PDF
        </a>
      </Button>
    );
  }
  return null;
}
