// Reads every sample invoice with each model and scores the answers against the true readings

import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { InvoiceReading } from '../../src/modules/purchases/extraction.schema.js';
import {
  OpenAiReader,
  type Effort,
} from '../../src/modules/purchases/extraction.service.js';
import type { FileType, Reading } from '../../src/modules/purchases/invoice-reader.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLES = join(HERE, 'sample-invoices');
const ANSWERS = join(HERE, 'ai-answers');
const DH_PER_DOLLAR = 10;
const AT_ONCE = 3;
const DEFAULT_RUNS = ['gpt-6-luna@none', 'gpt-6-luna@low', 'gpt-6.1-sol@low', 'gpt-6-astra@low'];

const TYPES: Record<string, FileType> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

interface Score {
  right: number;
  total: number;
  mistakes: string[];
}

interface Result {
  file: string;
  ms: number;
  reading?: Reading;
  score?: Score;
  error?: string;
}

const normalize = (text: string | null) =>
  text === null
    ? null
    : text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
const withoutLegalForm = (text: string | null) =>
  normalize(text)?.replace(/\b(sarl|sarlau|sa|ste|societe)\b/g, '').replace(/\s+/g, ' ').trim() ?? null;
const digits = (text: string | null) => text?.replace(/\D/g, '') ?? null;
const sameNumber = (a: string | null, b: string | null) =>
  a === null || b === null ? a === b : Number(a) === Number(b);

function scoreOf(got: InvoiceReading, want: InvoiceReading): Score {
  const score: Score = { right: 0, total: 0, mistakes: [] };
  const check = (field: string, ok: boolean, value: unknown, expected: unknown) => {
    score.total += 1;
    if (ok) {
      score.right += 1;
    } else {
      score.mistakes.push(`${field}: ${JSON.stringify(value)} instead of ${JSON.stringify(expected)}`);
    }
  };
  check('type', got.document_type === want.document_type, got.document_type, want.document_type);
  check('supplier', withoutLegalForm(got.supplier.name) === withoutLegalForm(want.supplier.name), got.supplier.name, want.supplier.name);
  check('ICE', digits(got.supplier.ice) === digits(want.supplier.ice), got.supplier.ice, want.supplier.ice);
  check('IF', digits(got.supplier.if_number) === digits(want.supplier.if_number), got.supplier.if_number, want.supplier.if_number);
  check('number', normalize(got.invoice_number) === normalize(want.invoice_number), got.invoice_number, want.invoice_number);
  check('date', got.invoice_date === want.invoice_date, got.invoice_date, want.invoice_date);
  check('TTC prices', got.prices_include_tax === want.prices_include_tax, got.prices_include_tax, want.prices_include_tax);
  for (const key of ['ht', 'tva', 'ttc'] as const) {
    check(`total ${key}`, sameNumber(got.totals[key], want.totals[key]), got.totals[key], want.totals[key]);
  }
  const count = Math.max(got.lines.length, want.lines.length);
  for (let index = 0; index < count; index += 1) {
    const line = got.lines[index];
    const expected = want.lines[index];
    const name = `line ${index + 1}`;
    if (!expected) {
      check(name, false, line?.label, 'no such line');
      continue;
    }
    if (!line) {
      score.total += 6;
      score.mistakes.push(`${name}: missing`);
      continue;
    }
    check(`${name} label`, normalize(line.label) === normalize(expected.label), line.label, expected.label);
    check(`${name} reference`, normalize(line.reference) === normalize(expected.reference), line.reference, expected.reference);
    check(`${name} quantity`, sameNumber(line.quantity, expected.quantity), line.quantity, expected.quantity);
    check(`${name} price`, sameNumber(line.unit_price, expected.unit_price), line.unit_price, expected.unit_price);
    check(`${name} rate`, sameNumber(line.tva_rate, expected.tva_rate), line.tva_rate, expected.tva_rate);
    check(`${name} total`, sameNumber(line.line_total, expected.line_total), line.line_total, expected.line_total);
  }
  return score;
}

async function inTurns<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await work(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

// A busy rate limit gets one more try after a pause
async function readOnce(reader: OpenAiReader, bytes: Buffer, type: FileType): Promise<Reading> {
  try {
    return await reader.read(bytes, type);
  } catch (error) {
    if ((error as { status?: number }).status !== 429) {
      throw error;
    }
    await pause(20_000);
    return reader.read(bytes, type);
  }
}

async function main() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error('OPENAI_API_KEY is missing from apps/api/.env');
  }
  const runs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_RUNS;
  const files = readdirSync(SAMPLES)
    .filter((name) => TYPES[extname(name).toLowerCase()])
    .sort();
  const truths = new Map<string, InvoiceReading>();
  for (const name of readdirSync(SAMPLES).filter((name) => name.endsWith('.json'))) {
    truths.set(name.replace('.json', ''), JSON.parse(readFileSync(join(SAMPLES, name), 'utf8')) as InvoiceReading);
  }
  console.log(`Key found, ${key.length} characters. ${files.length} documents, ${runs.length} runs.\n`);

  const report: string[] = ['| Run | Fields right | Perfect | Avg time | Cost | Per document |', '| --- | --- | --- | --- | --- | --- |'];
  const details: string[] = [];
  for (const run of runs) {
    const [model, effort = 'low'] = run.split('@');
    const reader = new OpenAiReader(key, model, effort as Effort);
    const folder = join(ANSWERS, run);
    mkdirSync(folder, { recursive: true });
    const results = await inTurns(files, AT_ONCE, async (file): Promise<Result> => {
      const bytes = readFileSync(join(SAMPLES, file));
      const started = Date.now();
      try {
        const reading = await readOnce(reader, bytes, TYPES[extname(file).toLowerCase()]);
        const ms = Date.now() - started;
        const sha256 = createHash('sha256').update(bytes).digest('hex');
        writeFileSync(join(folder, `${file}.json`), `${JSON.stringify({ file, sha256, ms, ...reading }, null, 2)}\n`);
        const truth = truths.get(file.split('.')[0]);
        return { file, ms, reading, score: truth ? scoreOf(reading.answer as InvoiceReading, truth) : undefined };
      } catch (error) {
        return { file, ms: Date.now() - started, error: messageOf(error) };
      }
    });

    const scored = results.filter((result) => result.score);
    const right = scored.reduce((sum, result) => sum + (result.score?.right ?? 0), 0);
    const total = scored.reduce((sum, result) => sum + (result.score?.total ?? 0), 0);
    const perfect = scored.filter((result) => result.score?.mistakes.length === 0).length;
    const costMicro = results.reduce((sum, result) => sum + (result.reading?.costMicroUsd ?? 0), 0);
    const read = results.filter((result) => result.reading);
    const averageMs = read.reduce((sum, result) => sum + result.ms, 0) / Math.max(read.length, 1);
    const perDocument = costMicro / Math.max(read.length, 1);
    const row = `| ${run} | ${total ? ((100 * right) / total).toFixed(1) : '—'} % | ${perfect}/${scored.length} | ${(averageMs / 1000).toFixed(1)} s | $${(costMicro / 1e6).toFixed(4)} | $${(perDocument / 1e6).toFixed(5)} ≈ ${((perDocument / 1e6) * DH_PER_DOLLAR).toFixed(3)} DH |`;
    report.push(row);
    console.log(row);
    details.push(`\n### ${run}\n`);
    for (const result of results) {
      if (result.error) {
        details.push(`- **${result.file}**: failed, ${result.error}`);
      } else if (result.score?.mistakes.length) {
        details.push(`- **${result.file}**: ${result.score.mistakes.join(' · ')}`);
      }
    }
  }
  const summary = `# AI test, ${new Date().toISOString().slice(0, 10)}\n\n${report.join('\n')}\n\n## Mistakes\n${details.join('\n')}\n`;
  writeFileSync(join(ANSWERS, 'summary.md'), summary);
  console.log(`\nMistakes per document: prisma/seed/ai-answers/summary.md`);
}

await main();
