import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';
import { ENTITY_TYPES, type EntityType } from '../entity-types.js';

export class HistoryParamsDto {
  @ApiProperty({ enum: ENTITY_TYPES, example: 'invoice' })
  @IsIn(ENTITY_TYPES)
  entityType: EntityType;

  @ApiProperty()
  @IsString()
  @MaxLength(64)
  entityId: string;
}
