import { ApiProperty } from '@nestjs/swagger';
import { ClientType } from '../../../generated/prisma/client.js';

// The client as it was when the document was sent
export class ClientSnapshotDto {
  @ApiProperty({ enum: ClientType })
  type: ClientType;

  @ApiProperty({ example: 'Cabinet Benali' })
  name: string;

  @ApiProperty({ nullable: true, example: '003456789000045' })
  ice: string | null;

  @ApiProperty({ nullable: true })
  address: string | null;

  @ApiProperty({ nullable: true })
  city: string | null;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty({ example: 60 })
  paymentDays: number;
}

// The shop's legal identity as it was when the document was sent
export class ShopSnapshotDto {
  @ApiProperty({ example: 'TechStore Maarif SARL' })
  legalName: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  city: string;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ example: '009876543000021' })
  ice: string;

  @ApiProperty()
  ifNumber: string;

  @ApiProperty()
  tpNumber: string;

  @ApiProperty()
  rcNumber: string;

  @ApiProperty()
  rcCity: string;

  @ApiProperty({ nullable: true })
  bankName: string | null;

  @ApiProperty({ nullable: true })
  rib: string | null;

  @ApiProperty({ nullable: true, description: 'The logo of the send day' })
  logoKey: string | null;
}
