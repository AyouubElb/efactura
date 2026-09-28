import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsIce } from '../../../common/validation/is-ice.js';

// Printed on every document (Art. 145 CGI)
export class ShopIdentityDto {
  @ApiProperty({ example: 'TechStore Maarif SARL' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  legalName: string;

  @ApiProperty({ example: '123, boulevard Al Massira, Maârif' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address: string;

  @ApiProperty({ example: 'Casablanca' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ nullable: true, example: '05 22 00 00 00' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'contact@techstore.example' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @ApiProperty({ example: '009876543000021' })
  @IsIce()
  ice: string;

  @ApiProperty({ example: '50123456', description: 'Identifiant fiscal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  ifNumber: string;

  @ApiProperty({ example: '35712345', description: 'Taxe professionnelle' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  tpNumber: string;

  @ApiProperty({ example: '512345', description: 'Registre de commerce' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  rcNumber: string;

  @ApiProperty({ example: 'Casablanca' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  rcCity: string;

  @ApiPropertyOptional({ nullable: true, example: 'Banque Populaire' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '190780211110000123456789' })
  @IsOptional()
  @Matches(/^\d{24}$/, { message: 'Le RIB compte 24 chiffres' })
  rib?: string | null;
}

export class UpdateSettingsDto {
  @ApiProperty({ type: ShopIdentityDto })
  @ValidateNested()
  @Type(() => ShopIdentityDto)
  identity: ShopIdentityDto;

  @ApiProperty({ example: 60, description: 'Law 69-21: 120 at most' })
  @IsInt()
  @Min(0)
  @Max(120)
  defaultPaymentDays: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  @Max(365)
  defaultQuoteValidityDays: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  @Max(100)
  priceRiseThresholdPercent: number;

  @ApiProperty({ example: [2000, 1000, 0], description: '2000 = 20 %' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(10_000, { each: true })
  tvaRatesBp: number[];
}

export class SettingsDto {
  @ApiProperty({ description: 'False until the admin fills the shop identity' })
  configured: boolean;

  @ApiProperty({ type: ShopIdentityDto, nullable: true })
  identity: ShopIdentityDto | null;

  @ApiProperty({ example: 60 })
  defaultPaymentDays: number;

  @ApiProperty({ example: 30 })
  defaultQuoteValidityDays: number;

  @ApiProperty({ example: 10 })
  priceRiseThresholdPercent: number;

  @ApiProperty({ example: [2000, 1000, 0] })
  tvaRatesBp: number[];

  @ApiProperty({ nullable: true })
  updatedAt: Date | null;
}
