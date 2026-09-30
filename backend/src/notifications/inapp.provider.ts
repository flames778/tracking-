import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationMessage } from './notification-provider.interface';

/** In-app provider (default). EMAIL/SMS/PUSH adapters implement the same interface later. */
@Injectable()
export class InAppNotificationProvider {
  constructor(private prisma: PrismaService) {}

  async send(n: NotificationMessage) {
    await this.prisma.notification.create({
      data: {
        organizationId: n.organizationId,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        channel: (n.channel ?? 'IN_APP') as any,
        status: 'SENT',
        sentAt: new Date(),
        metadata: (n.metadata ?? {}) as any,
      },
    });
  }
}
