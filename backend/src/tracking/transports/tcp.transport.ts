import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';
import { DeviceTransport } from './device-transport.interface';
import { TrackingIngestionService } from '../tracking-ingestion.service';

/**
 * TCP transport skeleton — DISABLED until C003F protocol is known.
 * Enabled only via DEVICE_TCP_ENABLED=true. Forwards raw buffers into
 * the ingestion pipeline (which selects the adapter).
 */
@Injectable()
export class TcpDeviceTransport implements DeviceTransport, OnModuleDestroy {
  readonly name = 'TCP';
  running = false;
  private server: net.Server | null = null;
  private readonly logger = new Logger(TcpDeviceTransport.name);

  constructor(
    private config: ConfigService,
    private ingestion: TrackingIngestionService,
  ) {}

  async start(): Promise<void> {
    const enabled = this.config.get<boolean>('app.deviceTcpEnabled');
    if (!enabled) {
      this.logger.log('TCP device transport disabled (DEVICE_TCP_ENABLED=false)');
      return;
    }
    const port = this.config.get<number>('app.deviceTcpPort') ?? 5023;
    this.server = net.createServer((socket) => {
      socket.on('data', (buf: Buffer) => {
        this.ingestion.ingestRaw(buf).catch((e) =>
          this.logger.warn(`ingest failed: ${e.message}`),
        );
      });
    });
    await new Promise<void>((resolve) =>
      this.server!.listen(port, () => resolve()),
    );
    this.running = true;
    this.logger.log(`TCP device transport listening on :${port}`);
  }

  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => this.server!.close(() => resolve()));
      this.server = null;
    }
    this.running = false;
  }

  async onModuleDestroy() {
    await this.stop();
  }
}
