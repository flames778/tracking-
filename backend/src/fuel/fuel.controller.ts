import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('fuel')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgScopeGuard)
@Controller('vehicles/:id/fuel')
export class FuelController {
  constructor(private prisma: PrismaService) {}

  private async vehicle(@Req() req: any, @Param('id') id: string) {
    const v = await this.prisma.vehicle.findFirst({
      where: { id, organizationId: req.organizationId, deletedAt: null },
    });
    if (!v) return null;
    return v;
  }

  /**
   * Fuel is optional. When the vehicle has no fuel sensor, respond with
   * fuelUnavailable: true — never fabricate a percentage.
   */
  @Get()
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async summary(@Req() req: any, @Param('id') id: string) {
    const v = await this.vehicle(req, id);
    if (!v) return { data: { fuelUnavailable: true } };
    const latest = await this.prisma.fuelReading.findFirst({
      where: { vehicleId: id, organizationId: req.organizationId },
      orderBy: { timestamp: 'desc' },
    });
    if (!latest || (latest.percentage == null && latest.liters == null)) {
      return { data: { fuelUnavailable: true, message: 'Fuel data unavailable' } };
    }
    return { data: { fuelUnavailable: false, reading: latest } };
  }

  @Get('readings')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async readings(
    @Req() req: any,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const v = await this.vehicle(req, id);
    if (!v) return { data: [] };
    const where: any = { vehicleId: id, organizationId: req.organizationId };
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }
    const rows = await this.prisma.fuelReading.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Math.min(parseInt(limit ?? '200', 10) || 200, 1000),
    });
    return { data: rows };
  }

  @Get('events')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async events(@Req() req: any, @Param('id') id: string, @Query('limit') limit?: string) {
    const v = await this.vehicle(req, id);
    if (!v) return { data: [] };
    const rows = await this.prisma.fuelEvent.findMany({
      where: { vehicleId: id, organizationId: req.organizationId },
      orderBy: { timestamp: 'desc' },
      take: Math.min(parseInt(limit ?? '50', 10) || 50, 200),
    });
    return { data: rows };
  }
}
