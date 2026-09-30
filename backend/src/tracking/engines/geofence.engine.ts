import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { isInsideGeofence } from '../../common/utils/geo.util';
import { AlertEngine } from './alert.engine';
import { EngineCtx } from './trip.engine';

@Injectable()
export class GeofenceEngine {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AlertEngine))
    private alerts: AlertEngine,
  ) {}

  /** Evaluate all active org geofences; emit events only on transitions. */
  async process(ctx: EngineCtx) {
    const { organizationId, vehicleId, validated } = ctx;
    const fences = await this.prisma.geofence.findMany({
      where: { organizationId, active: true, deletedAt: null },
    });
    const out: any[] = [];
    for (const fence of fences) {
      const inside = isInsideGeofence(validated.latitude, validated.longitude, fence as any);
      const state = await this.prisma.geofenceVehicleState.upsert({
        where: { geofenceId_vehicleId: { geofenceId: fence.id, vehicleId } },
        update: {},
        create: { geofenceId: fence.id, vehicleId, isInside: !inside },
      });
      if (state.isInside !== inside) {
        await this.prisma.geofenceVehicleState.update({
          where: { geofenceId_vehicleId: { geofenceId: fence.id, vehicleId } },
          data: { isInside: inside },
        });
        const event = await this.prisma.geofenceEvent.create({
          data: {
            organizationId,
            geofenceId: fence.id,
            vehicleId,
            eventType: inside ? 'ENTER' : 'EXIT',
            timestamp: validated.timestamp,
            latitude: validated.latitude,
            longitude: validated.longitude,
          },
        });
        // Alert (with notification + realtime) goes through the alert engine
        // so cooldown rules and delivery behave like every other alert type.
        if ((inside && fence.enterAlertEnabled) || (!inside && fence.exitAlertEnabled)) {
          const last = await this.prisma.alert.findFirst({
            where: { organizationId, vehicleId, geofenceId: fence.id },
            orderBy: { occurredAt: 'desc' },
          });
          const cooldownSec = 60;
          const cooled =
            !last || Date.now() - last.occurredAt.getTime() > cooldownSec * 1000;
          if (cooled) {
            await this.alerts.raise({
              organizationId,
              vehicleId,
              deviceId: ctx.deviceId,
              geofenceId: fence.id,
              type: inside ? 'GEOFENCE_ENTER' : 'GEOFENCE_EXIT',
              severity: 'INFO',
              title: `${fence.name}: ${inside ? 'entered' : 'exited'}`,
              message: `Vehicle ${inside ? 'entered' : 'exited'} geofence ${fence.name}`,
              validated,
              metadata: { geofenceName: fence.name, eventType: inside ? 'ENTER' : 'EXIT' },
            });
          }
        }
        out.push({ ...event, entered: inside, geofenceId: fence.id, geofenceName: fence.name, vehicleId });
      }
    }
    return out;
  }
}
