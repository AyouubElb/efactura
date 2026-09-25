import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  // Public: the host's health check calls it, and it wakes a sleeping API
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }
}
