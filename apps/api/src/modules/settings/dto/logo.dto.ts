import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Matches, Max, Min } from 'class-validator';

// pdfmake prints PNG and JPEG only
export const LOGO_TYPES = ['image/png', 'image/jpeg'] as const;
export type LogoType = (typeof LOGO_TYPES)[number];

export const MAX_LOGO_BYTES = 1_000_000;

export const LOGO_KEY = /^logos\/[0-9a-f-]{36}\.(png|jpg)$/;

export class LogoUploadRequestDto {
  @ApiProperty({ enum: LOGO_TYPES, example: 'image/png' })
  @IsIn(LOGO_TYPES)
  fileType: LogoType;

  @ApiProperty({ example: 48213, description: 'In bytes, 1 MB at most' })
  @IsInt()
  @Min(1)
  @Max(MAX_LOGO_BYTES)
  fileSize: number;
}

export class LogoUploadDto {
  @ApiProperty({ description: 'PUT the file here, with the same type and size' })
  uploadUrl: string;

  @ApiProperty({ example: 'logos/3f2c9d1e-7a41-4c1b-9d3e-2b8f0c6a5e10.png' })
  key: string;

  @ApiProperty()
  expiresAt: Date;
}

export class SetLogoDto {
  @ApiProperty({ example: 'logos/3f2c9d1e-7a41-4c1b-9d3e-2b8f0c6a5e10.png' })
  @Matches(LOGO_KEY, { message: 'Logo inconnu' })
  key: string;
}
