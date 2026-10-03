import { ConflictException } from '@nestjs/common';
import type { PurchaseStatus } from '../../generated/prisma/client.js';

const WHY: Record<PurchaseStatus, string> = {
  uploaded: 'Lecture en cours : attendez son résultat',
  reading: 'Lecture en cours : attendez son résultat',
  ready: 'Enregistrement impossible : réessayez',
  failed: "La lecture n'a pas abouti : utilisez « Relancer »",
  confirmed: 'Achat déjà validé : il ne peut plus être modifié',
  discarded: 'Achat écarté : il ne peut plus être modifié',
};

// Only a ready achat changes; the others say why
export function notEditable(status: PurchaseStatus): ConflictException {
  return new ConflictException({ code: 'NOT_EDITABLE', message: WHY[status] });
}
