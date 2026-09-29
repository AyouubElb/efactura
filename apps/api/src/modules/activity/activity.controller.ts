import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { InternalKeyGuard } from '../../common/guards/internal-key.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiDataResponse } from '../../common/response/api-data-response.decorator.js';
import { ActivityService } from './activity.service.js';
import { ActivityEntryDto } from './dto/activity-entry.dto.js';
import { ActivityQueryDto } from './dto/activity-query.dto.js';
import { HistoryParamsDto } from './dto/history-params.dto.js';

@ApiTags('history')
@ApiSecurity('internal-key')
@ApiBearerAuth()
@Controller()
@UseGuards(InternalKeyGuard, AuthGuard, RolesGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get('history/:entityType/:entityId')
  @ApiDataResponse(ActivityEntryDto, { isArray: true })
  history(@Param() params: HistoryParamsDto, @CurrentUser() user: AuthUser) {
    return this.activity.forEntity(
      { type: params.entityType, id: params.entityId },
      user,
    );
  }

  @Get('activity')
  @Roles('admin')
  @ApiDataResponse(ActivityEntryDto, { paged: true })
  list(@Query() query: ActivityQueryDto) {
    return this.activity.list(query);
  }
}
