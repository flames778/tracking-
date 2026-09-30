import { Module } from '@nestjs/common';
import { GeofencesController } from './geofences.controller';
import { AuditModule } from '../audit/audit.module';

@Module({ imports: [AuditModule], controllers: [GeofencesController] })
export class GeofencesModule {}
