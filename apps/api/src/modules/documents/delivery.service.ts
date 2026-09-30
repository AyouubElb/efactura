import { formatDate, formatMoney } from '@efactura/shared';
import {
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  DocumentType,
  SendChannel,
} from '../../generated/prisma/client.js';
import { EmailQueue } from '../email/email.queue.js';
import type { Email } from '../email/email.service.js';
import { documentEmail } from '../email/templates.js';
import { DocumentFilesService } from './document-files.service.js';
import type { DeliveryDto } from './dto/delivery.dto.js';
import { displayNumber, isoDay } from './numbers.js';
import { ShareLinksService } from './share-links.service.js';
import type { ShopSnapshot } from './snapshots.js';
import { whatsappUrl } from './whatsapp.js';

// What every channel needs; the address and phone come from today's client card
interface Recipient {
  kind: DocumentType;
  number: string;
  totalTtcCentimes: number;
  validUntil: string | null;
  dueDate: string | null;
  // An avoir names the invoice it cancels
  cancels: string | null;
  shop: ShopSnapshot;
  email: string | null;
  phone: string | null;
}

const CONTACT = { select: { email: true, phone: true } } as const;

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: DocumentFilesService,
    private readonly shareLinks: ShareLinksService,
    private readonly emailQueue: EmailQueue,
  ) {}

  // Checked before a number is taken: an email needs an address
  async assertCanDeliver(
    kind: DocumentType,
    id: string,
    channel: SendChannel,
  ): Promise<void> {
    if (channel !== 'email') {
      return;
    }
    const { email } = await this.clientContact(kind, id);
    if (!email) {
      throw noEmail();
    }
  }

  // After the commit, and as often as needed: the number never changes
  async deliver(
    kind: DocumentType,
    id: string,
    channel: SendChannel,
    user: AuthUser,
  ): Promise<DeliveryDto> {
    const recipient = await this.recipient(kind, id);
    switch (channel) {
      case 'whatsapp': {
        const link = await this.shareLinks.forDocument(kind, id, user);
        return {
          channel,
          whatsappUrl: whatsappUrl(recipient.phone, whatsappText(recipient, link)),
          emailTo: null,
        };
      }
      case 'email': {
        if (!recipient.email) {
          throw noEmail();
        }
        await this.emailQueue.sendDocument(kind, id);
        return { channel, whatsappUrl: null, emailTo: recipient.email };
      }
      case 'download':
        return { channel, whatsappUrl: null, emailTo: null };
    }
  }

  // Right after a number is given: the document stays numbered whatever fails now
  async deliverAfterSend(
    kind: DocumentType,
    id: string,
    channel: SendChannel,
    user: AuthUser,
    done: string,
  ): Promise<DeliveryDto> {
    try {
      return await this.deliver(kind, id, channel, user);
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() !== 500) {
        throw error;
      }
      this.logger.error(`Delivery of ${kind} ${id} failed`, error);
      throw new ServiceUnavailableException({
        code: 'DELIVERY_FAILED',
        message: `${done}, mais la livraison a échoué : utilisez « Renvoyer »`,
      });
    }
  }

  // Built by the email worker when the email leaves, with the PDF attached
  async email(kind: DocumentType, id: string): Promise<Email> {
    const recipient = await this.recipient(kind, id);
    if (!recipient.email) {
      throw new Error("Client has no email address");
    }
    const pdf = await this.files.read(kind, id);
    const { shop } = recipient;
    return {
      to: recipient.email,
      replyTo: shop.email ?? undefined,
      ...documentEmail({
        subject: `${TITLES[kind]} ${recipient.number} — ${shop.legalName}`,
        body: emailText(recipient),
        shopName: shop.legalName,
        shopPhone: shop.phone,
      }),
      attachments: [
        { filename: pdf.fileName, content: pdf.bytes, contentType: 'application/pdf' },
      ],
    };
  }

  private async recipient(kind: DocumentType, id: string): Promise<Recipient> {
    switch (kind) {
      case 'quote': {
        const quote = await this.prisma.quote.findUniqueOrThrow({
          where: { id },
          include: { client: CONTACT },
        });
        const number = displayNumber(quote.number, quote.version);
        if (quote.status === 'draft' || !number) {
          throw notSent();
        }
        return {
          kind,
          number,
          totalTtcCentimes: quote.totalTtcCentimes,
          validUntil: isoDay(quote.validUntil),
          dueDate: null,
          cancels: null,
          shop: quote.shopSnapshot as unknown as ShopSnapshot,
          email: quote.client.email,
          phone: quote.client.phone,
        };
      }
      case 'invoice': {
        const invoice = await this.prisma.invoice.findUniqueOrThrow({
          where: { id },
          include: { client: CONTACT },
        });
        if (invoice.status === 'draft' || !invoice.number) {
          throw notSent();
        }
        return {
          kind,
          number: invoice.number,
          totalTtcCentimes: invoice.totalTtcCentimes,
          validUntil: null,
          // "To pay by" only while it is still owed
          dueDate: invoice.status === 'sent' ? isoDay(invoice.dueDate) : null,
          cancels: null,
          shop: invoice.shopSnapshot as unknown as ShopSnapshot,
          email: invoice.client.email,
          phone: invoice.client.phone,
        };
      }
      case 'credit_note': {
        const note = await this.prisma.creditNote.findUniqueOrThrow({
          where: { id },
          include: { invoice: { select: { number: true, client: CONTACT } } },
        });
        return {
          kind,
          number: note.number,
          totalTtcCentimes: note.totalTtcCentimes,
          validUntil: null,
          dueDate: null,
          cancels: note.invoice.number,
          shop: note.shopSnapshot as unknown as ShopSnapshot,
          email: note.invoice.client.email,
          phone: note.invoice.client.phone,
        };
      }
    }
  }

  private async clientContact(kind: DocumentType, id: string) {
    switch (kind) {
      case 'quote':
        return (
          await this.prisma.quote.findUniqueOrThrow({
            where: { id },
            select: { client: CONTACT },
          })
        ).client;
      case 'invoice':
        return (
          await this.prisma.invoice.findUniqueOrThrow({
            where: { id },
            select: { client: CONTACT },
          })
        ).client;
      case 'credit_note':
        return (
          await this.prisma.creditNote.findUniqueOrThrow({
            where: { id },
            select: { invoice: { select: { client: CONTACT } } },
          })
        ).invoice.client;
    }
  }
}

const TITLES: Record<DocumentType, string> = {
  quote: 'Devis',
  invoice: 'Facture',
  credit_note: 'Avoir',
};

const YOUR: Record<DocumentType, string> = {
  quote: 'votre devis',
  invoice: 'votre facture',
  credit_note: 'votre avoir',
};

function amount(recipient: Recipient): string {
  return `${formatMoney(Math.abs(recipient.totalTtcCentimes))} DH`;
}

function cancels(recipient: Recipient): string {
  return recipient.cancels ? `, qui annule la facture ${recipient.cancels}` : '';
}

function whatsappText(recipient: Recipient, link: string): string {
  return [
    'Bonjour,',
    `Veuillez trouver ${YOUR[recipient.kind]} ${recipient.number} d’un montant de ${amount(recipient)}${cancels(recipient)} :`,
    link,
    `Cordialement, ${recipient.shop.legalName}`,
  ].join('\n');
}

function emailText(recipient: Recipient): string {
  const until = recipient.validUntil
    ? `, valable jusqu’au ${formatDate(recipient.validUntil)}`
    : '';
  const due = recipient.dueDate
    ? `, à régler au plus tard le ${formatDate(recipient.dueDate)}`
    : '';
  return `Veuillez trouver ci-joint ${YOUR[recipient.kind]} ${recipient.number} d’un montant de ${amount(recipient)} TTC${until}${due}${cancels(recipient)}.`;
}

function noEmail() {
  return new ConflictException({
    code: 'CLIENT_EMAIL_MISSING',
    message: "Ce client n'a pas d'email : ajoutez-le sur sa fiche",
  });
}

function notSent() {
  return new ConflictException({
    code: 'NOT_SENT',
    message: 'Ce document est encore un brouillon',
  });
}
