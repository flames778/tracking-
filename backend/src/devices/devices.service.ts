import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDeviceDto, UpdateDeviceDto } from './dto';

@Injectable()
export class DevicesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getOwned(organizationId: string, id: string) {
    const device = await this.prisma.device.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { vehicle: true },
    });
    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  list(organizationId: string, q: { status?: string; search?: string; limit?: string }) {
    const limit = Math.min(parseInt(q.limit ?? '50', 10) || 50, 200);
    const where: any = { organizationId, deletedAt: null };
    if (q.status) where.status = q.status;
    if (q.search) where.imei = { contains: q.search };
    return this.prisma.device.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { vehicle: true },
    });
  }

  async create(organizationId: string, userId: string, dto: CreateDeviceDto) {
    const clash = await this.prisma.device.findUnique({
      where: { imei: dto.imei },
    });
    if (clash) throw new ConflictException('IMEI already registered');
    const device = await this.prisma.device.create({
      data: { ...dto, organizationId, status: 'UNASSIGNED' },
    });
    await this.audit.log({
      organizationId,
      userId,
      action: 'DEVICE_CREATED',
      entityType: 'Device',
      entityId: device.id,
    });
    return device;
  }

  async update(organizationId: string, userId: string, id: string, dto: UpdateDeviceDto) {
    await this.getOwned(organizationId, id);
    const updated = await this.prisma.device.update({
      where: { id },
      data: dto,
    });
    await this.audit.log({
      organizationId,
      userId,
      action: 'DEVICE_UPDATED',
      entityType: 'Device',
      entityId: id,
      metadata: dto,
    });
    return updated;
  }

  /**
   * Atomic assignment with history row. A vehicle keeps at most one active
   * device: any other device currently on the vehicle is unassigned in the
   * same transaction.
   */
  async assign(organizationId: string, userId: string, deviceId: string, vehicleId: string) {
    const device = await this.getOwned(organizationId, deviceId);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, organizationId, deletedAt: null },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const displaced = await this.prisma.device.findMany({
      where: { vehicleId, id: { not: deviceId }, deletedAt: null },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      // close any open assignment for this device
      await tx.deviceAssignment.updateMany({
        where: { deviceId, unassignedAt: null },
        data: { unassignedAt: new Date() },
      });
      await tx.deviceAssignment.create({
        data: { organizationId, deviceId, vehicleId },
      });
      // one active device per vehicle: release the previous one
      if (displaced.length) {
        await tx.deviceAssignment.updateMany({
          where: { deviceId: { in: displaced.map((d) => d.id) }, unassignedAt: null },
          data: { unassignedAt: new Date() },
        });
        await tx.device.updateMany({
          where: { id: { in: displaced.map((d) => d.id) } },
          data: { vehicleId: null, status: 'UNASSIGNED' },
        });
      }
      await tx.device.update({
        where: { id: deviceId },
        data: { vehicleId, status: 'ACTIVE' },
      });
    });
    await this.audit.log({
      organizationId,
      userId,
      action: 'DEVICE_ASSIGNED',
      entityType: 'Device',
      entityId: deviceId,
      metadata: {
        vehicleId,
        previousVehicleId: device.vehicleId,
        displacedDeviceIds: displaced.map((d) => d.id),
      },
    });
    return this.getOwned(organizationId, deviceId);
  }

  async unassign(organizationId: string, userId: string, deviceId: string) {
    const device = await this.getOwned(organizationId, deviceId);
    await this.prisma.$transaction(async (tx) => {
      await tx.deviceAssignment.updateMany({
        where: { deviceId, unassignedAt: null },
        data: { unassignedAt: new Date() },
      });
      await tx.device.update({
        where: { id: deviceId },
        data: { vehicleId: null, status: 'UNASSIGNED' },
      });
      // a vehicle with no device has no current state
      if (device.vehicleId) {
        await tx.vehicleLatestState.deleteMany({ where: { vehicleId: device.vehicleId } });
      }
    });
    await this.audit.log({
      organizationId,
      userId,
      action: 'DEVICE_UNASSIGNED',
      entityType: 'Device',
      entityId: deviceId,
    });
    return { ok: true };
  }

  /**
   * Soft delete. Telemetry, trips, alerts and audit history are retained;
   * the device is released and can no longer transmit.
   */
  async remove(organizationId: string, userId: string, deviceId: string) {
    const device = await this.getOwned(organizationId, deviceId);
    await this.prisma.$transaction(async (tx) => {
      await tx.deviceAssignment.updateMany({
        where: { deviceId, unassignedAt: null },
        data: { unassignedAt: new Date() },
      });
      await tx.device.update({
        where: { id: deviceId },
        data: {
          vehicleId: null,
          status: 'INACTIVE',
          deletedAt: new Date(),
        },
      });
      if (device.vehicleId) {
        await tx.vehicleLatestState.deleteMany({ where: { vehicleId: device.vehicleId } });
      }
    });
    await this.audit.log({
      organizationId,
      userId,
      action: 'DEVICE_DELETED',
      entityType: 'Device',
      entityId: deviceId,
      metadata: { imei: device.imei, previousVehicleId: device.vehicleId },
    });
    return { ok: true };
  }

  async status(organizationId: string, id: string) {
    const d = await this.getOwned(organizationId, id);
    return {
      id: d.id,
      imei: d.imei,
      status: d.status,
      lastSeenAt: d.lastSeenAt,
      lastLatitude: d.lastLatitude,
      lastLongitude: d.lastLongitude,
      vehicleId: d.vehicleId,
    };
  }

  history(organizationId: string, id: string) {
    return this.getOwned(organizationId, id).then(() =>
      this.prisma.deviceAssignment.findMany({
        where: { deviceId: id, organizationId },
        orderBy: { assignedAt: 'desc' },
        include: { vehicle: { select: { id: true, name: true, registrationNumber: true } } },
      }),
    );
  }
}
