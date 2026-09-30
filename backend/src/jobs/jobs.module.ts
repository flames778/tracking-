import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUES } from '../config/constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const parsed = new URL(
          config.get<string>('app.redisUrl') ?? 'redis://localhost:6379',
        );
        return {
          connection: {
            host: parsed.hostname || 'localhost',
            port: Number(parsed.port || 6379),
            ...(parsed.password ? { password: parsed.password } : {}),
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
          prefix: process.env.BULLMQ_PREFIX ?? 'fleet',
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUES.REPORT },
      { name: QUEUES.NOTIFICATION },
      { name: QUEUES.DEVICE_STATUS },
      { name: QUEUES.RETENTION },
      { name: QUEUES.TRIP },
    ),
  ],
  exports: [BullModule],
})
export class JobsModule {}
