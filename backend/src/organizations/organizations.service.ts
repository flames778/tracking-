import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateOrganizationDto } from './dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getMine(organizationId: string | null) {
    if (!organizationId) throw new NotFoundException('No organization');
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async updateMine(organizationId: string | null, userId: string, dto: UpdateOrganizationDto) {
    if (!organizationId) throw new ForbiddenException('No organization scope');
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: dto,
    });
    await this.audit.log({
      organizationId,
      userId,
      action: 'ORGANIZATION_UPDATED',
      entityType: 'Organization',
      entityId: updated.id,
      metadata: dto,
    });
    return updated;
  }

  // ── platform admin ──
  listAll(take = 50, skip = 0) {
    return this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 200),
      skip,
      include: { _count: { select: { vehicles: true, devices: true, users: true } } },
    });
  }

  getById(id: string) {
    return this.prisma.organization.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new NotFoundException('Organization not found');
    });
  }
}
