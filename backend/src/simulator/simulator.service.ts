import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TrackingIngestionService } from '../tracking/tracking-ingestion.service';
import { ParsedTelemetry } from '../tracking/adapters/protocol-adapter.interface';

// Demo routes around Lagos (fictional demo coordinates, clearly simulated).
const ROUTES: Array<Array<[number, number]>> = [
  // Lekki → Victoria Island → Lagos Island
  [
    [6.4698, 3.5852],
    [6.455, 3.55],
    [6.4281, 3.4219],
    [6.4549, 3.3947],
  ],
  // Ikeja → Yaba → Surulere
  [
    [6.6018, 3.3515],
    [6.55, 3.37],
    [6.504, 3.371],
    [6.4969, 3.354],
  ],
  // Apapa → Maryland → Ikeja
  [
    [6.4433, 3.3616],
    [6.51, 3.371],
    [6.56, 3.348],
    [6.6018, 3.3515],
  ],
];

interface SimVehicle {
  vehicleId: string;
  deviceId: string;
  imei: string;
  routeIdx: number;
  segT: number;
  speedKph: number;
  ignition: boolean;
  fuel: number;
  battery: number;
  online: boolean;
  lat: number;
  lng: number;
}

@Injectable()
export class SimulatorService implements OnModuleDestroy {
  private readonly logger = new Logger(SimulatorService.name);
  private timer: NodeJS.Timeout | null = null;
  private fleet: SimVehicle[] = [];
  running = false;
  intervalMs = 5000;
  startedAt: Date | null = null;
  sentCount = 0;

  constructor(
    private prisma: PrismaService,
    private ingestion: TrackingIngestionService,
  ) {}

  status() {
    return {
      running: this.running,
      vehicles: this.fleet.length,
      sentCount: this.sentCount,
      intervalMs: this.intervalMs,
      startedAt: this.startedAt,
    };
  }

  async start(opts: { vehicleCount?: number; intervalMs?: number } = {}) {
    if (this.running) return this.status();
    this.intervalMs = opts.intervalMs ?? 5000;
    await this.ensureDemoFleet(opts.vehicleCount ?? 5);
    this.running = true;
    this.startedAt = new Date();
    this.timer = setInterval(() => this.tick().catch((e) => this.logger.warn(e.message)), this.intervalMs);
    this.logger.log(`simulator started with ${this.fleet.length} vehicles every ${this.intervalMs}ms`);
    return this.status();
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    // mark sim vehicles stale (they'll flip OFFLINE via worker / next tick skip)
    return this.status();
  }

  async reset() {
    await this.stop();
    this.fleet = [];
    this.sentCount = 0;
    this.startedAt = null;
    return this.status();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  private async ensureDemoFleet(count: number) {
    let org = await this.prisma.organization.findUnique({ where: { slug: 'demo-fleet' } });
    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          name: 'Demo Fleet (SIMULATED)',
          slug: 'demo-fleet',
          email: 'demo@example.com',
          timezone: 'Africa/Lagos',
          currency: 'NGN',
          isDemo: true,
        },
      });
    }
    const names = ['Lagos Logistics Van 01', 'School Bus 01', 'Executive SUV 01', 'Fleet Truck 01', 'Private Car 01'];
    this.fleet = [];
    for (let i = 0; i < count; i++) {
      const name = names[i % names.length] + (i >= names.length ? ` #${i + 1}` : '');
      const reg = `DEMO-${String(i + 1).padStart(3, '0')}`;
      const vehicle = await this.prisma.vehicle.upsert({
        where: { organizationId_registrationNumber: { organizationId: org.id, registrationNumber: reg } },
        update: { isSimulated: true, status: 'ACTIVE' },
        create: {
          organizationId: org.id,
          name,
          registrationNumber: reg,
          vehicleType: (['VAN', 'BUS', 'SUV', 'TRUCK', 'CAR'] as any)[i % 5],
          status: 'ACTIVE',
          isSimulated: true,
        },
      });
      const imei = `860000000000${String(101 + i).slice(-3)}`;
      const device = await this.prisma.device.upsert({
        where: { imei },
        update: { organizationId: org.id, vehicleId: vehicle.id, status: 'ACTIVE', isSimulated: true },
        create: {
          organizationId: org.id,
          vehicleId: vehicle.id,
          imei,
          model: i % 4 === 3 ? 'OTHER_MODEL' : 'C003F',
          manufacturer: 'SIMULATED',
          status: 'ACTIVE',
          isSimulated: true,
        },
      });
      // seed geofences + rules once
      await this.ensureDemoSeed(org.id);
      const route = ROUTES[i % ROUTES.length];
      this.fleet.push({
        vehicleId: vehicle.id,
        deviceId: device.id,
        imei,
        routeIdx: i % ROUTES.length,
        segT: Math.random(),
        speedKph: 30 + Math.random() * 50,
        ignition: true,
        fuel: 40 + Math.random() * 50,
        battery: 12 + Math.random() * 1.5,
        online: true,
        lat: route[0][0],
        lng: route[0][1],
      });
    }
  }

  private seeded = false;
  private async ensureDemoSeed(orgId: string) {
    if (this.seeded) return;
    this.seeded = true;
    const count = await this.prisma.geofence.count({ where: { organizationId: orgId } });
    if (count === 0) {
      await this.prisma.geofence.createMany({
        data: [
          {
            organizationId: orgId,
            name: 'Main Office (Demo)',
            type: 'CIRCLE',
            centerLatitude: 6.4549,
            centerLongitude: 3.3947,
            radiusMeters: 800,
          },
          {
            organizationId: orgId,
            name: 'Warehouse (Demo)',
            type: 'CIRCLE',
            centerLatitude: 6.4433,
            centerLongitude: 3.3616,
            radiusMeters: 600,
          },
          {
            organizationId: orgId,
            name: 'School Campus (Demo)',
            type: 'POLYGON',
            polygon: [
              [3.37, 6.5],
              [3.38, 6.5],
              [3.38, 6.51],
              [3.37, 6.51],
            ],
          },
        ],
      });
    }
    const rules = await this.prisma.alertRule.count({ where: { organizationId: orgId } });
    if (rules === 0) {
      await this.prisma.alertRule.createMany({
        data: [
          { organizationId: orgId, type: 'OVERSPEED', configuration: { thresholdKph: 100 }, cooldownSeconds: 600 },
          { organizationId: orgId, type: 'LOW_FUEL', configuration: { thresholdPercent: 20 }, cooldownSeconds: 3600 },
          { organizationId: orgId, type: 'LOW_BATTERY', configuration: { thresholdVolts: 11.5 }, cooldownSeconds: 3600 },
        ],
      });
    }
  }

  private async tick() {
    for (const v of this.fleet) {
      // occasional offline blips
      if (Math.random() < 0.02) v.online = !v.online;
      if (!v.online) continue;
      this.advance(v);
      const t: ParsedTelemetry = {
        imei: v.imei,
        timestamp: new Date(),
        latitude: v.lat,
        longitude: v.lng,
        speedKph: Math.round(v.speedKph),
        heading: Math.round(Math.random() * 360),
        ignition: v.ignition,
        batteryVoltage: Number(v.battery.toFixed(1)),
        fuelPercentage: Number(v.fuel.toFixed(1)),
        odometerKm: undefined,
        satellites: 8 + Math.floor(Math.random() * 6),
        gsmSignal: 15 + Math.floor(Math.random() * 15),
        rawData: { simulated: true, isSimulated: true },
      };
      // randomly toggle ignition / vary fuel / speed
      if (Math.random() < 0.03) v.ignition = !v.ignition;
      v.speedKph = v.ignition
        ? Math.max(0, Math.min(120, v.speedKph + (Math.random() - 0.5) * 20))
        : 0;
      v.fuel = Math.max(5, v.fuel - Math.random() * 0.2);
      v.battery = Math.max(10.5, Math.min(14.5, v.battery + (Math.random() - 0.5) * 0.2));
      try {
        await this.ingestion.ingest(t);
        this.sentCount++;
      } catch (e: any) {
        this.logger.debug(`sim ingest skipped: ${e.message}`);
      }
    }
  }

  private advance(v: SimVehicle) {
    const route = ROUTES[v.routeIdx % ROUTES.length];
    v.segT += 0.05 + (v.speedKph / 400) * 0.05;
    if (v.segT >= 1) {
      v.segT = 0;
      // loop route
      route.push(route.shift()!);
    }
    const [lat1, lng1] = route[0];
    const [lat2, lng2] = route[1 % route.length];
    const jitter = () => (Math.random() - 0.5) * 0.002;
    v.lat = lat1 + (lat2 - lat1) * v.segT + jitter();
    v.lng = lng1 + (lng2 - lng1) * v.segT + jitter();
  }
}
