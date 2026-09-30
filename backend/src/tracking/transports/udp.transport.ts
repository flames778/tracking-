import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dgram from 'dgram';
import { DeviceTransport } from './device-transport.interface';
import { TrackingIngestionService } from '../tracking-ingestion.service';

/** UDP transport skeleton — DISABLED until C003F protocol is known. */
@Injectable()
export class UdpDeviceTransport implements DeviceTransport, OnModuleDestroy {
  readonly name = 'UDP';
  running = false;
  private socket: dgram.Socket | null = null;
  private readonly logger = new Logger(UdpDeviceTransport.name);

  constructor(
    private config: ConfigService,
    private ingestion: TrackingIngestionService,
  ) {}

  async start(): Promise<void> {
    const enabled = this.config.get<boolean>('app.deviceUdpEnabled');
    if (!enabled) {
      this.logger.log('UDP device transport disabled (DEVICE_UDP_ENABLED=false)');
      return;
    }
    const port = this.config.get<number>('app.deviceUdpPort') ?? 5024;
    this.socket = dgram.createSocket('udp4');
    this.socket.on('message', (msg) => {
      this.ingestion.ingestRaw(Buffer.from(msg)).catch((e) =>
        this.logger.warn(`ingest failed: ${e.message}`),
      );
    });
    await new Promise<void>((resolve) => this.socket!.bind(port, () => resolve()));
    this.running = true;
    this.logger.log(`UDP device transport listening on :${port}`);
  }

  async stop(): Promise<void> {
    if (this.socket) {
      await new Promise<void>((resolve) => this.socket!.close(() => resolve()));
      this.socket = null;
    }
    this.running = false;
  }

  async onModuleDestroy() {
    await this.stop();
  }
}
