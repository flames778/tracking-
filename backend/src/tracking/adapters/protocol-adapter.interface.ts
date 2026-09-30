/**
 * Central contract between device ingestion and the rest of the backend.
 * Regardless of manufacturer (C003F or other), adapters MUST output this shape.
 * Optional fields stay null/undefined when the device doesn't provide them —
 * never fabricate sensor values.
 */
export interface ParsedTelemetry {
  imei: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  speedKph: number;
  heading?: number;
  ignition?: boolean;
  batteryVoltage?: number;
  fuelPercentage?: number;
  fuelLiters?: number;
  odometerKm?: number;
  satellites?: number;
  gsmSignal?: number;
  engineStatus?: string;
  sequenceNumber?: string;
  rawData?: unknown;
}

/**
 * Protocol adapter boundary. The real C003F adapter implements this
 * once protocol documentation is available. Domain code never imports
 * C003F specifics directly.
 */
export interface TrackingProtocolAdapter {
  readonly name: string;
  canHandle(message: Buffer | string): boolean;
  parse(message: Buffer | string): ParsedTelemetry | null;
  buildResponse?(message: Buffer | string): Buffer | string | null;
}

export type TelemetryQuality = 'VALID' | 'SUSPICIOUS' | 'INVALID';

export interface ValidatedTelemetry extends ParsedTelemetry {
  quality: TelemetryQuality;
  rejectionReason?: string;
}
