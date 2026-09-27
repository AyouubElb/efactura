import { ApiProperty } from '@nestjs/swagger';

class ActivityUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Karim Alaoui' })
  fullName: string;
}

export class ActivityEntryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'invoice.paid' })
  action: string;

  @ApiProperty({ example: 'invoice' })
  entityType: string;

  @ApiProperty()
  entityId: string;

  @ApiProperty({ example: 'a marqué la facture FA-2026-0016 payée' })
  summary: string;

  @ApiProperty({ type: Object, nullable: true })
  details: unknown;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: ActivityUserDto, nullable: true })
  user: ActivityUserDto | null;
}
