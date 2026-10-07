import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { isRecordId } from '@/lib/action-result';
import { apiRead } from '@/lib/api-server';
import { loginAgainUrl } from '@/lib/session';

// A fresh 5-minute link at each opening, so a page left open never points at a dead one
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/purchases/[id]/original'>,
) {
  const { id } = await ctx.params;
  if (!isRecordId(id)) {
    return text('Ce fichier est introuvable.', 404);
  }
  const result = await apiRead<{ url: string }>(`/purchases/${id}/file-url`);
  if (!result.ok) {
    if (result.error.statusCode === 401) {
      redirect(await loginAgainUrl());
    }
    return result.error.statusCode === 404
      ? text('Ce fichier est introuvable.', 404)
      : text(
          "Le fichier n'a pas pu être ouvert. Réessayez dans un instant.",
          503,
        );
  }
  return new Response(null, {
    status: 307,
    headers: {
      Location: result.data.url,
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
