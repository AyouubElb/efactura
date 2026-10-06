// Sets the shop's logo through the API, once: pnpm --filter api set-logo [file.png]
// It asks for the internal key and the admin's password, hidden: never in .env or the shell history.
// It goes through the API's own routes, so the image is checked and the history says who changed it.

import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { askHidden } from './ask-hidden.js';

const LOCAL_API = 'http://localhost:3001';
const DEFAULT_LOGO = join(
  dirname(fileURLToPath(import.meta.url)),
  'seed',
  'techstore-logo.png',
);
const MAX_LOGO_BYTES = 1_000_000;
// The free API can sleep: its first answer takes about a minute
const WAIT_MS = 90_000;

if (!stdin.isTTY) {
  throw new Error('Run it in a terminal: it asks for a password.');
}

interface Answer<T> {
  status: number;
  data?: T;
  error?: { code: string; message: string };
}

async function main() {
  const file = process.argv[2] ?? DEFAULT_LOGO;
  const type = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  }[extname(file).toLowerCase()];
  if (!type) {
    throw new Error('The logo must be a PNG or JPEG file.');
  }
  const bytes = readFileSync(file);
  if (bytes.length > MAX_LOGO_BYTES) {
    throw new Error('The logo must weigh 1 MB at most.');
  }

  const lines = createInterface({ input: stdin, output: stdout });
  const typedApi = await lines.question(
    `Adresse de l'API (Entrée = ${LOCAL_API}) : `,
  );
  lines.close();
  const api = (typedApi.trim() || LOCAL_API).replace(/\/+$/, '');
  const host = new URL(api).hostname;

  console.log(
    'Collez la clé interne : une * par caractère, Ctrl+V ou clic droit.',
  );
  const typedKey = await askHidden('Clé interne (Entrée = celle du .env) : ');
  const key = typedKey.trim() || process.env.INTERNAL_API_KEY || '';
  console.log(`${key.length} caractères reçus.`);

  const call = async <T>(
    method: string,
    path: string,
    body?: unknown,
    token?: string,
  ): Promise<Answer<T>> => {
    const response = await fetch(`${api}${path}`, {
      method,
      headers: {
        'X-Internal-Key': key,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(WAIT_MS),
    });
    const payload = (await response.json().catch(() => null)) as {
      data?: T;
      error?: { code: string; message: string };
    } | null;
    return {
      status: response.status,
      data: payload?.data,
      error: payload?.error,
    };
  };

  // An unknown share link needs only the key: 410 means the key was accepted
  console.log(
    `Vérification de la clé sur ${host}, une minute au plus si l'API dort...`,
  );
  const probe = await call(
    'GET',
    `/share-links/${randomBytes(16).toString('hex')}/resolve`,
  );
  if (probe.status === 403) {
    throw new Error('Key refused: copy it again.');
  }
  if (probe.status !== 410 && probe.status !== 404) {
    throw new Error(`Unexpected answer from ${host}: ${probe.status}.`);
  }
  console.log('Clé acceptée.');

  const login = createInterface({ input: stdin, output: stdout });
  const email = (await login.question("E-mail de l'administrateur : "))
    .trim()
    .toLowerCase();
  login.close();
  const password = await askHidden('Mot de passe : ');
  console.log(`${password.length} caractères reçus.`);

  const session = await call<{ accessToken: string }>('POST', '/auth/login', {
    email,
    password,
  });
  const token = session.data?.accessToken;
  if (!token) {
    throw new Error(
      `Login refused: ${session.error?.message ?? session.status}.`,
    );
  }

  try {
    const confirm = createInterface({ input: stdin, output: stdout });
    const answer = await confirm.question(
      `Enregistrer ${file.endsWith('techstore-logo.png') ? 'le logo TechStore' : file} sur ${host} ? Tapez oui : `,
    );
    confirm.close();
    if (answer.trim().toLowerCase() !== 'oui') {
      throw new Error('Cancelled.');
    }

    const link = await call<{ uploadUrl: string; key: string }>(
      'POST',
      '/settings/logo-upload-url',
      { fileType: type, fileSize: bytes.length },
      token,
    );
    if (!link.data) {
      throw new Error(`No upload link: ${link.error?.message ?? link.status}.`);
    }
    const upload = await fetch(link.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': type },
      body: bytes,
      signal: AbortSignal.timeout(WAIT_MS),
    });
    if (!upload.ok) {
      throw new Error(`The file storage refused the file: ${upload.status}.`);
    }
    const saved = await call(
      'PUT',
      '/settings/logo',
      { key: link.data.key },
      token,
    );
    if (saved.status !== 200) {
      throw new Error(
        `Logo not saved: ${saved.error?.message ?? saved.status}.`,
      );
    }
    console.log(`Logo enregistré sur ${host}.`);
  } finally {
    await call('POST', '/auth/logout', undefined, token).catch(() => undefined);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
