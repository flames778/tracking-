import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { Server } from 'socket.io';
import { AppModule } from './app.module';
import { RealtimeService } from './realtime/realtime.service';
import { TcpDeviceTransport } from './tracking/transports/tcp.transport';
import { UdpDeviceTransport } from './tracking/transports/udp.transport';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.useLogger(app.get(Logger));
  const config = app.get(ConfigService);
  const prefix = config.get<string>('app.apiPrefix') ?? 'api/v1';

  app.setGlobalPrefix(prefix, {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const origins: string[] =
    (config.get<string[]>('app.corsOrigins') as string[]) ?? [
      'http://localhost:3000',
    ];
  app.enableCors({ origin: origins, credentials: true });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Fleet Tracking API')
    .setDescription(
      'Vehicle tracking & fleet management backend. Telemetry boundary: Transport → ProtocolAdapter → ParsedTelemetry → pipeline. C003F adapter is a placeholder until protocol docs arrive.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const httpServer = app.getHttpServer();
  const io = new Server(httpServer, {
    cors: { origin: origins, credentials: true },
    path: '/socket.io',
  });
  app.get(RealtimeService).attach(io);

  try {
    await app.get(TcpDeviceTransport).start();
    await app.get(UdpDeviceTransport).start();
  } catch (e: any) {
    console.warn('[transports] failed to start:', e.message);
  }

  const port = (config.get<number>('app.port') as number) ?? 4000;
  await app.listen(port);
  console.log(`API listening on :${port}/${prefix} — docs at /docs`);
}

void bootstrap();
