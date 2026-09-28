import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'karim@techstore.example' })
  @IsEmail()
  @MaxLength(254)
  email: string;
}

// Invitation and reset: the token from the email link, then the chosen password
export class SetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  token: string;

  @ApiProperty({ minLength: 8, maxLength: 200, example: 'Demo-2026' })
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password: string;
}
