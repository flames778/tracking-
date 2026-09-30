import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto, VehicleQuery } from './dto';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('vehicles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgScopeGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(
    private vehicles: VehiclesService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  list(@Req() req: any, @Query() q: VehicleQuery) {
    return this.vehicles.list(req.organizationId, q);
  }

  @Post()
  @Roles('FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  create(@Req() req: any, @Body() dto: CreateVehicleDto) {
    return this.vehicles.create(req.organizationId, req.user.sub, dto);
  }

  @Get(':id')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  get(@Req() req: any, @Param('id') id: string) {
    return this.vehicles.getOwned(req.organizationId, id);
  }

  @Patch(':id')
  @Roles('FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicles.update(req.organizationId, req.user.sub, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.vehicles.remove(req.organizationId, req.user.sub, id);
  }

  @Get(':id/latest')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  latest(@Req() req: any, @Param('id') id: string) {
    return this.vehicles.latest(req.organizationId, id);
  }

  @Get(':id/trips')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async trips(@Req() req: any, @Param('id') id: string) {
    await this.vehicles.getOwned(req.organizationId, id);
    const rows = await this.prisma.trip.findMany({
      where: { vehicleId: id, organizationId: req.organizationId },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
    return { data: rows };
  }

  @Get(':id/alerts')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async alerts(@Req() req: any, @Param('id') id: string) {
    await this.vehicles.getOwned(req.organizationId, id);
    const rows = await this.prisma.alert.findMany({
      where: { vehicleId: id, organizationId: req.organizationId },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
    return { data: rows };
  }

  @Get(':id/geofences')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async geofences(@Req() req: any, @Param('id') id: string) {
    await this.vehicles.getOwned(req.organizationId, id);
    const rows = await this.prisma.geofenceEvent.findMany({
      where: { vehicleId: id, organizationId: req.organizationId },
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: { geofence: true },
    });
    return { data: rows };
  }
}
