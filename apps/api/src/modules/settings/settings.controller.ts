import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { InternalKeyGuard } from '../../common/guards/internal-key.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiDataResponse } from '../../common/response/api-data-response.decorator.js';
import {
  LogoUploadDto,
  LogoUploadRequestDto,
  SetLogoDto,
} from './dto/logo.dto.js';
import {
  NumberingQueryDto,
  SeriesCounterDto,
  SetNumberingStartDto,
} from './dto/numbering.dto.js';
import { SettingsDto, UpdateSettingsDto } from './dto/settings.dto.js';
import { NumberingService } from './numbering.service.js';
import { SettingsService } from './settings.service.js';

@ApiTags('settings')
@ApiSecurity('internal-key')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(InternalKeyGuard, AuthGuard, RolesGuard)
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly numbering: NumberingService,
  ) {}

  // Everyone: every form needs the TVA rates
  @Get()
  @ApiDataResponse(SettingsDto)
  get() {
    return this.settings.get();
  }

  @Put()
  @Roles('admin')
  @ApiDataResponse(SettingsDto)
  update(@Body() dto: UpdateSettingsDto, @CurrentUser() admin: AuthUser) {
    return this.settings.update(dto, admin);
  }

  // The browser sends the file straight to storage, then calls PUT /settings/logo
  @Post('logo-upload-url')
  @Roles('admin')
  @HttpCode(200)
  @ApiDataResponse(LogoUploadDto)
  logoUploadLink(@Body() dto: LogoUploadRequestDto) {
    return this.settings.logoUploadLink(dto);
  }

  @Put('logo')
  @Roles('admin')
  @ApiDataResponse(SettingsDto)
  setLogo(@Body() dto: SetLogoDto, @CurrentUser() admin: AuthUser) {
    return this.settings.setLogo(dto, admin);
  }

  @Get('numbering')
  @Roles('admin')
  @ApiDataResponse(SeriesCounterDto, { isArray: true })
  listNumbering(@Query() query: NumberingQueryDto) {
    return this.numbering.list(query.year);
  }

  @Put('numbering')
  @Roles('admin')
  @ApiDataResponse(SeriesCounterDto, { isArray: true })
  setNumberingStart(
    @Body() dto: SetNumberingStartDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.numbering.setStart(dto, admin);
  }
}
