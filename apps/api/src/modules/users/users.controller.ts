import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { ChangeRoleDto, InviteUserDto, UserDto } from './dto/users.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiSecurity('internal-key')
@ApiBearerAuth()
@Controller('users')
@UseGuards(InternalKeyGuard, AuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiDataResponse(UserDto, { isArray: true })
  list() {
    return this.users.list();
  }

  @Post('invite')
  @HttpCode(200)
  @ApiDataResponse(UserDto)
  invite(@Body() dto: InviteUserDto, @CurrentUser() admin: AuthUser) {
    return this.users.invite(dto, admin);
  }

  @Patch(':id')
  @ApiDataResponse(UserDto)
  changeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.users.changeRole(id, dto.role, admin);
  }

  @Post(':id/turn-off')
  @HttpCode(200)
  @ApiDataResponse(UserDto)
  turnOff(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.users.turnOff(id, admin);
  }

  @Post(':id/turn-on')
  @HttpCode(200)
  @ApiDataResponse(UserDto)
  turnOn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.users.turnOn(id, admin);
  }
}
