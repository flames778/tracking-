import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUES } from '../config/constants';

/**
 * Registers the repeatable jobs the system depends on. Runs in the worker
 * process only, so a scaled API tier never registers duplicate schedules.
 * BullMQ dedupes repeatables by job id, so restarts are safe.
 */
@Injectable()
export class JobSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobSchedulerService.name);

  constructor(
    @InjectQueue(QUEUES.DEVICE_STATUS) private readonly deviceStatusQueue: Queue,
    @InjectQueue(QUEUES.RETENTION) private readonly retentionQueue: Queue,
  ) {}

  async onApplicationBootstrap() {
    const offlineMs = Number(process.env.DEVICE_OFFLINE_THRESHOLD_SECONDS ?? 300) * 1000;
    await this.deviceStatusQueue.add(
      'device-status-sweep',
      {},
      {
        repeat: { every: 60_000 },
        jobId: 'repeat:device-status-sweep',
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );
    this.logger.log(`device offline sweep scheduled every 60s (threshold ${offlineMs / 1000}s)`);

    await this.retentionQueue.add(
      'telemetry-retention',
      {},
      {
        repeat: { pattern: '17 3 * * *' },
        jobId: 'repeat:telemetry-retention',
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );
    this.logger.log('telemetry retention scheduled daily at 03:17');
  }
}
