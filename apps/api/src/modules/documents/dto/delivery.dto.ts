import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SendChannel } from '../../../generated/prisma/client.js';

export class SendDocumentDto {
  @ApiProperty({ enum: SendChannel, example: SendChannel.whatsapp })
  @IsEnum(SendChannel)
  channel: SendChannel;
}

export class DeliveryDto {
  @ApiProperty({ enum: SendChannel })
  channel: SendChannel;

  @ApiProperty({
    nullable: true,
    description: "WhatsApp: open it in the person's browser, the message is ready",
    example: 'https://wa.me/212612345678?text=Bonjour%2C…',
  })
  whatsappUrl: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Email: the address the queue sends to',
  })
  emailTo: string | null;
}

export class ShareLinkDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'https://app.example/d/Kq9xP2mT…' })
  url: string;

  @ApiProperty({ example: 2 })
  openCount: number;

  @ApiProperty({ nullable: true })
  lastOpenedAt: Date | null;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({ nullable: true })
  revokedAt: Date | null;
}

export class ResolvedLinkDto {
  @ApiProperty({ description: 'The PDF, for five minutes' })
  url: string;
}
