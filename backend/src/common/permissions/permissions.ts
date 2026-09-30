import { Role } from '@prisma/client';

/** Central permission matrix. RolesGuard handles hierarchy; this documents intent. */
export const PERMISSIONS: Record<string, Role[]> = {
  'org.manage': ['SUPER_ADMIN', 'ADMIN'],
  'user.manage': ['SUPER_ADMIN', 'ADMIN'],
  'vehicle.manage': ['SUPER_ADMIN', 'ADMIN', 'FLEET_MANAGER'],
  'vehicle.view': ['SUPER_ADMIN', 'ADMIN', 'FLEET_MANAGER', 'FLEET_USER', 'VIEWER'],
  'device.manage': ['SUPER_ADMIN', 'ADMIN', 'FLEET_MANAGER'],
  'trip.view': ['SUPER_ADMIN', 'ADMIN', 'FLEET_MANAGER', 'FLEET_USER', 'VIEWER'],
  'alert.manage': ['SUPER_ADMIN', 'ADMIN', 'FLEET_MANAGER'],
  'geofence.manage': ['SUPER_ADMIN', 'ADMIN', 'FLEET_MANAGER'],
  'report.manage': ['SUPER_ADMIN', 'ADMIN', 'FLEET_MANAGER'],
  'subscription.manage': ['SUPER_ADMIN', 'ADMIN'],
  'installation.manage': ['SUPER_ADMIN', 'ADMIN', 'FLEET_MANAGER'],
};
