import { Controller, Get, Param, Patch, Post, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgScopeGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  list(@Req() req: any) {
    return this.prisma.notification
      .findMany({
        where: { organizationId: req.organizationId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      .then((rows) => ({ data: rows }));
  }

  @Patch(':id/read')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  async read(@Req() req: any, @Param('id') id: string) {
    const n = await this.prisma.notification.findFirst({
      where: { id, organizationId: req.organizationId },
    });
    if (!n) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date(), status: 'READ' },
    });
  }

  @Post('read-all')
  @Roles('VIEWER', 'FLEET_USER', 'FLEET_MANAGER', 'ADMIN', 'SUPER_ADMIN')
  readAll(@Req() req: any) {
    return this.prisma.notification
      .updateMany({
        where: { organizationId: req.organizationId, readAt: null },
        data: { readAt: new Date(), status: 'READ' },
      })
      .then((r) => ({ updated: r.count }));
  }
}
