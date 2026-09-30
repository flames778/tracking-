import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { downsample } from '../common/utils/geo.util';

@ApiTags('trips')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgScopeGuard)
@Controller('trips')
export class TripsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  list(
    @Req() req: any,
    @Query('vehicleId') vehicleId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const organizationId: string = req.organizationId;
    const where: any = { organizationId };
    if (vehicleId) {
      // verify ownership to prevent IDOR probing
      where.vehicleId = vehicleId;
    }
    if (from || to) {
      where.startedAt = {};
      if (from) where.startedAt.gte = new Date(from);
      if (to) where.startedAt.lte = new Date(to);
    }
    return this.prisma.trip
      .findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: Math.min(parseInt(limit ?? '50', 10) || 50, 200),
      })
      .then((rows) => ({ data: rows }));
  }

  @Get(':id')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async get(@Req() req: any, @Param('id') id: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, organizationId: req.organizationId },
    });
    if (!trip) return { data: null };
    return trip;
  }

  @Get(':id/points')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async points(
    @Req() req: any,
    @Param('id') id: string,
    @Query('maxPoints') maxPoints?: string,
  ) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, organizationId: req.organizationId },
    });
    if (!trip) return { data: [] };
    const to = trip.endedAt ?? new Date();
    const rows = await this.prisma.telemetry.findMany({
      where: {
        vehicleId: trip.vehicleId,
        organizationId: req.organizationId,
        timestamp: { gte: trip.startedAt, lte: to },
      },
      orderBy: { timestamp: 'asc' },
      take: 20000,
      select: { latitude: true, longitude: true, speedKph: true, timestamp: true, heading: true },
    });
    const max = Math.min(parseInt(maxPoints ?? '1000', 10) || 1000, 5000);
    return { data: downsample(rows, max) };
  }

  @Get(':id/replay')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  replay(@Req() req: any, @Param('id') id: string, @Query('maxPoints') maxPoints?: string) {
    return this.points(req, id, maxPoints);
  }
}
