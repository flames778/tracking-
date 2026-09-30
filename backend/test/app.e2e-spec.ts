import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { WorkerModule } from '../src/jobs/worker.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import request from 'supertest';

jest.setTimeout(120_000);

let app: INestApplication;
let worker: INestApplication;
let prisma: PrismaService;
let baseUrl: string;

const SUFFIX = Math.random().toString(36).slice(2, 8);

async function registerOrg(prefix: string) {
  const res = await request(baseUrl)
    .post('/api/v1/auth/register')
    .send({
      fullName: `Org A ${prefix}`,
      email: `a-${prefix}@test.local`,
      password: 'Password123!',
      organizationName: `OrgA ${prefix}`,
    })
    .expect(201);
  return {
    token: res.body.data.accessToken,
    orgId: res.body.data.user.organizationId,
  };
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/live', 'health/ready'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  await app.listen(0);
  const addr = app.getHttpServer().address();
  if (typeof addr !== 'object' || !addr) {
    throw new Error('Failed to bind test HTTP server');
  }
  baseUrl = `http://127.0.0.1:${addr.port}`;
  prisma = app.get(PrismaService);

  // Real worker process equivalent: consumes the derived-data queue so the
  // async telemetry pipeline is exercised, not stubbed. Without a broker the
  // API processes inline, so the worker is optional here.
  if (await redisAvailable()) {
    worker = await (
      await Test.createTestingModule({ imports: [WorkerModule] })
    ).compile().then((m) => m.createNestApplication());
    await worker.init();
  }
});

async function redisAvailable(): Promise<boolean> {
  const IORedis = (await import('ioredis')).default;
  const client = new IORedis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  try {
    await client.connect();
    const pong = await client.ping();
    return pong === 'PONG';
  } catch {
    return false;
  } finally {
    client.disconnect();
  }
}

afterAll(async () => {
  await worker?.close();
  await app?.close();
});

/** Derived data is now processed asynchronously — poll instead of assuming. */
async function waitUntil<T>(fn: () => Promise<T>, timeoutMs = 15_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: T | undefined;
  for (;;) {
    try {
      last = await fn();
      if (last) return last;
    } catch {
      /* keep polling */
    }
    if (Date.now() > deadline) return last as T;
    await new Promise((r) => setTimeout(r, 250));
  }
}

describe('auth', () => {
  it('registers, logs in, refreshes, revokes', async () => {
    const email = `auth-${SUFFIX}@test.local`;
    const reg = await request(baseUrl)
      .post('/api/v1/auth/register')
      .send({ fullName: 'Auth User', email, password: 'Password123!' })
      .expect(201);
    expect(reg.body.data.user.passwordHash).toBeUndefined();

    const login = await request(baseUrl)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Password123!' })
      .expect(200);
    const refreshToken = login.body.data.refreshToken;

    const refreshed = await request(baseUrl)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();

    // old refresh token is rotated out
    await request(baseUrl)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    const me = await request(baseUrl)
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${refreshed.body.data.accessToken}`)
      .expect(200);
    expect(me.body.data.email).toBe(email);
  });

  it('rejects wrong password and unknown user identically', async () => {
    const a = await request(baseUrl)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.local', password: 'x' })
      .expect(401);
    const b = await request(baseUrl)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@demo.ng', password: 'wrong' })
      .expect(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });
});

describe('multi-tenant isolation', () => {
  it('Org A cannot read/update/delete Org B resources', async () => {
    const a = await registerOrg(`A-${SUFFIX}`);
    const b = await registerOrg(`B-${SUFFIX}`);

    const vehicleB = (
      await request(baseUrl)
        .post('/api/v1/vehicles')
        .set('authorization', `Bearer ${b.token}`)
        .send({ name: 'B Truck', registrationNumber: `B-${SUFFIX}` })
        .expect(201)
    ).body.data;

    // A cannot read B's vehicle
    const r1 = await request(baseUrl)
      .get(`/api/v1/vehicles/${vehicleB.id}`)
      .set('authorization', `Bearer ${a.token}`)
      .expect(404);

    // A cannot update B's vehicle
    await request(baseUrl)
      .patch(`/api/v1/vehicles/${vehicleB.id}`)
      .set('authorization', `Bearer ${a.token}`)
      .send({ name: 'hijacked' })
      .expect(404);

    // A cannot delete B's vehicle
    await request(baseUrl)
      .delete(`/api/v1/vehicles/${vehicleB.id}`)
      .set('authorization', `Bearer ${a.token}`)
      .expect(404);

    // A cannot read B's telemetry
    await request(baseUrl)
      .get(`/api/v1/vehicles/${vehicleB.id}/telemetry`)
      .set('authorization', `Bearer ${a.token}`)
      .expect(200)
      .expect((res) => expect(res.body.data).toEqual([]));

    // A cannot read B's trips/alerts
    await request(baseUrl)
      .get(`/api/v1/vehicles/${vehicleB.id}/trips`)
      .set('authorization', `Bearer ${a.token}`)
      .expect(404);
    await request(baseUrl)
      .get(`/api/v1/vehicles/${vehicleB.id}/alerts`)
      .set('authorization', `Bearer ${a.token}`)
      .expect(404);

    // A cannot modify B's geofences
    const fenceB = (
      await request(baseUrl)
        .post('/api/v1/geofences')
        .set('authorization', `Bearer ${b.token}`)
        .send({
          name: 'B Zone',
          type: 'CIRCLE',
          centerLatitude: 6.45,
          centerLongitude: 3.39,
          radiusMeters: 500,
        })
        .expect(201)
    ).body.data;
    await request(baseUrl)
      .patch(`/api/v1/geofences/${fenceB.id}`)
      .set('authorization', `Bearer ${a.token}`)
      .send({ name: 'stolen' })
      .expect(404);

    // A's own vehicles list never includes B's
    const aList = await request(baseUrl)
      .get('/api/v1/vehicles')
      .set('authorization', `Bearer ${a.token}`)
      .expect(200);
    expect(aList.body.data.map((v: any) => v.id)).not.toContain(vehicleB.id);
    void a.orgId;
    void b.orgId;
    void r1;
  });

  it('Org A cannot assign a device to Org B vehicle and cannot see B devices', async () => {
    const a = await registerOrg(`C-${SUFFIX}`);
    const b = await registerOrg(`D-${SUFFIX}`);
    const vehicleB = (
      await request(baseUrl)
        .post('/api/v1/vehicles')
        .set('authorization', `Bearer ${b.token}`)
        .send({ name: 'B Car', registrationNumber: `D-${SUFFIX}` })
        .expect(201)
    ).body.data;
    const deviceA = (
      await request(baseUrl)
        .post('/api/v1/devices')
        .set('authorization', `Bearer ${a.token}`)
        .send({ imei: `99000000${SUFFIX}` })
        .expect(201)
    ).body.data;

    // assigning to B's vehicle must fail
    await request(baseUrl)
      .post(`/api/v1/devices/${deviceA.id}/assign`)
      .set('authorization', `Bearer ${a.token}`)
      .send({ vehicleId: vehicleB.id })
      .expect(404);

    const bDevices = await request(baseUrl)
      .get('/api/v1/devices')
      .set('authorization', `Bearer ${b.token}`)
      .expect(200);
    expect(bDevices.body.data.map((d: any) => d.id)).not.toContain(deviceA.id);
  });
});

describe('RBAC', () => {
  it('viewer cannot create vehicles, fleet_manager can', async () => {
    const org = await registerOrg(`E-${SUFFIX}`);
    const viewer = (
      await request(baseUrl)
        .post('/api/v1/users')
        .set('authorization', `Bearer ${org.token}`)
        .send({
          fullName: 'Viewer',
          email: `viewer-${SUFFIX}@test.local`,
          password: 'Password123!',
          role: 'VIEWER',
        })
        .expect(201)
    ).body.data;
    const viewerLogin = await request(baseUrl)
      .post('/api/v1/auth/login')
      .send({ email: viewer.email, password: 'Password123!' })
      .expect(200);

    await request(baseUrl)
      .post('/api/v1/vehicles')
      .set('authorization', `Bearer ${viewerLogin.body.data.accessToken}`)
      .send({ name: 'nope', registrationNumber: `V-${SUFFIX}` })
      .expect(403);

    await request(baseUrl)
      .post('/api/v1/vehicles')
      .set('authorization', `Bearer ${org.token}`)
      .send({ name: 'ok', registrationNumber: `M-${SUFFIX}` })
      .expect(201);
  });

  it('unauthenticated requests are rejected', async () => {
    await request(baseUrl).get('/api/v1/vehicles').expect(401);
    await request(baseUrl).get('/health/ready').expect(200);
  });
});

describe('telemetry pipeline (admin ingest)', () => {
  it('accepts valid telemetry, updates latest state, creates trip + fuel reading', async () => {
    const org = await registerOrg(`F-${SUFFIX}`);
    const vehicle = (
      await request(baseUrl)
        .post('/api/v1/vehicles')
        .set('authorization', `Bearer ${org.token}`)
        .send({ name: 'Tel Van', registrationNumber: `T-${SUFFIX}` })
        .expect(201)
    ).body.data;
    const imei = `88000000${SUFFIX}`;
    const device = (
      await request(baseUrl)
        .post('/api/v1/devices')
        .set('authorization', `Bearer ${org.token}`)
        .send({ imei })
        .expect(201)
    ).body.data;
    await request(baseUrl)
      .post(`/api/v1/devices/${device.id}/assign`)
      .set('authorization', `Bearer ${org.token}`)
      .send({ vehicleId: vehicle.id })
      .expect(201);

    for (let i = 0; i < 3; i++) {
      await request(baseUrl)
        .post('/api/v1/tracking/ingest')
        .set('authorization', `Bearer ${org.token}`)
        .send({
          raw: JSON.stringify({
            imei,
            latitude: 6.5 + i * 0.001,
            longitude: 3.37 + i * 0.001,
            speedKph: 40,
            ignition: true,
            batteryVoltage: 12.5,
            fuelPercentage: 70 - i,
            timestamp: new Date().toISOString(),
          }),
        })
        .expect(202);
    }

    const latest = await request(baseUrl)
      .get(`/api/v1/vehicles/${vehicle.id}/latest`)
      .set('authorization', `Bearer ${org.token}`)
      .expect(200);
    expect(latest.body.data.connectionStatus).toBe('online');
    expect(latest.body.data.fuel.percentage).toBeLessThan(70);
    expect(latest.body.data.fuelUnavailable).toBe(false);

    const trips = await waitUntil(async () => {
      const res = await request(baseUrl)
        .get(`/api/v1/vehicles/${vehicle.id}/trips`)
        .set('authorization', `Bearer ${org.token}`);
      return res.body.data?.length ? res.body.data : null;
    });
    expect(trips.length).toBeGreaterThan(0);
    expect(trips[0].distanceKm).toBeGreaterThan(0);

    const fuel = await request(baseUrl)
      .get(`/api/v1/vehicles/${vehicle.id}/fuel/readings`)
      .set('authorization', `Bearer ${org.token}`)
      .expect(200);
    expect(fuel.body.data.length).toBe(3);
  });

  it('rejects unknown device and invalid coordinates', async () => {
    const org = await registerOrg(`G-${SUFFIX}`);
    await request(baseUrl)
      .post('/api/v1/tracking/ingest')
      .set('authorization', `Bearer ${org.token}`)
      .send({
        raw: JSON.stringify({ imei: '000000000000000', latitude: 6.5, longitude: 3.37 }),
      })
      .expect(404);

    const vehicle = (
      await request(baseUrl)
        .post('/api/v1/vehicles')
        .set('authorization', `Bearer ${org.token}`)
        .send({ name: 'Invalid Tel Car', registrationNumber: `IT-${SUFFIX}` })
        .expect(201)
    ).body.data;
    const imei = `77000000${SUFFIX}`;
    const device = (
      await request(baseUrl)
        .post('/api/v1/devices')
        .set('authorization', `Bearer ${org.token}`)
        .send({ imei })
        .expect(201)
    ).body.data;
    // device must be ACTIVE (assigned) before it can transmit
    await request(baseUrl)
      .post(`/api/v1/devices/${device.id}/assign`)
      .set('authorization', `Bearer ${org.token}`)
      .send({ vehicleId: vehicle.id })
      .expect(201);

    const res = await request(baseUrl)
      .post('/api/v1/tracking/ingest')
      .set('authorization', `Bearer ${org.token}`)
      .send({
        raw: JSON.stringify({ imei, latitude: 999, longitude: 3.37, speedKph: 10 }),
      })
      .expect(400);
    expect(res.body.error.code).toBe('INVALID_TELEMETRY');
  });

  it('rejects telemetry from an unassigned device', async () => {
    const org = await registerOrg(`G2-${SUFFIX}`);
    const imei = `55000000${SUFFIX}`;
    await request(baseUrl)
      .post('/api/v1/devices')
      .set('authorization', `Bearer ${org.token}`)
      .send({ imei })
      .expect(201);
    await request(baseUrl)
      .post('/api/v1/tracking/ingest')
      .set('authorization', `Bearer ${org.token}`)
      .send({
        raw: JSON.stringify({ imei, latitude: 6.5, longitude: 3.37, speedKph: 10 }),
      })
      .expect(403);
  });

  it('vehicle without fuel sensor reports fuelUnavailable', async () => {
    const org = await registerOrg(`H-${SUFFIX}`);
    const vehicle = (
      await request(baseUrl)
        .post('/api/v1/vehicles')
        .set('authorization', `Bearer ${org.token}`)
        .send({ name: 'No Fuel Car', registrationNumber: `NF-${SUFFIX}` })
        .expect(201)
    ).body.data;
    const fuel = await request(baseUrl)
      .get(`/api/v1/vehicles/${vehicle.id}/fuel`)
      .set('authorization', `Bearer ${org.token}`)
      .expect(200);
    expect(fuel.body.data.fuelUnavailable).toBe(true);
    expect(fuel.body.data.reading).toBeUndefined();
  });
});

describe('geofences', () => {
  it('detects enter/exit transitions only on change', async () => {
    const org = await registerOrg(`I-${SUFFIX}`);
    const vehicle = (
      await request(baseUrl)
        .post('/api/v1/vehicles')
        .set('authorization', `Bearer ${org.token}`)
        .send({ name: 'Geo Car', registrationNumber: `G-${SUFFIX}` })
        .expect(201)
    ).body.data;
    const imei = `66000000${SUFFIX}`;
    const device = (
      await request(baseUrl)
        .post('/api/v1/devices')
        .set('authorization', `Bearer ${org.token}`)
        .send({ imei })
        .expect(201)
    ).body.data;
    await request(baseUrl)
      .post(`/api/v1/devices/${device.id}/assign`)
      .set('authorization', `Bearer ${org.token}`)
      .send({ vehicleId: vehicle.id })
      .expect(201);
    await request(baseUrl)
      .post('/api/v1/geofences')
      .set('authorization', `Bearer ${org.token}`)
      .send({
        name: 'Office',
        type: 'CIRCLE',
        centerLatitude: 6.5,
        centerLongitude: 3.4,
        radiusMeters: 1000,
      })
      .expect(201);

    const point = (lat: number, lng: number) =>
      request(baseUrl)
        .post('/api/v1/tracking/ingest')
        .set('authorization', `Bearer ${org.token}`)
        .send({
          raw: JSON.stringify({
            imei,
            latitude: lat,
            longitude: lng,
            speedKph: 20,
            ignition: true,
            timestamp: new Date().toISOString(),
          }),
        })
        .expect(202);

    await point(6.5, 3.4); // inside
    await point(6.5, 3.4); // still inside -> no new event
    await point(6.52, 3.42); // outside
    await point(6.52, 3.42); // still outside

    const events = await waitUntil(async () => {
      const res = await request(baseUrl)
        .get('/api/v1/reports/geofences')
        .set('authorization', `Bearer ${org.token}`);
      return res.body.data?.length === 2 ? res.body.data : null;
    });
    expect(events).toHaveLength(2);
    expect(events[0].eventType).toBe('EXIT');
  });
});
