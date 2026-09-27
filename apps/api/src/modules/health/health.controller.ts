import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { RawResponse } from '../../common/response/raw-response.decorator.js';

@Controller('health')
@RawResponse()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  // Public: the host's health check calls it, and it wakes a sleeping API
  @Get()
  @HealthCheck()
  check() {
    // A sleeping Neon database wakes in under a second; Render gives up after 5
    return this.health.check([
      () => this.database.pingCheck('database', this.prisma).withTimeout(3000),
    ]);
  }
}
