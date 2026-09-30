import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QUEUES } from '../../config/constants';

/** Notification + device-status + retention workers (fault-isolated). */
@Processor(QUEUES.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  constructor(private prisma: PrismaService) {
    super();
  }
  async process(job: Job) {
    const { notificationId } = job.data as { notificationId: string };
    try {
      // In-app channel: mark SENT immediately. EMAIL/SMS adapters plug in here.
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'SENT', sentAt: new Date() },
      });
      return { ok: true };
    } catch (e: any) {
      this.logger.warn(`notification ${notificationId} failed: ${e.message}`);
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'FAILED' },
      }).catch(() => null);
      throw e;
    }
  }
}

@Processor(QUEUES.DEVICE_STATUS)
export class DeviceStatusProcessor extends WorkerHost {
  private readonly logger = new Logger(DeviceStatusProcessor.name);
  constructor(private prisma: PrismaService) {
    super();
  }
  async process(_job: Job) {
    const thresholdSec = Number(process.env.DEVICE_OFFLINE_THRESHOLD_SECONDS ?? 300);
    const cutoff = new Date(Date.now() - thresholdSec * 1000);
    // Mark stale devices offline (single pass, no alert spam — alert only on transition)
    const stale = await this.prisma.vehicleLatestState.findMany({
      where: {
        connectionStatus: 'ONLINE',
        lastTelemetryAt: { lt: cutoff },
      },
      take: 500,
    });
    for (const s of stale) {
      await this.prisma.vehicleLatestState.update({
        where: { vehicleId: s.vehicleId },
        data: { connectionStatus: 'OFFLINE' },
      });
      // transition alert (cooldown-guarded by existing OPEN alert check)
      const existing = await this.prisma.alert.findFirst({
        where: {
          vehicleId: s.vehicleId,
          type: 'DEVICE_OFFLINE',
          status: 'OPEN',
        },
      });
      if (!existing) {
        await this.prisma.alert.create({
          data: {
            organizationId: s.organizationId,
            vehicleId: s.vehicleId,
            deviceId: s.deviceId,
            type: 'DEVICE_OFFLINE',
            severity: 'WARNING',
            status: 'OPEN',
            title: 'Device offline',
            message: `No telemetry for > ${thresholdSec}s`,
            occurredAt: new Date(),
          },
        });
      }
    }
    return { markedOffline: stale.length };
  }
}

@Processor(QUEUES.RETENTION)
export class RetentionProcessor extends WorkerHost {
  private readonly logger = new Logger(RetentionProcessor.name);
  constructor(private prisma: PrismaService) {
    super();
  }
  async process(_job: Job) {
    const days = Number(process.env.TELEMETRY_RETENTION_DAYS ?? process.env.RAW_TELEMETRY_RETENTION_DAYS ?? 365);
    if (!days || days <= 0) return { skipped: true };
    const cutoff = new Date(Date.now() - days * 864e5);
    const telemetry = await this.prisma.telemetry.deleteMany({
      where: { timestamp: { lt: cutoff } },
    });
    this.logger.log(`retention: deleted ${telemetry.count} telemetry rows older than ${days}d`);
    return { deletedTelemetry: telemetry.count };
  }
}
