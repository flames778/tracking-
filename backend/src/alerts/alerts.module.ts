import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AuditModule } from '../audit/audit.module';

@Module({ imports: [AuditModule], controllers: [AlertsController] })
export class AlertsModule {}
