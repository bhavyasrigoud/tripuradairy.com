/**
 * Remote sync for the operations data (PHP + MySQL on Hostinger).
 *
 * The UI never talks to this file — only `store.ts` does. The app keeps a
 * synchronous in-memory copy (so no component had to change) and this module
 * keeps that copy in step with the shared server state:
 *
 *   - pull on startup, on tab focus, and every POLL_MS
 *   - push (debounced) after every local mutation
 *   - optimistic concurrency: on a 409 we take the server copy, re-apply the
 *     local change on top and retry once
 *
 * Set VITE_OPS_API_BASE + VITE_OPS_API_KEY in `.env` (or edit the fallbacks
 * below) to point at your Hostinger domain. When the API is unreachable the
 * app keeps working offline from localStorage and syncs on the next success.
 */

/** Where the PHP API lives. "/api" works when the site and API share a domain. */
export const API_BASE = (import.meta.env['VITE_OPS_API_BASE'] as string | undefined) ?? "/api";

/** Must match API_KEY in public/api/config.php. */
export const API_KEY =
  (import.meta.env['VITE_OPS_API_KEY'] as string | undefined) ?? "CHANGE_ME_long_random_string";

export const POLL_MS = 15000;

export type RemoteState<T> = { version: number; data: T };

export type SyncStatus = "offline" | "syncing" | "synced" | "error";

async function call<T>(method: "GET" | "POST", body?: unknown): Promise<Response> {
  return fetch(`${API_BASE}/state.php`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** Reads the shared state. Returns null when the API is unavailable. */
export async function pullState<T>(): Promise<RemoteState<T> | null> {
  try {
    const res = await call<T>("GET");
    if (!res.ok) return null;
    return (await res.json()) as RemoteState<T>;
  } catch {
    return null;
  }
}

/**
 * Writes the shared state.
 * - `{ ok: true, version }`   saved
 * - `{ ok: false, conflict }` server moved on; caller must re-apply and retry
 * - `null`                    network/API unavailable
 */
export async function pushState<T>(
  version: number,
  data: T,
): Promise<{ ok: true; version: number } | { ok: false; conflict: RemoteState<T> } | null> {
  try {
    const res = await call<T>("POST", { version, data });
    if (res.status === 409) {
      return { ok: false, conflict: (await res.json()) as RemoteState<T> };
    }
    if (!res.ok) return null;
    const json = (await res.json()) as RemoteState<T>;
    return { ok: true, version: json.version };
  } catch {
    return null;
  }
}
