import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { InternalKeyGuard } from '../../common/guards/internal-key.guard.js';
import { ApiDataResponse } from '../../common/response/api-data-response.decorator.js';
import { ListQueryDto } from '../../common/validation/list-query.dto.js';
import {
  CreateSupplierDto,
  SupplierDto,
  UpdateSupplierDto,
} from './dto/suppliers.dto.js';
import { SuppliersService } from './suppliers.service.js';

@ApiTags('suppliers')
@ApiSecurity('internal-key')
@ApiBearerAuth()
@Controller('suppliers')
@UseGuards(InternalKeyGuard, AuthGuard)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @ApiDataResponse(SupplierDto, { paged: true })
  list(@Query() query: ListQueryDto) {
    return this.suppliers.list(query);
  }

  @Get(':id')
  @ApiDataResponse(SupplierDto)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.get(id);
  }

  @Post()
  @ApiDataResponse(SupplierDto, { status: 201 })
  create(@Body() dto: CreateSupplierDto, @CurrentUser() user: AuthUser) {
    return this.suppliers.create(dto, user);
  }

  @Patch(':id')
  @ApiDataResponse(SupplierDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.suppliers.update(id, dto, user);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @ApiDataResponse(SupplierDto)
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.suppliers.archive(id, user);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiDataResponse(SupplierDto)
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.suppliers.restore(id, user);
  }
}
