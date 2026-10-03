import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Nullable } from '../../../common/validation/nullable.js';
import { MatchMethod } from '../../../generated/prisma/client.js';
import type { Candidate, DraftLine, NewProduct, PurchaseDraft } from '../draft.js';
import { DOCUMENT_TYPES, type InvoiceReading } from '../extraction.schema.js';

// Saves keep half-typed values; "Valider" checks every rule. Text limits sit above anything the AI writes

class CandidateDto implements Candidate {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 0.62, description: '0.62 = 62 % alike' })
  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;
}

class NewProductDto implements NewProduct {
  @ApiProperty({ nullable: true, example: 'Clavier Logitech K120' })
  @Nullable()
  @IsString()
  @MaxLength(1000)
  name: string | null;

  @ApiProperty({ nullable: true, example: '920-002488' })
  @Nullable()
  @IsString()
  @MaxLength(200)
  reference: string | null;

  @ApiProperty({ nullable: true, example: 'pièce' })
  @Nullable()
  @IsString()
  @MaxLength(50)
  unit: string | null;

  @ApiProperty({ nullable: true, example: 14900, description: 'Selling price before tax, typed by the person' })
  @Nullable()
  @IsInt()
  priceHtCentimes: number | null;

  @ApiProperty({ nullable: true, example: 2000 })
  @Nullable()
  @IsInt()
  @Min(0)
  @Max(10_000)
  tvaRateBp: number | null;
}

class DraftLineDto implements DraftLine {
  @ApiProperty({ nullable: true, example: 'CLAVIER LOGITECH K120 USB AZERTY' })
  @Nullable()
  @IsString()
  @MaxLength(1000)
  label: string | null;

  @ApiProperty({ nullable: true, example: '920-002488' })
  @Nullable()
  @IsString()
  @MaxLength(200)
  reference: string | null;

  @ApiProperty({ nullable: true, example: '12', description: 'Decimal text with a dot' })
  @Nullable()
  @IsString()
  @MaxLength(50)
  quantity: string | null;

  @ApiProperty({ nullable: true, example: 11900 })
  @Nullable()
  @IsInt()
  unitPriceCentimes: number | null;

  @ApiProperty({ nullable: true, example: 142800 })
  @Nullable()
  @IsInt()
  lineTotalCentimes: number | null;

  @ApiProperty({ nullable: true, example: 2000 })
  @Nullable()
  @IsInt()
  @Min(0)
  @Max(10_000)
  tvaRateBp: number | null;

  @ApiProperty({ nullable: true })
  @Nullable()
  @IsUUID()
  productId: string | null;

  @ApiProperty({ enum: MatchMethod, nullable: true })
  @Nullable()
  @IsIn(Object.values(MatchMethod))
  match: MatchMethod | null;

  @ApiProperty({ type: [CandidateDto] })
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => CandidateDto)
  candidates: CandidateDto[];

  @ApiProperty({ type: NewProductDto, nullable: true })
  @Nullable()
  @ValidateNested()
  @Type(() => NewProductDto)
  newProduct: NewProductDto | null;

  @ApiProperty({ description: '"Ignorer la ligne": never saved as a purchase line' })
  @IsBoolean()
  ignored: boolean;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  notes: string[];
}

class DraftSupplierDto {
  @ApiProperty({ nullable: true, description: 'An existing supplier; null makes a new one at "Valider"' })
  @Nullable()
  @IsUUID()
  id: string | null;

  @ApiProperty({ nullable: true, example: 'Atlas Distribution SARL' })
  @Nullable()
  @IsString()
  @MaxLength(1000)
  name: string | null;

  @ApiProperty({ nullable: true, example: '001234567000089' })
  @Nullable()
  @IsString()
  @MaxLength(50)
  ice: string | null;

  @ApiProperty({ nullable: true, example: '40112233' })
  @Nullable()
  @IsString()
  @MaxLength(50)
  ifNumber: string | null;

  @ApiProperty({ nullable: true })
  @Nullable()
  @IsString()
  @MaxLength(1000)
  address: string | null;
}

class DraftTotalsDto {
  @ApiProperty({ nullable: true, example: 2008000 })
  @Nullable()
  @IsInt()
  htCentimes: number | null;

  @ApiProperty({ nullable: true, example: 401600 })
  @Nullable()
  @IsInt()
  tvaCentimes: number | null;

  @ApiProperty({ nullable: true, example: 2409600 })
  @Nullable()
  @IsInt()
  ttcCentimes: number | null;
}

export class ReviewDraftDto implements PurchaseDraft {
  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsIn(DOCUMENT_TYPES)
  documentType: InvoiceReading['document_type'];

  @ApiProperty({ type: DraftSupplierDto })
  @ValidateNested()
  @Type(() => DraftSupplierDto)
  supplier: DraftSupplierDto;

  @ApiProperty({ nullable: true, example: 'FAC-26-04598' })
  @Nullable()
  @IsString()
  @MaxLength(200)
  invoiceNumber: string | null;

  @ApiProperty({ nullable: true, example: '2026-09-30' })
  @Nullable()
  @IsString()
  @MaxLength(50)
  invoiceDate: string | null;

  @ApiProperty({ description: 'Line prices as printed, with tax when true' })
  @IsBoolean()
  pricesIncludeTax: boolean;

  @ApiProperty({ type: [DraftLineDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DraftLineDto)
  lines: DraftLineDto[];

  @ApiProperty({ type: DraftTotalsDto })
  @ValidateNested()
  @Type(() => DraftTotalsDto)
  totals: DraftTotalsDto;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  notes: string[];
}

export class ReviewSavedDto {
  @ApiProperty({ description: 'When this save landed: "Enregistré à 14:32"' })
  updatedAt: Date;
}
