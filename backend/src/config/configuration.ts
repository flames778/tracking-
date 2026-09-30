import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me-32chars!!',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me-32chars!',
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  deviceTcpEnabled: process.env.DEVICE_TCP_ENABLED === 'true',
  deviceTcpPort: parseInt(process.env.DEVICE_TCP_PORT ?? '5023', 10),
  deviceUdpEnabled: process.env.DEVICE_UDP_ENABLED === 'true',
  deviceUdpPort: parseInt(process.env.DEVICE_UDP_PORT ?? '5024', 10),
  ingestMaxSkewMinutes: parseInt(process.env.INGEST_MAX_SKEW_MINUTES ?? '60', 10),
  ingestMinMoveMeters: parseInt(process.env.INGEST_MIN_MOVE_METERS ?? '5', 10),
  tripMinDurationSeconds: parseInt(process.env.TRIP_MIN_DURATION_SECONDS ?? '120', 10),
  tripMinDistanceMeters: parseInt(process.env.TRIP_MIN_DISTANCE_METERS ?? '300', 10),
  telemetryRetentionDays: parseInt(process.env.TELEMETRY_RETENTION_DAYS ?? '365', 10),
}));
