import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '../../../generated/prisma/client.js';

export class AmountDto {
  @ApiProperty({ example: 7788000 })
  totalTtcCentimes: number;

  @ApiProperty({ example: 3, description: 'How many documents make it' })
  count: number;
}

// "Collected" means marked paid by a person: the app never talks to the bank
export class DashboardTotalsDto {
  @ApiProperty({ example: '2026-09', description: 'The month in Morocco' })
  month: string;

  @ApiProperty({ type: AmountDto, description: 'Invoices marked paid this month' })
  collectedThisMonth: AmountDto;

  @ApiProperty({ type: AmountDto, description: 'Sent, unpaid, not due yet' })
  waiting: AmountDto;

  @ApiProperty({ type: AmountDto, description: 'Sent, unpaid, past their due date' })
  late: AmountDto;

  @ApiProperty({ type: AmountDto, description: 'Confirmed supplier invoices dated this month' })
  purchasesThisMonth: AmountDto;
}

export const RECENT_STATUSES = [
  'draft',
  'sent',
  'expired',
  'accepted',
  'refused',
  'replaced',
  'late',
  'paid',
  'cancelled',
  'issued',
] as const;
export type RecentStatus = (typeof RECENT_STATUSES)[number];

export class RecentDocumentDto {
  @ApiProperty({ enum: DocumentType })
  type: DocumentType;

  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true, example: 'FA-2026-0016', description: 'Empty for a first draft' })
  number: string | null;

  @ApiProperty({
    enum: RECENT_STATUSES,
    description: 'As shown: expired and late are computed now; an avoir is issued',
  })
  status: RecentStatus;

  @ApiProperty({ example: 'Cabinet Benali' })
  client: string;

  @ApiProperty({ example: 7788000, description: 'Negative for an avoir' })
  totalTtcCentimes: number;

  @ApiProperty({ description: 'The last change: created, edited, sent, paid…' })
  changedAt: Date;
}
