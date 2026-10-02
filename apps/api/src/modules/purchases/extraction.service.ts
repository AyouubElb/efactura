import OpenAI, { BadRequestError, UnprocessableEntityError } from 'openai';
import type {
  ResponseInputContent,
  ResponseUsage,
} from 'openai/resources/responses/responses.js';
import { INSTRUCTIONS, INVOICE_SCHEMA } from './extraction.schema.js';
import {
  DocumentRefused,
  type FileType,
  type InvoiceReader,
  type Reading,
} from './invoice-reader.js';

export type Effort = 'none' | 'low' | 'medium' | 'high';

// Dollars per million tokens, from OpenAI's pricing page on 2026-09-30
const PRICES: Record<string, { input: number; cached: number; output: number }> = {
  'gpt-6-luna': { input: 0.1, cached: 0.01, output: 0.5 },
  'gpt-6.1-sol': { input: 2, cached: 0.1, output: 10 },
  'gpt-6-astra': { input: 10, cached: 1, output: 50 },
};

// The only file that talks to OpenAI: one request per document, its answer shaped by the schema
export class OpenAiReader implements InvoiceReader {
  private readonly openai: OpenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
    private readonly effort: Effort = 'low',
  ) {
    // The queue retries a failed read, not the SDK
    this.openai = new OpenAI({ apiKey, maxRetries: 0, timeout: 120_000 });
  }

  async read(file: Buffer, type: FileType): Promise<Reading> {
    const response = await this.openai.responses
      .create({
        model: this.model,
        store: false,
        reasoning: { effort: this.effort },
        input: [
          { role: 'system', content: INSTRUCTIONS },
          {
            role: 'user',
            content: [document(file, type), { type: 'input_text', text: 'Lis ce document.' }],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'facture_fournisseur',
            schema: INVOICE_SCHEMA,
            strict: true,
          },
        },
      })
      .catch((error: unknown) => {
        // OpenAI refuses the file itself, a corrupt image for one: another try gives the same answer
        if (error instanceof BadRequestError || error instanceof UnprocessableEntityError) {
          throw new DocumentRefused(
            `L'IA ne peut pas lire ce fichier : envoyez une photo plus nette ou un PDF${error.code ? ` (${error.code})` : ''}`,
          );
        }
        throw error;
      });
    const refusal = response.output
      .flatMap((item) => (item.type === 'message' ? item.content : []))
      .find((part) => part.type === 'refusal');
    if (refusal) {
      throw new DocumentRefused(refusal.refusal);
    }
    if (response.status !== 'completed') {
      throw new Error(
        `Answer ${response.status}: ${response.incomplete_details?.reason ?? 'no reason given'}`,
      );
    }
    return {
      answer: JSON.parse(response.output_text) as unknown,
      model: response.model,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      costMicroUsd: response.usage ? cost(this.model, response.usage) : null,
    };
  }
}

// A PDF goes with its text and a picture of each page; a photo in high detail for small print
function document(file: Buffer, type: FileType): ResponseInputContent {
  const data = `data:${type};base64,${file.toString('base64')}`;
  return type === 'application/pdf'
    ? { type: 'input_file', filename: 'facture.pdf', file_data: data }
    : { type: 'input_image', image_url: data, detail: 'high' };
}

// A price per million tokens is that many millionths of a dollar per token
function cost(model: string, usage: ResponseUsage): number | null {
  const price = PRICES[model];
  if (!price) {
    return null;
  }
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;
  return Math.round(
    (usage.input_tokens - cached) * price.input +
      cached * price.cached +
      usage.output_tokens * price.output,
  );
}
