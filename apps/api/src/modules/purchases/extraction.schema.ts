// What the AI must return for one supplier invoice: OpenAI enforces the shape, a person checks the content

export const DOCUMENT_TYPES = ['invoice', 'delivery_note', 'quote', 'other'] as const;
export const READABILITY = ['good', 'fair', 'poor'] as const;

export interface ReadLine {
  label: string | null;
  reference: string | null;
  quantity: string | null;
  unit_price: string | null;
  tva_rate: string | null;
  line_total: string | null;
}

export interface InvoiceReading {
  document_type: (typeof DOCUMENT_TYPES)[number];
  supplier: {
    name: string | null;
    ice: string | null;
    if_number: string | null;
    address: string | null;
  };
  invoice_number: string | null;
  invoice_date: string | null;
  prices_include_tax: boolean;
  lines: ReadLine[];
  totals: { ht: string | null; tva: string | null; ttc: string | null };
  readability: (typeof READABILITY)[number];
  notes: string[];
}

// Text with a dot, never a float: "1234.50"
const AMOUNT = '^-?\\d{1,9}(\\.\\d{1,4})?$';
const QUANTITY = '^\\d{1,6}(\\.\\d{1,3})?$';
const RATE = '^\\d{1,2}(\\.\\d{1,2})?$';
const DAY = '^\\d{4}-\\d{2}-\\d{2}$';

const text = { type: ['string', 'null'] };
const matching = (pattern: string) => ({ type: ['string', 'null'], pattern });

const LINE = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'reference', 'quantity', 'unit_price', 'tva_rate', 'line_total'],
  properties: {
    label: text,
    reference: text,
    quantity: matching(QUANTITY),
    unit_price: matching(AMOUNT),
    tva_rate: matching(RATE),
    line_total: matching(AMOUNT),
  },
};

export const INVOICE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'document_type',
    'supplier',
    'invoice_number',
    'invoice_date',
    'prices_include_tax',
    'lines',
    'totals',
    'readability',
    'notes',
  ],
  properties: {
    document_type: { type: 'string', enum: [...DOCUMENT_TYPES] },
    supplier: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'ice', 'if_number', 'address'],
      properties: { name: text, ice: text, if_number: text, address: text },
    },
    invoice_number: text,
    invoice_date: matching(DAY),
    prices_include_tax: { type: 'boolean' },
    lines: { type: 'array', items: LINE },
    totals: {
      type: 'object',
      additionalProperties: false,
      required: ['ht', 'tva', 'ttc'],
      properties: { ht: matching(AMOUNT), tva: matching(AMOUNT), ttc: matching(AMOUNT) },
    },
    readability: { type: 'string', enum: [...READABILITY] },
    notes: { type: 'array', items: { type: 'string' } },
  },
};

export const INSTRUCTIONS = `Tu lis une facture fournisseur marocaine et tu recopies ce qui y est écrit. Tu ne devines jamais.

- supplier : l'entreprise qui émet le document, le vendeur. Jamais le client à qui il est adressé.
- Montants et quantités : chiffres avec un point décimal, sans espace, sans séparateur de milliers ni devise. « 1 234,50 DH » et « 1.234,50 » deviennent "1234.50".
- Une valeur illisible ou absente vaut null. Ne complète jamais un chiffre manquant.
- ICE et IF : les chiffres tels qu'imprimés, sans espaces. N'en ajoute et n'en retire aucun.
- invoice_number : le numéro du document. invoice_date : sa date, au format AAAA-MM-JJ.
- lines : toutes les lignes du tableau, dans l'ordre, y compris les frais de livraison ou de transport et les remises, avec leur signe.
- reference : le code article imprimé sur la ligne, sinon null.
- tva_rate : le taux de TVA de la ligne en pourcentage, par exemple "20". Si le document n'indique qu'un seul taux pour toutes les lignes, mets-le sur chaque ligne ; sinon null.
- prices_include_tax : true si les prix des lignes sont TTC.
- totals : les totaux imprimés, HT, TVA et TTC ; null pour ceux qui n'y figurent pas.
- document_type : "invoice" pour une facture, "delivery_note" pour un bon de livraison, "quote" pour un devis ou une facture proforma, "other" sinon.
- readability : "good", "fair" ou "poor" selon la lisibilité du document.
- notes : un problème précis par note, par exemple « Ligne 3 illisible ». Liste vide si tout est lisible.`;
