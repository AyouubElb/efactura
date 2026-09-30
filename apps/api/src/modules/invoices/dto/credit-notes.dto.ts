import { ApiProperty } from '@nestjs/swagger';
import { SendChannel } from '../../../generated/prisma/client.js';
import { ActivityEntryDto } from '../../activity/dto/activity-entry.dto.js';
import {
  DeliveryDto,
  ShareLinkDto,
} from '../../documents/dto/delivery.dto.js';
import {
  DocumentLineViewDto,
  TvaRowDto,
} from '../../documents/dto/document-line.dto.js';
import {
  ClientSnapshotDto,
  ShopSnapshotDto,
} from '../../documents/dto/snapshot.dto.js';

class CancelledInvoiceRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'FA-2026-0016' })
  number: string;
}

class ClientRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Cabinet Benali', description: 'As on the invoice' })
  name: string;
}

class UserRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Youssef Idrissi' })
  fullName: string;
}

// A full avoir: every amount is the invoice's, made negative
export class CreditNoteDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'AV-2026-0001' })
  number: string;

  @ApiProperty({ type: CancelledInvoiceRefDto })
  invoice: CancelledInvoiceRefDto;

  @ApiProperty({ type: ClientRefDto })
  client: ClientRefDto;

  @ApiProperty({ example: 'Erreur de quantité' })
  reason: string;

  @ApiProperty({ example: '2026-09-20' })
  issueDate: string;

  @ApiProperty({ example: -6490000 })
  totalHtCentimes: number;

  @ApiProperty({ example: -1298000 })
  totalTvaCentimes: number;

  @ApiProperty({ example: -7788000 })
  totalTtcCentimes: number;

  @ApiProperty({ example: 'soixante-dix-sept mille huit cent quatre-vingts dirhams' })
  totalInWords: string;

  @ApiProperty({ type: [DocumentLineViewDto], description: "The invoice's lines, amounts negative" })
  lines: DocumentLineViewDto[];

  @ApiProperty({ type: [TvaRowDto] })
  tvaBreakdown: TvaRowDto[];

  @ApiProperty({ type: ClientSnapshotDto })
  clientSnapshot: ClientSnapshotDto;

  @ApiProperty({ type: ShopSnapshotDto })
  shopSnapshot: ShopSnapshotDto;

  @ApiProperty({ enum: SendChannel, nullable: true })
  sentVia: SendChannel | null;

  @ApiProperty({ description: 'False while its PDF waits to be made' })
  pdfReady: boolean;

  @ApiProperty({ type: ShareLinkDto, nullable: true })
  shareLink: ShareLinkDto | null;

  @ApiProperty({ type: UserRefDto })
  createdBy: UserRefDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: [ActivityEntryDto] })
  history: ActivityEntryDto[];
}

export class CreditNoteDeliveredDto {
  @ApiProperty({ type: CreditNoteDetailDto })
  creditNote: CreditNoteDetailDto;

  @ApiProperty({ type: DeliveryDto })
  delivery: DeliveryDto;
}
