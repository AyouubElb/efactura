// Creates the first admin, once: pnpm --filter api create-admin
// It asks for the database URL, hidden: never in .env, an env variable or the shell history.
// It uses the API's limited key: creating a user is an ordinary insert.

import 'dotenv/config';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';

if (!stdin.isTTY) {
  throw new Error('Run it in a terminal: it asks for passwords.');
}

async function main() {
  const typedUrl = await askHidden(
    'URL de la base, clé efactura_app (Entrée = base locale) : ',
  );
  const url = typedUrl.trim() || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('No URL typed and no DATABASE_URL in .env.');
  }
  const host = new URL(url).hostname;
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });

  try {
    const existing = await prisma.user.count({ where: { role: 'admin' } });
    if (existing > 0) {
      throw new Error(
        `${host} already has an admin: invite people from the team page.`,
      );
    }

    const lines = createInterface({ input: stdin, output: stdout });
    const fullName = (await lines.question('Nom complet : ')).trim();
    const email = (await lines.question('Email : ')).trim().toLowerCase();
    lines.close();

    if (fullName.length === 0 || fullName.length > 100) {
      throw new Error('The name must have 1 to 100 characters.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email.');
    }

    const password = await askHidden('Mot de passe (8 caractères minimum) : ');
    if (password.length < 8 || password.length > 200) {
      throw new Error('The password must have 8 to 200 characters.');
    }
    if ((await askHidden('Mot de passe, encore : ')) !== password) {
      throw new Error('The two passwords differ.');
    }

    const confirm = createInterface({ input: stdin, output: stdout });
    const answer = await confirm.question(
      `Créer l'administrateur ${email} sur ${host} ? Tapez oui : `,
    );
    confirm.close();
    if (answer.trim().toLowerCase() !== 'oui') {
      throw new Error('Cancelled.');
    }

    const passwordHash = await argon2.hash(password);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName,
          email,
          passwordHash,
          role: 'admin',
          status: 'active',
        },
      });
      await tx.activityLog.create({
        data: {
          userId: null,
          action: 'user.created',
          entityType: 'user',
          entityId: user.id,
          summary: 'compte administrateur créé (script)',
        },
      });
    });
    console.log(`Admin ${email} created on ${host}. Log in with it.`);
  } finally {
    await prisma.$disconnect();
  }
}

// Raw mode: each character shows as *, never in clear
function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };
    const onData = (chunk: string) => {
      // Some terminals wrap a paste in invisible markers
      const text = chunk
        .replaceAll('\u001b[200~', '')
        .replaceAll('\u001b[201~', '');
      for (const char of text) {
        if (char === '\r' || char === '\n') {
          finish();
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          finish();
          reject(new Error('Cancelled.'));
          return;
        }
        if (char === '\u007f' || char === '\b') {
          if (value) {
            value = value.slice(0, -1);
            stdout.write('\b \b');
          }
        } else if (char >= ' ') {
          value += char;
          stdout.write('*');
        }
      }
    };
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.on('data', onData);
  });
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
