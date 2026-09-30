import { Injectable } from '@nestjs/common';
import {
  ParsedTelemetry,
  TrackingProtocolAdapter,
} from './protocol-adapter.interface';

/**
 * Generic JSON adapter — used by the HTTP ingestion endpoint and the
 * simulator transport. Accepts already-normalized JSON so the simulator
 * exercises the SAME pipeline as real devices.
 */
@Injectable()
export class GenericJsonAdapter implements TrackingProtocolAdapter {
  readonly name = 'GENERIC_JSON';

  canHandle(message: Buffer | string): boolean {
    try {
      const text = Buffer.isBuffer(message) ? message.toString('utf8') : message;
      const obj = JSON.parse(text);
      return typeof obj?.imei === 'string' && typeof obj?.latitude === 'number';
    } catch {
      return false;
    }
  }

  parse(message: Buffer | string): ParsedTelemetry | null {
    try {
      const text = Buffer.isBuffer(message) ? message.toString('utf8') : message;
      const o = JSON.parse(text);
      if (!o.imei || typeof o.latitude !== 'number' || typeof o.longitude !== 'number') {
        return null;
      }
      return {
        imei: String(o.imei),
        timestamp: o.timestamp ? new Date(o.timestamp) : new Date(),
        latitude: Number(o.latitude),
        longitude: Number(o.longitude),
        speedKph: Number(o.speedKph ?? o.speed ?? 0),
        heading: o.heading != null ? Number(o.heading) : undefined,
        ignition: o.ignition != null ? Boolean(o.ignition) : undefined,
        batteryVoltage: o.batteryVoltage != null ? Number(o.batteryVoltage) : undefined,
        fuelPercentage: o.fuelPercentage != null ? Number(o.fuelPercentage) : undefined,
        fuelLiters: o.fuelLiters != null ? Number(o.fuelLiters) : undefined,
        odometerKm: o.odometerKm != null ? Number(o.odometerKm) : undefined,
        satellites: o.satellites != null ? Number(o.satellites) : undefined,
        gsmSignal: o.gsmSignal != null ? Number(o.gsmSignal) : undefined,
        engineStatus: o.engineStatus,
        sequenceNumber: o.sequenceNumber ? String(o.sequenceNumber) : undefined,
        rawData: o,
      };
    } catch {
      return null;
    }
  }
}
