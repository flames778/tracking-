export const REALTIME_EVENTS = {
  TELEMETRY_UPDATED: 'vehicle.telemetry.updated',
  STATUS_CHANGED: 'vehicle.status.changed',
  CONNECTED: 'vehicle.connected',
  DISCONNECTED: 'vehicle.disconnected',
  IGNITION_CHANGED: 'vehicle.ignition.changed',
  ALERT_CREATED: 'vehicle.alert.created',
  GEOFENCE_ENTERED: 'vehicle.geofence.entered',
  GEOFENCE_EXITED: 'vehicle.geofence.exited',
  FUEL_EVENT: 'fuel.event.detected',
  TRIP_STARTED: 'trip.started',
  TRIP_ENDED: 'trip.ended',
} as const;

export const QUEUES = {
  TELEMETRY: 'telemetry-processing',
  TRIP: 'trip-processing',
  ALERT: 'alert-processing',
  NOTIFICATION: 'notification-processing',
  REPORT: 'report-generation',
  DEVICE_STATUS: 'device-status',
  RETENTION: 'data-retention',
} as const;

export const ERROR_CODES = {
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  FORBIDDEN: 'FORBIDDEN',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  DEVICE_INACTIVE: 'DEVICE_INACTIVE',
  VEHICLE_NOT_FOUND: 'VEHICLE_NOT_FOUND',
  INVALID_TELEMETRY: 'INVALID_TELEMETRY',
  PROTOCOL_NOT_SUPPORTED: 'PROTOCOL_NOT_SUPPORTED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
