import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import { PageQueryDto } from '../../../common/validation/list-query.dto.js';
import {
  InvoiceStatus,
  QuoteStatus,
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

export class CreateQuoteDto extends DocumentDraftDto {}

// Lines, when sent, replace the whole list
export class UpdateQuoteDto extends PartialType(CreateQuoteDto, {
  skipNullProperties: false,
}) {}

export const QUOTE_FILTERS = [
  'draft',
  'sent',
  'expired',
  'accepted',
  'refused',
  'replaced',
] as const;
export type QuoteFilter = (typeof QUOTE_FILTERS)[number];

export class QuoteListQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    enum: QUOTE_FILTERS,
    description: 'sent: still valid · expired: sent and past its date',
  })
  @IsOptional()
  @IsIn(QUOTE_FILTERS)
  status?: QuoteFilter;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;
}

export class ExtendQuoteDto {
  @ApiProperty({ example: '2026-10-15' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date invalide : AAAA-MM-JJ' })
  validUntil: string;
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

class QuoteVersionRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true, example: 'DV-2026-0009' })
  number: string | null;

  @ApiProperty({ enum: QuoteStatus })
  status: QuoteStatus;
}

class QuoteInvoiceRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true, example: 'FA-2026-0016', description: 'Empty while a draft' })
  number: string | null;

  @ApiProperty({ enum: InvoiceStatus })
  status: InvoiceStatus;
}

export class QuoteDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    nullable: true,
    example: 'DV-2026-0009-v2',
    description: 'Empty until the first version is sent',
  })
  number: string | null;

  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty({ enum: QuoteStatus })
  status: QuoteStatus;

  @ApiProperty({ description: 'Sent and past its validity date: computed, never stored' })
  expired: boolean;

  @ApiProperty({ type: RefDto, description: 'As sent, once sent' })
  client: RefDto;

  @ApiProperty({ nullable: true, example: '2026-09-03' })
  issueDate: string | null;

  @ApiProperty({ nullable: true, example: '2026-10-03' })
  validUntil: string | null;

  @ApiProperty({ example: 6490000 })
  totalHtCentimes: number;

  @ApiProperty({ example: 1298000 })
  totalTvaCentimes: number;

  @ApiProperty({ example: 7788000 })
  totalTtcCentimes: number;

  @ApiProperty({ enum: SendChannel, nullable: true })
  sentVia: SendChannel | null;

  @ApiProperty({ nullable: true })
  sentAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class QuoteDetailDto extends QuoteDto {
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

  @ApiProperty({ type: QuoteVersionRefDto, nullable: true })
  previousVersion: QuoteVersionRefDto | null;

  @ApiProperty({ type: QuoteVersionRefDto, nullable: true })
  nextVersion: QuoteVersionRefDto | null;

  @ApiProperty({ type: QuoteInvoiceRefDto, nullable: true, description: 'The invoice made from this quote' })
  invoice: QuoteInvoiceRefDto | null;

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

export class QuoteDeliveredDto {
  @ApiProperty({ type: QuoteDetailDto })
  quote: QuoteDetailDto;

  @ApiProperty({ type: DeliveryDto })
  delivery: DeliveryDto;
}
