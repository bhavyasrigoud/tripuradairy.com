import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  ExternalLink,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { logout, makeCredentials, useSession } from "@/lib/staff/auth";
import {
  addArea,
  addCustomer,
  areaName,
  assignOrder,
  customerOf,
  clearAudit,
  customersByArea,
  deleteAuditEntries,
  deleteCustomer,
  bottlesFor,
  dailyLedger,
  eligibleCustomers,
  generateOrdersForDate,
  monthlyTotals,
  monthsWithOrders,
  UNIT_RATES,
  orderTotal,
  ordersForDate,
  todayISO,
  uid,
  updateArea,
  updateCustomer,
  upsertStaff,
  useDb,
  type CustomerInput,
} from "@/lib/staff/store";
import { distanceFromStoreKm, formatDistance, normaliseMapsLink } from "@/lib/staff/geo";
import {
  PRODUCT_LABELS,
  SCHEDULE_LABELS,
  STATUS_LABELS,
  type Customer,
  type DeliveryStatus,
  type ProductKey,
  type ScheduleType,
  type StaffUser,
} from "@/lib/staff/types";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const TABS = ["Dashboard", "Customers", "Areas", "Delivery Boys", "Orders", "History & Revenue"] as const;
type Tab = (typeof TABS)[number];

function AdminPage() {
  const session = useSession();
  const navigate = useNavigate();
  const db = useDb();
  const [tab, setTab] = useState<Tab>("Dashboard");

  if (!session || session.role !== "ADMIN") {
    return <Denied />;
  }
  const by = session.name;

  return (
    <section className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-serif text-xl font-bold text-foreground sm:text-2xl">Admin Panel</h1>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">
            Signed in as {session.name}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            logout();
            navigate({ to: "/" });
          }}
        >
          <LogOut className="mr-1.5 h-4 w-4" /> Log out
        </Button>
      </header>

      <nav className="-mx-3 mt-4 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:mt-6 sm:flex-wrap sm:overflow-visible sm:px-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
              tab === t
                ? "border-transparent bg-gradient-to-r from-gold to-gold-deep text-primary-foreground"
                : "border-border/60 bg-card text-foreground/80 hover:bg-accent"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="mt-4 sm:mt-6">
        {tab === "Dashboard" && <Dashboard by={by} />}
        {tab === "Customers" && <CustomersTab by={by} />}
        {tab === "Areas" && <AreasTab by={by} />}
        {tab === "Delivery Boys" && <StaffTab by={by} />}
        {tab === "Orders" && <OrdersTab by={by} />}
        {tab === "History & Revenue" && <HistoryTab />}
      </div>


      {db.areas.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Add a delivery area to get started.</p>
      ) : null}
    </section>
  );
}

export function Denied() {
  return (
    <section className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-serif text-2xl font-bold text-foreground">Staff access required</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Please sign in with your staff account to continue.
      </p>
      <Link
        to="/staff-login"
        className="mt-6 inline-flex items-center justify-center rounded-md bg-gradient-to-r from-gold to-gold-deep px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Go to Staff Login
      </Link>
    </section>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border/60 bg-card p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------- Dashboard ------------------------------- */

function Dashboard({ by }: { by: string }) {
  const db = useDb();
  const [target, setTarget] = useState(todayISO());
  const orders = ordersForDate(db, target);
  const count = (s: DeliveryStatus) => orders.filter((o) => o.status === s).length;

  /** Live preview of the run for the selected date (before/after generating). */
  const due = eligibleCustomers(db, target);
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
  const revenue = litres * UNIT_RATES.milk;

  const rows = db.areas.map((a) => {
    const cust = customersByArea(db, a.id);
    const ao = orders.filter((o) => cust.some((c) => c.id === o.customerId));
    return {
      area: a,
      customers: cust.length,
      today: ao.length,
      delivered: ao.filter((o) => o.status === "DELIVERED").length,
    };
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1">
            <Field label="Target delivery date">
              <Input type="date" value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
          </div>
          <Button
            onClick={() => {
              const s = generateOrdersForDate(target, by);
              toast.success(
                s.created
                  ? `${s.created} order(s) created · ${s.litres} L · ${s.litreBottles} × 1L + ${s.halfLitreBottles} × 500ml`
                  : "No new orders — every eligible customer already has one.",
              );
            }}
            className="w-full bg-gradient-to-r from-gold to-gold-deep text-primary-foreground hover:opacity-90 sm:w-auto"
          >
            Generate Orders
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-5">
        <Stat label="Eligible Customers" value={due.length} />
        <Stat label="Total Volume (L)" value={litres} />
        <Stat label="1L Bottles" value={bottles.litreBottles} />
        <Stat label="500ml Bottles" value={bottles.halfLitreBottles} />
        <Stat label="Day Revenue (₹)" value={revenue} />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-5">
        <Stat label="Orders on date" value={orders.length} />
        <Stat label="Pending" value={count("PENDING")} />
        <Stat label="Out for Delivery" value={count("OUT_FOR_DELIVERY")} />
        <Stat label="Delivered" value={count("DELIVERED")} />
        <Stat label="Failed" value={count("FAILED")} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-base font-semibold text-foreground sm:text-lg">
            Area overview
          </h2>
        </div>

        {/* Mobile: stacked cards (no horizontal scrolling) */}
        <div className="mt-4 space-y-2 sm:hidden">
          {rows.map((r) => (
            <div key={r.area.id} className="rounded-xl border border-border/50 p-3">
              <p className="text-sm font-semibold text-foreground">
                {r.area.name} {r.area.active ? "" : "(inactive)"}
              </p>
              <dl className="mt-1.5 grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
                <div>
                  <dt>Customers</dt>
                  <dd className="text-sm font-semibold text-foreground">{r.customers}</dd>
                </div>
                <div>
                  <dt>Orders</dt>
                  <dd className="text-sm font-semibold text-foreground">{r.today}</dd>
                </div>
                <div>
                  <dt>Delivered</dt>
                  <dd className="text-sm font-semibold text-foreground">{r.delivered}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="mt-4 hidden sm:block">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">Area</th>
                <th className="py-2">Customers</th>
                <th className="py-2">Today's orders</th>
                <th className="py-2">Delivered</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.area.id} className="border-t border-border/50">
                  <td className="py-2 font-medium text-foreground">
                    {r.area.name} {r.area.active ? "" : "(inactive)"}
                  </td>
                  <td className="py-2">{r.customers}</td>
                  <td className="py-2">{r.today}</td>
                  <td className="py-2">{r.delivered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="!p-3 sm:!p-5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl font-bold text-foreground sm:text-3xl">{value}</p>
    </Card>
  );
}


/* -------------------------------- Customers ------------------------------ */

function CustomersTab({ by }: { by: string }) {
  const db = useDb();
  const [areaId, setAreaId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [adding, setAdding] = useState(false);

  if (!areaId) {
    return (
      <div className="space-y-4">
        <h2 className="font-serif text-lg font-semibold text-foreground">Select an area</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {db.areas.map((a) => (
            <button key={a.id} onClick={() => setAreaId(a.id)} className="text-left">
              <Card className="transition-colors hover:bg-accent">
                <p className="font-serif text-lg font-semibold text-foreground">{a.name}</p>
                <p className="text-sm text-muted-foreground">
                  {customersByArea(db, a.id).length} customer(s)
                </p>
              </Card>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const list = customersByArea(db, areaId).filter((c) =>
    `${c.name} ${c.phone} ${c.address}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-center gap-2 sm:justify-between sm:gap-3">
        <button
          onClick={() => setAreaId(null)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All areas
        </button>
        <h2 className="w-full font-serif text-base font-semibold text-foreground sm:w-auto sm:text-lg">
          Customers — {areaName(db, areaId)}
        </h2>
        <Button
          size="sm"
          onClick={() => setAdding(true)}
          className="w-full bg-gradient-to-r from-gold to-gold-deep text-primary-foreground hover:opacity-90 sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Customer
        </Button>
      </div>


      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name, phone or address"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {adding || editing ? (
        <CustomerForm
          areaId={areaId}
          customer={editing}
          by={by}
          onDone={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      ) : null}

      <div className="space-y-3">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No customers in this area yet.</p>
        ) : null}
        {list.map((c) => (
          <Card key={c.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-serif text-base font-semibold text-foreground sm:text-lg">
                  {c.name}
                </p>
                <p className="text-xs text-muted-foreground sm:text-sm">{c.phone}</p>
                <p className="mt-1 break-words text-xs text-foreground/80 sm:text-sm">{c.address}</p>
                <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                  Milk: {c.milkQuantity} L · {SCHEDULE_LABELS[c.scheduleType]} · from{" "}
                  {c.startDate}
                  {c.active === false ? " · paused" : ""}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                  Distance from store: {formatDistance(distanceFromStoreKm(c.mapsLink))}
                </p>
              </div>
              {c.houseImage ? (
                <img
                  src={c.houseImage}
                  alt={`${c.name} house`}
                  className="h-14 w-14 shrink-0 rounded-lg object-cover sm:h-16 sm:w-16"
                />
              ) : null}
              <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                {c.mapsLink ? (
                  <a
                    href={c.mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-md border border-border px-3 text-xs sm:flex-none"
                  >
                    <MapPin className="h-4 w-4" /> Maps
                  </a>
                ) : null}
                <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm(`Delete ${c.name}?`)) deleteCustomer(c.id, by);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

          </Card>
        ))}
      </div>
    </div>
  );
}

function CustomerForm({
  areaId,
  customer,
  by,
  onDone,
}: {
  areaId: string;
  customer: Customer | null;
  by: string;
  onDone: () => void;
}) {
  const db = useDb();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<CustomerInput>(
    customer
      ? {
          name: customer.name,
          phone: customer.phone,
          areaId: customer.areaId,
          address: customer.address,
          mapsLink: customer.mapsLink,
          houseImage: customer.houseImage,
          milkQuantity: customer.milkQuantity,
          scheduleType: customer.scheduleType,
          startDate: customer.startDate,
          active: customer.active !== false,
        }
      : {
          name: "",
          phone: "",
          areaId,
          address: "",
          mapsLink: "",
          houseImage: undefined,
          milkQuantity: 1,
          scheduleType: "DAILY",
          startDate: todayISO(),
          active: true,
        },
  );

  function set<K extends keyof CustomerInput>(k: K, v: CustomerInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onPickImage(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("houseImage", String(reader.result));
    reader.readAsDataURL(file);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: CustomerInput = { ...form, mapsLink: normaliseMapsLink(form.mapsLink) };
    if (customer) {
      updateCustomer(customer.id, payload, by);
      toast.success("Customer updated.");
    } else {
      addCustomer(payload, by);
      toast.success("Customer added.");
    }
    onDone();
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <h3 className="font-serif text-lg font-semibold text-foreground">
          {customer ? "Edit customer" : "Add customer"}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer Name">
            <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Phone Number">
            <Input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="Area">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.areaId}
              onChange={(e) => set("areaId", e.target.value)}
            >
              {db.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Google Maps Location (paste link)">
            <div className="flex gap-2">
              <Input
                placeholder="https://maps.google.com/..."
                value={form.mapsLink}
                onChange={(e) => set("mapsLink", e.target.value)}
              />
              {form.mapsLink ? (
                <a
                  href={normaliseMapsLink(form.mapsLink)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md border border-border px-3 text-xs"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </Field>
        </div>

        <Field label="Delivery Address">
          <Textarea
            required
            rows={2}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <Field label="Milk Quantity (Litres)">
            <Input
              required
              type="number"
              min={0}
              step="0.5"
              value={form.milkQuantity}
              onChange={(e) => set("milkQuantity", Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Delivery Schedule">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.scheduleType}
              onChange={(e) => set("scheduleType", e.target.value as ScheduleType)}
            >
              <option value="DAILY">Daily</option>
              <option value="ALTERNATE">Alternate days</option>
            </select>
          </Field>
          <Field label="Start Date">
            <Input
              required
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
          <span className="text-sm text-foreground">
            {form.active ? "Subscription active" : "Subscription paused"}
          </span>
          <span className="text-xs text-muted-foreground">
            Bottles per delivery: {bottlesFor(form.milkQuantity).litreBottles} × 1L
            {bottlesFor(form.milkQuantity).halfLitreBottles ? " + 1 × 500ml" : ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {form.houseImage ? (
            <img
              src={form.houseImage}
              alt="House"
              className="h-20 w-20 rounded-lg object-cover"
            />
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPickImage(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            <Camera className="mr-2 h-4 w-4" />
            {form.houseImage ? "Replace house image" : "Add house image"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Daily total: ₹{orderTotal({ milk: form.milkQuantity }).toLocaleString("en-IN")}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            className="bg-gradient-to-r from-gold to-gold-deep text-primary-foreground hover:opacity-90"
          >
            Save
          </Button>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/* ---------------------------------- Areas -------------------------------- */

function AreasTab({ by }: { by: string }) {
  const db = useDb();
  const [name, setName] = useState("");

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            addArea(name, by);
            setName("");
            toast.success("Area added.");
          }}
        >
          <div className="min-w-[160px] flex-1 space-y-2">
            <Label htmlFor="area">New area name</Label>
            <Input
              id="area"
              placeholder="e.g. Nagole"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-gold to-gold-deep text-primary-foreground hover:opacity-90 sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" /> Add area
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        {db.areas.map((a) => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center gap-3 sm:justify-between">
              <Input
                className="w-full sm:max-w-xs"
                value={a.name}
                onChange={(e) => updateArea(a.id, { name: e.target.value }, by)}
              />
              <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
                <span className="text-xs text-muted-foreground sm:text-sm">
                  {customersByArea(db, a.id).length} customer(s)
                </span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={a.active}
                    onCheckedChange={(v) => updateArea(a.id, { active: v }, by)}
                  />
                  <span className="text-xs sm:text-sm">{a.active ? "Active" : "Inactive"}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

    </div>
  );
}

/* ------------------------------ Delivery boys ---------------------------- */

function StaffTab({ by }: { by: string }) {
  const db = useDb();
  const [form, setForm] = useState({ name: "", phone: "", username: "", password: "", areaIds: [] as string[] });
  const boys = db.staff.filter((s) => s.role === "DELIVERY_BOY");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (db.staff.some((s) => s.username.toLowerCase() === form.username.trim().toLowerCase())) {
      toast.error("That username is already taken.");
      return;
    }
    const { salt, passHash } = await makeCredentials(form.password);
    const user: StaffUser = {
      id: uid("staff-"),
      name: form.name.trim(),
      phone: form.phone.trim(),
      username: form.username.trim(),
      salt,
      passHash,
      role: "DELIVERY_BOY",
      areaIds: form.areaIds,
      active: true,
      createdAt: Date.now(),
    };
    upsertStaff(user, by);
    setForm({ name: "", phone: "", username: "", password: "", areaIds: [] });
    toast.success("Delivery boy created.");
  }

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={create} className="space-y-4">
          <h3 className="font-serif text-lg font-semibold text-foreground">Add delivery boy</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Phone Number">
              <Input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Username">
              <Input
                required
                autoCapitalize="none"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </Field>
            <Field label="Password">
              <PasswordInput
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>

          </div>
          <Field label="Assigned areas">
            <div className="flex flex-wrap gap-2">
              {db.areas.map((a) => {
                const on = form.areaIds.includes(a.id);
                return (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() =>
                      setForm({
                        ...form,
                        areaIds: on
                          ? form.areaIds.filter((x) => x !== a.id)
                          : [...form.areaIds, a.id],
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      on ? "border-transparent bg-accent text-accent-foreground" : "border-border"
                    }`}
                  >
                    {a.name}
                  </button>
                );
              })}
            </div>
          </Field>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-gold to-gold-deep text-primary-foreground hover:opacity-90 sm:w-auto"
          >
            Create
          </Button>
        </form>
      </Card>

      {boys.map((s) => (
        <Card key={s.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-serif text-base font-semibold text-foreground sm:text-lg">
                {s.name}
              </p>
              <p className="break-words text-xs text-muted-foreground sm:text-sm">
                {s.phone} · username: {s.username}
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">

              {db.areas.map((a) => {
                const on = s.areaIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() =>
                      upsertStaff(
                        {
                          ...s,
                          areaIds: on ? s.areaIds.filter((x) => x !== a.id) : [...s.areaIds, a.id],
                        },
                        by,
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs ${
                      on ? "border-transparent bg-accent text-accent-foreground" : "border-border"
                    }`}
                  >
                    {a.name}
                  </button>
                );
              })}
              <Switch
                checked={s.active}
                onCheckedChange={(v) => upsertStaff({ ...s, active: v }, by)}
              />
              <span className="text-sm">{s.active ? "Active" : "Inactive"}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* --------------------------------- Orders -------------------------------- */

function OrdersTab({ by }: { by: string }) {
  const db = useDb();
  const [date, setDate] = useState(todayISO());
  const orders = ordersForDate(db, date);

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[150px] flex-1">
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Button
            onClick={() => {
              const s = generateOrdersForDate(date, by);
              toast.success(
                s.created
                  ? `${s.created} order(s) created for ${date}.`
                  : "No new orders to create for this date.",
              );
            }}
            variant="outline"
            className="w-full sm:w-auto"
          >
            Generate orders for this date
          </Button>
        </div>
      </Card>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders for this date.</p>
      ) : null}

      {orders.map((o) => {
        const c = customerOf(db, o.customerId);
        return (
          <Card key={o.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground">{o.id}</p>
                <p className="font-serif text-base font-semibold text-foreground sm:text-lg">
                  {c?.name ?? "Unknown customer"}
                </p>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {c ? `${c.phone} · ${areaName(db, c.areaId)}` : ""}
                </p>
                <p className="mt-1 break-words text-xs sm:text-sm">
                  {(Object.keys(PRODUCT_LABELS) as ProductKey[])
                    .filter((k) => o.quantities[k] > 0)
                    .map((k) => `${PRODUCT_LABELS[k]}: ${o.quantities[k]}`)
                    .join(" · ")}{" "}
                  · ₹{o.total.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                  {formatDistance(distanceFromStoreKm(c?.mapsLink))}
                </p>
              </div>
              <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end">
                <StatusPill status={o.status} />
                <select
                  className="h-9 max-w-[55%] rounded-md border border-input bg-background px-2 text-xs sm:max-w-none sm:text-sm"
                  value={o.assignedTo ?? ""}
                  onChange={(e) => assignOrder(o.id, e.target.value || undefined, by)}
                >
                  <option value="">Unassigned</option>
                  {db.staff
                    .filter((s) => s.role === "DELIVERY_BOY")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {o.events.length > 1 ? (
              <ul className="mt-3 space-y-1 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                {o.events.map((e, i) => (
                  <li key={i}>
                    {new Date(e.at).toLocaleString("en-IN")} — {STATUS_LABELS[e.status]} by {e.by}
                    {e.reason ? ` (${e.reason})` : ""}
                    {e.notes ? ` — ${e.notes}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

export function StatusPill({ status }: { status: DeliveryStatus }) {
  const tone: Record<DeliveryStatus, string> = {
    PENDING: "bg-muted text-muted-foreground",
    OUT_FOR_DELIVERY: "bg-accent text-accent-foreground",
    DELIVERED: "bg-gradient-to-r from-gold to-gold-deep text-primary-foreground",
    FAILED: "bg-destructive text-destructive-foreground",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

/* ------------------------- History & Revenue ledger ------------------------ */

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function HistoryTab() {
  const db = useDb();
  const months = useMemo(() => monthsWithOrders(db), [db.orders]);
  const [month, setMonth] = useState<string>(() => todayISO().slice(0, 7));
  const rows = useMemo(() => dailyLedger(db, month), [db.orders, month]);
  const totals = useMemo(() => monthlyTotals(rows), [rows]);
  const monthLabel = month
    ? new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "All time";

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-gold/10 to-gold-deep/10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Monthly revenue — {monthLabel}
            </p>
            <p className="mt-1 font-serif text-3xl font-bold text-foreground sm:text-4xl">
              {inr(totals.revenue)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totals.days} delivery day(s) · {totals.customers} customer deliveries ·{" "}
              {totals.litres.toLocaleString("en-IN")} L milk
            </p>
          </div>
          <div className="w-full sm:w-56">
            <Field label="Month">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="">All time</option>
                {[...new Set([todayISO().slice(0, 7), ...months])].sort().reverse().map((m) => (
                  <option key={m} value={m}>
                    {new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-base font-semibold text-foreground sm:text-lg">
          Daily ledger
        </h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No deliveries recorded for this period yet.
          </p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="mt-3 space-y-2 sm:hidden">
              {rows.map((r) => (
                <div key={r.date} className="rounded-xl border border-border/50 p-3">
                  <p className="text-sm font-semibold text-foreground">{r.date}</p>
                  <dl className="mt-1.5 grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
                    <div>
                      <dt>Customers</dt>
                      <dd className="text-sm font-semibold text-foreground">{r.customers}</dd>
                    </div>
                    <div>
                      <dt>Litres</dt>
                      <dd className="text-sm font-semibold text-foreground">{r.litres}</dd>
                    </div>
                    <div>
                      <dt>Revenue</dt>
                      <dd className="text-sm font-semibold text-foreground">{inr(r.revenue)}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="mt-3 hidden sm:block">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Date</th>
                    <th className="py-2">Total customers served</th>
                    <th className="py-2">Total milk volume (L)</th>
                    <th className="py-2">Total daily revenue (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.date} className="border-t border-border/50">
                      <td className="py-2 font-medium text-foreground">{r.date}</td>
                      <td className="py-2">{r.customers}</td>
                      <td className="py-2">{r.litres.toLocaleString("en-IN")}</td>
                      <td className="py-2">{inr(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td className="py-2 font-semibold text-foreground">Total</td>
                    <td className="py-2 font-semibold">{totals.customers}</td>
                    <td className="py-2 font-semibold">
                      {totals.litres.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 font-semibold">{inr(totals.revenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
