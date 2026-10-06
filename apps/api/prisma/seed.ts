// Demo data for TechStore Maarif SARL, a fictional IT and phones shop in Casablanca.
// Every name, ICE, RIB and phone number is fictional. Local development only.
// Amounts are in centimes: 350_000 = 3 500,00 DH.

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  addDays,
  amountInWords,
  computeTotals,
  formatDate,
  todayInMorocco,
} from '@efactura/shared';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import type { EnvironmentVariables } from '../src/config/env.validation.js';
import {
  Prisma,
  PrismaClient,
  type Client,
  type PaymentMethod,
  type SendChannel,
  type User,
} from '../src/generated/prisma/client.js';
import {
  clientSnapshot,
  shopSnapshot,
} from '../src/modules/documents/snapshots.js';
import { StorageService } from '../src/modules/storage/storage.service.js';

const DEMO_PASSWORD = 'Demo-2026';
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];

// A fixed key: every seed rewrites the same file
const LOGO_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  'seed',
  'techstore-logo.png',
);
const LOGO_KEY = 'logos/5f0c2a7e-3b1d-4c8e-9a64-2d7b1e0f9c35.png';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The demo seed never runs in production.');
}

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  throw new Error('MIGRATION_DATABASE_URL is missing from apps/api/.env');
}

// The seed empties every table: it only ever runs on the database of this PC
const host = new URL(url).hostname;
if (!LOCAL_HOSTS.includes(host)) {
  throw new Error(`The demo seed only runs on a local database, not on ${host}.`);
}

// The owner key: only the owner may empty the tables
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const TVA_20 = 2000;

async function emptyAllTables() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} CASCADE`);
}

// Without the PC's file storage the seed still runs; the PDFs then print no logo
async function storeLogo(): Promise<string | null> {
  const endpoint = process.env.S3_ENDPOINT;
  const storageHost = endpoint ? new URL(endpoint).hostname : 'no S3_ENDPOINT';
  if (!LOCAL_HOSTS.includes(storageHost)) {
    console.warn(`Logo skipped: the file storage isn't on this PC (${storageHost}).`);
    return null;
  }
  try {
    const storage = new StorageService(
      new ConfigService<EnvironmentVariables, true>(),
    );
    await storage.onModuleInit();
    await storage.save(LOGO_KEY, readFileSync(LOGO_FILE), 'image/png');
    return LOGO_KEY;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`Logo skipped: ${reason}. Start s3proxy, then seed again.`);
    return null;
  }
}

async function main() {
  await emptyAllTables();
  const passwordHash = await argon2.hash(DEMO_PASSWORD);
  const logoKey = await storeLogo();

  await prisma.$transaction(async (tx) => {
    await tx.shopSettings.create({
      data: {
        logoKey,
        legalName: 'TechStore Maarif SARL',
        address: '123, boulevard Al Massira, Maârif',
        city: 'Casablanca',
        phone: '05 22 00 00 00',
        email: 'contact@techstore.example',
        ice: '009876543000021',
        ifNumber: '50123456',
        tpNumber: '35712345',
        rcNumber: '512345',
        rcCity: 'Casablanca',
        bankName: 'Banque Populaire',
        rib: '190780211110000123456789',
      },
    });

    await tx.user.createMany({
      data: [
        { fullName: 'Karim Alaoui', email: 'karim@techstore.example', role: 'admin', status: 'active', passwordHash },
        { fullName: 'Youssef Idrissi', email: 'youssef@techstore.example', role: 'staff', status: 'active', passwordHash },
        { fullName: 'Salma Berrada', email: 'salma@techstore.example', role: 'staff', status: 'active', passwordHash },
      ],
    });

    const atlas = await tx.supplier.create({
      data: {
        name: 'Atlas Distribution SARL',
        ice: '001234567000089',
        ifNumber: '40112233',
        address: '45, rue Ibnou Mounir, zone industrielle',
        city: 'Casablanca',
        phone: '05 22 11 11 11',
        email: 'commandes@atlas-distribution.example',
      },
    });
    const maghreb = await tx.supplier.create({
      data: {
        name: 'Maghreb IT Supply',
        ice: '002345678000012',
        ifNumber: '40445566',
        address: '12, avenue Hassan II',
        city: 'Rabat',
        phone: '05 37 22 22 22',
        email: 'ventes@maghreb-it.example',
      },
    });

    const lastCostAt = new Date('2026-09-10T10:00:00Z');
    const products: [name: string, reference: string, priceHt: number, costHt: number, supplierId: string][] = [
      // phones
      ['Samsung Galaxy A55 5G 128 Go', 'SM-A556B', 350_000, 290_000, atlas.id],
      ['Samsung Galaxy A15 128 Go', 'SM-A155F', 149_900, 119_000, atlas.id],
      ['Xiaomi Redmi Note 13 256 Go', 'RN13-256', 209_900, 169_000, maghreb.id],
      ['Apple iPhone 15 128 Go', 'IP15-128', 829_900, 735_000, atlas.id],
      ['Oppo A79 5G 128 Go', 'CPH2553', 219_900, 178_000, maghreb.id],
      // laptops
      ['HP 250 G10 i5-1335U 8/512 W11', 'HP250G10-I5', 629_000, 535_000, atlas.id],
      ['Lenovo IdeaPad Slim 3 i3 8/256', 'IPS3-I3', 489_000, 410_000, maghreb.id],
      ['Dell Vostro 3520 i5 8/512', 'V3520-I5', 699_000, 590_000, atlas.id],
      ['ASUS VivoBook 15 i7 16/512', 'X1504ZA-I7', 849_000, 715_000, maghreb.id],
      // printers and screens
      ['Canon PIXMA G3470', 'G3470', 169_000, 139_000, atlas.id],
      ['Epson EcoTank L3250', 'L3250', 179_000, 148_000, maghreb.id],
      ['HP LaserJet M111w', 'M111W', 129_000, 105_000, atlas.id],
      ['Écran Samsung 24" LS24C310', 'LS24C310', 129_000, 105_000, atlas.id],
      // accessories
      ['Clé USB SanDisk Ultra 64 Go', 'SDCZ48-064G', 6_900, 4_500, maghreb.id],
      ['Clé USB Kingston DataTraveler 32 Go', 'DTX-32GB', 4_500, 2_800, maghreb.id],
      ['Câble HDMI 2.0 1,5 m', 'HDMI-15', 3_900, 1_800, atlas.id],
      ['Souris sans fil Logitech M185', 'M185', 12_900, 8_500, atlas.id],
      ['Clavier et souris Logitech MK270', 'MK270', 29_900, 21_500, atlas.id],
      ['Chargeur rapide Samsung 25 W', 'EP-TA800', 14_900, 9_500, atlas.id],
      ['Coque de protection Galaxy A55', 'COQ-A55', 7_900, 3_200, maghreb.id],
    ];
    await tx.product.createMany({
      data: products.map(([name, reference, priceHtCentimes, lastCostHtCentimes, lastSupplierId]) => ({
        name,
        reference,
        priceHtCentimes,
        tvaRateBp: TVA_20,
        lastCostHtCentimes,
        lastCostAt,
        lastSupplierId,
      })),
    });

    await tx.client.createMany({
      data: [
        { type: 'company', name: 'Cabinet Benali', ice: '001523847000063', address: '8, rue Moussa Ibnou Noussair', city: 'Casablanca', email: 'contact@cabinet-benali.example', phone: '05 22 33 33 33', paymentDays: 60 },
        { type: 'company', name: 'Atelier Zineb Design SARL', ice: '002671938000045', address: '21, avenue Fal Ould Oumeir, Agdal', city: 'Rabat', email: 'zineb@atelier-zineb.example', paymentDays: 30 },
        { type: 'company', name: 'Clinique Dentaire Al Amal', ice: '001987654000032', address: '5, boulevard Zerktouni', city: 'Casablanca', email: 'accueil@clinique-alamal.example', paymentDays: 60 },
        { type: 'company', name: 'École Privée Les Orangers', ice: '002345123000078', address: 'Route de Rabat, km 3', city: 'Mohammedia', email: 'direction@les-orangers.example', paymentDays: 90 },
        { type: 'company', name: 'Transports Ouled Salah SARL', ice: '001456789000091', address: 'Zone logistique Lissasfa', city: 'Casablanca', email: 'compta@ouled-salah.example', paymentDays: 120 },
        { type: 'individual', name: 'Mehdi Tazi', city: 'Casablanca', phone: '06 00 00 01 01', paymentDays: 0 },
        { type: 'individual', name: 'Nadia El Fassi', city: 'Casablanca', phone: '06 00 00 01 02', paymentDays: 0 },
        { type: 'individual', name: 'Omar Chraibi', city: 'Mohammedia', email: 'omar.chraibi@mail.example', paymentDays: 0 },
      ],
    });
  });

  await prisma.$transaction((tx) => addDocuments(tx), { timeout: 30_000 });

  const counts = {
    users: await prisma.user.count(),
    suppliers: await prisma.supplier.count(),
    products: await prisma.product.count(),
    clients: await prisma.client.count(),
    quotes: await prisma.quote.count(),
    invoices: await prisma.invoice.count(),
    avoirs: await prisma.creditNote.count(),
  };
  console.log('Demo data loaded:', counts);
  console.log(`Team login: karim@techstore.example (admin) or youssef@ / salma@ — password ${DEMO_PASSWORD}`);
}

// ---------------------------------------------------------------------------
// Quotes, invoices and an avoir in every status, dated back from today, so
// "late", "expired" and "this month" always hold. Built like the app builds
// them: lines and totals by computeTotals, words by amountInWords, numbers
// in date order with no gap. Each document is inserted as a draft, then sent:
// the freeze refuses lines on a sent document.
// ---------------------------------------------------------------------------

type Tx = Prisma.TransactionClient;

interface Item {
  ref?: string; // a catalogue product, by reference
  label?: string; // a free line
  qty: string;
  price?: number; // the product's price when left out
}

const CHANNEL: Record<SendChannel, string> = {
  whatsapp: 'par WhatsApp',
  email: 'par email',
  download: '(PDF téléchargé)',
};

const PAYMENT: Record<PaymentMethod, string> = {
  cash: 'espèces',
  cheque: 'chèque',
  transfer: 'virement',
  card: 'carte',
  effet: 'effet',
};

async function addDocuments(tx: Tx) {
  const today = todayInMorocco();
  const day = (offset: number) => addDays(today, offset);
  const date = (offset: number) => new Date(`${day(offset)}T00:00:00.000Z`);
  // A time on that day; today's stay before now and in the same order
  const at = (offset: number, hour: number) =>
    new Date(Math.min(Date.parse(`${day(offset)}T${String(hour).padStart(2, '0')}:00:00Z`), Date.now() - (24 - hour) * 60_000));

  const settings = await tx.shopSettings.findUniqueOrThrow({ where: { id: 1 } });
  const shop = json(shopSnapshot(settings));
  const users = await tx.user.findMany();
  const user = (first: string) => users.find((u) => u.email.startsWith(`${first}@`)) as User;
  const [karim, youssef, salma] = [user('karim'), user('youssef'), user('salma')];
  const clients = await tx.client.findMany();
  const client = (name: string) => clients.find((c) => c.name === name) as Client;
  const products = await tx.product.findMany();

  // FA-2026-0001: one counter per series and year, in date order
  const counters = new Map<string, number>();
  const nextNumber = (series: 'DV' | 'FA' | 'AV', offset: number) => {
    const year = Number(day(offset).slice(0, 4));
    const n = (counters.get(`${series}-${year}`) ?? 0) + 1;
    counters.set(`${series}-${year}`, n);
    return `${series}-${year}-${String(n).padStart(4, '0')}`;
  };

  const linesOf = (items: Item[]) => {
    const rows = items.map((item, index) => {
      const product = products.find((p) => p.reference === item.ref);
      return {
        position: index + 1,
        productId: product?.id ?? null,
        label: product?.name ?? (item.label as string),
        reference: product?.reference ?? null,
        unit: product?.unit ?? 'pièce',
        quantity: item.qty,
        unitPriceHtCentimes: item.price ?? (product?.priceHtCentimes as number),
        tvaRateBp: product?.tvaRateBp ?? TVA_20,
      };
    });
    const totals = computeTotals(rows);
    return {
      lines: rows.map((row, i) => ({ ...row, lineTotalHtCentimes: totals.lineTotalsHtCentimes[i] })),
      totals: {
        totalHtCentimes: totals.totalHtCentimes,
        totalTvaCentimes: totals.totalTvaCentimes,
        totalTtcCentimes: totals.totalTtcCentimes,
        tvaBreakdown: json(totals.tvaBreakdown),
        totalInWords: amountInWords(totals.totalTtcCentimes),
      },
    };
  };

  const log = (by: User | null, action: string, type: string, id: string, summary: string, when: Date) =>
    tx.activityLog.create({ data: { userId: by?.id ?? null, action, entityType: type, entityId: id, summary, createdAt: when } });

  const emailed = (to: Client, type: string, id: string, when: Date) =>
    log(null, 'email.sent', type, id, `email envoyé à ${to.email}`, new Date(when.getTime() + 60_000));

  // --- quotes -------------------------------------------------------------

  async function draftQuote(name: string, by: User, items: Item[], offset: number, extra: Partial<Prisma.QuoteUncheckedCreateInput> = {}) {
    const to = client(name);
    const { lines, totals } = linesOf(items);
    const created = at(offset, 9);
    const quote = await tx.quote.create({
      data: { clientId: to.id, createdById: by.id, createdAt: created, updatedAt: created, ...totals, lines: { create: lines }, ...extra },
    });
    if (!extra.previousVersionId) {
      await log(by, 'quote.created', 'quote', quote.id, `a créé un devis pour ${to.name} (brouillon)`, created);
    }
    return { quote, to };
  }

  async function sendQuote(quoteId: string, to: Client, by: User, offset: number, channel: SendChannel, number: string, version = 1) {
    const sent = at(offset, 10);
    await tx.quote.update({
      where: { id: quoteId },
      data: {
        status: 'sent',
        number,
        issueDate: date(offset),
        validUntil: date(offset + settings.defaultQuoteValidityDays),
        clientSnapshot: json(clientSnapshot(to)),
        shopSnapshot: shop,
        sentVia: channel,
        sentAt: sent,
        sentById: by.id,
        updatedAt: sent,
      },
    });
    const shown = version > 1 ? `${number}-v${version}` : number;
    await log(by, 'quote.sent', 'quote', quoteId, `a envoyé le devis ${shown} ${CHANNEL[channel]}`, sent);
    if (channel === 'email') {
      await emailed(to, 'quote', quoteId, sent);
    }
  }

  async function decide(quoteId: string, number: string, status: 'accepted' | 'refused', by: User, offset: number) {
    const when = at(offset, 15);
    await tx.quote.update({ where: { id: quoteId }, data: { status, updatedAt: when } });
    await log(by, `quote.${status}`, 'quote', quoteId, `a marqué le devis ${number} ${status === 'accepted' ? 'accepté' : 'refusé'}`, when);
  }

  // --- invoices -----------------------------------------------------------

  async function draftInvoice(name: string, by: User, items: Item[], offset: number, fromQuote?: { id: string; number: string }) {
    const to = client(name);
    const { lines, totals } = linesOf(items);
    const created = at(offset, 9);
    const invoice = await tx.invoice.create({
      data: { clientId: to.id, quoteId: fromQuote?.id, createdById: by.id, createdAt: created, updatedAt: created, ...totals, lines: { create: lines } },
    });
    await log(by, 'invoice.created', 'invoice', invoice.id, fromQuote
      ? `a créé une facture depuis le devis ${fromQuote.number} (brouillon)`
      : `a créé une facture pour ${to.name} (brouillon)`, created);
    if (fromQuote) {
      await log(by, 'quote.converted', 'quote', fromQuote.id, `a converti le devis ${fromQuote.number} en facture (brouillon)`, created);
    }
    return { invoice, to };
  }

  async function sendInvoice(invoiceId: string, to: Client, by: User, offset: number, channel: SendChannel) {
    const number = nextNumber('FA', offset);
    const sent = at(offset, 11);
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'sent',
        number,
        issueDate: date(offset),
        dueDate: date(offset + to.paymentDays),
        clientSnapshot: json(clientSnapshot(to)),
        shopSnapshot: shop,
        sentVia: channel,
        sentAt: sent,
        sentById: by.id,
        updatedAt: sent,
      },
    });
    await log(by, 'invoice.sent', 'invoice', invoiceId, `a envoyé la facture ${number} ${CHANNEL[channel]}`, sent);
    if (channel === 'email') {
      await emailed(to, 'invoice', invoiceId, sent);
    }
    return number;
  }

  async function pay(invoiceId: string, number: string, by: User, offset: number, method: PaymentMethod, reference: string | null = null) {
    const when = at(offset, 16);
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: 'paid', paidOn: date(offset), paymentMethod: method, paymentReference: reference, paidRecordedById: by.id, updatedAt: when },
    });
    await log(by, 'invoice.paid', 'invoice', invoiceId, `a marqué la facture ${number} payée (${PAYMENT[method]}, le ${formatDate(day(offset))})`, when);
  }

  // Oldest first: the numbers follow the dates

  // 75 days ago, due after 60: late
  const printers = await draftInvoice('Clinique Dentaire Al Amal', youssef, [
    { ref: 'G3470', qty: '2' },
    { ref: 'M111W', qty: '1' },
    { ref: 'HDMI-15', qty: '4' },
  ], -76);
  await sendInvoice(printers.invoice.id, printers.to, youssef, -75, 'email');

  // Sent 45 days ago, valid 30 days: expired
  const school = await draftQuote('École Privée Les Orangers', youssef, [
    { ref: 'IPS3-I3', qty: '10' },
    { ref: 'MK270', qty: '10' },
  ], -46, { notes: 'Livraison et installation dans vos locaux incluses.' });
  await sendQuote(school.quote.id, school.to, youssef, -45, 'email', nextNumber('DV', -45));

  // Accepted, converted, sent, paid this month
  const benali = await draftQuote('Cabinet Benali', salma, [
    { ref: 'HP250G10-I5', qty: '3' },
    { ref: 'M185', qty: '3' },
    { label: 'Installation et configuration', qty: '1', price: 60_000 },
  ], -41);
  const benaliNumber = nextNumber('DV', -40);
  await sendQuote(benali.quote.id, benali.to, salma, -40, 'whatsapp', benaliNumber);
  await decide(benali.quote.id, benaliNumber, 'accepted', salma, -38);
  const fromBenali = await draftInvoice('Cabinet Benali', youssef, [
    { ref: 'HP250G10-I5', qty: '3' },
    { ref: 'M185', qty: '3' },
    { label: 'Installation et configuration', qty: '1', price: 60_000 },
  ], -37, { id: benali.quote.id, number: benaliNumber });
  const benaliInvoice = await sendInvoice(fromBenali.invoice.id, fromBenali.to, youssef, -37, 'email');
  const monthStart = -(Number(today.slice(8, 10)) - 1);
  await pay(fromBenali.invoice.id, benaliInvoice, karim, Math.max(-3, monthStart), 'transfer', 'Réf. virement 58213');

  // Refused
  const clinic = await draftQuote('Clinique Dentaire Al Amal', youssef, [
    { ref: 'LS24C310', qty: '3' },
    { ref: 'MK270', qty: '3' },
  ], -31);
  const clinicNumber = nextNumber('DV', -30);
  await sendQuote(clinic.quote.id, clinic.to, youssef, -30, 'email', clinicNumber);
  await decide(clinic.quote.id, clinicNumber, 'refused', youssef, -25);

  // A quantity error: cancelled the next day with an avoir, then the right invoice, paid by cheque
  const wrong = await draftInvoice('École Privée Les Orangers', youssef, [
    { ref: 'MK270', qty: '12' },
    { ref: 'DTX-32GB', qty: '10' },
  ], -28);
  const wrongNumber = await sendInvoice(wrong.invoice.id, wrong.to, youssef, -28, 'email');
  const avoirNumber = nextNumber('AV', -27);
  const reason = 'Erreur de quantité : 12 claviers facturés au lieu de 10';
  const cancelled = at(-27, 9);
  const avoir = await tx.creditNote.create({
    data: {
      number: avoirNumber,
      invoiceId: wrong.invoice.id,
      reason,
      clientSnapshot: json(clientSnapshot(wrong.to)),
      shopSnapshot: shop,
      totalHtCentimes: -wrong.invoice.totalHtCentimes,
      totalTvaCentimes: -wrong.invoice.totalTvaCentimes,
      totalTtcCentimes: -wrong.invoice.totalTtcCentimes,
      totalInWords: wrong.invoice.totalInWords as string,
      sentVia: 'email',
      createdById: karim.id,
      createdAt: cancelled,
    },
  });
  await tx.invoice.update({ where: { id: wrong.invoice.id }, data: { status: 'cancelled', updatedAt: cancelled } });
  await log(karim, 'invoice.cancelled', 'invoice', wrong.invoice.id, `a annulé la facture ${wrongNumber} par l'avoir ${avoirNumber} (motif : ${reason})`, cancelled);
  await log(karim, 'credit_note.created', 'credit_note', avoir.id, `a envoyé l'avoir ${avoirNumber} par email, qui annule la facture ${wrongNumber}`, cancelled);
  await emailed(wrong.to, 'credit_note', avoir.id, cancelled);
  const right = await draftInvoice('École Privée Les Orangers', youssef, [
    { ref: 'MK270', qty: '10' },
    { ref: 'DTX-32GB', qty: '10' },
  ], -27);
  const rightNumber = await sendInvoice(right.invoice.id, right.to, youssef, -27, 'email');
  await pay(right.invoice.id, rightNumber, karim, -10, 'cheque', 'Chèque n° 0045871');

  // Due in 120 days: waiting
  const fleet = await draftInvoice('Transports Ouled Salah SARL', salma, [
    { ref: 'SM-A155F', qty: '6' },
    { ref: 'EP-TA800', qty: '6' },
  ], -20);
  await sendInvoice(fleet.invoice.id, fleet.to, salma, -20, 'email');

  // Version 1, then a better price in version 2: v1 replaced
  const studio = await draftQuote('Atelier Zineb Design SARL', youssef, [{ ref: 'X1504ZA-I7', qty: '2' }], -13);
  const studioNumber = nextNumber('DV', -12);
  await sendQuote(studio.quote.id, studio.to, youssef, -12, 'whatsapp', studioNumber);
  const revised = await draftQuote('Atelier Zineb Design SARL', youssef, [
    { ref: 'X1504ZA-I7', qty: '2', price: 829_000 },
    { ref: 'MK270', qty: '2' },
  ], -11, { number: studioNumber, version: 2, previousVersionId: studio.quote.id });
  await log(youssef, 'quote.revised', 'quote', revised.quote.id, `a préparé la version 2 du devis ${studioNumber}`, at(-11, 9));
  const replaced = at(-10, 10);
  await tx.quote.update({ where: { id: studio.quote.id }, data: { status: 'replaced', updatedAt: replaced } });
  await log(youssef, 'quote.replaced', 'quote', studio.quote.id, `a remplacé le devis ${studioNumber} par la version 2`, replaced);
  await sendQuote(revised.quote.id, revised.to, youssef, -10, 'whatsapp', studioNumber, 2);

  // Still valid
  const phones = await draftQuote('Transports Ouled Salah SARL', salma, [
    { ref: 'SM-A556B', qty: '4' },
    { ref: 'COQ-A55', qty: '4' },
  ], -4);
  await sendQuote(phones.quote.id, phones.to, salma, -3, 'email', nextNumber('DV', -3));

  // A walk-in client pays cash at the counter
  const walkIn = await draftInvoice('Mehdi Tazi', salma, [
    { ref: 'IP15-128', qty: '1' },
    { ref: 'EP-TA800', qty: '1' },
  ], 0);
  const walkInNumber = await sendInvoice(walkIn.invoice.id, walkIn.to, salma, 0, 'download');
  await pay(walkIn.invoice.id, walkInNumber, salma, 0, 'cash');

  // Drafts: no number yet
  await draftQuote('Omar Chraibi', youssef, [{ ref: 'V3520-I5', qty: '1' }], -1);
  await draftInvoice('Nadia El Fassi', salma, [
    { ref: 'RN13-256', qty: '1' },
    { ref: 'SDCZ48-064G', qty: '1' },
  ], 0);

  // The counters continue after the demo numbers
  for (const [key, lastNumber] of counters) {
    const [series, year] = key.split('-') as ['DV' | 'FA' | 'AV', string];
    await tx.numberCounter.create({ data: { series, year: Number(year), lastNumber } });
  }
}

function json(value: object): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
