import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SimulatorCliModule } from './simulator/simulator-cli.module';
import { SimulatorService } from './simulator/simulator.service';

/**
 * Standalone simulator process (development only).
 *
 * It feeds the *same* `TrackingIngestionService` pipeline that real devices
 * use — the only difference is where the payload comes from. Nothing here
 * writes telemetry behind the ingestion service's back.
 *
 *   npm run simulator -- --vehicles 5 --interval 2000
 */
async function bootstrap() {
  const args = process.argv.slice(2);
  const read = (flag: string, fallback: number) => {
    const i = args.indexOf(flag);
    const v = i >= 0 ? Number(args[i + 1]) : NaN;
    return Number.isFinite(v) ? v : fallback;
  };
  const vehicleCount = read('--vehicles', 5);
  const intervalMs = read('--interval', 2000);

  const app = await NestFactory.createApplicationContext(SimulatorCliModule);

  const sim = app.get(SimulatorService);
  await sim.start({ vehicleCount, intervalMs });
  new Logger('Simulator').log(
    `streaming ${vehicleCount} demo vehicles every ${intervalMs}ms — ctrl-c to stop`,
  );

  const shutdown = async () => {
    await sim.stop();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('simulator failed to start', err);
  process.exit(1);
});
