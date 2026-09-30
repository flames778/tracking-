import { haversineKm, isInsideGeofence, isValidCoordinate } from './geo.util';
import { validateTelemetry } from '../../tracking/telemetry-validator';

describe('geo utils', () => {
  it('haversine Lagos→Abuja ≈ 530km', () => {
    const d = haversineKm(6.5244, 3.3792, 9.0765, 7.3986);
    expect(d).toBeGreaterThan(500);
    expect(d).toBeLessThan(560);
  });

  it('validates coordinates', () => {
    expect(isValidCoordinate(6.5, 3.3)).toBe(true);
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(0, 181)).toBe(false);
  });

  it('circle geofence contains/excludes', () => {
    const fence = {
      type: 'CIRCLE',
      centerLatitude: 6.4549,
      centerLongitude: 3.3947,
      radiusMeters: 800,
    };
    expect(isInsideGeofence(6.4549, 3.3947, fence)).toBe(true);
    expect(isInsideGeofence(6.6, 3.35, fence)).toBe(false);
  });

  it('polygon geofence contains/excludes', () => {
    const fence = {
      type: 'POLYGON',
      polygon: [
        [3.37, 6.5],
        [3.38, 6.5],
        [3.38, 6.51],
        [3.37, 6.51],
      ],
    };
    expect(isInsideGeofence(6.505, 3.375, fence)).toBe(true);
    expect(isInsideGeofence(6.6, 3.35, fence)).toBe(false);
  });
});

describe('telemetry validation', () => {
  const config: any = { get: (k: string) => (k === 'app.ingestMaxSkewMinutes' ? 60 : undefined) };

  it('accepts valid telemetry', () => {
    const v = validateTelemetry(
      { imei: 'x', timestamp: new Date(), latitude: 6.5, longitude: 3.3, speedKph: 60 },
      config,
    );
    expect(v.quality).toBe('VALID');
  });

  it('rejects bad coordinates/speed', () => {
    expect(
      validateTelemetry(
        { imei: 'x', timestamp: new Date(), latitude: 200, longitude: 3, speedKph: 10 },
        config,
      ).quality,
    ).toBe('INVALID');
    expect(
      validateTelemetry(
        { imei: 'x', timestamp: new Date(), latitude: 6, longitude: 3, speedKph: -5 },
        config,
      ).quality,
    ).toBe('INVALID');
  });

  it('flags impossible jumps as suspicious (not silently dropped)', () => {
    const v = validateTelemetry(
      { imei: 'x', timestamp: new Date(), latitude: 9.07, longitude: 7.39, speedKph: 60 },
      config,
      { lastLat: 6.52, lastLng: 3.37, lastTimestamp: new Date(Date.now() - 60_000) },
    );
    expect(v.quality).toBe('SUSPICIOUS');
  });
});
