'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { CameraIcon, FileArrowUpIcon } from '@phosphor-icons/react';
import { Notice } from '@/components/notice';
import { Button } from '@/components/ui/button';
import { WakingBanner } from '@/components/waking-banner';
import { cn } from '@/lib/utils';
import { prepareFile, sendFile } from './prepare-file';
import {
  getUploadUrl,
  registerUpload,
  type UploadFailure,
} from './purchases.actions';

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
const LIMITS = 'PDF, JPEG, PNG ou WebP, 10 Mo au plus.';

type Refusal = Pick<UploadFailure, 'error' | 'code' | 'purchaseId'>;

type Step =
  | { kind: 'idle' }
  | { kind: 'working'; name: string; label: string; percent: number | null }
  | { kind: 'refused'; refusal: Refusal };

// One file at a time: shrunk and fingerprinted here, then sent straight to storage
export function UploadForm() {
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  function upload(file: File | undefined) {
    if (!file || pending) {
      return;
    }
    const working = (label: string, percent: number | null = null) =>
      setStep({ kind: 'working', name: file.name, label, percent });
    const refused = (refusal: Refusal) => setStep({ kind: 'refused', refusal });
    working('Préparation du fichier…');
    startTransition(async () => {
      const prepared = await prepareFile(file);
      if (!prepared.ok) {
        refused({ error: prepared.error });
        return;
      }
      const link = await getUploadUrl({
        fileType: prepared.type,
        fileSize: prepared.blob.size,
        sha256: prepared.sha256,
      });
      if (!link.ok) {
        refused(link);
        return;
      }
      working('Envoi du fichier…', 0);
      const sent = await sendFile(
        link.data.uploadUrl,
        prepared.blob,
        prepared.type,
        (percent) => working('Envoi du fichier…', percent),
      );
      if (!sent) {
        refused({
          error:
            "L'envoi du fichier a échoué. Vérifiez la connexion, puis réessayez.",
        });
        return;
      }
      working('Enregistrement…');
      // On success the action opens the achat's page
      const registered = await registerUpload({
        fileKey: link.data.fileKey,
        sha256: prepared.sha256,
      });
      if (registered && !registered.ok) {
        refused(registered);
      }
    });
  }

  function picked(event: React.ChangeEvent<HTMLInputElement>) {
    upload(event.target.files?.[0]);
    // The same file can be picked again after a refusal
    event.target.value = '';
  }

  return (
    <div className="grid max-w-2xl gap-4">
      {step.kind === 'working' ? (
        <section
          aria-live="polite"
          className="grid gap-3 rounded-md border border-line bg-card p-4"
        >
          <p className="truncate font-semibold">{step.name}</p>
          <div className="flex items-center justify-between gap-3 text-label text-pencil">
            <span>{step.label}</span>
            {step.percent !== null && (
              <span className="tabular-nums">{`${step.percent} %`}</span>
            )}
          </div>
          <div aria-hidden className="h-1.5 overflow-hidden rounded-xs bg-line">
            <div
              className="h-full bg-main transition-[width]"
              style={{ width: `${step.percent ?? 0}%` }}
            />
          </div>
        </section>
      ) : (
        <>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              upload(event.dataTransfer.files[0]);
            }}
            className={cn(
              'hidden justify-items-center gap-2 rounded-md border-[1.5px] border-dashed border-field bg-card px-6 py-10 text-center md:grid',
              dragging && 'border-main bg-main-tint',
            )}
          >
            <FileArrowUpIcon aria-hidden className="size-8 text-pencil" />
            <p className="font-semibold">Déposez la facture ici</p>
            <Button type="button" onClick={() => fileInput.current?.click()}>
              Choisir un fichier
            </Button>
            <p className="text-xs text-pencil">{LIMITS}</p>
          </div>
          <div className="grid gap-2 md:hidden">
            <Button type="button" onClick={() => cameraInput.current?.click()}>
              <CameraIcon />
              Prendre une photo
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInput.current?.click()}
            >
              Choisir un fichier
            </Button>
            <p className="text-xs text-pencil">{LIMITS}</p>
          </div>
        </>
      )}
      {step.kind === 'refused' && <RefusalNotice refusal={step.refusal} />}
      {pending && <WakingBanner />}
      <p className="text-pencil">
        {
          "L'IA lit la facture, puis vous vérifiez tout. Rien n'est enregistré avant « Valider »."
        }
      </p>
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        onChange={picked}
        aria-hidden
        tabIndex={-1}
        className="sr-only"
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={picked}
        aria-hidden
        tabIndex={-1}
        className="sr-only"
      />
    </div>
  );
}

function RefusalNotice({ refusal }: { refusal: Refusal }) {
  const duplicate = refusal.code === 'ALREADY_IMPORTED';
  return (
    <Notice
      role="alert"
      tone={duplicate ? 'check' : 'act'}
      stamp={duplicate ? 'Doublon' : 'Erreur'}
    >
      {refusal.error}{' '}
      {refusal.purchaseId && (
        <Link href={`/purchases/${refusal.purchaseId}`} className="link">
          {"Ouvrir l'achat"}
        </Link>
      )}
    </Notice>
  );
}
