import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateInstallationDto, UpdateInstallationDto } from './dto';

@ApiTags('installations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgScopeGuard)
@Controller('installations')
export class InstallationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER')
  list(@Req() req: any) {
    return this.prisma.installation
      .findMany({
        where: { organizationId: req.organizationId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { vehicle: true, device: true },
      })
      .then((rows) => ({ data: rows }));
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER')
  async create(@Req() req: any, @Body() dto: CreateInstallationDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, organizationId: req.organizationId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return this.prisma.installation.create({
      data: {
        organizationId: req.organizationId,
        vehicleId: dto.vehicleId,
        deviceId: dto.deviceId,
        installerName: dto.installerName,
        installerPhone: dto.installerPhone,
        installationLocation: dto.installationLocation,
        notes: dto.notes,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status: 'SCHEDULED',
      },
    });
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateInstallationDto) {
    const existing = await this.prisma.installation.findFirst({
      where: { id, organizationId: req.organizationId },
    });
    if (!existing) throw new NotFoundException('Installation not found');
    const data: any = { ...dto };
    if (dto.status === 'COMPLETED') data.completedAt = new Date();
    return this.prisma.installation.update({ where: { id }, data });
  }
}
