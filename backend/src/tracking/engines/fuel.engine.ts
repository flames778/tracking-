import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { REALTIME_EVENTS } from '../../config/constants';
import { EngineCtx } from './trip.engine';

/**
 * Fuel processing with neutral terminology (FUEL_DROP_DETECTED, never
 * "theft"). Accounts for sensor noise: ignores sub-threshold jitter and
 * requires sustained change. Works only when sensor data exists.
 */
@Injectable()
export class FuelEngine {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => RealtimeService))
    private realtime: RealtimeService,
  ) {}

  async process(ctx: EngineCtx) {
    const { organizationId, vehicleId, deviceId, validated } = ctx;
    if (validated.fuelPercentage == null && validated.fuelLiters == null) return;

    const last = await this.prisma.fuelReading.findFirst({
      where: { vehicleId },
      orderBy: { timestamp: 'desc' },
      skip: 1, // current reading was just inserted; compare to previous
    });
    if (!last) return;

    const beforePct = last.percentage;
    const afterPct = validated.fuelPercentage;
    if (beforePct == null || afterPct == null) return;

    const delta = afterPct - beforePct;
    const REFILL_THRESHOLD = Number(process.env.FUEL_REFILL_THRESHOLD_PCT ?? 8);
    const DROP_THRESHOLD = Number(process.env.FUEL_DROP_THRESHOLD_PCT ?? 6);

    if (delta >= REFILL_THRESHOLD) {
      const ev = await this.prisma.fuelEvent.create({
        data: {
          organizationId,
          vehicleId,
          deviceId,
          type: 'REFILL',
          timestamp: validated.timestamp,
          beforePercentage: beforePct,
          afterPercentage: afterPct,
          metadata: { deltaPct: delta } as any,
        },
      });
      this.realtime
        .emitToVehicle(organizationId, vehicleId, REALTIME_EVENTS.FUEL_EVENT, ev)
        .catch(() => null);
    } else if (delta <= -DROP_THRESHOLD) {
      // Neutral naming; UI/business layer decides wording.
      const ev = await this.prisma.fuelEvent.create({
        data: {
          organizationId,
          vehicleId,
          deviceId,
          type: 'FUEL_DROP_DETECTED',
          timestamp: validated.timestamp,
          beforePercentage: beforePct,
          afterPercentage: afterPct,
          metadata: { deltaPct: delta } as any,
        },
      });
      this.realtime
        .emitToVehicle(organizationId, vehicleId, REALTIME_EVENTS.FUEL_EVENT, ev)
        .catch(() => null);
    }
  }
}
