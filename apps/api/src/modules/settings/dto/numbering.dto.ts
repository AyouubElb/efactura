import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Series } from '../../../generated/prisma/client.js';

export const MAX_DOCUMENT_NUMBER = 999_999;

export class NumberingQueryDto {
  @ApiPropertyOptional({ description: 'The current year when omitted' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}

export class SetNumberingStartDto {
  @ApiProperty({ enum: Object.values(Series) })
  @IsEnum(Series)
  series: Series;

  @ApiProperty({ example: 2026 })
  @IsInt()
  year: number;

  @ApiProperty({
    example: 143,
    description: 'The next document gets this number',
  })
  @IsInt()
  @Min(1)
  @Max(MAX_DOCUMENT_NUMBER)
  startAt: number;
}

export class SeriesCounterDto {
  @ApiProperty({ enum: Object.values(Series) })
  series: Series;

  @ApiProperty({ example: 2026 })
  year: number;

  @ApiProperty({ example: 142, description: '0 when nothing was numbered yet' })
  lastNumber: number;

  @ApiProperty({ example: 'FA-2026-0143' })
  nextNumber: string;
}
