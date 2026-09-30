import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';

/** Efficient dashboard reads — latest-state table, no telemetry scans. */
@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgScopeGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('summary')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async summary(@Req() req: any) {
    const organizationId: string = req.organizationId;
    const [total, online, open, critical, activeTrips] = await Promise.all([
      this.prisma.vehicle.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.vehicleLatestState.count({ where: { organizationId, connectionStatus: 'ONLINE' } }),
      this.prisma.alert.count({ where: { organizationId, status: 'OPEN' } }),
      this.prisma.alert.count({ where: { organizationId, status: 'OPEN', severity: 'CRITICAL' } }),
      this.prisma.trip.count({
        where: { organizationId, status: { in: ['ACTIVE', 'IN_PROGRESS', 'STARTING'] } },
      }),
    ]);
    return {
      totalVehicles: total,
      onlineVehicles: online,
      offlineVehicles: Math.max(total - online, 0),
      activeTrips,
      openAlerts: open,
      criticalAlerts: critical,
    };
  }

  @Get('live-vehicles')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  live(@Req() req: any) {
    return this.prisma.vehicleLatestState
      .findMany({
        where: { organizationId: req.organizationId },
        include: { vehicle: true },
        take: 500,
      })
      .then((rows) => ({ data: rows }));
  }

  @Get('recent-alerts')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  recentAlerts(@Req() req: any) {
    return this.prisma.alert
      .findMany({
        where: { organizationId: req.organizationId },
        orderBy: { occurredAt: 'desc' },
        take: 20,
      })
      .then((rows) => ({ data: rows }));
  }

  @Get('recent-trips')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  recentTrips(@Req() req: any) {
    return this.prisma.trip
      .findMany({
        where: { organizationId: req.organizationId },
        orderBy: { startedAt: 'desc' },
        take: 20,
      })
      .then((rows) => ({ data: rows }));
  }
}
