import { randomUUID } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { logRedisError, withTimeout } from '../email/email.queue.js';

export const PURCHASES_QUEUE = 'purchases';
export const READ_JOB = 'read';

// Only the purchase's id: the file is in storage, the data in PostgreSQL
export interface ReadJob {
  purchaseId: string;
}

// Three tries: the second after 1 minute, the third after 5 more
const RETRY_DELAYS_MS = [60_000, 300_000];

export function retryDelay(attemptsMade: number): number {
  return RETRY_DELAYS_MS[Math.min(attemptsMade, RETRY_DELAYS_MS.length) - 1];
}

const ADD_TIMEOUT_MS = 5_000;

@Injectable()
export class PurchasesQueue {
  private readonly logger = new Logger(PurchasesQueue.name);

  constructor(
    @InjectQueue(PURCHASES_QUEUE) private readonly queue: Queue<ReadJob>,
  ) {
    queue.on('error', (error) => logRedisError(this.logger, error));
  }

  // A new job id each time: "Relancer" reads again on purpose
  async read(purchaseId: string): Promise<void> {
    await withTimeout(
      this.queue.add(READ_JOB, { purchaseId }, { jobId: randomUUID() }),
      ADD_TIMEOUT_MS,
    );
  }
}
