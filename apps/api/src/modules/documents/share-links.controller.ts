import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
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
import { ResolvedLinkDto, ShareLinkDto } from './dto/delivery.dto.js';
import { ShareLinksService } from './share-links.service.js';

@ApiTags('share-links')
@ApiSecurity('internal-key')
@Controller('share-links')
export class ShareLinksController {
  constructor(private readonly shareLinks: ShareLinksService) {}

  // The public page /d/<token> asks here: no login, the token is the permission
  @Get(':token/resolve')
  @UseGuards(InternalKeyGuard)
  @ApiDataResponse(ResolvedLinkDto)
  resolve(@Param('token') token: string) {
    return this.shareLinks.resolve(token);
  }

  @Post(':id/revoke')
  @UseGuards(InternalKeyGuard, AuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiDataResponse(ShareLinkDto)
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.shareLinks.revoke(id, admin);
  }
}
