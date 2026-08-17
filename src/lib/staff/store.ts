/**
 * Data layer for the Admin & Delivery modules.
 *
 * The shared source of truth is the PHP + MySQL API on Hostinger (see
 * `public/api/`), reached through `sync.ts`. localStorage is kept as an
 * offline cache so the app still works with no signal and pushes when back
 * online. UI components only ever use the repository functions below.
 */
import { useSyncExternalStore } from "react";
import { POLL_MS, pullState, pushState, type SyncStatus } from "./sync";

import {
  type Area,
  type AuditEntry,
  type Customer,
  type DeliveryStatus,
  type Order,
  type ProductKey,
  type Quantities,
  type StaffUser,
} from "./types";

const KEY = "tripura.ops.v1";

export type Db = {
  areas: Area[];
  customers: Customer[];
  staff: StaffUser[];
  orders: Order[];
  audit: AuditEntry[];
};

/** Per-unit rates reused from the public product catalogue. */
export const UNIT_RATES: Record<ProductKey, number> = {
  milk: 100, // per litre
};

export function orderTotal(q: Quantities) {
  return (Object.keys(UNIT_RATES) as ProductKey[]).reduce(
    (sum, k) => sum + (q[k] || 0) * UNIT_RATES[k],
    0,
  );
}

/* ---------------------------- schedule helpers ---------------------------- */

/** Parses a YYYY-MM-DD string into a UTC-midnight timestamp (DST-safe). */
export function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y || 1970, (m || 1) - 1, d || 1);
}

/** Whole days between two YYYY-MM-DD dates (b - a). */
export function daysBetween(a: string, b: string) {
  return Math.round((parseISODate(b) - parseISODate(a)) / 86_400_000);
}

/** Is the customer due for a delivery on `date`? */
export function isDeliveryDay(c: Customer, date: string) {
  if (c.active === false) return false;
  if (!c.startDate) return false;
  const diff = daysBetween(c.startDate, date);
  if (diff < 0) return false;
  // ALTERNATE: start date is Day 1 (diff = 0), then every 2nd day.
  // Eligible when the gap from start is an even number of days.
  return c.scheduleType === "ALTERNATE" ? diff % 2 === 0 : true;
}

export type BottleBreakdown = { litreBottles: number; halfLitreBottles: number };

/** 2.5 L -> 2 × 1L + 1 × 500ml. */
export function bottlesFor(litres: number): BottleBreakdown {
  const safe = Math.max(0, litres);
  const litreBottles = Math.floor(safe);
  const remainder = Number((safe - litreBottles).toFixed(3));
  return { litreBottles, halfLitreBottles: remainder >= 0.5 ? 1 : 0 };
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function uid(prefix = "") {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const SEED_AREAS = ["Uppal", "Boduppal", "Narapally"];

function seed(): Db {
  const now = Date.now();
  return {
    areas: SEED_AREAS.map((name, i) => ({
      id: `area-${name.toLowerCase()}`,
      name,
      active: true,
      createdAt: now + i,
    })),
    customers: [],
    staff: [],
    orders: [],
    audit: [],
  };
}

/**
 * Brings older records (multi-product quantities, no schedule) up to the
 * current milk-subscription shape so existing data keeps working.
 */
function migrate(db: Db): Db {
  db.customers = (db.customers ?? []).map((raw) => {
    const c = raw as Customer & { quantities?: Record<string, number> };
    const milkQuantity =
      typeof c.milkQuantity === "number" ? c.milkQuantity : Number(c.quantities?.milk ?? 0) || 0;
    const startDate = c.startDate || todayISO();
    delete c.quantities;
    return {
      ...c,
      milkQuantity,
      scheduleType: c.scheduleType === "ALTERNATE" ? "ALTERNATE" : "DAILY",
      startDate,
      active: c.active !== false,
    };
  });
  db.orders = (db.orders ?? []).map((o) => ({
    ...o,
    quantities: { milk: Number(o.quantities?.milk ?? 0) || 0 },
  }));
  return db;
}

let cache: Db | null = null;
const listeners = new Set<() => void>();

/* ------------------------------ remote sync ------------------------------ */

const VERSION_KEY = `${KEY}.version`;
let version = 0;
let status: SyncStatus = "offline";
let dirty = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;
const statusListeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setStatus(next: SyncStatus) {
  if (status === next) return;
  status = next;
  statusListeners.forEach((l) => l());
}

/** Merge helper: the server copy is the base, our pending copy wins on top. */
function applyRemote(data: Partial<Db>, remoteVersion: number, keepLocal: boolean) {
  const merged = migrate({ ...seed(), ...data } as Db);
  cache = keepLocal && cache ? cache : merged;
  version = remoteVersion;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
    window.localStorage.setItem(VERSION_KEY, String(version));
  }
  emit();
}

async function pull() {
  const remote = await pullState<Partial<Db>>();
  if (!remote) {
    setStatus("error");
    return;
  }
  // Never clobber unsaved local edits with a pull.
  applyRemote(remote.data, remote.version, dirty);
  setStatus(dirty ? "syncing" : "synced");
  if (dirty) schedulePush(0);
}

async function push() {
  if (!cache) return;
  setStatus("syncing");
  const res = await pushState<Db>(version, cache);
  if (res === null) {
    setStatus("error");
    return; // stays dirty; the next poll retries
  }
  if (res.ok) {
    version = res.version;
    dirty = false;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VERSION_KEY, String(version));
    }
    setStatus("synced");
    return;
  }
  // Conflict: take the server version number and retry with our copy once.
  version = res.conflict.version;
  const retry = await pushState<Db>(version, cache);
  if (retry && retry.ok) {
    version = retry.version;
    dirty = false;
    setStatus("synced");
  } else {
    setStatus("error");
  }
}

function schedulePush(delay = 600) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void push();
  }, delay);
}

/** Starts pulling/polling. Safe to call many times. */
export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  version = Number(window.localStorage.getItem(VERSION_KEY) ?? 0) || 0;
  void pull();
  setInterval(() => {
    if (document.visibilityState === "visible") void pull();
  }, POLL_MS);
  window.addEventListener("focus", () => void pull());
  window.addEventListener("online", () => void pull());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      statusListeners.add(cb);
      return () => statusListeners.delete(cb);
    },
    () => status,
    () => "offline" as SyncStatus,
  );
}

/** Forces an immediate refresh from the server. */
export async function refreshFromServer() {
  await pull();
}

export function readDb(): Db {
  if (cache) return cache;
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? migrate({ ...seed(), ...JSON.parse(raw) } as Db) : seed();
  } catch {
    cache = seed();
  }
  startSync();
  return cache ?? seed();
}

function writeDb(next: Db) {
  cache = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  dirty = true;
  schedulePush();
  emit();
}

export function mutate(fn: (db: Db) => Db) {
  writeDb(fn(structuredClone(readDb())));
}

/** Reactive hook — any component re-renders when the data changes. */
export function useDb(): Db {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => readDb(),
    () => readDb(),
  );
}


/* ----------------------------- audit logging ----------------------------- */

function logChange(
  db: Db,
  entry: Omit<AuditEntry, "id" | "at">,
) {
  db.audit.unshift({ id: uid("log-"), at: Date.now(), ...entry });
  db.audit = db.audit.slice(0, 800);
}

/* --------------------------------- areas --------------------------------- */

export function addArea(name: string, by: string) {
  mutate((db) => {
    db.areas.push({ id: uid("area-"), name: name.trim(), active: true, createdAt: Date.now() });
    logChange(db, { by, entity: "area", entityId: name, entityLabel: name, field: "Area", from: "—", to: name });
    return db;
  });
}

export function updateArea(id: string, patch: Partial<Area>, by: string) {
  mutate((db) => {
    const a = db.areas.find((x) => x.id === id);
    if (!a) return db;
    if (patch.name !== undefined && patch.name !== a.name) {
      logChange(db, { by, entity: "area", entityId: id, entityLabel: a.name, field: "Area name", from: a.name, to: patch.name });
      a.name = patch.name;
    }
    if (patch.active !== undefined && patch.active !== a.active) {
      logChange(db, { by, entity: "area", entityId: id, entityLabel: a.name, field: "Status", from: a.active ? "Active" : "Inactive", to: patch.active ? "Active" : "Inactive" });
      a.active = patch.active;
    }
    return db;
  });
}

/* ------------------------------- customers ------------------------------- */

export type CustomerInput = Omit<Customer, "id" | "createdAt" | "updatedAt">;

export function addCustomer(input: CustomerInput, by: string) {
  const id = uid("cust-");
  mutate((db) => {
    db.customers.push({ ...input, id, createdAt: Date.now(), updatedAt: Date.now() });
    logChange(db, { by, entity: "customer", entityId: id, entityLabel: input.name, field: "Customer created", from: "—", to: input.name });
    return db;
  });
  return id;
}

const CUSTOMER_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  phone: "Phone",
  areaId: "Area",
  address: "Address",
  mapsLink: "Google Maps location",
  houseImage: "House image",
  milkQuantity: "Milk quantity (L)",
  scheduleType: "Delivery schedule",
  startDate: "Start date",
  active: "Subscription status",
};

export function updateCustomer(id: string, patch: Partial<CustomerInput>, by: string) {
  mutate((db) => {
    const c = db.customers.find((x) => x.id === id);
    if (!c) return db;
    for (const [k, v] of Object.entries(patch)) {
      const prev = (c as unknown as Record<string, unknown>)[k];
      if (v === prev) continue;
      const label = CUSTOMER_FIELD_LABELS[k] ?? k;
      const fmt = (x: unknown) =>
        k === "houseImage"
          ? x
            ? "photo"
            : "none"
          : k === "areaId"
            ? db.areas.find((a) => a.id === x)?.name ?? "—"
            : k === "active"
              ? x
                ? "Active"
                : "Paused"
              : String(x ?? "—");
      logChange(db, { by, entity: "customer", entityId: id, entityLabel: c.name, field: label, from: fmt(prev), to: fmt(v) });
      (c as unknown as Record<string, unknown>)[k] = v;
    }
    c.updatedAt = Date.now();
    return db;
  });
}

export function deleteCustomer(id: string, by: string) {
  mutate((db) => {
    const c = db.customers.find((x) => x.id === id);
    if (!c) return db;
    db.customers = db.customers.filter((x) => x.id !== id);
    logChange(db, { by, entity: "customer", entityId: id, entityLabel: c.name, field: "Customer deleted", from: c.name, to: "—" });
    return db;
  });
}

/* --------------------------------- staff --------------------------------- */

export function upsertStaff(user: StaffUser, by: string) {
  mutate((db) => {
    const i = db.staff.findIndex((s) => s.id === user.id);
    if (i === -1) {
      db.staff.push(user);
      logChange(db, { by, entity: "staff", entityId: user.id, entityLabel: user.name, field: "Staff created", from: "—", to: `${user.name} (${user.role})` });
    } else {
      const prev = db.staff[i]!;
      db.staff[i] = user;
      if (prev.active !== user.active) {
        logChange(db, { by, entity: "staff", entityId: user.id, entityLabel: user.name, field: "Status", from: prev.active ? "Active" : "Inactive", to: user.active ? "Active" : "Inactive" });
      }
      if (prev.areaIds.join() !== user.areaIds.join()) {
        const names = (ids: string[]) => ids.map((id) => db.areas.find((a) => a.id === id)?.name ?? id).join(", ") || "none";
        logChange(db, { by, entity: "staff", entityId: user.id, entityLabel: user.name, field: "Assigned areas", from: names(prev.areaIds), to: names(user.areaIds) });
      }
    }
    return db;
  });
}

/* --------------------------------- orders -------------------------------- */

export type GenerationSummary = {
  date: string;
  created: number;
  skipped: number;
  customers: number;
  litres: number;
  litreBottles: number;
  halfLitreBottles: number;
  revenue: number;
};

/** Customers due for delivery on `date`. */
export function eligibleCustomers(db: Db, date: string) {
  return db.customers.filter((c) => c.milkQuantity > 0 && isDeliveryDay(c, date));
}

/** Creates orders for every customer whose schedule matches `date`. */
export function generateOrdersForDate(date: string, by: string): GenerationSummary {
  let created = 0;
  let skipped = 0;
  const db0 = readDb();
  const due = eligibleCustomers(db0, date);
  const litres = due.reduce((s, c) => s + c.milkQuantity, 0);
  const bottles = due.reduce(
    (acc, c) => {
      const b = bottlesFor(c.milkQuantity);
      return {
        litreBottles: acc.litreBottles + b.litreBottles,
        halfLitreBottles: acc.halfLitreBottles + b.halfLitreBottles,
      };
    },
    { litreBottles: 0, halfLitreBottles: 0 },
  );

  mutate((db) => {
    for (const c of eligibleCustomers(db, date)) {
      if (db.orders.some((o) => o.customerId === c.id && o.date === date)) {
        skipped += 1;
        continue;
      }
      const staff = db.staff.find(
        (s) => s.role === "DELIVERY_BOY" && s.active && s.areaIds.includes(c.areaId),
      );
      const quantities: Quantities = { milk: c.milkQuantity };
      db.orders.push({
        id: `ORD-${date.replace(/-/g, "")}-${String(db.orders.length + 1).padStart(3, "0")}`,
        customerId: c.id,
        date,
        quantities,
        total: orderTotal(quantities),
        status: "PENDING",
        assignedTo: staff?.id,
        events: [{ at: Date.now(), status: "PENDING", by }],
        createdAt: Date.now(),
      });
      created += 1;
    }
    return db;
  });

  return {
    date,
    created,
    skipped,
    customers: due.length,
    litres,
    litreBottles: bottles.litreBottles,
    halfLitreBottles: bottles.halfLitreBottles,
    revenue: litres * UNIT_RATES.milk,
  };
}

/** Back-compat helper used by older call sites. */
export function generateOrdersForToday(by: string) {
  return generateOrdersForDate(todayISO(), by).created;
}

/* --------------------------- ledger & revenue ---------------------------- */

export type LedgerRow = {
  date: string;
  customers: number;
  litres: number;
  revenue: number;
  delivered: number;
};

/** Daily financial ledger, newest first. Optionally filtered to `YYYY-MM`. */
export function dailyLedger(db: Db, month?: string): LedgerRow[] {
  const map = new Map<string, LedgerRow>();
  for (const o of db.orders) {
    if (month && !o.date.startsWith(month)) continue;
    if (o.status === "FAILED") continue;
    const row =
      map.get(o.date) ?? { date: o.date, customers: 0, litres: 0, revenue: 0, delivered: 0 };
    row.customers += 1;
    row.litres += o.quantities.milk ?? 0;
    row.revenue += o.total;
    if (o.status === "DELIVERED") row.delivered += 1;
    map.set(o.date, row);
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function monthsWithOrders(db: Db): string[] {
  return [...new Set(db.orders.map((o) => o.date.slice(0, 7)))].sort().reverse();
}

export function monthlyTotals(rows: LedgerRow[]) {
  return rows.reduce(
    (acc, r) => ({
      customers: acc.customers + r.customers,
      litres: acc.litres + r.litres,
      revenue: acc.revenue + r.revenue,
      days: acc.days + 1,
    }),
    { customers: 0, litres: 0, revenue: 0, days: 0 },
  );
}

export function setOrderStatus(
  id: string,
  status: DeliveryStatus,
  by: string,
  extra?: { reason?: string; notes?: string },
) {
  mutate((db) => {
    const o = db.orders.find((x) => x.id === id);
    if (!o) return db;
    const from = o.status;
    o.status = status;
    o.events.push({ at: Date.now(), status, by, ...extra });
    logChange(db, { by, entity: "order", entityId: id, entityLabel: id, field: "Delivery status", from, to: status });
    return db;
  });
}

export function assignOrder(id: string, staffId: string | undefined, by: string) {
  mutate((db) => {
    const o = db.orders.find((x) => x.id === id);
    if (!o) return db;
    const nameOf = (sid?: string) => db.staff.find((s) => s.id === sid)?.name ?? "Unassigned";
    logChange(db, { by, entity: "order", entityId: id, entityLabel: id, field: "Delivery boy", from: nameOf(o.assignedTo), to: nameOf(staffId) });
    o.assignedTo = staffId;
    return db;
  });
}

/* -------------------------------- selectors ------------------------------- */

export function customersByArea(db: Db, areaId: string) {
  return db.customers.filter((c) => c.areaId === areaId);
}

export function areaName(db: Db, areaId: string) {
  return db.areas.find((a) => a.id === areaId)?.name ?? "—";
}

export function customerOf(db: Db, id: string) {
  return db.customers.find((c) => c.id === id);
}

export function ordersForDate(db: Db, date: string) {
  return db.orders.filter((o) => o.date === date);
}

/* ------------------------------ history admin ----------------------------- */

/** Permanently remove selected audit/history entries. */
export function deleteAuditEntries(ids: string[]) {
  const set = new Set(ids);
  mutate((db) => {
    db.audit = db.audit.filter((e) => !set.has(e.id));
    return db;
  });
}

/** Permanently remove every history entry. */
export function clearAudit() {
  mutate((db) => {
    db.audit = [];
    return db;
  });
}
