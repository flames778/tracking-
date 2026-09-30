import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
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
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from './dto';

@ApiTags('alerts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgScopeGuard)
@Controller()
export class AlertsController {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  @Get('alerts')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  list(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('limit') limit?: string,
  ) {
    const where: any = { organizationId: req.organizationId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (vehicleId) where.vehicleId = vehicleId;
    return this.prisma.alert
      .findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: Math.min(parseInt(limit ?? '50', 10) || 50, 200),
      })
      .then((rows) => ({ data: rows }));
  }

  @Get('alerts/:id')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async get(@Req() req: any, @Param('id') id: string) {
    const a = await this.prisma.alert.findFirst({
      where: { id, organizationId: req.organizationId },
    });
    if (!a) throw new NotFoundException('Alert not found');
    return a;
  }

  @Patch('alerts/:id/acknowledge')
  @Roles('FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'FLEET_USER')
  async ack(@Req() req: any, @Param('id') id: string) {
    await this.get(req, id);
    return this.prisma.alert.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date(), acknowledgedBy: req.user.sub },
    });
  }

  @Patch('alerts/:id/resolve')
  @Roles('FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async resolve(@Req() req: any, @Param('id') id: string) {
    await this.get(req, id);
    return this.prisma.alert.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
  }

  @Get('alert-rules')
  @Roles('FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  rules(@Req() req: any) {
    return this.prisma.alertRule
      .findMany({ where: { organizationId: req.organizationId }, orderBy: { createdAt: 'desc' } })
      .then((rows) => ({ data: rows }));
  }

  @Post('alert-rules')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER')
  async createRule(@Req() req: any, @Body() dto: CreateAlertRuleDto) {
    if (dto.vehicleId) {
      const v = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, organizationId: req.organizationId },
      });
      if (!v) throw new NotFoundException('Vehicle not found');
    }
    const rule = await this.prisma.alertRule.create({
      data: {
        organizationId: req.organizationId,
        vehicleId: dto.vehicleId,
        type: dto.type,
        enabled: dto.enabled ?? true,
        configuration: (dto.configuration ?? {}) as any,
        cooldownSeconds: dto.cooldownSeconds ?? 600,
      },
    });
    await this.audit.log({
      organizationId: req.organizationId,
      userId: req.user.sub,
      action: 'ALERT_RULE_CHANGED',
      entityType: 'AlertRule',
      entityId: rule.id,
      metadata: dto,
    });
    return rule;
  }

  @Patch('alert-rules/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER')
  async updateRule(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAlertRuleDto) {
    const existing = await this.prisma.alertRule.findFirst({
      where: { id, organizationId: req.organizationId },
    });
    if (!existing) throw new NotFoundException('Alert rule not found');
    return this.prisma.alertRule.update({ where: { id }, data: dto as any });
  }

  @Delete('alert-rules/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async deleteRule(@Req() req: any, @Param('id') id: string) {
    const existing = await this.prisma.alertRule.findFirst({
      where: { id, organizationId: req.organizationId },
    });
    if (!existing) throw new NotFoundException('Alert rule not found');
    await this.prisma.alertRule.delete({ where: { id } });
    return { ok: true };
  }
}
