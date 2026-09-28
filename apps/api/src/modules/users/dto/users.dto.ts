import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { Role, UserStatus } from '../../../generated/prisma/client.js';

export class InviteUserDto {
  @ApiProperty({ example: 'Youssef Benali' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'youssef@techstore.example' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ enum: Object.values(Role) })
  @IsEnum(Role)
  role: Role;
}

export class ChangeRoleDto {
  @ApiProperty({ enum: Object.values(Role) })
  @IsEnum(Role)
  role: Role;
}

export const INVITE_EMAIL_STATUSES = [
  'queued',
  'sent',
  'failed',
  'expired',
] as const;
export type InviteEmailStatus = (typeof INVITE_EMAIL_STATUSES)[number];

export class InviteEmailDto {
  @ApiProperty({ enum: INVITE_EMAIL_STATUSES })
  status: InviteEmailStatus;

  @ApiProperty()
  expiresAt: Date;
}

export class UserDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Youssef Benali' })
  fullName: string;

  @ApiProperty({ example: 'youssef@techstore.example' })
  email: string;

  @ApiProperty({ enum: Object.values(Role) })
  role: Role;

  @ApiProperty({ enum: Object.values(UserStatus) })
  status: UserStatus;

  @ApiProperty({ nullable: true })
  lastLoginAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({
    type: InviteEmailDto,
    nullable: true,
    description: 'Only while the person is invited',
  })
  inviteEmail: InviteEmailDto | null;
}
