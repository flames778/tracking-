import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('telemetry')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgScopeGuard)
@Controller('vehicles/:id/telemetry')
export class TelemetryController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async history(
    @Req() req: any,
    @Param('id') vehicleId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const organizationId: string = req.organizationId;
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, organizationId, deletedAt: null },
    });
    if (!vehicle) return { data: [], meta: { hasMore: false, nextCursor: null } };
    const take = Math.min(parseInt(limit ?? '200', 10) || 200, 1000);
    const where: any = { vehicleId, organizationId };
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }
    if (cursor) where.timestamp = { ...(where.timestamp ?? {}), lt: new Date(cursor) };
    const rows = await this.prisma.telemetry.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: take + 1,
    });
    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;
    return {
      data,
      meta: {
        hasMore,
        nextCursor: hasMore ? data[data.length - 1].timestamp : null,
      },
    };
  }
}
