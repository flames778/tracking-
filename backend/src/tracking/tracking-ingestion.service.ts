import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import { ProtocolRegistry } from './adapters/protocol-registry';
import { ParsedTelemetry } from './adapters/protocol-adapter.interface';
import { validateTelemetry } from './telemetry-validator';
import { SecondaryProcessingService } from './secondary-processing.service';
import {
  SECONDARY_PROCESSING_JOB,
  SecondaryProcessingJobData,
} from './secondary-processing.types';
import { RealtimeService } from '../realtime/realtime.service';
import { QUEUES, REALTIME_EVENTS } from '../config/constants';

const QUEUE_ENQUEUE_TIMEOUT_MS = 1000;

@Injectable()
export class TrackingIngestionService {
  private readonly logger = new Logger(TrackingIngestionService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private registry: ProtocolRegistry,
    private secondary: SecondaryProcessingService,
    @InjectQueue(QUEUES.TRIP) private tripQueue: Queue,
    @Inject(forwardRef(() => RealtimeService))
    private realtime: RealtimeService,
  ) {}

  /** Entry for TCP/UDP transports — selects adapter, parses, processes. */
  async ingestRaw(message: Buffer | string): Promise<void> {
    const adapter = this.registry.resolve(message);
    if (!adapter) {
      await this.prisma.deviceMessageLog.create({
        data: {
          reason: 'PROTOCOL_NOT_SUPPORTED',
          rawMessage: preview(message),
        },
      });
      return;
    }
    let parsed: ParsedTelemetry | null = null;
    try {
      parsed = adapter.parse(message);
    } catch (e: any) {
      await this.prisma.deviceMessageLog.create({
        data: {
          reason: `PARSE_ERROR:${adapter.name}:${e.message}`.slice(0, 200),
          rawMessage: preview(message),
        },
      });
      return;
    }
    if (!parsed) {
      await this.prisma.deviceMessageLog.create({
        data: { reason: `PARSE_NULL:${adapter.name}`, rawMessage: preview(message) },
      });
      return;
    }
    await this.ingest(parsed);
  }

  /** Main pipeline — also used directly by simulator + HTTP ingestion. */
  async ingest(t: ParsedTelemetry) {
    // 1. Identify + authenticate device
    const device = await this.prisma.device.findUnique({
      where: { imei: t.imei },
      include: { vehicle: true },
    });
    if (!device) {
      await this.prisma.deviceMessageLog.create({
        data: { imei: t.imei, reason: 'UNKNOWN_DEVICE' },
      });
      throw Object.assign(new Error('Unknown device'), { status: 404, code: 'DEVICE_NOT_FOUND' });
    }
    if (device.status !== 'ACTIVE') {
      await this.prisma.deviceMessageLog.create({
        data: { imei: t.imei, reason: `DEVICE_${device.status}` },
      });
      throw Object.assign(new Error(`Device is ${device.status}`), {
        status: 403,
        code: 'DEVICE_INACTIVE',
      });
    }
    const organizationId = device.organizationId;
    const vehicleId = device.vehicleId;
    if (!vehicleId) {
      this.logger.warn(`device ${t.imei} has no vehicle assignment`);
    }

    // 2. Validate (with last-point context for jump detection)
    const validated = validateTelemetry(t, this.config, {
      lastLat: device.lastLatitude,
      lastLng: device.lastLongitude,
      lastTimestamp: device.lastSeenAt,
    });
    if (validated.quality === 'INVALID') {
      await this.prisma.deviceMessageLog.create({
        data: {
          imei: t.imei,
          reason: `INVALID_TELEMETRY:${validated.rejectionReason}`,
        },
      });
      throw Object.assign(
        new Error(`Invalid telemetry: ${validated.rejectionReason}`),
        { status: 400, code: 'INVALID_TELEMETRY' },
      );
    }

    // 3. Deduplicate (sequenceNumber or exact imei+timestamp+coords)
    if (validated.sequenceNumber) {
      const dup = await this.prisma.telemetry.findFirst({
        where: {
          deviceId: device.id,
          timestamp: validated.timestamp,
          speedKph: validated.speedKph,
        },
      });
      if (dup) return dup;
    }

    // 4. Persist telemetry (+ fuel reading when present)
    const telemetry = await this.prisma.telemetry.create({
      data: {
        deviceId: device.id,
        vehicleId: vehicleId ?? undefined,
        organizationId,
        timestamp: validated.timestamp,
        latitude: validated.latitude,
        longitude: validated.longitude,
        speedKph: validated.speedKph,
        heading: validated.heading,
        ignition: validated.ignition,
        batteryVoltage: validated.batteryVoltage,
        fuelPercentage: validated.fuelPercentage,
        fuelLiters: validated.fuelLiters,
        odometerKm: validated.odometerKm,
        satellites: validated.satellites,
        gsmSignal: validated.gsmSignal,
        engineStatus: validated.engineStatus,
        quality: validated.quality,
        sequenceNumber: validated.sequenceNumber,
        rawData: (validated.rawData ?? undefined) as any,
      },
    });

    if (
      vehicleId &&
      (validated.fuelPercentage != null || validated.fuelLiters != null)
    ) {
      await this.prisma.fuelReading
        .create({
          data: {
            organizationId,
            vehicleId,
            deviceId: device.id,
            timestamp: validated.timestamp,
            percentage: validated.fuelPercentage,
            liters: validated.fuelLiters,
            source: 'SENSOR',
          },
        })
        .catch(() => null);
    }

    // 5. Update latest state + device last-seen (controlled, atomic-ish)
    const prevState = vehicleId
      ? await this.prisma.vehicleLatestState.findUnique({ where: { vehicleId } })
      : null;
    const wasOnline = prevState?.connectionStatus === 'ONLINE';
    const prevIgnition = prevState?.ignition;

    if (vehicleId) {
      await this.prisma.vehicleLatestState.upsert({
        where: { vehicleId },
        update: {
          organizationId,
          deviceId: device.id,
          latitude: validated.latitude,
          longitude: validated.longitude,
          speedKph: validated.speedKph,
          heading: validated.heading,
          ignition: validated.ignition,
          fuelPercentage: validated.fuelPercentage,
          batteryVoltage: validated.batteryVoltage,
          odometerKm: validated.odometerKm,
          lastTelemetryAt: validated.timestamp,
          connectionStatus: 'ONLINE',
        },
        create: {
          vehicleId,
          organizationId,
          deviceId: device.id,
          latitude: validated.latitude,
          longitude: validated.longitude,
          speedKph: validated.speedKph,
          heading: validated.heading,
          ignition: validated.ignition,
          fuelPercentage: validated.fuelPercentage,
          batteryVoltage: validated.batteryVoltage,
          odometerKm: validated.odometerKm,
          lastTelemetryAt: validated.timestamp,
          connectionStatus: 'ONLINE',
        },
      });
    }
    await this.prisma.device.update({
      where: { id: device.id },
      data: {
        lastSeenAt: new Date(),
        lastLatitude: validated.latitude,
        lastLongitude: validated.longitude,
        status: 'ACTIVE',
      },
    });

    // 6. Secondary processing (trips, geofences, alerts, fuel) is queued so
    //    the device path never blocks on derived data. If the broker is
    //    unreachable the work runs inline so nothing is silently lost.
    if (vehicleId) {
      const job: SecondaryProcessingJobData = {
        telemetryId: telemetry.id,
        prevIgnition,
      };
      let queued = false;
      try {
        // BullMQ queues commands while disconnected, so an unreachable
        // broker would otherwise stall ingestion forever. Bound the wait and
        // fall back to inline work; the claim column keeps it exactly-once.
        await Promise.race([
          this.tripQueue.add(SECONDARY_PROCESSING_JOB, job, {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 5000,
            removeOnFail: 1000,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('broker unreachable')), QUEUE_ENQUEUE_TIMEOUT_MS),
          ),
        ]);
        queued = true;
      } catch (e: any) {
        this.logger.warn(`queue unavailable (${e.message}); processing inline`);
      }
      if (!queued) {
        await this.secondary.process(job).catch((e) =>
          this.logger.error(`inline secondary processing failed: ${e.message}`),
        );
      }
    }

    // 7. Broadcast the live point immediately — the map does not wait for
    //    trip/alert processing. Only the vehicle's own org can receive it.
    if (vehicleId) {
      this.realtime
        .emitToVehicle(organizationId, vehicleId, REALTIME_EVENTS.TELEMETRY_UPDATED, {
          vehicleId,
          latitude: validated.latitude,
          longitude: validated.longitude,
          speedKph: validated.speedKph,
          heading: validated.heading,
          ignition: validated.ignition,
          batteryVoltage: validated.batteryVoltage,
          fuelPercentage: validated.fuelPercentage,
          timestamp: validated.timestamp,
        })
        .catch(() => null);
      if (!wasOnline) {
        this.realtime
          .emitToVehicle(organizationId, vehicleId, REALTIME_EVENTS.CONNECTED, {
            vehicleId,
            timestamp: new Date(),
          })
          .catch(() => null);
      }
      if (
        prevIgnition !== undefined &&
        prevIgnition !== validated.ignition &&
        validated.ignition !== undefined
      ) {
        this.realtime
          .emitToVehicle(organizationId, vehicleId, REALTIME_EVENTS.IGNITION_CHANGED, {
            vehicleId,
            ignition: validated.ignition,
            timestamp: validated.timestamp,
          })
          .catch(() => null);
      }
    }

    return telemetry;
  }
}

function preview(message: Buffer | string): string {
  try {
    const s = Buffer.isBuffer(message) ? message.toString('utf8') : String(message);
    return s.slice(0, 500);
  } catch {
    return '<binary>';
  }
}
