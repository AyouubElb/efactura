'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function pdfLabel(pageCount: number | null): string {
  if (!pageCount) {
    return 'PDF';
  }
  return pageCount === 1 ? 'PDF, 1 page' : `PDF, ${pageCount} pages`;
}

// The supplier's invoice as it arrived: it stays in view while the lines scroll
export function OriginalViewer({
  id,
  fileType,
  pageCount,
}: {
  id: string;
  fileType: string;
  pageCount: number | null;
}) {
  const src = `/purchases/${id}/original`;
  const pdf = fileType === 'application/pdf';
  const [zoomed, setZoomed] = useState(false);
  const [turns, setTurns] = useState(0);
  // Height over width, read once the photo arrives
  const [ratio, setRatio] = useState<number | null>(null);
  const sideways = turns % 2 === 1 && ratio !== null;
  const openLink = (
    <a href={src} target="_blank" rel="noopener noreferrer" className="link">
      {"Ouvrir l'original"}
    </a>
  );

  return (
    <section
      aria-label="Facture d'origine"
      className="grid min-w-0 content-start overflow-hidden rounded-md border border-line bg-card"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-1.5 text-xs text-pencil">
        <span>{pdf ? pdfLabel(pageCount) : 'Photo'}</span>
        <div className="flex items-center gap-3">
          {!pdf && (
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={() => setTurns((current) => (current + 1) % 4)}
            >
              <ArrowClockwiseIcon />
              Pivoter
            </Button>
          )}
          {/* On a phone the PDF's own line below carries the link */}
          <span className={cn(pdf && 'hidden lg:inline')}>{openLink}</span>
        </div>
      </div>
      {pdf ? (
        <>
          <iframe
            src={src}
            title="Facture d'origine"
            className="hidden h-[calc(100dvh-7rem)] w-full lg:block"
          />
          <p className="p-4 text-pencil lg:hidden">
            {"Le PDF s'ouvre en plein écran : "}
            {openLink}
          </p>
        </>
      ) : (
        <div className="max-h-[70dvh] overflow-auto lg:max-h-[calc(100dvh-7rem)]">
          <button
            type="button"
            onClick={() => setZoomed((current) => !current)}
            aria-label={zoomed ? 'Réduire la photo' : 'Agrandir la photo'}
            className={cn(
              'relative block',
              zoomed ? 'w-[200%] cursor-zoom-out' : 'w-full cursor-zoom-in',
            )}
            style={sideways ? { aspectRatio: ratio } : undefined}
          >
            <Image
              src={src}
              alt="Facture d'origine"
              width={1241}
              height={1754}
              unoptimized
              onLoad={(event) =>
                setRatio(
                  event.currentTarget.naturalHeight /
                    event.currentTarget.naturalWidth,
                )
              }
              className={
                sideways
                  ? 'absolute top-1/2 left-1/2 h-auto max-w-none'
                  : 'h-auto w-full'
              }
              style={
                sideways
                  ? {
                      width: `${100 / ratio}%`,
                      transform: `translate(-50%, -50%) rotate(${turns * 90}deg)`,
                    }
                  : { transform: `rotate(${turns * 90}deg)` }
              }
            />
          </button>
        </div>
      )}
    </section>
  );
}
