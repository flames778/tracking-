import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import configuration from '../config/configuration';
import { validateEnv } from '../config/env.validation';
import { ReportStorageService } from '../reports/report-storage.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../common/redis/redis.module';
import { JobsModule } from './jobs.module';
import {
  DeviceStatusProcessor,
  NotificationProcessor,
  RetentionProcessor,
} from './processors/misc.processor';
import { ReportProcessor } from './processors/report.processor';
import { TelemetryProcessingProcessor } from './processors/telemetry.processor';
import { JobSchedulerService } from './job-scheduler.service';
import { TrackingModule } from '../tracking/tracking.module';

/**
 * Worker-only module. The HTTP API never consumes queues — it only enqueues.
 * Run it as its own process (`npm run worker` / `node dist/worker`).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    LoggerModule.forRoot({
      pinoHttp: { level: process.env.LOG_LEVEL ?? 'info' },
    }),
    PrismaModule,
    RedisModule,
    JobsModule,
    TrackingModule,
  ],
  providers: [
    ReportStorageService,
    ReportProcessor,
    NotificationProcessor,
    DeviceStatusProcessor,
    RetentionProcessor,
    TelemetryProcessingProcessor,
    JobSchedulerService,
  ],
})
export class WorkerModule {}
