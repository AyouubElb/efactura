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
import { ClientsService } from './clients.service.js';
import {
  ClientDto,
  CreateClientDto,
  UpdateClientDto,
} from './dto/clients.dto.js';

@ApiTags('clients')
@ApiSecurity('internal-key')
@ApiBearerAuth()
@Controller('clients')
@UseGuards(InternalKeyGuard, AuthGuard)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @ApiDataResponse(ClientDto, { paged: true })
  list(@Query() query: ListQueryDto) {
    return this.clients.list(query);
  }

  @Get(':id')
  @ApiDataResponse(ClientDto)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.get(id);
  }

  @Post()
  @ApiDataResponse(ClientDto, { status: 201 })
  create(@Body() dto: CreateClientDto, @CurrentUser() user: AuthUser) {
    return this.clients.create(dto, user);
  }

  @Patch(':id')
  @ApiDataResponse(ClientDto)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clients.update(id, dto, user);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @ApiDataResponse(ClientDto)
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clients.archive(id, user);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiDataResponse(ClientDto)
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clients.restore(id, user);
  }
}
