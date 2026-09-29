import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module.js';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';

// SettingsModule exports SettingsService: the default payment delay
@Module({
  imports: [SettingsModule],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
