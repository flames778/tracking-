import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgScopeGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER')
  list(
    @Req() req: any,
    @Query('take') take?: string,
    @Query('entityType') entityType?: string,
  ) {
    const organizationId: string | null = req.organizationId ?? null;
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (entityType) where.entityType = entityType;
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(take ?? '50', 10) || 50, 200),
    });
  }
}
