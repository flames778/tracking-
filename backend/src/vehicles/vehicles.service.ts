import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto';

@Injectable()
export class VehiclesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** Tenant-scoped fetch — returns 404 (not 403) for cross-tenant IDs to avoid leaking existence. */
  async getOwned(organizationId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        devices: { where: { deletedAt: null } },
        latestState: true,
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  list(organizationId: string, q: { search?: string; status?: string; limit?: string; cursor?: string }) {
    const limit = Math.min(parseInt(q.limit ?? '25', 10) || 25, 100);
    const where: any = { organizationId, deletedAt: null };
    if (q.status) where.status = q.status;
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { registrationNumber: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.cursor) where.id = { lt: q.cursor };
    return this.prisma.vehicle
      .findMany({
        where,
        orderBy: { id: 'desc' },
        take: limit + 1,
        include: { latestState: true, devices: { where: { deletedAt: null } } },
      })
      .then((rows) => {
        const hasMore = rows.length > limit;
        const data = hasMore ? rows.slice(0, limit) : rows;
        return {
          data,
          meta: {
            nextCursor: hasMore ? data[data.length - 1].id : null,
            hasMore,
          },
        };
      });
  }

  async create(organizationId: string, userId: string, dto: CreateVehicleDto) {
    const vehicle = await this.prisma.vehicle.create({
      data: { ...dto, organizationId },
    });
    await this.audit.log({
      organizationId,
      userId,
      action: 'VEHICLE_CREATED',
      entityType: 'Vehicle',
      entityId: vehicle.id,
    });
    return vehicle;
  }

  async update(organizationId: string, userId: string, id: string, dto: UpdateVehicleDto) {
    await this.getOwned(organizationId, id);
    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: dto,
    });
    await this.audit.log({
      organizationId,
      userId,
      action: 'VEHICLE_UPDATED',
      entityType: 'Vehicle',
      entityId: id,
      metadata: dto,
    });
    return updated;
  }

  /** Soft delete: keep telemetry/trips/alerts for reporting & audit. */
  async remove(organizationId: string, userId: string, id: string) {
    await this.getOwned(organizationId, id);
    await this.prisma.$transaction([
      this.prisma.device.updateMany({
        where: { vehicleId: id, organizationId },
        data: { vehicleId: null, status: 'UNASSIGNED' },
      }),
      this.prisma.vehicle.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'INACTIVE' },
      }),
    ]);
    await this.audit.log({
      organizationId,
      userId,
      action: 'VEHICLE_DELETED',
      entityType: 'Vehicle',
      entityId: id,
    });
    return { ok: true };
  }

  latest(organizationId: string, id: string) {
    return this.getOwned(organizationId, id).then(async (v) => {
      const state = await this.prisma.vehicleLatestState.findUnique({
        where: { vehicleId: v.id },
      });
      return this.toFrontendContract(v, state);
    });
  }

  /** Normalized frontend contract — no protocol internals leak. */
  toFrontendContract(vehicle: any, state: any) {
    if (!state) {
      return {
        vehicleId: vehicle.id,
        timestamp: null,
        location: null,
        speed: 0,
        heading: 0,
        ignition: null,
        fuel: null,
        batteryVoltage: null,
        connectionStatus: 'offline',
        odometer: vehicle.odometer ?? null,
        fuelUnavailable: true,
      };
    }
    const hasFuel = state.fuelPercentage != null;
    return {
      vehicleId: vehicle.id ?? state.vehicleId,
      timestamp: state.lastTelemetryAt,
      location:
        state.latitude != null
          ? { latitude: state.latitude, longitude: state.longitude }
          : null,
      speed: state.speedKph ?? 0,
      heading: state.heading ?? 0,
      ignition: state.ignition ?? null,
      fuel: hasFuel
        ? { percentage: state.fuelPercentage }
        : null,
      fuelUnavailable: !hasFuel,
      batteryVoltage: state.batteryVoltage ?? null,
      connectionStatus:
        state.connectionStatus === 'ONLINE' ? 'online' : 'offline',
      odometer: state.odometerKm ?? vehicle.odometer ?? null,
    };
  }
}
