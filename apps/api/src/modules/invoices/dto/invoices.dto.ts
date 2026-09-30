import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PageQueryDto } from '../../../common/validation/list-query.dto.js';
import { Trim } from '../../../common/validation/trim.js';
import {
  InvoiceStatus,
  PaymentMethod,
  SendChannel,
} from '../../../generated/prisma/client.js';
import { ActivityEntryDto } from '../../activity/dto/activity-entry.dto.js';
import {
  DeliveryDto,
  ShareLinkDto,
} from '../../documents/dto/delivery.dto.js';
import { DocumentDraftDto } from '../../documents/dto/document-draft.dto.js';
import {
  DocumentLineViewDto,
  TvaRowDto,
} from '../../documents/dto/document-line.dto.js';
import {
  ClientSnapshotDto,
  ShopSnapshotDto,
} from '../../documents/dto/snapshot.dto.js';
import { CreditNoteDetailDto } from './credit-notes.dto.js';

export class CreateInvoiceDto extends DocumentDraftDto {}

// Lines, when sent, replace the whole list
export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto, {
  skipNullProperties: false,
}) {}

export const INVOICE_FILTERS = [
  'draft',
  'sent',
  'late',
  'paid',
  'cancelled',
] as const;
export type InvoiceFilter = (typeof INVOICE_FILTERS)[number];

export class InvoiceListQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    enum: INVOICE_FILTERS,
    description: 'sent: not due yet · late: sent and past its due date',
  })
  @IsOptional()
  @IsIn(INVOICE_FILTERS)
  status?: InvoiceFilter;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;
}

export class PayInvoiceDto {
  @ApiProperty({ example: '2026-09-12' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date invalide : AAAA-MM-JJ' })
  paidOn: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.transfer })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ nullable: true, example: 'Chèque n° 0045871' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  reference?: string | null;
}

export class CancelInvoiceDto {
  @ApiProperty({ example: 'Erreur de quantité', description: 'Printed on the avoir' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason: string;

  @ApiProperty({
    enum: SendChannel,
    example: SendChannel.whatsapp,
    description: 'How the avoir reaches the client',
  })
  @IsEnum(SendChannel)
  channel: SendChannel;
}

class RefDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Cabinet Benali' })
  name: string;
}

class UserRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Youssef Idrissi' })
  fullName: string;
}

class InvoiceQuoteRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'DV-2026-0009-v2' })
  number: string;
}

class InvoiceCreditNoteRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'AV-2026-0001' })
  number: string;

  @ApiProperty({ example: 'Erreur de quantité' })
  reason: string;
}

export class InvoiceDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    nullable: true,
    example: 'FA-2026-0016',
    description: 'Empty until the invoice is sent',
  })
  number: string | null;

  @ApiProperty({ enum: InvoiceStatus })
  status: InvoiceStatus;

  @ApiProperty({ description: 'Sent, unpaid and past its due date: computed, never stored' })
  late: boolean;

  @ApiProperty({ type: RefDto, description: 'As sent, once sent' })
  client: RefDto;

  @ApiProperty({ nullable: true, example: '2026-09-03' })
  issueDate: string | null;

  @ApiProperty({ nullable: true, example: '2026-11-02' })
  dueDate: string | null;

  @ApiProperty({ example: 6490000 })
  totalHtCentimes: number;

  @ApiProperty({ example: 1298000 })
  totalTvaCentimes: number;

  @ApiProperty({ example: 7788000 })
  totalTtcCentimes: number;

  @ApiProperty({ nullable: true, example: '2026-09-12' })
  paidOn: string | null;

  @ApiProperty({ enum: PaymentMethod, nullable: true })
  paymentMethod: PaymentMethod | null;

  @ApiProperty({ enum: SendChannel, nullable: true })
  sentVia: SendChannel | null;

  @ApiProperty({ nullable: true })
  sentAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class InvoiceDetailDto extends InvoiceDto {
  @ApiProperty({ type: [DocumentLineViewDto] })
  lines: DocumentLineViewDto[];

  @ApiProperty({ type: [TvaRowDto] })
  tvaBreakdown: TvaRowDto[];

  @ApiProperty({ nullable: true })
  totalInWords: string | null;

  @ApiProperty({ nullable: true })
  notes: string | null;

  @ApiProperty({ type: ClientSnapshotDto, nullable: true })
  clientSnapshot: ClientSnapshotDto | null;

  @ApiProperty({ type: ShopSnapshotDto, nullable: true })
  shopSnapshot: ShopSnapshotDto | null;

  @ApiProperty({ type: InvoiceQuoteRefDto, nullable: true, description: 'The quote it was made from' })
  quote: InvoiceQuoteRefDto | null;

  @ApiProperty({ type: InvoiceCreditNoteRefDto, nullable: true, description: 'The avoir that cancels it' })
  creditNote: InvoiceCreditNoteRefDto | null;

  @ApiProperty({ nullable: true, example: 'Chèque n° 0045871' })
  paymentReference: string | null;

  @ApiProperty({ type: UserRefDto, nullable: true })
  paidRecordedBy: UserRefDto | null;

  @ApiProperty({ description: 'Sent: false while its PDF waits to be made' })
  pdfReady: boolean;

  @ApiProperty({ type: ShareLinkDto, nullable: true })
  shareLink: ShareLinkDto | null;

  @ApiProperty({ type: UserRefDto })
  createdBy: UserRefDto;

  @ApiProperty({ type: UserRefDto, nullable: true })
  sentBy: UserRefDto | null;

  @ApiProperty({ type: [ActivityEntryDto] })
  history: ActivityEntryDto[];
}

export class InvoiceDeliveredDto {
  @ApiProperty({ type: InvoiceDetailDto })
  invoice: InvoiceDetailDto;

  @ApiProperty({ type: DeliveryDto })
  delivery: DeliveryDto;
}

export class InvoiceCancelledDto {
  @ApiProperty({ type: InvoiceDetailDto })
  invoice: InvoiceDetailDto;

  @ApiProperty({ type: CreditNoteDetailDto })
  creditNote: CreditNoteDetailDto;

  @ApiProperty({ type: DeliveryDto, description: "The avoir's delivery" })
  delivery: DeliveryDto;
}
