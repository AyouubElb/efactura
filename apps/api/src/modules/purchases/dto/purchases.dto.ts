import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { PageQueryDto } from '../../../common/validation/list-query.dto.js';
import { PurchaseStatus } from '../../../generated/prisma/client.js';
import { ActivityEntryDto } from '../../activity/dto/activity-entry.dto.js';
import type { PurchaseDraft } from '../draft.js';
import { FILE_TYPES, type FileType } from '../invoice-reader.js';
import { ReviewDraftDto } from './review-draft.dto.js';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SHA256 = /^[0-9a-f]{64}$/;

export class PurchaseUploadDto {
  @ApiProperty({ enum: FILE_TYPES, example: 'image/jpeg' })
  @IsIn(FILE_TYPES)
  fileType: FileType;

  @ApiProperty({ example: 1_048_576, description: 'Bytes, 10 MB at most' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_FILE_BYTES)
  fileSize: number;

  @ApiProperty({ description: "The file's SHA-256, computed by the browser" })
  @Matches(SHA256, { message: 'Empreinte SHA-256 invalide' })
  sha256: string;
}

export class PurchaseUploadLinkDto {
  @ApiProperty({ description: 'PUT the file there within 5 minutes' })
  uploadUrl: string;

  @ApiProperty({ example: 'purchases/3f2c….jpg' })
  fileKey: string;
}

export class RegisterPurchaseDto {
  @ApiProperty({ example: 'purchases/3f2c….jpg' })
  @Matches(/^purchases\/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/, {
    message: 'Clé de fichier invalide',
  })
  fileKey: string;

  @ApiProperty()
  @Matches(SHA256, { message: 'Empreinte SHA-256 invalide' })
  sha256: string;
}

export class PurchaseListQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: PurchaseStatus })
  @IsOptional()
  @IsIn(Object.values(PurchaseStatus))
  status?: PurchaseStatus;
}

class PurchaseUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Salma Berrada' })
  fullName: string;
}

export class PurchaseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    enum: PurchaseStatus,
    description: 'A read still running after 10 minutes shows as failed',
  })
  status: PurchaseStatus;

  @ApiProperty({ enum: FILE_TYPES })
  fileType: string;

  @ApiProperty({ nullable: true, example: 'ATLAS DISTRIBUTION SARL' })
  supplierName: string | null;

  @ApiProperty({ nullable: true, example: 'FAC-26-04512' })
  invoiceNumber: string | null;

  @ApiProperty({ nullable: true, example: '2026-09-24' })
  invoiceDate: string | null;

  @ApiProperty({ nullable: true, example: 4616400 })
  totalTtcCentimes: number | null;

  @ApiProperty({ type: PurchaseUserDto })
  uploadedBy: PurchaseUserDto;

  @ApiProperty()
  createdAt: Date;
}

export class PurchaseDetailDto extends PurchaseDto {
  @ApiProperty({ nullable: true })
  pageCount: number | null;

  @ApiProperty({ nullable: true, example: 'Le PDF a 7 pages : 5 au maximum' })
  error: string | null;

  @ApiProperty({ description: 'Tries of the latest read' })
  attempts: number;

  @ApiProperty({ nullable: true, example: 'gpt-6-luna' })
  aiModel: string | null;

  @ApiProperty({ nullable: true, description: 'Millionths of a dollar' })
  aiCostMicroUsd: number | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: "The AI's answer, untouched",
  })
  proposal: object | null;

  @ApiProperty({
    type: ReviewDraftDto,
    nullable: true,
    description: 'The working copy a person checks, then validates',
  })
  draft: PurchaseDraft | null;

  @ApiProperty({ type: [ActivityEntryDto] })
  history: ActivityEntryDto[];
}

export class FileLinkDto {
  @ApiProperty({ description: 'Opens the original for 5 minutes' })
  url: string;
}
