import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration';
import { validateEnv } from '../config/env.validation';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../common/redis/redis.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TrackingModule } from '../tracking/tracking.module';
import { SimulatorService } from './simulator.service';

/** Context module for the standalone simulator process (no HTTP, no controllers). */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    PrismaModule,
    RedisModule,
    RealtimeModule,
    TrackingModule,
  ],
  providers: [SimulatorService],
})
export class SimulatorCliModule {}
