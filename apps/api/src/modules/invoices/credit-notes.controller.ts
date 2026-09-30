import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiProduces,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { InternalKeyGuard } from '../../common/guards/internal-key.guard.js';
import { ApiDataResponse } from '../../common/response/api-data-response.decorator.js';
import { pdfStream } from '../documents/document-files.service.js';
import { SendDocumentDto } from '../documents/dto/delivery.dto.js';
import { CreditNotesService } from './credit-notes.service.js';
import {
  CreditNoteDeliveredDto,
  CreditNoteDetailDto,
} from './dto/credit-notes.dto.js';

// An avoir is created by POST /invoices/:id/cancel
@ApiTags('credit-notes')
@ApiSecurity('internal-key')
@ApiBearerAuth()
@Controller('credit-notes')
@UseGuards(InternalKeyGuard, AuthGuard)
export class CreditNotesController {
  constructor(private readonly creditNotes: CreditNotesService) {}

  @Get(':id')
  @ApiDataResponse(CreditNoteDetailDto)
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.creditNotes.get(id, user);
  }

  @Get(':id/pdf')
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'The kept file' })
  async pdf(@Param('id', ParseUUIDPipe) id: string) {
    return pdfStream(await this.creditNotes.pdf(id));
  }

  @Post(':id/deliver')
  @HttpCode(200)
  @ApiDataResponse(CreditNoteDeliveredDto)
  deliver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.creditNotes.deliver(id, dto.channel, user);
  }
}
