import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/client.js';

export class MeDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Karim Alaoui' })
  fullName: string;

  @ApiProperty({ example: 'karim@techstore.example' })
  email: string;

  @ApiProperty({ enum: Object.values(Role) })
  role: Role;
}

export class TokenPairDto {
  @ApiProperty({ description: '15 minutes' })
  accessToken: string;

  @ApiProperty({ description: '7 days, usable once' })
  refreshToken: string;

  @ApiProperty()
  refreshExpiresAt: Date;
}

export class LoginResponseDto extends TokenPairDto {
  @ApiProperty({ type: MeDto })
  user: MeDto;
}
