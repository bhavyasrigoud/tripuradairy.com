/**
 * Store location + distance helpers.
 *
 * The Tripura Dairy store location already exists on the public site
 * (Contact page map embed). We reuse those exact coordinates here as the
 * single fixed origin for delivery-distance calculations — the Admin never
 * re-enters the store location.
 */

export const STORE_LAT = 17.4117709;
export const STORE_LON = 78.5704023;

export const STORE_MAPS_LINK =
  "https://www.google.co.in/maps/place/Tripura+dairy/@17.4116573,78.5679951,17.14z/data=!4m6!3m5!1s0x3bcb9f001ace8785:0x58bce4f6e58c3147!8m2!3d17.4117709!4d78.5704023!16s%2Fg%2F11zcv2j_gv";

/**
 * Extracts coordinates from a Google Maps link when they are present.
 * Supports `?q=lat,lon`, `@lat,lon,zoom` and `!3dlat!4dlon` forms.
 * Returns null when the link has no coordinates (e.g. a shortened link) —
 * we never guess or invent a location.
 */
export function coordsFromMapsLink(link?: string): { lat: number; lon: number } | null {
  if (!link) return null;
  const patterns = [
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]query=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    /\/(-?\d{1,2}\.\d{3,}),(-?\d{1,3}\.\d{3,})/,
  ];
  for (const re of patterns) {
    const m = link.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lon = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
    }
  }
  return null;
}

/** Straight-line (haversine) distance in km. */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Approx distance from the Tripura Dairy store, or null when unknown. */
export function distanceFromStoreKm(mapsLink?: string): number | null {
  const c = coordsFromMapsLink(mapsLink);
  if (!c) return null;
  return haversineKm({ lat: STORE_LAT, lon: STORE_LON }, c);
}

export function formatDistance(km: number | null) {
  if (km === null) return "Location unavailable";
  return `${km.toFixed(1)} km`;
}

/** Normalises whatever the Admin pasted into an openable Maps URL. */
export function normaliseMapsLink(raw: string) {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  // Bare "lat,lon" paste
  const m = v.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (m) return `https://www.google.com/maps?q=${m[1]},${m[2]}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}`;
}
