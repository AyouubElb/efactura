import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Trim } from '../../../common/validation/trim.js';
import { DocumentLineDto } from './document-line.dto.js';

// The body of a quote or invoice draft: the server computes every total
export class DocumentDraftDto {
  @ApiProperty()
  @IsUUID()
  clientId: string;

  @ApiProperty({ type: [DocumentLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  // JSON arrives as plain objects: @Type makes each one a DocumentLineDto, so its rules run
  @Type(() => DocumentLineDto)
  lines: DocumentLineDto[];

  @ApiPropertyOptional({
    nullable: true,
    example: 'Livraison sous 5 jours ouvrés après accord.',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
