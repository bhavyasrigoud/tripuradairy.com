export type AddressParts = {
  /** Apartment / Suite / Flat name — OPTIONAL */
  apartment: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
};

export const emptyAddress: AddressParts = {
  apartment: "",
  street: "",
  city: "",
  state: "",
  pincode: "",
};

export function fullAddress(a: AddressParts) {
  return [a.apartment, a.street, a.city, a.state, a.pincode].filter(Boolean).join(", ");
}

/** Required fields for an address (everything except apartment). */
export function isAddressComplete(a: AddressParts) {
  return Boolean(a.street.trim() && a.city.trim() && a.state.trim() && a.pincode.trim());
}

/**
 * Build a Google Maps search link for a manually-typed address.
 * Used as a fallback when GPS auto-detection wasn't used.
 */
export function buildMapsLinkFromAddress(a: AddressParts) {
  const q = fullAddress(a).trim();
  if (!q) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

type ReverseResult = Partial<AddressParts> & { mapsLink?: string; lat?: number; lon?: number };

/**
 * Requests the user's current location and reverse-geocodes it into
 * address parts using the free OpenStreetMap Nominatim API.
 */
export function getCurrentAddress(): Promise<ReverseResult> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { Accept: "application/json" } },
          );
          if (!res.ok) throw new Error("Could not look up your address.");
          const data = await res.json();
          const a = data.address ?? {};
          let pincode: string = a.postcode ?? "";
          if (!pincode && (a.city || a.town || a.village || a.suburb)) {
            try {
              const q = encodeURIComponent(
                [a.suburb, a.city ?? a.town ?? a.village, a.state, a.country]
                  .filter(Boolean)
                  .join(", "),
              );
              const r2 = await fetch(
                `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${q}`,
                { headers: { Accept: "application/json" } },
              );
              if (r2.ok) {
                const d2 = await r2.json();
                pincode = d2?.[0]?.address?.postcode ?? "";
              }
            } catch {
              /* ignore */
            }
          }
          const apartment = [a.house_number, a.house_name].filter(Boolean).join(" ");
          resolve({
            apartment,
            street: a.road ?? a.pedestrian ?? a.neighbourhood ?? "",
            city:
              a.city ??
              a.town ??
              a.village ??
              a.suburb ??
              a.county ??
              "",
            state: a.state ?? a.region ?? "",
            pincode,
            lat: latitude,
            lon: longitude,
            mapsLink: `https://www.google.com/maps?q=${latitude},${longitude}`,
          });
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Could not look up your address."));
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new Error(
              "Location permission denied. Please enable location access in your browser/phone settings.",
            ),
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error("Your location is unavailable right now. Please try again or enter your address manually."));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error("Locating timed out. Please try again or enter your address manually."));
        } else {
          reject(new Error("Could not get your location. Please enter your address manually."));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Saved addresses (localStorage)                                             */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "tripura.savedAddresses.v1";

export type SavedAddress = {
  id: string;
  label: string;
  address: AddressParts;
  mapsLink?: string;
  savedAt: number;
};

export function loadSavedAddresses(): SavedAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && typeof x === "object" && x.address);
  } catch {
    return [];
  }
}

export function saveAddress(entry: Omit<SavedAddress, "id" | "savedAt">): SavedAddress[] {
  if (typeof window === "undefined") return [];
  const list = loadSavedAddresses();
  const next: SavedAddress = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt: Date.now(),
    ...entry,
  };
  // De-duplicate by fullAddress string
  const key = fullAddress(entry.address);
  const filtered = list.filter((s) => fullAddress(s.address) !== key);
  const updated = [next, ...filtered].slice(0, 10);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteSavedAddress(id: string): SavedAddress[] {
  if (typeof window === "undefined") return [];
  const list = loadSavedAddresses().filter((s) => s.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}
