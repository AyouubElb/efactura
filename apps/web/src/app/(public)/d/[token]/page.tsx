import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { PaperCard } from '@/components/paper-card';
import { OpeningNote } from '@/features/documents/opening-note';
import { apiGetPublic } from '@/lib/api-server';

export const metadata: Metadata = {
  title: 'Document',
  robots: { index: false, follow: false },
};

const TOKEN = /^[A-Za-z0-9_-]{43}$/;
// WhatsApp builds the message's preview from the shop's own phone: it must not count as the client's opening
const PREVIEW_ROBOTS =
  /WhatsApp|facebookexternalhit|Facebot|Twitterbot|TelegramBot|Slackbot|Discordbot|LinkedInBot|SkypeUriPreview|Googlebot|bingbot|Applebot/i;

// The shop's client, from WhatsApp: no login, the link is the permission
export default async function SharedDocumentPage({
  params,
}: PageProps<'/d/[token]'>) {
  const { token } = await params;
  const agent = (await headers()).get('user-agent') ?? '';
  if (PREVIEW_ROBOTS.test(agent)) {
    return (
      <PaperCard title="Document partagé">
        <p className="text-sm">Ouvrez ce lien pour voir le PDF.</p>
      </PaperCard>
    );
  }
  if (!TOKEN.test(token)) {
    return <Expired />;
  }
  return (
    <Suspense
      fallback={
        <PaperCard title="Ouverture du document…">
          <OpeningNote />
        </PaperCard>
      }
    >
      <Resolve token={token} />
    </Suspense>
  );
}

// The opening is counted here, then the browser is sent to the PDF for five minutes
async function Resolve({ token }: { token: string }) {
  const result = await apiGetPublic<{ url: string }>(
    `/share-links/${token}/resolve`,
  );
  if (result.ok) {
    redirect(result.data.url);
  }
  if (result.error.statusCode === 410) {
    return <Expired />;
  }
  return (
    <PaperCard title="Document indisponible">
      <p className="text-sm">
        Le document n&apos;a pas pu s&apos;ouvrir. Réessayez dans un instant.
      </p>
      <a href={`/d/${token}`} className="link text-label">
        Réessayer
      </a>
    </PaperCard>
  );
}

function Expired() {
  return (
    <PaperCard title="Lien expiré">
      <p className="text-sm">
        Ce lien a expiré ou a été désactivé. Demandez un nouveau lien à la
        boutique.
      </p>
    </PaperCard>
  );
}
