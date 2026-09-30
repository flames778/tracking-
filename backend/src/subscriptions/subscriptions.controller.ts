import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrgScopeGuard } from '../common/guards/org-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';

export interface PaymentProvider {
  createCheckout(organizationId: string, planId: string): Promise<{ url: string }>;
  handleWebhook(payload: unknown): Promise<void>;
}

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgScopeGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private prisma: PrismaService) {}

  @Get('current')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'VIEWER', 'FLEET_USER')
  current(@Req() req: any) {
    return this.prisma.subscription.findFirst({
      where: { organizationId: req.organizationId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
  }

  @Get('plans')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER', 'VIEWER', 'FLEET_USER')
  plans() {
    return this.prisma.subscriptionPlan
      .findMany({ where: { active: true } })
      .then((rows) => ({ data: rows }));
  }

  @Patch('current')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async change(@Req() req: any, @Body() body: { planId?: string; planName?: string }) {
    // Manual/billing-ops change only — payment gateway plugs in via PaymentProvider.
    const current = await this.prisma.subscription.findFirst({
      where: { organizationId: req.organizationId },
      orderBy: { createdAt: 'desc' },
    });
    if (!current) {
      return this.prisma.subscription.create({
        data: {
          organizationId: req.organizationId,
          planId: body.planId,
          planName: body.planName ?? 'FREE',
          status: 'TRIAL',
        },
      });
    }
    return this.prisma.subscription.update({
      where: { id: current.id },
      data: { planId: body.planId, planName: body.planName },
    });
  }
}
