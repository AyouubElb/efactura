import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { InvoiceDetailDto } from '../invoices/dto/invoices.dto.js';
import { InvoicesService } from '../invoices/invoices.service.js';
import {
  CreateQuoteDto,
  ExtendQuoteDto,
  QuoteDeliveredDto,
  QuoteDetailDto,
  QuoteDto,
  QuoteListQueryDto,
  UpdateQuoteDto,
} from './dto/quotes.dto.js';
import { QuotesService } from './quotes.service.js';

// Open to every logged-in person: staff make and send quotes too
@ApiTags('quotes')
@ApiSecurity('internal-key')
@ApiBearerAuth()
@Controller('quotes')
@UseGuards(InternalKeyGuard, AuthGuard)
export class QuotesController {
  constructor(
    private readonly quotes: QuotesService,
    private readonly invoices: InvoicesService,
  ) {}

  @Get()
  @ApiDataResponse(QuoteDto, { paged: true })
  list(@Query() query: QuoteListQueryDto) {
    return this.quotes.list(query);
  }

  @Get(':id')
  @ApiDataResponse(QuoteDetailDto)
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.quotes.get(id, user);
  }

  @Post()
  @ApiDataResponse(QuoteDetailDto, { status: 201 })
  create(@Body() dto: CreateQuoteDto, @CurrentUser() user: AuthUser) {
    return this.quotes.create(dto, user);
  }

  @Patch(':id')
  @ApiDataResponse(QuoteDetailDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotes.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'The draft is gone: data is null' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotes.remove(id, user);
  }

  @Get(':id/pdf')
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'A draft: made now, marked BROUILLON. Sent: the kept file',
  })
  async pdf(@Param('id', ParseUUIDPipe) id: string) {
    return pdfStream(await this.quotes.pdf(id));
  }

  @Post(':id/send')
  @HttpCode(200)
  @ApiDataResponse(QuoteDeliveredDto)
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotes.send(id, dto.channel, user);
  }

  @Post(':id/deliver')
  @HttpCode(200)
  @ApiDataResponse(QuoteDeliveredDto)
  deliver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotes.deliver(id, dto.channel, user);
  }

  @Post(':id/accept')
  @HttpCode(200)
  @ApiDataResponse(QuoteDetailDto)
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotes.accept(id, user);
  }

  @Post(':id/refuse')
  @HttpCode(200)
  @ApiDataResponse(QuoteDetailDto)
  refuse(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotes.refuse(id, user);
  }

  @Post(':id/revise')
  @ApiDataResponse(QuoteDetailDto, { status: 201 })
  revise(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotes.revise(id, user);
  }

  @Post(':id/extend')
  @HttpCode(200)
  @ApiDataResponse(QuoteDetailDto)
  extend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendQuoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotes.extend(id, dto, user);
  }

  // "Convertir en facture": an invoice draft; the invoices module owns it
  @Post(':id/convert')
  @ApiDataResponse(InvoiceDetailDto, { status: 201 })
  convert(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoices.fromQuote(id, user);
  }
}
