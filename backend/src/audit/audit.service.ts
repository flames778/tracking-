import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    organizationId?: string | null;
    userId?: string | null;
    actorId?: string | null;
    action: string;
    entityType?: string;
    entity?: string;
    entityId?: string;
    metadata?: unknown;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: params.organizationId ?? undefined,
          userId: params.userId ?? params.actorId ?? undefined,
          action: params.action,
          entityType: params.entityType ?? params.entity,
          entityId: params.entityId,
          metadata: (params.metadata ?? undefined) as any,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch {
      // audit must never break the request
    }
  }
}
