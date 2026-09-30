import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { REALTIME_EVENTS } from '../config/constants';
import { TripEngine, EngineCtx } from './engines/trip.engine';
import { GeofenceEngine } from './engines/geofence.engine';
import { AlertEngine } from './engines/alert.engine';
import { FuelEngine } from './engines/fuel.engine';
import { SecondaryProcessingJobData } from './secondary-processing.types';

/**
 * Everything derived from a telemetry point: trips, geofence transitions,
 * alerts and fuel events. Deliberately separate from ingestion so the device
 * path stays fast — this runs on the worker, off the request/ingest thread.
 */
@Injectable()
export class SecondaryProcessingService {
  private readonly logger = new Logger(SecondaryProcessingService.name);

  constructor(
    private prisma: PrismaService,
    private trips: TripEngine,
    private geofences: GeofenceEngine,
    private alerts: AlertEngine,
    private fuel: FuelEngine,
    private realtime: RealtimeService,
  ) {}

  async process(data: SecondaryProcessingJobData) {
    // Exactly-once: whichever path (queue worker or inline fallback) claims
    // the row first does the work; the other becomes a no-op.
    const claim = await this.prisma.telemetry.updateMany({
      where: { id: data.telemetryId, secondaryProcessedAt: null },
      data: { secondaryProcessedAt: new Date() },
    });
    if (claim.count === 0) return { skipped: true, reason: 'already-processed' };

    const telemetry = await this.prisma.telemetry.findUnique({
      where: { id: data.telemetryId },
    });
    if (!telemetry || !telemetry.vehicleId) return { skipped: true };

    const ctx: EngineCtx = {
      organizationId: telemetry.organizationId,
      vehicleId: telemetry.vehicleId,
      deviceId: telemetry.deviceId,
      telemetry,
      validated: telemetry,
      prevIgnition: data.prevIgnition,
    };

    let tripEvent: string | null = null;
    try {
      tripEvent = await this.trips.process(ctx);
    } catch (e: any) {
      this.logger.warn(`trip engine failed for ${data.telemetryId}: ${e.message}`);
    }
    let geoEvents: any[] = [];
    try {
      geoEvents = await this.geofences.process(ctx);
    } catch (e: any) {
      this.logger.warn(`geofence engine failed for ${data.telemetryId}: ${e.message}`);
    }
    try {
      await this.alerts.process({ ...ctx, tripEvent });
    } catch (e: any) {
      this.logger.warn(`alert engine failed for ${data.telemetryId}: ${e.message}`);
    }
    try {
      await this.fuel.process(ctx);
    } catch (e: any) {
      this.logger.warn(`fuel engine failed for ${data.telemetryId}: ${e.message}`);
    }

    const { organizationId, vehicleId } = ctx;
    if (tripEvent === 'STARTED') {
      await this.safeEmit(organizationId, vehicleId, REALTIME_EVENTS.TRIP_STARTED, {
        vehicleId,
        timestamp: telemetry.timestamp,
      });
    } else if (tripEvent === 'ENDED') {
      await this.safeEmit(organizationId, vehicleId, REALTIME_EVENTS.TRIP_ENDED, {
        vehicleId,
        timestamp: telemetry.timestamp,
      });
    }
    for (const g of geoEvents ?? []) {
      await this.safeEmit(
        organizationId,
        vehicleId,
        g.entered ? REALTIME_EVENTS.GEOFENCE_ENTERED : REALTIME_EVENTS.GEOFENCE_EXITED,
        g,
      );
    }
    return { tripEvent, geofenceEvents: geoEvents.length };
  }

  private async safeEmit(organizationId: string, vehicleId: string, event: string, payload: unknown) {
    await this.realtime
      .emitToVehicle(organizationId, vehicleId, event, payload)
      .catch(() => null);
  }
}
