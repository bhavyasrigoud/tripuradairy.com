/**
 * Staff authentication (Admin / Delivery Boy).
 *
 * Passwords are never stored in plain text — only SHA-256(salt + password).
 * Sessions expire after 12 hours. This is a client-side gate suitable for the
 * current static hosting setup; when a backend is added, `login()` and
 * `getSession()` are the only functions that need to change.
 */
import { useSyncExternalStore } from "react";
import { mutate, readDb, refreshFromServer, startSync, uid } from "./store";
import type { StaffRole, StaffUser } from "./types";

const SESSION_KEY = "tripura.staffSession.v1";
const SESSION_MS = 12 * 60 * 60 * 1000;

export const DEFAULT_ADMIN = { username: "admin", password: "tripura@2026" };

export type Session = {
  userId: string;
  name: string;
  role: StaffRole;
  expiresAt: number;
};

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function makeCredentials(password: string) {
  const salt = uid("s-");
  return { salt, passHash: await hashPassword(password, salt) };
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (!s?.userId || s.expiresAt < Date.now()) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
  emit();
}

/**
 * Cached snapshot: `useSyncExternalStore` requires a stable reference between
 * renders, so the parsed session object is reused until the stored value or
 * its expiry actually changes.
 */
let snapshotRaw: string | null = null;
let snapshotValue: Session | null = null;

function getSessionSnapshot(): Session | null {
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(SESSION_KEY);
  const next = getSession();
  if (raw !== snapshotRaw || (next === null) !== (snapshotValue === null)) {
    snapshotRaw = raw;
    snapshotValue = next;
  }
  return snapshotValue;
}

export function useSession() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const onStorage = () => cb();
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSessionSnapshot,
    () => null,
  );
}

/** Ensures a default admin account exists on first run. */
async function ensureDefaultAdmin() {
  const db = readDb();
  if (db.staff.some((s) => s.role === "ADMIN")) return;
  const { salt, passHash } = await makeCredentials(DEFAULT_ADMIN.password);
  const admin: StaffUser = {
    id: uid("staff-"),
    name: "Administrator",
    phone: "",
    username: DEFAULT_ADMIN.username,
    salt,
    passHash,
    role: "ADMIN",
    areaIds: [],
    active: true,
    createdAt: Date.now(),
  };
  mutate((d) => {
    d.staff.push(admin);
    return d;
  });
}

export async function login(username: string, password: string) {
  // Pull the latest shared staff list so accounts created on another device work.
  startSync();
  await refreshFromServer();
  await ensureDefaultAdmin();
  const db = readDb();
  const user = db.staff.find(
    (s) => s.username.toLowerCase() === username.trim().toLowerCase(),
  );
  if (!user) return { ok: false as const, error: "Invalid username or password." };
  if (!user.active) return { ok: false as const, error: "This account is deactivated." };
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passHash) return { ok: false as const, error: "Invalid username or password." };

  const session: Session = {
    userId: user.id,
    name: user.name,
    role: user.role,
    expiresAt: Date.now() + SESSION_MS,
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emit();
  return { ok: true as const, session };
}

export async function changePassword(userId: string, password: string) {
  const { salt, passHash } = await makeCredentials(password);
  mutate((db) => {
    const u = db.staff.find((s) => s.id === userId);
    if (u) {
      u.salt = salt;
      u.passHash = passHash;
    }
    return db;
  });
}

/* ------------------------------------------------------------------ *
 * Role-specific logins used by the Contact Us (staff) and About Us
 * (admin) pages. Sessions are persisted exactly like `login()`, so
 * role-based navigation and refreshes keep working.
 * ------------------------------------------------------------------ */

function persistSession(session: Session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emit();
}

/** Staff (delivery) portal login — exposed on the Contact Us page. */
export async function loginStaff(username: string, password: string) {
  const res = await login(username, password);
  if (!res.ok) return { ok: false as const, error: "Invalid staff credentials." };
  return res;
}

/**
 * Admin login — exposed discreetly on the About Us page.
 * The default admin credentials always work, even with no backend/database
 * connected (preview & offline mode).
 */
export async function loginAdmin(username: string, password: string) {
  const isDefault =
    username.trim().toLowerCase() === DEFAULT_ADMIN.username &&
    password === DEFAULT_ADMIN.password;

  try {
    const res = await login(username, password);
    if (res.ok && res.session.role === "ADMIN") return res;
  } catch {
    // Backend unreachable — fall through to the offline default below.
  }

  if (isDefault) {
    try {
      await ensureDefaultAdmin();
    } catch {
      /* offline: session below is still enough to open the panel */
    }
    const admin = readDb().staff.find(
      (s) => s.role === "ADMIN" && s.username.toLowerCase() === DEFAULT_ADMIN.username,
    );
    const session: Session = {
      userId: admin?.id ?? "admin-default",
      name: admin?.name ?? "Administrator",
      role: "ADMIN",
      expiresAt: Date.now() + SESSION_MS,
    };
    persistSession(session);
    return { ok: true as const, session };
  }

  return { ok: false as const, error: "Invalid admin credentials." };
}
