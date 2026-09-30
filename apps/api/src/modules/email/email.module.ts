import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { EMAIL_QUEUE, EmailQueue } from './email.queue.js';
import { EmailService } from './email.service.js';

// The sender and the queue: every module may use them, and they use no module back
@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: true,
        // Redis Cloud's free plan holds 30 MB
        removeOnFail: 100,
      },
    }),
  ],
  providers: [EmailService, EmailQueue],
  exports: [EmailService, EmailQueue],
})
export class EmailModule {}
