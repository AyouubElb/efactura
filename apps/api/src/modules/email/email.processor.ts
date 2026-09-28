import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { linkToken } from '../../common/auth/token-hash.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { EmailService } from './email.service.js';
import {
  EMAIL_QUEUE,
  EmailQueue,
  logRedisError,
  type OneTimeLinkJob,
} from './email.queue.js';
import { ONE_TIME_LINK } from './one-time-link.js';
import { invitationEmail, passwordResetEmail } from './templates.js';

// One email at a time; a failed job comes back 30 s, 1, 2, then 4 min later.
// Idle, it asks Redis once a minute: a new job still wakes it at once.
@Processor(EMAIL_QUEUE, { drainDelay: 60, stalledInterval: 300_000 })
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly appUrl: string;
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly emailQueue: EmailQueue,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    super();
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/$/, '');
    this.secret = config.get('LINK_SECRET', { infer: true });
  }

  async process(job: Job<OneTimeLinkJob>): Promise<string> {
    // Read at send time: the link may have been replaced, used, given up or turned off since
    const token = await this.prisma.oneTimeToken.findUnique({
      where: { id: job.data.tokenId },
      include: {
        user: { select: { email: true, fullName: true, status: true } },
      },
    });
    if (
      !token ||
      token.usedAt ||
      token.emailFailedAt ||
      token.expiresAt <= new Date() ||
      token.user.status !== ONE_TIME_LINK[token.purpose].status
    ) {
      return 'skipped';
    }

    const link = `${this.appUrl}/${ONE_TIME_LINK[token.purpose].path}/${linkToken(this.secret, token.id)}`;
    const content =
      token.purpose === 'invite'
        ? invitationEmail(token.user.fullName, link)
        : passwordResetEmail(token.user.fullName, link);
    await this.email.send({ to: token.user.email, ...content });

    await this.prisma.oneTimeToken.update({
      where: { id: token.id },
      data: { emailSentAt: new Date() },
    });
    return 'sent';
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<OneTimeLinkJob> | undefined, error: Error) {
    if (!job) {
      return;
    }
    if (job.attemptsMade < (job.opts.attempts ?? 1)) {
      this.logger.warn(
        `Email try ${job.attemptsMade} failed: ${error.message}`,
      );
      return;
    }
    await this.emailQueue.recordFailure(
      job.data.tokenId,
      error,
      job.attemptsMade,
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    logRedisError(this.logger, error);
  }
}
