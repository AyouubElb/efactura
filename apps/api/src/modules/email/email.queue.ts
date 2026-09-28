import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';
import { ONE_TIME_LINK } from './one-time-link.js';

export const EMAIL_QUEUE = 'email';
export const ONE_TIME_LINK_JOB = 'one-time-link';

export interface OneTimeLinkJob {
  tokenId: string;
}

const ADD_TIMEOUT_MS = 5_000;
const REDIS_LOG_QUIET_MS = 60_000;

@Injectable()
export class EmailQueue {
  private readonly logger = new Logger(EmailQueue.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly queue: Queue<OneTimeLinkJob>,
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {
    queue.on('error', (error) => logRedisError(this.logger, error));
  }

  // Call it after the token is committed; the job id stops a double send
  async sendOneTimeLink(tokenId: string): Promise<void> {
    try {
      await withTimeout(
        this.queue.add(ONE_TIME_LINK_JOB, { tokenId }, { jobId: tokenId }),
        ADD_TIMEOUT_MS,
      );
    } catch (error) {
      await this.recordFailure(tokenId, error, 0);
      throw new ServiceUnavailableException({
        code: 'EMAIL_NOT_QUEUED',
        message: "Enregistré, mais l'email n'a pas pu partir. Réessayez.",
      });
    }
  }

  // Final: a job that still reaches Redis later finds the token failed and sends nothing
  async recordFailure(tokenId: string, error: unknown, attempts: number) {
    const reason = error instanceof Error ? error.message : String(error);
    this.logger.error(`Email for token ${tokenId} not sent: ${reason}`);
    try {
      await this.prisma.$transaction(async (tx) => {
        const token = await tx.oneTimeToken.update({
          where: { id: tokenId },
          data: { emailFailedAt: new Date() },
          select: { userId: true, purpose: true },
        });
        await this.activity.record(
          tx,
          null,
          'email.failed',
          { type: 'user', id: token.userId },
          `email non envoyé : ${ONE_TIME_LINK[token.purpose].label}`,
          { error: reason, attempts },
        );
      });
    } catch (recordError) {
      this.logger.error('Could not record the failed email', recordError);
    }
  }
}

// ioredis retries every second while Redis is down: one line, then one a minute
let lastRedisLog = { text: '', at: 0 };

export function logRedisError(logger: Logger, error: Error) {
  // A refused connection is an AggregateError: empty message, the reason in its code
  const code = (error as NodeJS.ErrnoException).code;
  const text = `Redis: ${error.message || code || error.name}`;
  const now = Date.now();
  if (
    text === lastRedisLog.text &&
    now - lastRedisLog.at < REDIS_LOG_QUIET_MS
  ) {
    return;
  }
  lastRedisLog = { text, at: now };
  logger.warn(text);
}

// ioredis waits for Redis forever by default; a request must not
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`No answer in ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
