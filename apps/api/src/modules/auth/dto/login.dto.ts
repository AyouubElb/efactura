import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'karim@techstore.example' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'Demo-2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password: string;
}
