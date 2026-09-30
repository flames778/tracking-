import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('Redis');
        const url = config.get<string>('app.redisUrl') ?? 'redis://localhost:6379';
        const client = new IORedis(url, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });

        // ioredis reconnects forever; logging every attempt floods the log
        // stream and hides real errors, so only report state changes.
        let downLogged = false;
        client.on('error', (err: Error) => {
          if (downLogged) return;
          downLogged = true;
          logger.error(`unavailable (${err.message}) — will keep retrying`);
        });
        client.on('ready', () => {
          if (downLogged) logger.log('connection restored');
          downLogged = false;
        });
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
