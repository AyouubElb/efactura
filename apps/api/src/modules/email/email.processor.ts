import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { linkToken } from '../../common/auth/token-hash.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { ActivityService } from '../activity/activity.service.js';
import { DeliveryService } from '../documents/delivery.service.js';
import { EmailService } from './email.service.js';
import {
  DOCUMENT_JOB,
  EMAIL_QUEUE,
  EmailQueue,
  logRedisError,
  type DocumentJob,
  type EmailJob,
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
    private readonly delivery: DeliveryService,
    private readonly activity: ActivityService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    super();
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/$/, '');
    this.secret = config.get('LINK_SECRET', { infer: true });
  }

  // One queue, two kinds of emails
  process(job: Job<EmailJob>): Promise<string> {
    if (job.name !== DOCUMENT_JOB) {
      return this.sendOneTimeLink(job.data as OneTimeLinkJob);
    }
    // Reached Redis after the person was told it failed: "Renvoyer" is theirs to click
    if (this.emailQueue.wasAbandoned(job.id)) {
      return Promise.resolve('skipped');
    }
    return this.sendDocument(job.data as DocumentJob);
  }

  private async sendOneTimeLink({ tokenId }: OneTimeLinkJob): Promise<string> {
    // Read at send time: the link may have been replaced, used, given up or turned off since
    const token = await this.prisma.oneTimeToken.findUnique({
      where: { id: tokenId },
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

  // The PDF is made here if it doesn't exist yet: a failed try is retried with the email
  private async sendDocument(job: DocumentJob): Promise<string> {
    const email = await this.delivery.email(job.type, job.id);
    await this.email.send(email);
    // The email is out: a failed line must not make the job send it twice
    try {
      await this.activity.record(
        this.prisma,
        null,
        'email.sent',
        { type: job.type, id: job.id },
        `email envoyé à ${email.to}`,
      );
    } catch (error) {
      this.logger.error(`Email for ${job.type} ${job.id} sent, history line not written`, error);
    }
    return 'sent';
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<EmailJob> | undefined, error: Error) {
    if (!job) {
      return;
    }
    if (job.attemptsMade < (job.opts.attempts ?? 1)) {
      this.logger.warn(
        `Email try ${job.attemptsMade} failed: ${error.message}`,
      );
      return;
    }
    if (job.name === DOCUMENT_JOB) {
      await this.emailQueue.recordDocumentFailure(
        job.data as DocumentJob,
        error,
        job.attemptsMade,
      );
      return;
    }
    await this.emailQueue.recordFailure(
      (job.data as OneTimeLinkJob).tokenId,
      error,
      job.attemptsMade,
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    logRedisError(this.logger, error);
  }
}
