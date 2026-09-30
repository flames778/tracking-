/** Haversine distance in km between two WGS84 points. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371.0088;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/** Point-in-polygon (ray casting). Polygon: [[lng,lat],...] or [{latitude,longitude}...]. */
export function pointInPolygon(
  lat: number,
  lng: number,
  polygon: any,
): boolean {
  let coords: Array<[number, number]> = [];
  if (Array.isArray(polygon)) {
    if (polygon.length === 0) return false;
    if (Array.isArray(polygon[0])) {
      coords = polygon as Array<[number, number]>;
    } else if (typeof polygon[0] === 'object') {
      coords = (polygon as any[]).map((p) => [p.longitude ?? p.lng ?? p[0], p.latitude ?? p.lat ?? p[1]]);
    }
  } else if (polygon?.coordinates) {
    const ring = polygon.coordinates[0] ?? polygon.coordinates;
    coords = ring as Array<[number, number]>;
  }
  if (coords.length < 3) return false;
  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][0];
    const yi = coords[i][1];
    const xj = coords[j][0];
    const yj = coords[j][1];
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function isInsideGeofence(
  lat: number,
  lng: number,
  geofence: { type: string; centerLatitude?: number | null; centerLongitude?: number | null; radiusMeters?: number | null; polygon?: any; geometry?: any },
): boolean {
  if (geofence.type === 'CIRCLE') {
    if (
      geofence.centerLatitude == null ||
      geofence.centerLongitude == null ||
      geofence.radiusMeters == null
    )
      return false;
    const dKm = haversineKm(lat, lng, geofence.centerLatitude, geofence.centerLongitude);
    return dKm * 1000 <= geofence.radiusMeters;
  }
  const poly = geofence.polygon ?? geofence.geometry;
  if (!poly) return false;
  return pointInPolygon(lat, lng, poly);
}

export function downsample<T>(
  points: T[],
  maxPoints: number,
): T[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const out: T[] = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]);
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]);
  return out;
}
