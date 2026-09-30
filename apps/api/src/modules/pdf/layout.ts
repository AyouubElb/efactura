import {
  formatDate,
  formatMoney,
  formatQuantity,
  formatRate,
} from '@efactura/shared';
import type {
  Content,
  TDocumentDefinitions,
  TableCell,
} from 'pdfmake/interfaces.js';
import type { Printable } from './printable.js';

const DARK = '#1c1917';
const GREY = '#57534e';
const LINE = '#d6d3d1';
const SHADE = '#f5f5f4';
const ACCENT = '#1d4ed8';

const TITLES = { quote: 'DEVIS', invoice: 'FACTURE', credit_note: 'AVOIR' };
const NAMES = { quote: 'Devis', invoice: 'Facture', credit_note: 'Avoir' };
const IN_WORDS = {
  quote: 'Arrêté le présent devis à la somme de : ',
  invoice: 'Arrêtée la présente facture à la somme de : ',
  credit_note: 'Arrêté le présent avoir à la somme de : ',
};

// The font engine takes this object; the typings only know the array form
const NO_LIGATURES = { liga: false, clig: false } as unknown as never[];

// Only horizontal lines: an invoice reads as rows
const ROWS = {
  hLineWidth: (i: number) => (i === 0 ? 0 : 0.5),
  vLineWidth: () => 0,
  hLineColor: () => LINE,
  paddingTop: () => 4,
  paddingBottom: () => 4,
};

export function layout(doc: Printable, logo: string | null): TDocumentDefinitions {
  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 56],
    info: {
      title: `${NAMES[doc.kind]} ${doc.number ?? 'brouillon'}`,
      author: doc.shop.legalName,
      creator: 'eFactura',
      producer: 'eFactura',
      creationDate: doc.madeAt,
      modDate: doc.madeAt,
    },
    watermark: doc.draft
      ? { text: 'BROUILLON', color: '#b91c1c', opacity: 0.12, bold: true }
      : undefined,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 9,
      color: DARK,
      lineHeight: 1.2,
      // A joined "fi" copies out as "f": configuration would read "confguration"
      fontFeatures: NO_LIGATURES,
    },
    images: logo ? { logo } : undefined,
    footer: (page: number, pages: number): Content => ({
      margin: [40, 16, 40, 0],
      fontSize: 7,
      color: GREY,
      columns: [
        { text: `${doc.shop.legalName} · ${doc.shop.address}, ${doc.shop.city}` },
        { text: `Page ${page} / ${pages}`, alignment: 'right', width: 60 },
      ],
    }),
    content: [
      header(doc, logo !== null),
      clientBlock(doc),
      linesTable(doc),
      totalsBlock(doc),
      inWords(doc),
      ...terms(doc),
    ],
  };
}

function header(doc: Printable, hasLogo: boolean): Content {
  const { shop } = doc;
  const contact = [shop.phone, shop.email].filter(Boolean).join(' · ');
  return {
    columns: [
      {
        width: '*',
        stack: [
          ...(hasLogo ? [{ image: 'logo', fit: [140, 56] as [number, number], margin: [0, 0, 0, 8] as [number, number, number, number] }] : []),
          { text: shop.legalName, bold: true, fontSize: 12 },
          shop.address,
          shop.city,
          ...(contact ? [contact] : []),
          { text: `ICE ${shop.ice} · IF ${shop.ifNumber}`, margin: [0, 4, 0, 0] as [number, number, number, number] },
          `TP ${shop.tpNumber} · RC ${shop.rcCity} ${shop.rcNumber}`,
        ],
      },
      {
        width: 210,
        alignment: 'right',
        stack: [
          { text: TITLES[doc.kind], bold: true, fontSize: 22, color: ACCENT },
          {
            text: doc.number ? `N° ${doc.number}` : 'Brouillon, pas encore numéroté',
            bold: true,
            fontSize: 11,
            margin: [0, 2, 0, 8],
          },
          ...dates(doc),
        ],
      },
    ],
  };
}

function dates(doc: Printable): Content[] {
  const rows: [string, string][] = [];
  if (doc.issueDate) {
    rows.push(['Date', formatDate(doc.issueDate)]);
  }
  if (doc.validUntil) {
    rows.push(['Valable jusqu’au', formatDate(doc.validUntil)]);
  }
  if (doc.dueDate) {
    rows.push(['Échéance', formatDate(doc.dueDate)]);
  }
  if (doc.cancelledInvoice) {
    rows.push(['Facture annulée', doc.cancelledInvoice]);
  }
  return rows.map(([label, value]) => ({
    text: [{ text: `${label} : `, color: GREY }, value],
  }));
}

function clientBlock(doc: Printable): Content {
  const { client } = doc;
  const place = [client.address, client.city].filter(
    (part): part is string => Boolean(part),
  );
  return {
    margin: [0, 20, 0, 16],
    columns: [
      { width: '*', text: '' },
      {
        width: 250,
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: SHADE,
                margin: [8, 6, 8, 6],
                stack: [
                  { text: 'CLIENT', fontSize: 7, color: GREY, bold: true },
                  { text: client.name, bold: true, fontSize: 11 },
                  ...place,
                  ...(client.ice ? [`ICE ${client.ice}`] : []),
                ],
              },
            ],
          ],
        },
        layout: 'noBorders',
      },
    ],
  };
}

function linesTable(doc: Printable): Content {
  const head = (text: string, alignment: 'left' | 'right' = 'right'): TableCell => ({
    text,
    bold: true,
    fontSize: 8,
    color: GREY,
    alignment,
    fillColor: SHADE,
  });
  const right = (text: string): TableCell => ({ text, alignment: 'right' });
  return {
    table: {
      headerRows: 1,
      widths: ['*', 48, 40, 64, 36, 70],
      body: [
        [
          head('Désignation', 'left'),
          head('Unité', 'left'),
          head('Qté'),
          head('PU HT'),
          head('TVA'),
          head('Total HT'),
        ],
        ...doc.lines.map((line): TableCell[] => [
          {
            stack: [
              line.label,
              ...(line.reference
                ? [{ text: `Réf. ${line.reference}`, fontSize: 7, color: GREY }]
                : []),
            ],
          },
          line.unit,
          right(formatQuantity(line.quantity)),
          right(formatMoney(line.unitPriceHtCentimes)),
          right(formatRate(line.tvaRateBp)),
          right(formatMoney(line.lineTotalHtCentimes)),
        ]),
      ],
    },
    layout: ROWS,
  };
}

function totalsBlock(doc: Printable): Content {
  const recap: TableCell[][] = [
    ['Taux', 'Base HT', 'TVA'].map((text, i) => ({
      text,
      bold: true,
      fontSize: 8,
      color: GREY,
      alignment: i === 0 ? 'left' : 'right',
      fillColor: SHADE,
    })),
    ...doc.tvaBreakdown.map((row): TableCell[] => [
      formatRate(row.rateBp),
      { text: formatMoney(row.baseHtCentimes), alignment: 'right' },
      { text: formatMoney(row.tvaCentimes), alignment: 'right' },
    ]),
  ];
  const money = (centimes: number) => `${formatMoney(centimes)} DH`;
  return {
    margin: [0, 14, 0, 0],
    columns: [
      {
        width: 220,
        stack: [
          { text: 'Récapitulatif TVA', bold: true, fontSize: 8, margin: [0, 0, 0, 4] },
          { table: { widths: [50, '*', '*'], body: recap }, layout: ROWS },
        ],
      },
      { width: '*', text: '' },
      {
        width: 200,
        table: {
          widths: ['*', 'auto'],
          body: [
            ['Total HT', { text: money(doc.totalHtCentimes), alignment: 'right' }],
            ['TVA', { text: money(doc.totalTvaCentimes), alignment: 'right' }],
            [
              { text: 'Total TTC', bold: true, fontSize: 11 },
              { text: money(doc.totalTtcCentimes), bold: true, fontSize: 11, alignment: 'right' },
            ],
          ],
        },
        layout: ROWS,
      },
    ],
  };
}

function inWords(doc: Printable): Content {
  if (!doc.totalInWords) {
    return '';
  }
  return {
    margin: [0, 16, 0, 0],
    text: [
      IN_WORDS[doc.kind],
      { text: `${doc.totalInWords} TTC.`, bold: true },
    ],
  };
}

function terms(doc: Printable): Content[] {
  const lines: Content[] = [];
  if (doc.kind === 'quote' && doc.validUntil) {
    lines.push(`Ce devis est valable jusqu’au ${formatDate(doc.validUntil)}.`);
  }
  if (doc.kind === 'invoice' && doc.dueDate) {
    lines.push(
      `Paiement à ${doc.client.paymentDays} jours, au plus tard le ${formatDate(doc.dueDate)}.`,
    );
  }
  if (doc.kind === 'invoice' && doc.shop.rib) {
    lines.push(
      `Virement : ${doc.shop.bankName ? `${doc.shop.bankName} · ` : ''}RIB ${doc.shop.rib}`,
    );
  }
  if (doc.reason) {
    lines.push(`Motif : ${doc.reason}`);
  }
  if (doc.notes) {
    lines.push({ text: doc.notes, color: GREY, margin: [0, 6, 0, 0] });
  }
  return lines.length > 0 ? [{ margin: [0, 12, 0, 0], stack: lines }] : [];
}
