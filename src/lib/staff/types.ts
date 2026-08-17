/**
 * Admin & Delivery domain types.
 *
 * These types are storage-agnostic on purpose: today the repository in
 * `store.ts` persists to localStorage (so the app stays a pure static build
 * that can be hosted on Hostinger). Swapping in a real API later only
 * requires re-implementing the repository functions, not the UI.
 */

/** Milk is the only subscription product. */
export type ProductKey = "milk";

export const PRODUCT_LABELS: Record<ProductKey, string> = {
  milk: "Milk (L)",
};

/** Per-day standing quantities for a customer (milk only). */
export type Quantities = Record<ProductKey, number>;

export const emptyQuantities: Quantities = { milk: 0 };

export type Area = {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
};

/** How often a customer receives milk. */
export type ScheduleType = "DAILY" | "ALTERNATE";

export const SCHEDULE_LABELS: Record<ScheduleType, string> = {
  DAILY: "Daily",
  ALTERNATE: "Alternate days",
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  areaId: string;
  address: string;
  /** Google Maps share/place link — what Admin & Delivery see. */
  mapsLink: string;
  /** Optional house photo (data URL, camera or file upload). */
  houseImage?: string;
  /** Litres of milk delivered per delivery day. */
  milkQuantity: number;
  scheduleType: ScheduleType;
  /** YYYY-MM-DD — first delivery day of the subscription. */
  startDate: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

export type StaffRole = "ADMIN" | "DELIVERY_BOY";

export type StaffUser = {
  id: string;
  name: string;
  phone: string;
  username: string;
  /** SHA-256(salt + password) — never a plain password. */
  passHash: string;
  salt: string;
  role: StaffRole;
  /** Areas a delivery boy is assigned to (empty for admin = all areas). */
  areaIds: string[];
  active: boolean;
  createdAt: number;
};

export type DeliveryStatus = "PENDING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED";

export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDING: "Pending",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  FAILED: "Failed",
};

export const FAILURE_REASONS = [
  "Customer unavailable",
  "Phone unreachable",
  "Wrong location",
  "Customer cancelled",
  "Other",
] as const;

export type OrderEvent = {
  at: number;
  status: DeliveryStatus;
  by: string;
  reason?: string;
  notes?: string;
};

export type Order = {
  id: string;
  customerId: string;
  /** YYYY-MM-DD */
  date: string;
  quantities: Quantities;
  total: number;
  status: DeliveryStatus;
  assignedTo?: string;
  events: OrderEvent[];
  createdAt: number;
};

/** Change log entry for customers/orders. */
export type AuditEntry = {
  id: string;
  at: number;
  by: string;
  entity: "customer" | "order" | "area" | "staff";
  entityId: string;
  entityLabel: string;
  field: string;
  from: string;
  to: string;
};
