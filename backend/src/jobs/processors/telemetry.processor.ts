import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SecondaryProcessingService } from '../../tracking/secondary-processing.service';
import {
  SECONDARY_PROCESSING_JOB,
  SecondaryProcessingJobData,
} from '../../tracking/secondary-processing.types';
import { QUEUES } from '../../config/constants';

/** Derives trips, geofence events, alerts and fuel events from a telemetry point. */
@Processor(QUEUES.TRIP, { concurrency: 20 })
export class TelemetryProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(TelemetryProcessingProcessor.name);

  constructor(private secondary: SecondaryProcessingService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== SECONDARY_PROCESSING_JOB) return { ignored: job.name };
    try {
      return await this.secondary.process(job.data as SecondaryProcessingJobData);
    } catch (e: any) {
      this.logger.error(`secondary processing failed for job ${job.id}: ${e.message}`);
      throw e;
    }
  }
}
