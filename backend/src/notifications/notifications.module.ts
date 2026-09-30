import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { InAppNotificationProvider } from './inapp.provider';

@Module({
  controllers: [NotificationsController],
  providers: [InAppNotificationProvider],
  exports: [InAppNotificationProvider],
})
export class NotificationsModule {}
