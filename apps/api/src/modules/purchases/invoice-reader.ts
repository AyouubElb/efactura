// What the purchases code asks for: a reader, without knowing whether it is OpenAI or a replay

export const FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export type FileType = (typeof FILE_TYPES)[number];

export interface Reading {
  // The AI's answer, untouched: the purchase's proposition
  answer: unknown;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costMicroUsd: number | null;
}

export interface InvoiceReader {
  read(file: Buffer, type: FileType): Promise<Reading>;
}

export const INVOICE_READER = Symbol('INVOICE_READER');

// Trying again gives the same answer: the read fails at once
export class DocumentRefused extends Error {}
