import { ConfigService } from '@nestjs/config';
import { ParsedTelemetry, ValidatedTelemetry } from './adapters/protocol-adapter.interface';
import { haversineKm, isValidCoordinate } from '../common/utils/geo.util';

export interface ValidationContext {
  lastLat?: number | null;
  lastLng?: number | null;
  lastTimestamp?: Date | null;
}

/**
 * GPS validation: coordinate bounds, speed, timestamp sanity,
 * impossible jumps (>500km/h implied). Classifies VALID/SUSPICIOUS/INVALID.
 * Suspicious data is still persisted (flagged) — never silently dropped.
 */
export function validateTelemetry(
  t: ParsedTelemetry,
  config: ConfigService,
  ctx: ValidationContext = {},
): ValidatedTelemetry {
  const fail = (reason: string): ValidatedTelemetry => ({
    ...t,
    quality: 'INVALID',
    rejectionReason: reason,
  });

  if (!t.imei || typeof t.imei !== 'string') return fail('missing imei');
  if (!isValidCoordinate(t.latitude, t.longitude)) return fail('invalid coordinates');
  if (!Number.isFinite(t.speedKph) || t.speedKph < 0 || t.speedKph > 600) {
    return fail('invalid speed');
  }
  if (!(t.timestamp instanceof Date) || isNaN(t.timestamp.getTime())) {
    return fail('invalid timestamp');
  }

  const now = Date.now();
  const skewMin = config.get<number>('app.ingestMaxSkewMinutes') ?? 60;
  const diffMin = (t.timestamp.getTime() - now) / 60000;
  if (diffMin > skewMin) return fail('timestamp too far in future');
  if (diffMin < -(60 * 24 * 30)) return fail('timestamp too old');

  if (t.fuelPercentage != null && (t.fuelPercentage < 0 || t.fuelPercentage > 100)) {
    return fail('invalid fuel percentage');
  }
  if (t.batteryVoltage != null && (t.batteryVoltage < 0 || t.batteryVoltage > 60)) {
    return { ...t, quality: 'SUSPICIOUS', rejectionReason: 'unlikely battery voltage' };
  }

  // impossible jump check against last known point
  if (
    ctx.lastLat != null &&
    ctx.lastLng != null &&
    ctx.lastTimestamp &&
    isValidCoordinate(ctx.lastLat, ctx.lastLng)
  ) {
    const dtHrs = (t.timestamp.getTime() - ctx.lastTimestamp.getTime()) / 3600000;
    if (dtHrs > 0) {
      const distKm = haversineKm(ctx.lastLat, ctx.lastLng, t.latitude, t.longitude);
      const impliedKph = distKm / dtHrs;
      if (impliedKph > 500 && distKm > 5) {
        return { ...t, quality: 'SUSPICIOUS', rejectionReason: `impossible jump: ${impliedKph.toFixed(0)}km/h implied` };
      }
    }
  }

  return { ...t, quality: 'VALID' };
}
