import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';

/** Platform admin — SUPER_ADMIN only, cross-tenant visibility. */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private orgs: OrganizationsService,
  ) {}

  @Get('organizations')
  @Roles('SUPER_ADMIN')
  orgs_(@Query('take') take?: string, @Query('skip') skip?: string) {
    return this.orgs.listAll(parseInt(take ?? '50', 10) || 50, parseInt(skip ?? '0', 10) || 0);
  }

  @Get('devices')
  @Roles('SUPER_ADMIN')
  devices(@Query('take') take?: string) {
    return this.prisma.device.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(take ?? '50', 10) || 50, 200),
      include: { vehicle: true, organization: { select: { id: true, name: true, slug: true } } },
    });
  }

  @Get('installations')
  @Roles('SUPER_ADMIN')
  installations() {
    return this.prisma.installation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { vehicle: true, device: true },
    });
  }

  @Get('subscriptions')
  @Roles('SUPER_ADMIN')
  subs() {
    return this.prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });
  }

  @Get('audit-logs')
  @Roles('SUPER_ADMIN')
  audit(@Req() req: any, @Query('take') take?: string, @Query('organizationId') organizationId?: string) {
    void req;
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(take ?? '100', 10) || 100, 500),
    });
  }

  @Get('rejected-devices')
  @Roles('SUPER_ADMIN')
  rejected(@Query('take') take?: string) {
    return this.prisma.deviceMessageLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(take ?? '100', 10) || 100, 500),
    });
  }

  @Get('system/health')
  @Roles('SUPER_ADMIN')
  async health() {
    const [orgs, vehicles, devices, telemetry] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.vehicle.count(),
      this.prisma.device.count(),
      this.prisma.telemetry.count(),
    ]);
    return { orgs, vehicles, devices, telemetry, uptimeSec: Math.round(process.uptime()) };
  }
}
