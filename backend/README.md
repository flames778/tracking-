# Fleet Tracking Backend

Production-oriented NestJS backend for a commercial vehicle-tracking / fleet-management SaaS.
Simulator-first today, real **C003F** hardware later — without rewriting the core.

```
Simulator ─┐
           ├─→ Transport → ProtocolAdapter → ParsedTelemetry ─→ PIPELINE ─→ Postgres/Redis/WebSocket ─→ Frontend
C003F ─────┘ (placeholder until protocol docs arrive)
```

## Quickstart

```bash
cd backend
cp .env.example .env        # point DATABASE_URL/REDIS_URL at docker or local
npm install
npx prisma migrate dev      # creates DB + enables PostGIS
npm run prisma:seed         # demo org, users, 5 vehicles/devices, geofences, rules
npm run start:dev           # API :4000, docs :4000/docs
```

Or all-in-one:

```bash
docker compose up --build
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run prisma:seed
```

Demo logins (password `Demo1234!`): `admin@demo.ng` / `manager@demo.ng` / `viewer@demo.ng`

## Telemetry flow

`ingestRaw(buffer)` → adapter select → parse → device auth → validate
(VALID/SUSPICIOUS/INVALID) → dedupe → persist telemetry → upsert
`VehicleLatestState` → trip/geofence/alert/fuel engines → Socket.IO emit.

Dashboard reads `VehicleLatestState` — never scans telemetry for live positions.

## Simulator (uses the REAL pipeline)

```bash
POST /api/v1/admin/simulator/start  { "vehicleCount": 5, "intervalMs": 5000 }
GET  /api/v1/admin/simulator/status
POST /api/v1/admin/simulator/stop
```

Admin-only. Data is flagged `isSimulated` / demo org.

## C003F integration (when hardware/docs arrive)

1. Read docs: transport, packet layout, auth, heartbeat, ACK.
2. Implement `C003FProtocolAdapter implements TrackingProtocolAdapter` + optional
   `C003FTransport implements DeviceTransport` using **real** packet samples.
3. Add fixtures under `src/tracking/adapters/` + enable transport via env.
4. Nothing else changes: vehicles/trips/alerts/geofences/fuel/reports/WebSocket stay untouched.

`C003FProtocolAdapter` currently **refuses** to parse — by design.

## API

Prefix `/api/v1`. Swagger at `/docs`. Auth: Bearer access JWT (15m) + rotating
refresh tokens (hashed, revocable). WebSocket: `socket.io` with token auth,
rooms `org:{id}` / `vehicle:{id}`, server-side tenant checks.

Key routes: `/auth`, `/users`, `/organization`, `/vehicles` (+`/:id/latest`,
`/:id/telemetry|trips|alerts|fuel`), `/devices` (+`/assign|/unassign|/status|/history`),
`/trips` (+`/:id/points|/replay`), `/alerts`, `/alert-rules`, `/geofences`,
`/reports` (+`/generate`), `/notifications`, `/installations`, `/subscriptions`,
`/dashboard/*`, `/admin/*`, `/health`, `/health/live`, `/health/ready`.

## Scripts

| cmd | purpose |
|---|---|
| `npm run start:dev` | watch mode |
| `npm run build` / `start:prod` | production |
| `npm test` | unit (geo, validation, adapters) |
| `npm run db:migrate` → `prisma migrate dev` | migrate |
| `npm run prisma:seed` | demo seed |

## Env

See `backend/.env.example`. Never commit secrets. Notable knobs:
`DEVICE_OFFLINE_THRESHOLD_SECONDS=300`, `TELEMETRY_RETENTION_DAYS=365`,
`DEVICE_TCP_ENABLED=false` (enable only with real protocol).

## Scaling

1–100 vehicles: 1 API + 1 worker + Postgres + Redis (compose as-is).
100–1k: replicate API/workers, add Socket.IO Redis adapter, consider
telemetry time-partitioning. 1k+: dedicated ingestion, read replicas, streaming.
