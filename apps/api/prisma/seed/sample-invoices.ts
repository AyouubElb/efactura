// Fictional supplier invoices for the AI test, each saved with the reading a perfect AI returns

import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addDays, amountInWords, formatDate } from '@efactura/shared';
import pdfmake from 'pdfmake';
import type {
  Content,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces.js';
import type {
  InvoiceReading,
  ReadLine,
} from '../../src/modules/purchases/extraction.schema.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'sample-invoices');
const ROBOTO = join(
  dirname(createRequire(import.meta.url).resolve('pdfmake/package.json')),
  'fonts',
  'Roboto',
);
const STANDARD_FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
  Courier: {
    normal: 'Courier',
    bold: 'Courier-Bold',
    italics: 'Courier-Oblique',
    bolditalics: 'Courier-BoldOblique',
  },
};
const BUILT_IN = new Set(
  Object.values(STANDARD_FONTS).flatMap((font) => Object.values(font)),
);

pdfmake.addFonts({
  Roboto: {
    normal: join(ROBOTO, 'Roboto-Regular.ttf'),
    bold: join(ROBOTO, 'Roboto-Medium.ttf'),
    italics: join(ROBOTO, 'Roboto-Italic.ttf'),
    bolditalics: join(ROBOTO, 'Roboto-MediumItalic.ttf'),
  },
  ...STANDARD_FONTS,
});
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy(
  (path) => path.startsWith(ROBOTO) || BUILT_IN.has(path),
);

type Layout = 'atlas' | 'maghreb' | 'bureau';
type Kind = 'invoice' | 'delivery_note' | 'quote';

interface Item {
  label: string;
  reference?: string;
  quantity?: string;
  unit?: string;
  // As printed, with a dot: "3250.00", "18.375"
  price?: string;
  // A discount line has a total and nothing else
  total?: string;
}

interface Sample {
  file: string;
  layout: Layout;
  kind: Kind;
  number: string;
  daysBefore: number;
  items: Item[];
  withoutIce?: boolean;
}

interface Supplier {
  name: string;
  address: string;
  ice: string;
  ifNumber: string;
  legal: string;
}

const SUPPLIERS: Record<Layout, Supplier> = {
  atlas: {
    name: 'Atlas Distribution SARL',
    address: '45, rue Ibnou Mounir, zone industrielle, Casablanca',
    ice: '001234567000089',
    ifNumber: '40112233',
    legal:
      'RC Casablanca 123456 – IF 40112233 – TP 34567890 – ICE 001234567000089 – CNSS 7654321 – RIB Attijariwafa bank 007 780 0001234567890123 45',
  },
  maghreb: {
    name: 'Maghreb IT Supply',
    address: '12, avenue Hassan II, Rabat',
    ice: '002345678000012',
    ifNumber: '40445566',
    legal:
      'Maghreb IT Supply – 12, avenue Hassan II, Rabat – Tél. 05 37 22 22 22 – ICE 002345678000012 – IF 40445566 – RC Rabat 98765 – Patente 25874136',
  },
  bureau: {
    name: 'Bureau Plus',
    address: '15, rue Derb Omar, Casablanca',
    ice: '003456789000045',
    ifNumber: '15873421',
    legal: '',
  },
};

const CLIENT = [
  'TECHSTORE MAARIF SARL',
  '123, boulevard Al Massira, Maârif',
  'Casablanca',
  'ICE : 009876543000021',
];

const TITLES: Record<Kind, string> = {
  invoice: 'FACTURE',
  delivery_note: 'BON DE LIVRAISON',
  quote: 'DEVIS',
};

const VAT_PERCENT = 20;

// The sample images were made from this day's files: their true dates depend on it
const PRINTED_ON = '2026-10-01';

const SAMPLES: Sample[] = [
  {
    file: 'atlas-01',
    layout: 'atlas',
    kind: 'invoice',
    number: 'FAC-26-04512',
    daysBefore: 7,
    items: [
      { label: 'SAMSUNG GALAXY A55 5G 128GB NAVY', reference: 'SM-A556B', quantity: '5', price: '3250.00' },
      { label: 'HP 250 G10 I5-1335U 8GB 512GB SSD W11', reference: '8A5D4EA', quantity: '3', price: '5350.00' },
      { label: 'CANON PIXMA G3470 MULTIFONCTION WIFI', reference: 'G3470', quantity: '2', price: '1390.00' },
      { label: 'LOGITECH M185 SOURIS SANS FIL GRIS', reference: '910-002238', quantity: '10', price: '85.00' },
      { label: 'CABLE HDMI 2.0 1.5M', reference: 'HDMI-15', quantity: '20', price: '18.00' },
      { label: 'LOGITECH MX KEYS S CLAVIER SANS FIL', reference: '920-011587', quantity: '2', price: '1090.00' },
    ],
  },
  {
    file: 'atlas-02',
    layout: 'atlas',
    kind: 'invoice',
    number: 'FAC-26-04598',
    daysBefore: 1,
    items: [
      { label: 'SAMSUNG GALAXY A55 5G 128GB NAVY', reference: 'SM-A556B', quantity: '3', price: '3250.00' },
      { label: 'SAMSUNG GALAXY A15 128GB BLACK', reference: 'SM-A155F', quantity: '6', price: '1190.00' },
      { label: 'CANON PIXMA G3470 MULTIFONCTION WIFI', reference: 'G3470', quantity: '1', price: '1390.00' },
      { label: 'LOGITECH M185 SOURIS SANS FIL GRIS', reference: '910-002238', quantity: '10', price: '85.00' },
      { label: 'SAMSUNG CHARGEUR RAPIDE 25W USB-C', reference: 'EP-TA800NBEGEU', quantity: '10', price: '95.00' },
    ],
  },
  {
    file: 'atlas-03',
    layout: 'atlas',
    kind: 'invoice',
    number: 'FAC-26-04377',
    daysBefore: 20,
    items: [
      { label: 'SAMSUNG GALAXY A55 5G 128GB NAVY', reference: 'SM-A556B', quantity: '4', price: '3250.00' },
      { label: 'SAMSUNG GALAXY A55 5G 128GB LILAS', reference: 'SM-A556B-L', quantity: '2', price: '3250.00' },
      { label: 'SAMSUNG GALAXY A15 128GB BLACK', reference: 'SM-A155F', quantity: '8', price: '1190.00' },
      { label: 'SAMSUNG GALAXY A15 128GB BLUE', reference: 'SM-A155F-B', quantity: '4', price: '1190.00' },
      { label: 'APPLE IPHONE 15 128GB BLACK', reference: 'MTP03', quantity: '2', price: '7350.00' },
      { label: 'APPLE IPHONE 15 128GB PINK', reference: 'MTP13', quantity: '1', price: '7350.00' },
      { label: 'HP 250 G10 I5-1335U 8GB 512GB SSD W11', reference: '8A5D4EA', quantity: '4', price: '5350.00' },
      { label: 'DELL VOSTRO 3520 I5-1235U 8GB 512GB', reference: 'V3520-I5', quantity: '2', price: '5900.00' },
      { label: 'HP LASERJET M111W WIFI', reference: 'M111W', quantity: '3', price: '1050.00' },
      { label: 'CANON PIXMA G3470 MULTIFONCTION WIFI', reference: 'G3470', quantity: '3', price: '1390.00' },
      { label: 'ECRAN SAMSUNG 24" LS24C310 IPS 75HZ', reference: 'LS24C310', quantity: '5', price: '1050.00' },
      { label: 'LOGITECH M185 SOURIS SANS FIL GRIS', reference: '910-002238', quantity: '20', price: '85.00' },
      { label: 'LOGITECH MK270 COMBO CLAVIER SOURIS AZERTY', reference: '920-004511', quantity: '10', price: '215.00' },
      { label: 'CABLE HDMI 2.0 1.5M', reference: 'HDMI-15', quantity: '30', price: '18.00' },
      { label: 'CABLE HDMI 2.0 3M', reference: 'HDMI-30', quantity: '15', price: '26.00' },
      { label: 'CABLE USB-C VERS USB-C 1M 60W', reference: 'USBC-1M', quantity: '25', price: '22.00' },
      { label: 'SAMSUNG CHARGEUR RAPIDE 25W USB-C', reference: 'EP-TA800NBEGEU', quantity: '15', price: '95.00' },
      { label: 'POWERBANK XIAOMI 10000MAH 22.5W', reference: 'BHR5884GL', quantity: '6', price: '165.00' },
      { label: 'ECOUTEURS SAMSUNG GALAXY BUDS FE GRAPHITE', reference: 'SM-R400N', quantity: '4', price: '690.00' },
      { label: 'TAPIS DE SOURIS ERGONOMIQUE GEL', reference: 'TS-GEL', quantity: '12', price: '35.00' },
      { label: 'WEBCAM LOGITECH C270 HD 720P', reference: '960-001063', quantity: '3', price: '245.00' },
      { label: 'CASQUE LOGITECH H390 USB', reference: '981-000406', quantity: '3', price: '310.00' },
      { label: 'CLAVIER LOGITECH K120 USB AZERTY', reference: '920-002488', quantity: '6', price: '99.00' },
      { label: 'HUB USB 3.0 4 PORTS', reference: 'HUB-4P', quantity: '8', price: '58.00' },
      { label: 'MULTIPRISE PARAFOUDRE 6 PRISES 2M', reference: 'MP-6P', quantity: '5', price: '120.00' },
      { label: 'ROUTEUR TP-LINK ARCHER C6 AC1200', reference: 'ARCHER-C6', quantity: '2', price: '340.00' },
    ],
  },
  {
    file: 'atlas-bl-01',
    layout: 'atlas',
    kind: 'delivery_note',
    number: 'BL-26-03981',
    daysBefore: 8,
    items: [
      { label: 'SAMSUNG GALAXY A55 5G 128GB NAVY', reference: 'SM-A556B', quantity: '5' },
      { label: 'HP 250 G10 I5-1335U 8GB 512GB SSD W11', reference: '8A5D4EA', quantity: '3' },
      { label: 'CANON PIXMA G3470 MULTIFONCTION WIFI', reference: 'G3470', quantity: '2' },
      { label: 'LOGITECH M185 SOURIS SANS FIL GRIS', reference: '910-002238', quantity: '10' },
    ],
  },
  {
    file: 'maghreb-01',
    layout: 'maghreb',
    kind: 'invoice',
    number: 'MIS/2026/1187',
    daysBefore: 12,
    items: [
      { label: 'Xiaomi Redmi Note 13 8+256Go Midnight Black', reference: 'RN13-256', quantity: '4', unit: 'u', price: '1690.00' },
      { label: 'Lenovo IdeaPad Slim 3 15IAN8 i3-N305 8Go 256Go', reference: '82XB0045FE', quantity: '2', unit: 'u', price: '4100.00' },
      { label: 'Clé USB SanDisk Ultra Flair 64Go USB 3.0', reference: 'SDCZ73-064G', quantity: '25', unit: 'u', price: '45.00' },
      { label: 'Coque silicone Galaxy A55 transparente', reference: 'CQ-A55-TR', quantity: '20', unit: 'u', price: '32.00' },
      { label: 'Frais de livraison Casablanca', quantity: '1', unit: 'forfait', price: '150.00' },
      { label: 'Remise commerciale 2%', total: '-334.50' },
    ],
  },
  {
    file: 'maghreb-02',
    layout: 'maghreb',
    kind: 'invoice',
    number: 'MIS/2026/1203',
    daysBefore: 5,
    items: [
      { label: 'Clé USB Kingston DataTraveler Exodia 32Go (carton de 10)', reference: 'DTX/32GB-10', quantity: '3', unit: 'ctn', price: '280.00' },
      { label: 'Epson EcoTank L3250 A4 WiFi', reference: 'C11CJ67405', quantity: '2', unit: 'u', price: '1480.00' },
      { label: 'Câble réseau RJ45 Cat6 UTP (au mètre)', reference: 'CAT6-UTP', quantity: '30.5', unit: 'm', price: '4.20' },
      { label: 'ASUS VivoBook 15 X1504ZA i7-1255U 16Go 512Go', reference: 'X1504ZA-NJ1086', quantity: '1', unit: 'u', price: '7150.00' },
    ],
  },
  {
    file: 'maghreb-03',
    layout: 'maghreb',
    kind: 'invoice',
    number: 'MIS/2026/1216',
    daysBefore: 3,
    items: [
      { label: 'Attache-câbles nylon 200mm noir (sachet de 100)', reference: 'AC-200-N', quantity: '12', unit: 'sachet', price: '18.375' },
      { label: 'Gaine thermorétractable 6mm (au mètre)', reference: 'GT-6', quantity: '15', unit: 'm', price: '2.125' },
      { label: 'Oppo A79 5G 8+128Go Glowing Green', reference: 'CPH2553', quantity: '3', unit: 'u', price: '1780.00' },
    ],
  },
  {
    file: 'maghreb-devis-01',
    layout: 'maghreb',
    kind: 'quote',
    number: 'DV-MIS-2026-311',
    daysBefore: 15,
    items: [
      { label: 'Dell Vostro 3520 i5-1235U 8Go 512Go', reference: 'N1608PVNB3520', quantity: '5', unit: 'u', price: '5900.00' },
      { label: 'Souris optique USB Dell MS116', reference: '570-AAIS', quantity: '5', unit: 'u', price: '65.00' },
    ],
  },
  {
    file: 'bureau-01',
    layout: 'bureau',
    kind: 'invoice',
    number: '2026/0387',
    daysBefore: 9,
    items: [
      { label: 'Ramette papier A4 80g Double A', quantity: '20', price: '52.00' },
      { label: 'Câble HDMI 1,5m', quantity: '10', price: '45.00' },
      { label: 'Souris USB filaire', quantity: '5', price: '60.00' },
    ],
  },
  {
    file: 'bureau-02',
    layout: 'bureau',
    kind: 'invoice',
    number: '2026/0412',
    daysBefore: 2,
    withoutIce: true,
    items: [
      { label: 'Multiprise 5 prises avec interrupteur', quantity: '4', price: '89.00' },
      { label: 'Clé USB 32Go Kingston', quantity: '15', price: '48.00' },
    ],
  },
];

// "18.375" with 4 digits → 183750
function scaled(decimal: string, digits: number): number {
  const negative = decimal.startsWith('-');
  const [whole, fraction = ''] = decimal.replace('-', '').split('.');
  const value =
    Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0'));
  return negative ? -value : value;
}

// Quantity × unit price, rounded half-up to the centime
function lineCents(quantity: string, price: string): number {
  const product = scaled(quantity, 3) * scaled(price, 4);
  const cents = Math.floor((Math.abs(product) + 50_000) / 100_000);
  return product < 0 ? -cents : cents;
}

// 1234550 → "12345.50"
function dot(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

// "1690.00" → "1 690,00" or "1.690,00"
function printed(decimal: string, thousands: string): string {
  const negative = decimal.startsWith('-');
  const [whole, fraction = ''] = decimal.replace('-', '').split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
  return `${negative ? '-' : ''}${grouped},${fraction.padEnd(2, '0')}`;
}

const quantityText = (quantity?: string) => quantity?.replace('.', ',') ?? '';

interface Computed {
  lines: { item: Item; total: number | null }[];
  ht: number | null;
  tva: number | null;
  ttc: number | null;
}

// Bureau Plus prints prices with tax included and only a total TTC
function compute(sample: Sample): Computed {
  const lines = sample.items.map((item) => ({
    item,
    total: item.total
      ? scaled(item.total, 2)
      : item.quantity && item.price
        ? lineCents(item.quantity, item.price)
        : null,
  }));
  if (sample.kind === 'delivery_note') {
    return { lines, ht: null, tva: null, ttc: null };
  }
  const sum = lines.reduce((total, line) => total + (line.total ?? 0), 0);
  if (sample.layout === 'bureau') {
    return { lines, ht: null, tva: null, ttc: sum };
  }
  const tva = Math.floor((sum * VAT_PERCENT + 50) / 100);
  return { lines, ht: sum, tva, ttc: sum + tva };
}

function reading(sample: Sample, day: string, c: Computed): InvoiceReading {
  const supplier = SUPPLIERS[sample.layout];
  const hasRate = sample.layout !== 'bureau' && sample.kind !== 'delivery_note';
  const lines: ReadLine[] = c.lines.map(({ item, total }) => ({
    label: item.label,
    reference: item.reference ?? null,
    quantity: item.quantity ?? null,
    unit_price: sample.kind === 'delivery_note' ? null : (item.price ?? null),
    tva_rate: hasRate ? String(VAT_PERCENT) : null,
    line_total: total === null || sample.kind === 'delivery_note' ? null : dot(total),
  }));
  return {
    document_type: sample.kind,
    supplier: {
      name: supplier.name,
      ice: sample.withoutIce ? null : supplier.ice,
      if_number: sample.withoutIce ? null : supplier.ifNumber,
      address: supplier.address,
    },
    invoice_number: sample.number,
    invoice_date: day,
    prices_include_tax: sample.layout === 'bureau',
    lines,
    totals: {
      ht: c.ht === null ? null : dot(c.ht),
      tva: c.tva === null ? null : dot(c.tva),
      ttc: c.ttc === null ? null : dot(c.ttc),
    },
    readability: 'good',
    notes: [],
  };
}

function words(sample: Sample, ttc: number): string {
  const amount = `${amountInWords(ttc)} TTC.`;
  return sample.kind === 'quote'
    ? `Arrêté le présent devis à la somme de : ${amount}`
    : `Arrêtée la présente facture à la somme de : ${amount}`;
}

const right = (text: string): TableCell => ({ text, alignment: 'right' });
const head = (text: string, fill: string, color = '#111827'): TableCell => ({
  text,
  bold: true,
  fillColor: fill,
  color,
});

function atlas(sample: Sample, day: string, c: Computed): TDocumentDefinitions {
  const money = (decimal: string) => printed(decimal, ' ');
  const priced = sample.kind !== 'delivery_note';
  const header = priced
    ? ['Réf.', 'Désignation', 'Qté', 'P.U. HT', 'TVA', 'Montant HT']
    : ['Réf.', 'Désignation', 'Qté livrée'];
  const rows: TableCell[][] = c.lines.map(({ item, total }) =>
    priced
      ? [
          item.reference ?? '',
          item.label,
          right(quantityText(item.quantity)),
          right(item.price ? money(item.price) : ''),
          right(`${VAT_PERCENT}%`),
          right(total === null ? '' : money(dot(total))),
        ]
      : [item.reference ?? '', item.label, right(quantityText(item.quantity))],
  );
  const details: TableCell[][] = [
    ['N°', sample.number],
    ['Date', formatDate(day)],
    ['Réf. client', 'C-0457'],
  ];
  if (sample.kind === 'invoice') {
    details.push(['Règlement', 'Virement à 60 jours']);
  }
  const end: Content[] = priced
    ? [
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 210,
              margin: [0, 12, 0, 0],
              table: {
                widths: ['*', 95],
                body: [
                  ['Total HT', right(money(dot(c.ht ?? 0)))],
                  [`TVA ${VAT_PERCENT}%`, right(money(dot(c.tva ?? 0)))],
                  [
                    { text: 'Total TTC', bold: true },
                    { text: `${money(dot(c.ttc ?? 0))} DH`, bold: true, alignment: 'right' },
                  ],
                ],
              },
            },
          ],
        },
        { text: words(sample, c.ttc ?? 0), margin: [0, 14, 0, 0] },
      ]
    : [
        { text: 'Ce document ne vaut pas facture.', italics: true, margin: [0, 16, 0, 0] },
        { text: 'Reçu par : ______________________     Signature :', margin: [0, 28, 0, 0] },
      ];
  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 70],
    defaultStyle: { font: 'Helvetica', fontSize: 9 },
    footer: (page, pages) => ({
      margin: [40, 16, 40, 0],
      stack: [
        { text: SUPPLIERS.atlas.legal, fontSize: 7, color: '#4b5563', alignment: 'center' },
        { text: `Page ${page} / ${pages}`, fontSize: 7, alignment: 'right', margin: [0, 4, 0, 0] },
      ],
    }),
    content: [
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'ATLAS DISTRIBUTION', fontSize: 18, bold: true, color: '#1d4ed8' },
              { text: 'SARL au capital de 1 000 000 DH', fontSize: 8, color: '#4b5563' },
              { text: '45, rue Ibnou Mounir, zone industrielle', margin: [0, 6, 0, 0] },
              'Casablanca',
              'Tél. 05 22 11 11 11 – commandes@atlas-distribution.example',
            ],
          },
          {
            width: 210,
            stack: [
              { text: TITLES[sample.kind], fontSize: 16, bold: true, alignment: 'right' },
              {
                margin: [50, 6, 0, 0],
                layout: 'noBorders',
                table: { widths: ['auto', '*'], body: details },
              },
            ],
          },
        ],
      },
      {
        margin: [270, 16, 0, 16],
        table: {
          widths: ['*'],
          body: [[{ stack: [{ text: 'Client', bold: true }, ...CLIENT], margin: [6, 4, 6, 4] }]],
        },
      },
      {
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#9ca3af',
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
        table: {
          headerRows: 1,
          widths: priced ? [62, '*', 26, 56, 28, 66] : [80, '*', 60],
          body: [header.map((text) => head(text, '#e5e7eb')), ...rows],
        },
      },
      ...end,
    ],
  };
}

function maghreb(sample: Sample, day: string, c: Computed): TDocumentDefinitions {
  const money = (decimal: string) => printed(decimal, '.');
  const terms =
    sample.kind === 'quote'
      ? "Validité de l'offre : 15 jours"
      : `Échéance : ${formatDate(addDays(day, 60))}`;
  return {
    pageSize: 'A4',
    pageMargins: [36, 36, 36, 60],
    defaultStyle: { font: 'Roboto', fontSize: 9 },
    footer: () => ({
      margin: [36, 20, 36, 0],
      text: SUPPLIERS.maghreb.legal,
      fontSize: 7,
      color: '#6b7280',
      alignment: 'center',
    }),
    content: [
      {
        layout: 'noBorders',
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: '#1f2937',
                margin: [12, 10, 12, 10],
                stack: [
                  { text: 'MAGHREB IT SUPPLY', color: '#ffffff', fontSize: 16, bold: true },
                  { text: 'Matériel informatique & télécom', color: '#d1d5db' },
                ],
              },
            ],
          ],
        },
      },
      {
        margin: [0, 14, 0, 14],
        columns: [
          {
            width: '*',
            stack: [
              { text: `${TITLES[sample.kind]} N° ${sample.number}`, fontSize: 12, bold: true },
              `Date : ${formatDate(day)}`,
              terms,
              'Code client : TSM-014',
            ],
          },
          {
            width: 220,
            table: {
              widths: ['*'],
              body: [[{ stack: [{ text: 'Facturé à', color: '#6b7280' }, ...CLIENT], margin: [6, 4, 6, 4] }]],
            },
          },
        ],
      },
      {
        layout: {
          fillColor: (row: number) => (row > 0 && row % 2 === 0 ? '#f3f4f6' : null),
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
        table: {
          headerRows: 1,
          widths: ['*', 78, 30, 34, 62, 70],
          body: [
            ['Désignation', 'Référence', 'Qté', 'Unité', 'PU HT (MAD)', 'Montant HT (MAD)'].map(
              (text) => head(text, '#374151', '#ffffff'),
            ),
            ...c.lines.map(({ item, total }): TableCell[] => [
              item.label,
              item.reference ?? '',
              right(quantityText(item.quantity)),
              item.unit ?? '',
              right(item.price ? money(item.price) : ''),
              right(total === null ? '' : money(dot(total))),
            ]),
          ],
        },
      },
      {
        margin: [0, 14, 0, 0],
        columns: [
          {
            width: '*',
            table: {
              widths: [80, 40, 80],
              body: [
                ['Base HT', 'Taux', 'Montant TVA'].map((text) => head(text, '#e5e7eb')),
                [money(dot(c.ht ?? 0)), `${VAT_PERCENT} %`, money(dot(c.tva ?? 0))],
              ],
            },
          },
          {
            width: 200,
            table: {
              widths: ['*', 90],
              body: [
                ['Total HT', right(money(dot(c.ht ?? 0)))],
                ['Total TVA', right(money(dot(c.tva ?? 0)))],
                [
                  { text: 'Net à payer TTC (MAD)', bold: true },
                  { text: money(dot(c.ttc ?? 0)), bold: true, alignment: 'right' },
                ],
              ],
            },
          },
        ],
      },
      { text: words(sample, c.ttc ?? 0), margin: [0, 14, 0, 0] },
    ],
  };
}

function bureau(sample: Sample, day: string, c: Computed): TDocumentDefinitions {
  const money = (decimal: string) => printed(decimal, ' ');
  const supplier = SUPPLIERS.bureau;
  const ids = sample.withoutIce
    ? []
    : [`ICE : ${supplier.ice}   IF : ${supplier.ifNumber}`];
  const client = sample.withoutIce
    ? 'Doit : TECHSTORE MAARIF SARL – ICE 009876543000021 – Casablanca'
    : 'Doit : TECHSTORE MAARIF SARL – Casablanca';
  return {
    pageSize: 'A4',
    pageMargins: [50, 50, 50, 50],
    defaultStyle: { font: 'Courier', fontSize: 10 },
    content: [
      { text: 'BUREAU PLUS', fontSize: 18, bold: true, alignment: 'center' },
      { text: 'Fournitures de bureau et informatique - Gros & détail', alignment: 'center' },
      { text: '15, rue Derb Omar - Casablanca - Tél. 05 22 44 55 66', alignment: 'center' },
      ...ids.map((text): Content => ({ text, alignment: 'center' })),
      { text: '-'.repeat(78), margin: [0, 8, 0, 8] },
      {
        columns: [
          { text: `FACTURE N° ${sample.number}`, bold: true },
          { text: `Casablanca, le ${formatDate(day)}`, alignment: 'right' },
        ],
      },
      { text: client, margin: [0, 10, 0, 14] },
      {
        layout: 'lightHorizontalLines',
        table: {
          headerRows: 1,
          widths: [40, '*', 80, 90],
          body: [
            ['Qté', 'Désignation', 'P.U. TTC', 'Total TTC'].map((text): TableCell => ({ text, bold: true })),
            ...c.lines.map(({ item, total }): TableCell[] => [
              quantityText(item.quantity),
              item.label,
              right(item.price ? money(item.price) : ''),
              right(total === null ? '' : money(dot(total))),
            ]),
          ],
        },
      },
      {
        text: `TOTAL TTC : ${money(dot(c.ttc ?? 0))} DHS`,
        bold: true,
        alignment: 'right',
        margin: [0, 14, 0, 0],
      },
      { text: words(sample, c.ttc ?? 0), margin: [0, 14, 0, 0] },
      { text: 'Cachet et signature', alignment: 'right', margin: [0, 40, 0, 0] },
    ],
  };
}

const LAYOUTS = { atlas, maghreb, bureau };

async function main() {
  // The newest invoice's day: pass one in the month a demo video is recorded
  const newest = process.argv[2] ?? PRINTED_ON;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newest)) {
    throw new Error(`Expected a day like 2026-10-25, got "${newest}"`);
  }
  mkdirSync(OUT, { recursive: true });
  for (const sample of SAMPLES) {
    const day = addDays(newest, -sample.daysBefore);
    const computed = compute(sample);
    const doc = LAYOUTS[sample.layout](sample, day, computed);
    // A fixed date inside the file: the same day always gives the same bytes
    doc.info = { creationDate: new Date(`${day}T09:00:00Z`) };
    const pdf = await pdfmake.createPdf(doc).getBuffer();
    writeFileSync(join(OUT, `${sample.file}.pdf`), pdf);
    writeFileSync(
      join(OUT, `${sample.file}.json`),
      `${JSON.stringify(reading(sample, day, computed), null, 2)}\n`,
    );
    console.log(`${sample.file}.pdf  ${day}  ${sample.items.length} lines`);
  }
}

await main();
