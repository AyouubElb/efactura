import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { isRecordId, sentence } from '@/lib/action-result';
import { apiReadFile } from '@/lib/api-server';
import { loginAgainUrl } from '@/lib/session';

const PATHS = new Map([
  ['quote', '/quotes'],
  ['invoice', '/invoices'],
  ['credit-note', '/credit-notes'],
]);

// "Aperçu" opens it in a tab, "Télécharger" (?download) saves it under its number
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/pdf/[kind]/[id]'>,
) {
  const { kind, id } = await ctx.params;
  const base = PATHS.get(kind);
  if (!base || !isRecordId(id)) {
    return text('Ce document est introuvable.', 404);
  }
  const result = await apiReadFile(`${base}/${id}/pdf`);
  if (!result.ok) {
    const { statusCode, message } = result.error;
    if (statusCode === 401) {
      redirect(await loginAgainUrl());
    }
    if (statusCode === 404) {
      return text('Ce document est introuvable.', 404);
    }
    if (statusCode === 409) {
      return text(sentence(message), 409);
    }
    return text(
      "Le PDF n'a pas pu être préparé. Réessayez dans un instant.",
      503,
    );
  }
  const { bytes, fileName } = result.data;
  const disposition = request.nextUrl.searchParams.has('download')
    ? 'attachment'
    : 'inline';
  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

function text(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
