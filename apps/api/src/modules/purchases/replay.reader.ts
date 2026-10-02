import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DocumentRefused,
  type InvoiceReader,
  type Reading,
} from './invoice-reader.js';

interface SavedAnswer {
  sha256: string;
  model: string;
  answer: unknown;
}

// On the PC only: the answer OpenAI gave earlier for the same file, found by its fingerprint
export class ReplayReader implements InvoiceReader {
  private readonly answers = new Map<string, SavedAnswer>();

  constructor(folder: string) {
    for (const name of readdirSync(folder).filter((name) => name.endsWith('.json'))) {
      const saved = JSON.parse(readFileSync(join(folder, name), 'utf8')) as SavedAnswer;
      this.answers.set(saved.sha256, saved);
    }
  }

  read(file: Buffer): Promise<Reading> {
    const saved = this.answers.get(createHash('sha256').update(file).digest('hex'));
    if (!saved) {
      return Promise.reject(
        new DocumentRefused('Aucune réponse enregistrée pour ce fichier : lisez-le avec INVOICE_READER=openai'),
      );
    }
    return Promise.resolve({
      answer: saved.answer,
      model: `${saved.model} replay`,
      inputTokens: 0,
      outputTokens: 0,
      costMicroUsd: 0,
    });
  }
}
