import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type IORedis from 'ioredis';
import { PrismaService } from '../common/prisma/prisma.service';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { Public } from '../common/decorators/public.decorator';

const REDIS_PROBE_TIMEOUT_MS = 1500;

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: IORedis,
  ) {}

  @Public()
  @Get()
  root() {
    return { status: 'ok', uptimeSec: Math.round(process.uptime()) };
  }

  @Public()
  @Get('live')
  live() {
    // Liveness: process is running. Never fail on optional deps.
    return { status: 'alive' };
  }

  /**
   * Readiness: Postgres and Redis are both required (queues + realtime
   * fan-out). The Redis probe is time-boxed because ioredis queues commands
   * while disconnected, which would otherwise hang the check forever.
   */
  @Public()
  @Get('ready')
  async ready() {
    const checks: Record<string, string> = {};
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.postgres = 'up';
    } catch {
      checks.postgres = 'down';
    }
    try {
      const res = await Promise.race([
        this.redis.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('redis probe timeout')), REDIS_PROBE_TIMEOUT_MS),
        ),
      ]);
      checks.redis = res === 'PONG' ? 'up' : 'down';
    } catch {
      checks.redis = 'down';
    }
    const ready = checks.postgres === 'up' && checks.redis === 'up';
    return { ready, checks };
  }
}
