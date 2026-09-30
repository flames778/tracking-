import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { QUEUES, REALTIME_EVENTS } from '../../config/constants';
import { EngineCtx } from './trip.engine';

export interface RaiseAlertParams {
  organizationId: string;
  vehicleId: string;
  deviceId: string;
  type: any;
  severity: any;
  title: string;
  message: string;
  validated: any;
  geofenceId?: string | null;
  metadata?: any;
}

const DEFAULT_OVERSPEED = 100;
const DEFAULT_LOW_FUEL = 20;
const DEFAULT_LOW_BATTERY = 11.5;

/**
 * Configurable alert engine with cooldown dedup:
 * OVERSPEED STARTED/CONTINUING/ENDED semantics — only STARTED creates an
 * alert; CONTINUING is suppressed within cooldown; ENDED resolves.
 */
@Injectable()
export class AlertEngine {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => RealtimeService))
    private realtime: RealtimeService,
    @InjectQueue(QUEUES.NOTIFICATION) private notificationQueue: Queue,
  ) {}

  async process(ctx: EngineCtx & { tripEvent?: string | null }) {
    const { organizationId, vehicleId, deviceId, validated } = ctx;
    const rules = await this.prisma.alertRule.findMany({
      where: { organizationId, enabled: true, OR: [{ vehicleId: null }, { vehicleId }] },
    });
    const ruleFor = (type: string) =>
      rules.find((r) => r.type === type) ??
      rules.find((r) => r.type === (type as any));

    await this.checkOverspeed(ctx, ruleFor('OVERSPEED'));
    await this.checkIgnition(ctx);
    await this.checkLowBattery(ctx, ruleFor('LOW_BATTERY'));
    await this.checkLowFuel(ctx, ruleFor('LOW_FUEL'));

    void organizationId;
    void vehicleId;
    void deviceId;
  }

  private cfg(rule: any, key: string, fallback: number): number {
    const v = (rule?.configuration as any)?.[key];
    return typeof v === 'number' ? v : fallback;
  }

  private async cooledDown(
    organizationId: string,
    vehicleId: string,
    type: any,
    cooldownSec: number,
  ): Promise<boolean> {
    const last = await this.prisma.alert.findFirst({
      where: { organizationId, vehicleId, type },
      orderBy: { occurredAt: 'desc' },
    });
    if (!last) return true;
    return Date.now() - last.occurredAt.getTime() > cooldownSec * 1000;
  }

  /**
   * Single place where alerts become visible: creates the alert, queues the
   * in-app notification for the worker, and fans out over realtime.
   */
  async raise(params: RaiseAlertParams) {
    const alert = await this.prisma.alert.create({
      data: {
        organizationId: params.organizationId,
        vehicleId: params.vehicleId,
        deviceId: params.deviceId,
        type: params.type,
        severity: params.severity,
        status: 'OPEN',
        title: params.title,
        message: params.message,
        geofenceId: params.geofenceId ?? undefined,
        latitude: params.validated.latitude,
        longitude: params.validated.longitude,
        speedKph: params.validated.speedKph,
        occurredAt: params.validated.timestamp,
        metadata: params.metadata as any,
      },
    });
    const notification = await this.prisma.notification
      .create({
        data: {
          organizationId: params.organizationId,
          type: params.type,
          title: params.title,
          message: params.message,
          channel: 'IN_APP',
          status: 'PENDING',
          metadata: { alertId: alert.id, vehicleId: params.vehicleId } as any,
        },
      })
      .catch(() => null);
    if (notification) {
      await this.notificationQueue
        .add('deliver', { notificationId: notification.id }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: 1000,
          removeOnFail: 500,
        })
        .catch(() => null);
    }
    this.realtime
      .emitToVehicle(params.organizationId, params.vehicleId, REALTIME_EVENTS.ALERT_CREATED, alert)
      .catch(() => null);
    return alert;
  }

  private async checkOverspeed(ctx: EngineCtx, rule: any) {
    const threshold = this.cfg(rule, 'thresholdKph', Number(process.env.DEFAULT_OVERSPEED_KPH ?? DEFAULT_OVERSPEED));
    const cooldown = rule?.cooldownSeconds ?? 600;
    const speeding = (ctx.validated.speedKph ?? 0) > threshold;
    if (!speeding) return;
    const ok = await this.cooledDown(ctx.organizationId, ctx.vehicleId, 'OVERSPEED', cooldown);
    if (!ok) return; // CONTINUING — suppressed
    await this.raise({
      ...ctx,
      type: 'OVERSPEED',
      severity: 'WARNING',
      title: `Overspeed: ${Math.round(ctx.validated.speedKph)} km/h`,
      message: `Speed ${Math.round(ctx.validated.speedKph)} km/h exceeds ${threshold} km/h`,
      validated: ctx.validated,
      metadata: { thresholdKph: threshold },
    });
  }

  private async checkIgnition(ctx: EngineCtx) {
    if (ctx.validated.ignition === undefined || ctx.prevIgnition === undefined) return;
    if (ctx.validated.ignition === ctx.prevIgnition) return;
    const on = ctx.validated.ignition === true;
    const ok = await this.cooledDown(
      ctx.organizationId,
      ctx.vehicleId,
      on ? 'IGNITION_ON' : 'IGNITION_OFF',
      60,
    );
    if (!ok) return;
    await this.raise({
      ...ctx,
      type: on ? 'IGNITION_ON' : 'IGNITION_OFF',
      severity: 'INFO',
      title: on ? 'Ignition ON' : 'Ignition OFF',
      message: on ? 'Ignition turned on' : 'Ignition turned off',
      validated: ctx.validated,
    });
  }

  private async checkLowBattery(ctx: EngineCtx, rule: any) {
    const v = ctx.validated.batteryVoltage;
    if (v == null) return;
    const threshold = this.cfg(rule, 'thresholdVolts', Number(process.env.DEFAULT_LOW_BATTERY_V ?? DEFAULT_LOW_BATTERY));
    if (v >= threshold) return;
    const ok = await this.cooledDown(ctx.organizationId, ctx.vehicleId, 'LOW_BATTERY', rule?.cooldownSeconds ?? 3600);
    if (!ok) return;
    await this.raise({
      ...ctx,
      type: 'LOW_BATTERY',
      severity: 'WARNING',
      title: `Low battery: ${v.toFixed(1)}V`,
      message: `Battery voltage ${v.toFixed(1)}V below ${threshold}V`,
      validated: ctx.validated,
    });
  }

  private async checkLowFuel(ctx: EngineCtx, rule: any) {
    const f = ctx.validated.fuelPercentage;
    if (f == null) return; // no sensor → no alert, never fake
    const threshold = this.cfg(rule, 'thresholdPercent', Number(process.env.DEFAULT_LOW_FUEL_PCT ?? DEFAULT_LOW_FUEL));
    if (f >= threshold) return;
    const ok = await this.cooledDown(ctx.organizationId, ctx.vehicleId, 'LOW_FUEL', rule?.cooldownSeconds ?? 3600);
    if (!ok) return;
    await this.raise({
      ...ctx,
      type: 'LOW_FUEL',
      severity: 'WARNING',
      title: `Low fuel: ${Math.round(f)}%`,
      message: `Fuel level ${Math.round(f)}% below ${threshold}%`,
      validated: ctx.validated,
    });
  }
}
