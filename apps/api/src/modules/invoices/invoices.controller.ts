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
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { InternalKeyGuard } from '../../common/guards/internal-key.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiDataResponse } from '../../common/response/api-data-response.decorator.js';
import { pdfStream } from '../documents/document-files.service.js';
import { SendDocumentDto } from '../documents/dto/delivery.dto.js';
import {
  CancelInvoiceDto,
  CreateInvoiceDto,
  InvoiceCancelledDto,
  InvoiceDeliveredDto,
  InvoiceDetailDto,
  InvoiceDto,
  InvoiceListQueryDto,
  PayInvoiceDto,
  UpdateInvoiceDto,
} from './dto/invoices.dto.js';
import { InvoicesService } from './invoices.service.js';

// Open to every logged-in person, except undoing a payment
@ApiTags('invoices')
@ApiSecurity('internal-key')
@ApiBearerAuth()
@Controller('invoices')
@UseGuards(InternalKeyGuard, AuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @ApiDataResponse(InvoiceDto, { paged: true })
  list(@Query() query: InvoiceListQueryDto) {
    return this.invoices.list(query);
  }

  @Get(':id')
  @ApiDataResponse(InvoiceDetailDto)
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.invoices.get(id, user);
  }

  @Post()
  @ApiDataResponse(InvoiceDetailDto, { status: 201 })
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.invoices.create(dto, user);
  }

  @Patch(':id')
  @ApiDataResponse(InvoiceDetailDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoices.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'The draft is gone: data is null' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoices.remove(id, user);
  }

  @Get(':id/pdf')
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'A draft: made now, marked BROUILLON. Sent: the kept file',
  })
  async pdf(@Param('id', ParseUUIDPipe) id: string) {
    return pdfStream(await this.invoices.pdf(id));
  }

  @Post(':id/send')
  @HttpCode(200)
  @ApiDataResponse(InvoiceDeliveredDto)
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoices.send(id, dto.channel, user);
  }

  @Post(':id/deliver')
  @HttpCode(200)
  @ApiDataResponse(InvoiceDeliveredDto)
  deliver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoices.deliver(id, dto.channel, user);
  }

  @Post(':id/pay')
  @HttpCode(200)
  @ApiDataResponse(InvoiceDetailDto)
  pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoices.pay(id, dto, user);
  }

  @Post(':id/unpay')
  @Roles('admin')
  @HttpCode(200)
  @ApiDataResponse(InvoiceDetailDto)
  unpay(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.invoices.unpay(id, admin);
  }

  // Creates the avoir AV-…, then sends it
  @Post(':id/cancel')
  @ApiDataResponse(InvoiceCancelledDto, { status: 201 })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoices.cancel(id, dto, user);
  }
}
