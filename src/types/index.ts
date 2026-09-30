export type Role = 'super_admin' | 'admin' | 'fleet_manager' | 'fleet_user' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
}

export interface Organization {
  id: string;
  name: string;
  subscriptionPlan: 'Personal' | 'Business' | 'Enterprise';
}

export interface Vehicle {
  id: string;
  name: string;
  registrationNumber: string;
  organizationId: string;
  deviceId?: string;
  type: string;
  status: 'online' | 'offline';
  hasFuelSensor: boolean;
  createdAt: string;
}

export interface VehicleTelemetry {
  vehicleId: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
  speed: number;
  heading: number;
  ignition: boolean;
  fuel?: {
    percentage: number;
    liters?: number;
  };
  batteryVoltage?: number;
  connectionStatus: 'online' | 'offline';
  odometer?: number;
  engineStatus?: string;
}

export interface TrackerDevice {
  id: string;
  imei: string;
  model: string;
  assignedVehicleId?: string;
  simStatus: 'active' | 'inactive';
  connectionStatus: 'online' | 'offline';
  lastCommunication?: string;
  installationDate?: string;
  firmwareVersion?: string;
}

export interface TripPoint {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

export interface Trip {
  id: string;
  vehicleId: string;
  startTime: string;
  endTime: string;
  startLocation: string;
  endLocation: string;
  distanceKm: number;
  durationMinutes: number;
  maxSpeedKmh: number;
  route: TripPoint[];
}

export interface Alert {
  id: string;
  vehicleId: string;
  type: 'Overspeeding' | 'Geofence' | 'Device Offline' | 'Ignition' | 'Fuel Event';
  severity: 'Critical' | 'Warning' | 'Information';
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface Geofence {
  id: string;
  name: string;
  type: string;
  trigger: ('Enter' | 'Exit')[];
  assignedVehicleIds: string[];
  coordinates: { latitude: number; longitude: number }[]; // For simplicity, array of points defining polygon
}

export interface FuelReading {
  vehicleId: string;
  timestamp: string;
  percentage: number;
  liters?: number;
}

export interface Installation {
  id: string;
  customerId: string;
  vehicleId: string;
  deviceId: string;
  installer: string;
  installationDate: string;
  status: 'Pending' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  notes: string;
}

export interface Subscription {
  id: string;
  organizationId: string;
  plan: 'Personal' | 'Business' | 'Enterprise';
  status: 'active' | 'suspended' | 'cancelled';
  renewalDate: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  timestamp: string;
  isRead: boolean;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  type: string;
  description: string;
  timestamp: string;
}
