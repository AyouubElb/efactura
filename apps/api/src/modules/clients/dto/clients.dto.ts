import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsIce } from '../../../common/validation/is-ice.js';
import { Trim } from '../../../common/validation/trim.js';
import { ClientType } from '../../../generated/prisma/client.js';

export class CreateClientDto {
  @ApiProperty({ enum: Object.values(ClientType) })
  @IsEnum(ClientType)
  type: ClientType;

  @ApiProperty({ example: 'Cabinet Benali' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    nullable: true,
    example: '001525878000045',
    description: 'Required for a company; cleared for an individual',
  })
  @IsOptional()
  @Trim()
  @IsIce()
  ice?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '45, rue Example, Maârif' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  address?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Casablanca' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'contact@benali.example' })
  @IsOptional()
  @Trim()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '+212 6 12 34 56 78' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 60,
    description: "Law 69-21: 120 at most. Empty: the settings' default",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  paymentDays?: number | null;
}

export class UpdateClientDto extends PartialType(CreateClientDto, {
  skipNullProperties: false,
}) {}

export class ClientDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: Object.values(ClientType) })
  type: ClientType;

  @ApiProperty({ example: 'Cabinet Benali' })
  name: string;

  @ApiProperty({ nullable: true, example: '001525878000045' })
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

  @ApiProperty({ nullable: true })
  archivedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
