import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../../common/validation/trim.js';

// 10 million DH: its TTC still fits an Int
export const MAX_PRICE_CENTIMES = 1_000_000_000;

export class CreateProductDto {
  @ApiProperty({ example: 'Samsung Galaxy A55 128 Go' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ nullable: true, example: 'SM-A556E' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(50)
  reference?: string | null;

  @ApiPropertyOptional({ default: 'pièce' })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ example: 357500, description: 'Selling price before tax' })
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_CENTIMES)
  priceHtCentimes: number;

  @ApiProperty({ example: 2000, description: "One of the settings' rates" })
  @IsInt()
  @Min(0)
  @Max(10_000)
  tvaRateBp: number;
}

// Every field optional, but null is still checked: { name: null } is refused
export class UpdateProductDto extends PartialType(CreateProductDto, {
  skipNullProperties: false,
}) {}

export class SupplierRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Atlas Distribution SARL' })
  name: string;
}

export class ProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Samsung Galaxy A55 128 Go' })
  name: string;

  @ApiProperty({ nullable: true, example: 'SM-A556E' })
  reference: string | null;

  @ApiProperty({ example: 'pièce' })
  unit: string;

  @ApiProperty({ example: 357500 })
  priceHtCentimes: number;

  @ApiProperty({ example: 2000 })
  tvaRateBp: number;

  @ApiProperty({ example: 429000, description: 'Computed, never stored' })
  priceTtcCentimes: number;

  @ApiProperty({ nullable: true, example: 290000 })
  lastCostHtCentimes: number | null;

  @ApiProperty({ nullable: true })
  lastCostAt: Date | null;

  @ApiProperty({ type: SupplierRefDto, nullable: true })
  lastSupplier: SupplierRefDto | null;

  @ApiProperty({
    nullable: true,
    example: 67500,
    description: 'Price HT − last cost; empty until a first purchase',
  })
  earningHtCentimes: number | null;

  @ApiProperty({ nullable: true })
  archivedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
