import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { haversineKm } from '../../common/utils/geo.util';

export interface EngineCtx {
  organizationId: string;
  vehicleId: string;
  deviceId: string;
  telemetry: any;
  validated: any;
  prevIgnition?: boolean | null;
}

/**
 * Trip detection supporting both ignition-based and movement-based starts.
 * - START: ignition ON (edge) OR sustained movement (>5km/h)
 * - END: ignition OFF (edge) OR stillness for TRIP_END_STILL_SECONDS
 * - Graceful gap handling: single missing points don't end trips.
 */
@Injectable()
export class TripEngine {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async process(ctx: EngineCtx): Promise<'STARTED' | 'ENDED' | null> {
    const { organizationId, vehicleId, deviceId, validated } = ctx;
    const open = await this.prisma.trip.findFirst({
      where: {
        vehicleId,
        status: { in: ['ACTIVE', 'IN_PROGRESS', 'STARTING'] },
      },
      orderBy: { startedAt: 'desc' },
    });

    const moving = (validated.speedKph ?? 0) > 5;
    const ignition = validated.ignition;

    // explicit ignition edges take precedence
    if (ignition === true && !open) {
      await this.startTrip(ctx);
      return 'STARTED';
    }
    if (ignition === false && open) {
      await this.endTrip(open, validated);
      return 'ENDED';
    }

    if (!open && moving) {
      // movement-based start (device without ignition)
      await this.startTrip(ctx);
      return 'STARTED';
    }

    if (open) {
      await this.updateTrip(open, validated);
      // stillness-based end
      const stillThresholdSec =
        parseInt(process.env.TRIP_END_STILL_SECONDS ?? '600', 10) || 600;
      const lastMove = await this.lastMovementTime(vehicleId, open.id);
      if (!moving && lastMove) {
        const stillSec = (validated.timestamp.getTime() - lastMove.getTime()) / 1000;
        if (stillSec > stillThresholdSec && ignition !== true) {
          const fresh = (await this.refresh(open.id)) ?? {};
          await this.endTrip({ ...open, ...fresh }, validated);
          return 'ENDED';
        }
      }
    }
    return null;
  }

  private async startTrip(ctx: EngineCtx) {
    return this.prisma.trip.create({
      data: {
        organizationId: ctx.organizationId,
        vehicleId: ctx.vehicleId,
        deviceId: ctx.deviceId,
        status: 'ACTIVE',
        startedAt: ctx.validated.timestamp,
        startLatitude: ctx.validated.latitude,
        startLongitude: ctx.validated.longitude,
        startOdometerKm: ctx.validated.odometerKm,
        maxSpeedKph: ctx.validated.speedKph ?? 0,
      },
    });
  }

  private async updateTrip(open: any, validated: any) {
    // The current telemetry row is already persisted, so the previous
    // point is the second-most-recent row. Using [0] would measure
    // distance from a point to itself (0 km).
    const prevPoints = await this.prisma.telemetry.findMany({
      where: {
        vehicleId: open.vehicleId,
        timestamp: { gte: open.startedAt, lt: validated.timestamp },
      },
      orderBy: { timestamp: 'desc' },
      take: 1,
    });
    let addedKm = 0;
    let gapSeconds = 0;
    if (prevPoints.length === 1) {
      const p = prevPoints[0];
      addedKm = haversineKm(p.latitude, p.longitude, validated.latitude, validated.longitude);
      if (addedKm > 50) addedKm = 0; // GPS glitch guard
      gapSeconds = Math.max(
        0,
        (validated.timestamp.getTime() - new Date(p.timestamp).getTime()) / 1000,
      );
      if (gapSeconds > 3600) gapSeconds = 0; // huge gap: don't credit idle time
    }

    const startedAt = new Date(open.startedAt).getTime();
    const now = validated.timestamp.getTime();
    const durationSeconds = Math.max(0, Math.round((now - startedAt) / 1000));
    const isMoving = (validated.speedKph ?? 0) > 3;

    await this.prisma.trip.update({
      where: { id: open.id },
      data: {
        distanceKm: (open.distanceKm ?? 0) + addedKm,
        gpsDistanceKm: (open.gpsDistanceKm ?? 0) + addedKm,
        durationSeconds,
        movingDurationSeconds:
          (open.movingDurationSeconds ?? 0) + (isMoving ? gapSeconds : 0),
        idleDurationSeconds:
          (open.idleDurationSeconds ?? 0) + (isMoving ? 0 : gapSeconds),
        maxSpeedKph: Math.max(open.maxSpeedKph ?? 0, validated.speedKph ?? 0),
      },
    });
  }

  private async endTrip(open: any, validated: any) {
    const minDuration =
      parseInt(process.env.TRIP_MIN_DURATION_SECONDS ?? '120', 10) || 120;
    const durationSeconds = Math.max(
      0,
      Math.round((validated.timestamp.getTime() - new Date(open.startedAt).getTime()) / 1000),
    );
    if (durationSeconds < minDuration && (open.distanceKm ?? 0) < 0.1) {
      await this.prisma.trip.update({
        where: { id: open.id },
        data: { status: 'CANCELLED', endedAt: validated.timestamp },
      });
      return;
    }
    const avg = durationSeconds > 0 ? ((open.distanceKm ?? 0) / durationSeconds) * 3600 : 0;
    await this.prisma.trip.update({
      where: { id: open.id },
      data: {
        status: 'COMPLETED',
        endedAt: validated.timestamp,
        endLatitude: validated.latitude,
        endLongitude: validated.longitude,
        endOdometerKm: validated.odometerKm,
        durationSeconds,
        averageSpeedKph: Math.min(avg, 300),
      },
    });
  }

  private async lastMovementTime(vehicleId: string, _tripId: string): Promise<Date | null> {
    const last = await this.prisma.telemetry.findFirst({
      where: { vehicleId, speedKph: { gt: 5 } },
      orderBy: { timestamp: 'desc' },
    });
    return last ? last.timestamp : null;
  }

  private async refresh(id: string) {
    return this.prisma.trip.findUnique({ where: { id } });
  }
}
