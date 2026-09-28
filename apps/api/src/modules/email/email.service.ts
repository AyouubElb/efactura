import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { EnvironmentVariables } from '../../config/env.validation.js';

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// The only file that talks to the SMTP server
@Injectable()
export class EmailService implements OnModuleDestroy {
  private readonly transport;
  private readonly from: string;
  private readonly redirectTo?: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.transport = createTransport({
      url: config.get('SMTP_URL', { infer: true }),
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    this.from = config.get('EMAIL_FROM', { infer: true });
    this.redirectTo = config.get('EMAIL_REDIRECT_TO', { infer: true });
  }

  async send(email: Email): Promise<void> {
    const to = this.redirectTo ?? email.to;
    const subject = this.redirectTo
      ? `[pour ${email.to}] ${email.subject}`
      : email.subject;
    await this.transport.sendMail({
      from: this.from,
      to,
      subject,
      text: email.text,
      html: email.html,
    });
  }

  onModuleDestroy() {
    this.transport.close();
  }
}
