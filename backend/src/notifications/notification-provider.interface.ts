export interface NotificationMessage {
  organizationId: string;
  userId?: string;
  type: string;
  title: string;
  message?: string;
  channel?: 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';
  metadata?: Record<string, unknown>;
}

export interface NotificationProvider {
  send(notification: NotificationMessage): Promise<void>;
}
