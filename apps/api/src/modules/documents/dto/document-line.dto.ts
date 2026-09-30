import { LINE_QUANTITY_PATTERN } from '@efactura/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../../common/validation/trim.js';
import { MAX_PRICE_CENTIMES } from '../../products/dto/products.dto.js';

// A line as the screen sends it: never a total, the server computes them
export class DocumentLineDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Empty for a free line, such as "Installation"',
  })
  @IsOptional()
  @IsUUID()
  productId?: string | null;

  @ApiProperty({ example: 'HP 250 G10 i5 8Go/512Go' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label: string;

  @ApiPropertyOptional({
    example: 'pièce',
    description: "The product's unit when left out",
  })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ example: '10', description: 'A dot and up to 3 decimals' })
  @IsString()
  @Matches(LINE_QUANTITY_PATTERN, { message: 'Quantité invalide : 10 ou 2.5, au-dessus de 0' })
  quantity: string;

  @ApiProperty({ example: 649000 })
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_CENTIMES)
  unitPriceHtCentimes: number;

  @ApiProperty({ example: 2000, description: "One of the settings' rates" })
  @IsInt()
  @Min(0)
  @Max(10_000)
  tvaRateBp: number;
}

export class DocumentLineViewDto {
  @ApiProperty({ example: 1 })
  position: number;

  @ApiProperty({ nullable: true, description: 'Kept for reports, never read to display' })
  productId: string | null;

  @ApiProperty({ example: 'HP 250 G10 i5 8Go/512Go' })
  label: string;

  @ApiProperty({ nullable: true, example: 'HP250G10-I5-8-512' })
  reference: string | null;

  @ApiProperty({ example: 'pièce' })
  unit: string;

  @ApiProperty({ example: '10' })
  quantity: string;

  @ApiProperty({ example: 649000 })
  unitPriceHtCentimes: number;

  @ApiProperty({ example: 2000 })
  tvaRateBp: number;

  @ApiProperty({ example: 6490000 })
  lineTotalHtCentimes: number;
}

export class TvaRowDto {
  @ApiProperty({ example: 2000 })
  rateBp: number;

  @ApiProperty({ example: 6490000 })
  baseHtCentimes: number;

  @ApiProperty({ example: 1298000 })
  tvaCentimes: number;
}
