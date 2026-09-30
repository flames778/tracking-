import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateGeofenceDto, UpdateGeofenceDto } from './dto';

@ApiTags('geofences')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgScopeGuard)
@Controller('geofences')
export class GeofencesController {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  @Get()
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  list(@Req() req: any) {
    return this.prisma.geofence
      .findMany({
        where: { organizationId: req.organizationId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      })
      .then((rows) => ({ data: rows }));
  }

  @Post()
  @Roles('FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async create(@Req() req: any, @Body() dto: CreateGeofenceDto) {
    const g = await this.prisma.geofence.create({
      data: {
        organizationId: req.organizationId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        centerLatitude: dto.centerLatitude,
        centerLongitude: dto.centerLongitude,
        radiusMeters: dto.radiusMeters,
        polygon: dto.polygon as any,
        geometry: (dto.polygon ?? undefined) as any,
        enterAlertEnabled: dto.enterAlertEnabled ?? true,
        exitAlertEnabled: dto.exitAlertEnabled ?? true,
      },
    });
    await this.audit.log({
      organizationId: req.organizationId,
      userId: req.user.sub,
      action: 'GEOFENCE_CREATED',
      entityType: 'Geofence',
      entityId: g.id,
    });
    return g;
  }

  @Get(':id')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async get(@Req() req: any, @Param('id') id: string) {
    const g = await this.prisma.geofence.findFirst({
      where: { id, organizationId: req.organizationId, deletedAt: null },
    });
    if (!g) throw new NotFoundException('Geofence not found');
    return g;
  }

  @Patch(':id')
  @Roles('FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateGeofenceDto) {
    await this.get(req, id);
    return this.prisma.geofence.update({ where: { id }, data: dto as any });
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.get(req, id);
    await this.prisma.geofence.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
    return { ok: true };
  }
}
