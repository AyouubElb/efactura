import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { InternalKeyGuard } from '../../common/guards/internal-key.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiDataResponse } from '../../common/response/api-data-response.decorator.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardTotalsDto, RecentDocumentDto } from './dto/dashboard.dto.js';

@ApiTags('dashboard')
@ApiSecurity('internal-key')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(InternalKeyGuard, AuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  // The money totals are the admin's
  @Get('totals')
  @Roles('admin')
  @ApiDataResponse(DashboardTotalsDto)
  totals() {
    return this.dashboard.totals();
  }

  @Get('recent')
  @ApiDataResponse(RecentDocumentDto, { isArray: true })
  recent() {
    return this.dashboard.recent();
  }
}
