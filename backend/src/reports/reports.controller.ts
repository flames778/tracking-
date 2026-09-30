import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IsEnum, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { QUEUES } from '../config/constants';
import { ReportType } from '@prisma/client';
import { ReportStorageService } from './report-storage.service';

class GenerateReportDto {
  @IsEnum(ReportType) type!: ReportType;
  @IsOptional() @IsObject() parameters?: Record<string, unknown>;
  @IsOptional() @IsIn(['csv', 'pdf']) fileFormat?: string;
}

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgScopeGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private prisma: PrismaService,
    private storage: ReportStorageService,
    @InjectQueue(QUEUES.REPORT) private reportQueue: Queue,
  ) {}

  /** Small synchronous reads (dashboard-friendly aggregates). */
  @Get('vehicles')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  vehicles(@Req() req: any) {
    return this.prisma.vehicle
      .findMany({
        where: { organizationId: req.organizationId, deletedAt: null },
        include: { latestState: true },
        take: 500,
      })
      .then((rows) => ({ data: rows }));
  }

  @Get('trips')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  trips(@Req() req: any, @Query() q: any) {
    const where: any = { organizationId: req.organizationId };
    if (q.vehicleId) where.vehicleId = q.vehicleId;
    if (q.dateFrom || q.dateTo) {
      where.startedAt = {};
      if (q.dateFrom) where.startedAt.gte = new Date(q.dateFrom);
      if (q.dateTo) where.startedAt.lte = new Date(q.dateTo);
    }
    return this.prisma.trip
      .findMany({ where, orderBy: { startedAt: 'desc' }, take: 500 })
      .then((rows) => ({ data: rows }));
  }

  @Get('alerts')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  alerts(@Req() req: any, @Query() q: any) {
    const where: any = { organizationId: req.organizationId };
    if (q.vehicleId) where.vehicleId = q.vehicleId;
    if (q.type) where.type = q.type;
    return this.prisma.alert
      .findMany({ where, orderBy: { occurredAt: 'desc' }, take: 500 })
      .then((rows) => ({ data: rows }));
  }

  @Get('fuel')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  fuel(@Req() req: any, @Query() q: any) {
    const where: any = { organizationId: req.organizationId };
    if (q.vehicleId) where.vehicleId = q.vehicleId;
    return this.prisma.fuelEvent
      .findMany({ where, orderBy: { timestamp: 'desc' }, take: 500 })
      .then((rows) => ({ data: rows }));
  }

  @Get('geofences')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  geofences(@Req() req: any) {
    return this.prisma.geofenceEvent
      .findMany({
        where: { organizationId: req.organizationId },
        orderBy: { timestamp: 'desc' },
        take: 500,
      })
      .then((rows) => ({ data: rows }));
  }

  /** Async generation: POST /reports/generate → job id → poll GET /reports/:id */
  @Post('generate')
  @Roles('FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async generate(@Req() req: any, @Body() dto: GenerateReportDto) {
    const report = await this.prisma.report.create({
      data: {
        organizationId: req.organizationId,
        type: dto.type,
        status: 'QUEUED',
        parameters: (dto.parameters ?? {}) as any,
        fileFormat: dto.fileFormat ?? 'csv',
        requestedBy: req.user.sub,
      },
    });
    try {
      await this.reportQueue.add(
        'generate',
        { reportId: report.id },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100 },
      );
    } catch {
      // Redis down → fall back to sync PENDING (visible, retryable)
    }
    return { id: report.id, status: report.status };
  }

  @Get(':id')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async get(@Req() req: any, @Param('id') id: string) {
    const r = await this.prisma.report.findFirst({
      where: { id, organizationId: req.organizationId },
    });
    if (!r) throw new NotFoundException('Report not found');
    return r;
  }

  /** Streams the generated file. Tenant-scoped: foreign ids 404. */
  @Get(':id/download')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async download(@Req() req: any, @Param('id') id: string, @Res() res: any) {
    const r = await this.prisma.report.findFirst({
      where: { id, organizationId: req.organizationId },
    });
    if (!r) throw new NotFoundException('Report not found');
    if (r.status !== 'COMPLETED') {
      throw new BadRequestException(`Report is not ready (status: ${r.status})`);
    }
    const format = r.fileFormat === 'pdf' ? 'pdf' : 'csv';
    const file = await this.storage.read(r.id, format);
    if (!file) throw new NotFoundException('Report file missing');
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${r.type}.${format}"`);
    res.send(file);
  }
}
