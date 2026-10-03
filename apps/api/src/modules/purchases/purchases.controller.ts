import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { InternalKeyGuard } from '../../common/guards/internal-key.guard.js';
import { ApiDataResponse } from '../../common/response/api-data-response.decorator.js';
import {
  FileLinkDto,
  PurchaseDetailDto,
  PurchaseDto,
  PurchaseListQueryDto,
  PurchaseUploadDto,
  PurchaseUploadLinkDto,
  RegisterPurchaseDto,
} from './dto/purchases.dto.js';
import { ReviewDraftDto, ReviewSavedDto } from './dto/review-draft.dto.js';
import { PurchasesService } from './purchases.service.js';

// Supplier invoices, open to every logged-in person
@ApiTags('purchases')
@ApiSecurity('internal-key')
@ApiBearerAuth()
@Controller('purchases')
@UseGuards(InternalKeyGuard, AuthGuard)
export class PurchasesController {
  constructor(private readonly purchases: PurchasesService) {}

  // The browser then sends the file straight to storage
  @Post('upload-url')
  @HttpCode(200)
  @ApiDataResponse(PurchaseUploadLinkDto)
  uploadLink(@Body() dto: PurchaseUploadDto) {
    return this.purchases.uploadLink(dto);
  }

  @Post()
  @ApiDataResponse(PurchaseDetailDto, { status: 201 })
  register(@Body() dto: RegisterPurchaseDto, @CurrentUser() user: AuthUser) {
    return this.purchases.register(dto, user);
  }

  @Get()
  @ApiDataResponse(PurchaseDto, { paged: true })
  list(@Query() query: PurchaseListQueryDto) {
    return this.purchases.list(query);
  }

  @Get(':id')
  @ApiDataResponse(PurchaseDetailDto)
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.purchases.get(id, user);
  }

  @Get(':id/file-url')
  @ApiDataResponse(FileLinkDto)
  fileLink(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchases.fileLink(id);
  }

  // Saved as the person types: the whole brouillon each time
  @Put(':id/review')
  @ApiDataResponse(ReviewSavedDto)
  saveReview(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewDraftDto) {
    return this.purchases.saveReview(id, dto);
  }

  // "Valider": everything saved in one go, or nothing
  @Post(':id/confirm')
  @HttpCode(200)
  @ApiDataResponse(PurchaseDetailDto)
  confirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.purchases.confirm(id, user);
  }

  @Post(':id/retry')
  @HttpCode(200)
  @ApiDataResponse(PurchaseDetailDto)
  retry(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.purchases.retry(id, user);
  }

  @Post(':id/discard')
  @HttpCode(200)
  @ApiDataResponse(PurchaseDetailDto)
  discard(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.purchases.discard(id, user);
  }
}
