import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { InternalKeyGuard } from '../../common/guards/internal-key.guard.js';
import { ApiDataResponse } from '../../common/response/api-data-response.decorator.js';
import { AuthService } from './auth.service.js';
import {
  LoginResponseDto,
  MeDto,
  TokenPairDto,
} from './dto/auth-responses.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto, SetPasswordDto } from './dto/password.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { TokensService } from './tokens.service.js';

@ApiTags('auth')
@ApiSecurity('internal-key')
@Controller('auth')
@UseGuards(InternalKeyGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @ApiDataResponse(LoginResponseDto)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiDataResponse(TokenPairDto)
  refresh(@Body() dto: RefreshDto) {
    return this.tokens.rotate(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  logout(@CurrentUser() user: AuthUser) {
    return this.auth.logout(user);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiDataResponse(MeDto)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }

  // No email in the body: the per-account limit would put everyone in one bucket
  @Post('invite/accept')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ email: true })
  acceptInvite(@Body() dto: SetPasswordDto) {
    return this.auth.acceptInvite(dto);
  }

  @Post('password/forgot')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('password/reset')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ email: true })
  resetPassword(@Body() dto: SetPasswordDto) {
    return this.auth.resetPassword(dto);
  }
}
