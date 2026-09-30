import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { io, Socket } from 'socket.io-client';
import * as argon2 from 'argon2';
import { createServer } from 'node:http';
import { AppModule } from '../src/app.module';
import { RealtimeService } from '../src/realtime/realtime.service';
import { REALTIME_EVENTS } from '../src/config/constants';

jest.setTimeout(120_000);

const SUFFIX = Math.random().toString(36).slice(2, 8);
const prisma = new PrismaClient();

let app: INestApplication;
let httpServer: ReturnType<typeof createServer>;
let baseUrl: string;
let realtime: RealtimeService;
let ioServer: Server;
let orgA: { id: string; token: string };
let orgB: { id: string; token: string };
let vehicleAId: string;
let vehicleBId: string;

const createdOrgIds: string[] = [];

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/live', 'health/ready'] });
  await app.init();

  httpServer = createServer(app.getHttpAdapter().getInstance());
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const addr = httpServer.address();
  if (typeof addr !== 'object' || !addr) throw new Error('test server did not bind');
  baseUrl = `http://127.0.0.1:${addr.port}`;

  realtime = app.get(RealtimeService);
  ioServer = new Server(httpServer, { path: '/socket.io' });
  realtime.attach(ioServer);

  const jwt = app.get(JwtService);
  const mkOrg = async (tag: string) => {
    const org = await prisma.organization.create({
      data: { name: `WS ${tag} ${SUFFIX}`, slug: `ws-${tag}-${SUFFIX}` },
    });
    createdOrgIds.push(org.id);
    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        fullName: `WS ${tag}`,
        email: `ws-${tag}-${SUFFIX}@test.local`,
        passwordHash: await argon2.hash('Password123!'),
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    const token = await jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role, organizationId: org.id },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' as never },
    );
    return { id: org.id, token };
  };

  orgA = await mkOrg('a');
  orgB = await mkOrg('b');

  const [vA, vB] = await Promise.all([
    prisma.vehicle.create({
      data: { organizationId: orgA.id, name: 'WS Vehicle A', registrationNumber: `WSA-${SUFFIX}` },
    }),
    prisma.vehicle.create({
      data: { organizationId: orgB.id, name: 'WS Vehicle B', registrationNumber: `WSB-${SUFFIX}` },
    }),
  ]);
  vehicleAId = vA.id;
  vehicleBId = vB.id;
});

afterAll(async () => {
  ioServer?.close();
  await new Promise<void>((resolve) => httpServer?.close(() => resolve()));
  await app?.close();
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
  await prisma.$disconnect();
});

function connect(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = io(baseUrl, { auth: { token }, transports: ['websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', (err) => reject(err));
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('realtime websocket tenant safety', () => {
  it('rejects connections without a valid token', async () => {
    await expect(connect('bogus-token')).rejects.toBeTruthy();
  });

  it('allows subscribing to own organization and vehicle only', async () => {
    const a = await connect(orgA.token);

    expect(await a.emitWithAck('subscribe:organization', orgB.id)).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    expect(await a.emitWithAck('subscribe:organization', orgA.id)).toEqual({ ok: true });
    expect(await a.emitWithAck('subscribe:vehicle', vehicleBId)).toEqual({
      ok: false,
      error: 'FORBIDDEN',
    });
    expect(await a.emitWithAck('subscribe:vehicle', vehicleAId)).toEqual({ ok: true });
    expect(await a.emitWithAck('subscribe:vehicle', '00000000-0000-0000-0000-000000000000')).toEqual(
      { ok: false, error: 'NOT_FOUND' },
    );

    a.close();
  });

  it('never delivers another tenant vehicle telemetry', async () => {
    const a = await connect(orgA.token);
    const b = await connect(orgB.token);
    await a.emitWithAck('subscribe:organization', orgA.id);
    await b.emitWithAck('subscribe:organization', orgB.id);
    await a.emitWithAck('subscribe:vehicle', vehicleAId);
    await b.emitWithAck('subscribe:vehicle', vehicleBId);
    await wait(250);

    const gotA: unknown[] = [];
    const gotB: unknown[] = [];
    const gotASubscribed: unknown[] = [];
    a.on(REALTIME_EVENTS.TELEMETRY_UPDATED, (m) => gotA.push(m));
    b.on(REALTIME_EVENTS.TELEMETRY_UPDATED, (m) => gotB.push(m));
    a.on(REALTIME_EVENTS.STATUS_CHANGED, (m) => gotASubscribed.push(m));

    await realtime.emitToVehicle(orgA.id, vehicleAId, REALTIME_EVENTS.TELEMETRY_UPDATED, {
      vehicleId: vehicleAId,
      latitude: 6.5244,
      longitude: 3.3792,
      speedKph: 44,
    });
    await realtime.emitToOrg(orgB.id, REALTIME_EVENTS.STATUS_CHANGED, {
      vehicleId: vehicleBId,
      status: 'ONLINE',
    });
    await wait(400);

    expect(gotA.length).toBe(1);
    expect((gotA[0] as any).data.vehicleId).toBe(vehicleAId);
    expect(gotB.length).toBe(0);
    expect(gotASubscribed.length).toBe(0);

    a.close();
    b.close();
  });

  it('sends each event once to a socket in both org and vehicle rooms', async () => {
    const a = await connect(orgA.token);
    await a.emitWithAck('subscribe:organization', orgA.id);
    await a.emitWithAck('subscribe:vehicle', vehicleAId);
    await wait(250);

    const got: unknown[] = [];
    a.on(REALTIME_EVENTS.TELEMETRY_UPDATED, (m) => got.push(m));

    await realtime.emitToVehicle(orgA.id, vehicleAId, REALTIME_EVENTS.TELEMETRY_UPDATED, {
      vehicleId: vehicleAId,
      speedKph: 12,
    });
    await wait(300);

    expect(got.length).toBe(1);
    a.close();
  });
});
