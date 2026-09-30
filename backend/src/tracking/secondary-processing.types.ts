/** Payload for the secondary (derived data) processing queue. */
export interface SecondaryProcessingJobData {
  telemetryId: string;
  /**
   * Ignition state of the vehicle *before* this point was applied, so
   * ignition-change events are still detected when processing happens
   * asynchronously (the previous row may already have been overwritten).
   */
  prevIgnition?: boolean | null;
}

export const SECONDARY_PROCESSING_JOB = 'telemetry.secondary-processing';
