// Demo data for TechStore Maarif SARL, a fictional IT and phones shop in Casablanca.
// Every name, ICE, RIB and phone number is fictional. Local development only.
// Amounts are in centimes: 350_000 = 3 500,00 DH.
// Quotes, invoices and the avoir are added with the selling side.

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';

const DEMO_PASSWORD = 'Demo-2026';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The demo seed never runs in production.');
}

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  throw new Error('MIGRATION_DATABASE_URL is missing from apps/api/.env');
}

// The seed empties every table: it only ever runs on the database of this PC
const host = new URL(url).hostname;
if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
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

async function main() {
  await emptyAllTables();
  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  await prisma.$transaction(async (tx) => {
    await tx.shopSettings.create({
      data: {
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

  const counts = {
    users: await prisma.user.count(),
    suppliers: await prisma.supplier.count(),
    products: await prisma.product.count(),
    clients: await prisma.client.count(),
  };
  console.log('Demo data loaded:', counts);
  console.log(`Team login: karim@techstore.example (admin) or youssef@ / salma@ — password ${DEMO_PASSWORD}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
