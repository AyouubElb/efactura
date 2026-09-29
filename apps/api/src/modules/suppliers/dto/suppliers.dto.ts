import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsIce } from '../../../common/validation/is-ice.js';
import { Trim } from '../../../common/validation/trim.js';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Atlas Distribution SARL' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    nullable: true,
    example: '001234567000089',
    description: 'How the supplier is recognised; unique',
  })
  @IsOptional()
  @Trim()
  @IsIce()
  ice?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Identifiant fiscal' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(20)
  ifNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
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

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Trim()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto, {
  skipNullProperties: false,
}) {}

export class SupplierDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Atlas Distribution SARL' })
  name: string;

  @ApiProperty({ nullable: true, example: '001234567000089' })
  ice: string | null;

  @ApiProperty({ nullable: true })
  ifNumber: string | null;

  @ApiProperty({ nullable: true })
  address: string | null;

  @ApiProperty({ nullable: true })
  city: string | null;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: true })
  archivedAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}
