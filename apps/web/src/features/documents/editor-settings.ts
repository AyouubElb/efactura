import type { Settings } from '@/features/settings/settings.types';
import type { EditorSettings } from './document-editor';

// Only what the editor needs reaches the browser, not the shop's whole identity
export function editorSettings(settings: Settings): EditorSettings {
  return {
    configured: settings.configured,
    tvaRatesBp: settings.tvaRatesBp,
    defaultQuoteValidityDays: settings.defaultQuoteValidityDays,
    defaultPaymentDays: settings.defaultPaymentDays,
  };
}

export const DRAFT_DELETE_NOTE =
  "Ce brouillon disparaît. Il n'avait pas encore de numéro : la numérotation reste sans trou.";
