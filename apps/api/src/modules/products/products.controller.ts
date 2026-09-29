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
  CreateProductDto,
  ProductDto,
  UpdateProductDto,
} from './dto/products.dto.js';
import { ProductsService } from './products.service.js';

// Open to every logged-in person: staff keep the catalogue too
@ApiTags('products')
@ApiSecurity('internal-key')
@ApiBearerAuth()
@Controller('products')
@UseGuards(InternalKeyGuard, AuthGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiDataResponse(ProductDto, { paged: true })
  list(@Query() query: ListQueryDto) {
    return this.products.list(query);
  }

  @Get(':id')
  @ApiDataResponse(ProductDto)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.get(id);
  }

  @Post()
  @ApiDataResponse(ProductDto, { status: 201 })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.products.create(dto, user);
  }

  @Patch(':id')
  @ApiDataResponse(ProductDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.products.update(id, dto, user);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @ApiDataResponse(ProductDto)
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.products.archive(id, user);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiDataResponse(ProductDto)
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.products.restore(id, user);
  }
}
