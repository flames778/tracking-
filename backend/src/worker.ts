import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './jobs/worker.module';

/**
 * Background worker entrypoint. Consumes the report, notification,
 * device-status and retention queues and owns the repeatable schedules.
 * The HTTP API never consumes queues.
 */
async function bootstrap() {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  logger.log('worker ready');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('worker failed to start', err);
  process.exit(1);
});
