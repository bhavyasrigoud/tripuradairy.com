/**
 * Delivery Boy portal — mobile first.
 *
 * Reads/writes through the repository in `@/lib/staff/store`, so moving the
 * data to a real API later needs no changes here.
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Camera,
  CheckCircle2,
  ExternalLink,
  LogOut,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { logout, useSession } from "@/lib/staff/auth";
import {
  areaName,
  customerOf,
  ordersForDate,
  setOrderStatus,
  todayISO,
  updateCustomer,
  useDb,
} from "@/lib/staff/store";
import { distanceFromStoreKm, formatDistance, normaliseMapsLink } from "@/lib/staff/geo";
import {
  FAILURE_REASONS,
  PRODUCT_LABELS,
  STATUS_LABELS,
  type Customer,
  type DeliveryStatus,
  type Order,
  type ProductKey,
} from "@/lib/staff/types";

export const Route = createFileRoute("/delivery")({
  component: DeliveryPage,
});

const STATUS_STYLES: Record<DeliveryStatus, string> = {
  PENDING: "bg-muted text-muted-foreground",
  OUT_FOR_DELIVERY: "bg-amber-100 text-amber-900",
  DELIVERED: "bg-emerald-100 text-emerald-900",
  FAILED: "bg-destructive/10 text-destructive",
};

function DeliveryPage() {
  const session = useSession();
  const navigate = useNavigate();
  const db = useDb();
  const [areaId, setAreaId] = useState<string>("ALL");
  const [openId, setOpenId] = useState<string | null>(null);

  const me = session ? db.staff.find((s) => s.id === session.userId) : undefined;

  const myAreas = useMemo(() => {
    if (!me) return [];
    return me.areaIds.length
      ? db.areas.filter((a) => me.areaIds.includes(a.id))
      : db.areas.filter((a) => a.active);
  }, [db.areas, me]);

  const rows = useMemo(() => {
    if (!me) return [];
    const today = todayISO();
    return ordersForDate(db, today)
      .map((o) => ({ order: o, customer: customerOf(db, o.customerId) }))
      .filter((r): r is { order: Order; customer: Customer } => Boolean(r.customer))
      .filter((r) => (me.areaIds.length ? me.areaIds.includes(r.customer.areaId) : true))
      .filter((r) => (r.order.assignedTo ? r.order.assignedTo === me.id : true))
      .filter((r) => areaId === "ALL" || r.customer.areaId === areaId)
      .map((r) => ({ ...r, km: distanceFromStoreKm(r.customer.mapsLink) }))
      .sort((a, b) => {
        const done = (s: DeliveryStatus) => (s === "DELIVERED" || s === "FAILED" ? 1 : 0);
        if (done(a.order.status) !== done(b.order.status))
          return done(a.order.status) - done(b.order.status);
        return (a.km ?? Number.POSITIVE_INFINITY) - (b.km ?? Number.POSITIVE_INFINITY);
      });
  }, [db, me, areaId]);

  if (!session || session.role !== "DELIVERY_BOY") {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 text-center">
        <h1 className="font-serif text-2xl font-bold text-foreground">Delivery portal</h1>
        <p className="mt-2 text-muted-foreground">
          {session ? "This portal is for delivery staff." : "Please sign in to continue."}
        </p>
        <div className="mt-6">
          <Link to="/staff-login">
            <Button className="w-full">Go to Staff Login</Button>
          </Link>
        </div>
      </section>
    );
  }

  const pending = rows.filter((r) => r.order.status === "PENDING" || r.order.status === "OUT_FOR_DELIVERY").length;
  const delivered = rows.filter((r) => r.order.status === "DELIVERED").length;

  return (
    <div className="mx-auto w-full max-w-xl px-3 pb-24 pt-3 sm:pt-4">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Delivery</p>
          <h1 className="truncate font-serif text-xl font-bold text-foreground sm:text-2xl">
            {session.name}
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            logout();
            navigate({ to: "/staff-login" });
          }}
        >
          <LogOut className="mr-1.5 h-4 w-4" /> Logout
        </Button>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Today" value={rows.length} />
        <Stat label="To go" value={pending} />
        <Stat label="Delivered" value={delivered} />
      </div>

      <div className="mt-4">
        <Label className="text-xs text-muted-foreground">Area</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          <AreaChip active={areaId === "ALL"} onClick={() => setAreaId("ALL")}>
            All areas
          </AreaChip>
          {myAreas.map((a) => (
            <AreaChip key={a.id} active={areaId === a.id} onClick={() => setAreaId(a.id)}>
              {a.name}
            </AreaChip>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Sorted nearest → farthest from the store.
      </p>

      <div className="mt-3 space-y-3">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No orders for today in this area.
          </div>
        )}
        {rows.map(({ order, customer, km }) => (
          <OrderCard
            key={order.id}
            order={order}
            customer={customer}
            km={km}
            areaLabel={areaName(db, customer.areaId)}
            by={session.name}
            editing={openId === order.id}
            onToggleEdit={() => setOpenId(openId === order.id ? null : order.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2 text-center">
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function AreaChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:py-2 sm:text-sm ${
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function OrderCard({
  order,
  customer,
  km,
  areaLabel,
  by,
  editing,
  onToggleEdit,
}: {
  order: Order;
  customer: Customer;
  km: number | null;
  areaLabel: string;
  by: string;
  editing: boolean;
  onToggleEdit: () => void;
}) {
  const [failOpen, setFailOpen] = useState(false);
  const [reason, setReason] = useState<string>(FAILURE_REASONS[0]);
  const [notes, setNotes] = useState("");

  const items = (Object.keys(PRODUCT_LABELS) as ProductKey[]).filter(
    (k) => (order.quantities[k] ?? 0) > 0,
  );
  const mapsUrl =
    customer.mapsLink ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`;
  const done = order.status === "DELIVERED" || order.status === "FAILED";

  return (
    <article className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      {customer.houseImage && (
        <img
          src={customer.houseImage}
          alt={`House of ${customer.name}`}
          className="h-24 w-full object-cover sm:h-28"
        />
      )}
      <div className="p-3">
        {/* Header: name + area/distance + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate font-serif text-base font-semibold leading-tight text-foreground">
              {customer.name}
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {areaLabel} · {formatDistance(km)}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[order.status]}`}
          >
            {STATUS_LABELS[order.status]}
          </span>
        </div>

        {/* Location */}
        <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-snug text-muted-foreground">
          <MapPin className="mt-[1px] h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0">
            {customer.address || "No address saved"}
          </span>
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          {customer.phone}
        </p>

        {/* Product breakdown + total */}
        <div className="mt-2 rounded-lg bg-muted/50 px-2.5 py-2 text-xs">
          {items.length === 0 && <p className="text-muted-foreground">No items</p>}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {items.map((k) => (
              <span key={k} className="text-muted-foreground">
                {PRODUCT_LABELS[k]}
                <span className="ml-1 font-semibold text-foreground">×{order.quantities[k]}</span>
              </span>
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-between border-t border-border/60 pt-1.5">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</span>
            <span className="text-sm font-bold text-foreground">₹{order.total}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          <a href={`tel:${customer.phone}`} className="block">
            <Button variant="outline" size="sm" className="h-9 w-full text-xs">
              <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
            </Button>
          </a>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="outline" size="sm" className="h-9 w-full text-xs">
              <Navigation className="mr-1.5 h-3.5 w-3.5" /> Maps
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </a>

          {order.status === "PENDING" && (
            <Button
              size="sm"
              className="col-span-2 h-9 w-full text-xs"
              onClick={() => {
                setOrderStatus(order.id, "OUT_FOR_DELIVERY", by);
                toast.success("Started delivery");
              }}
            >
              <Truck className="mr-1.5 h-3.5 w-3.5" /> Start delivery
            </Button>
          )}

          {!done && (
            <Button
              size="sm"
              className="h-9 w-full bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              onClick={() => {
                setOrderStatus(order.id, "DELIVERED", by);
                toast.success("Marked delivered");
              }}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Delivered
            </Button>
          )}

          {!done && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full border-destructive/40 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => setFailOpen((v) => !v)}
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" /> Failed
            </Button>
          )}

          {done && (
            <Button
              variant="ghost"
              size="sm"
              className="col-span-2 h-9 w-full text-xs"
              onClick={() => {
                setOrderStatus(order.id, "PENDING", by, { notes: "Reopened by delivery boy" });
                toast.message("Order reopened");
              }}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reopen order
            </Button>
          )}
        </div>

        {failOpen && !done && (
          <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            <Label className="text-xs">Reason</Label>
            <div className="mt-2 grid gap-2">
              {FAILURE_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${
                    reason === r
                      ? "border-destructive bg-card font-semibold text-destructive"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Label htmlFor={`n-${order.id}`} className="mt-3 block text-xs">
              Notes (optional)
            </Label>
            <Textarea
              id={`n-${order.id}`}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened?"
              className="mt-1"
            />
            <Button
              className="mt-3 h-11 w-full bg-destructive text-base text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setOrderStatus(order.id, "FAILED", by, { reason, notes: notes.trim() || undefined });
                setFailOpen(false);
                setNotes("");
                toast.error("Marked as failed");
              }}
            >
              Confirm failed delivery
            </Button>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleEdit}
          className="mt-2.5 text-xs font-medium text-muted-foreground underline underline-offset-4"
        >
          {editing ? "Close details" : "Fix phone / address / location"}
        </button>

        {editing && <LimitedEdit customer={customer} by={by} />}
      </div>
    </article>
  );
}

/** Delivery boys may only correct contact details — never quantities or price. */
function LimitedEdit({ customer, by }: { customer: Customer; by: string }) {
  const [phone, setPhone] = useState(customer.phone);
  const [address, setAddress] = useState(customer.address);
  const [mapsLink, setMapsLink] = useState(customer.mapsLink);
  const [houseImage, setHouseImage] = useState(customer.houseImage ?? "");

  function onFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setHouseImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border/60 bg-muted/40 p-3">
      <div>
        <Label htmlFor={`p-${customer.id}`} className="text-xs">
          Phone
        </Label>
        <Input
          id={`p-${customer.id}`}
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 bg-card"
        />
      </div>
      <div>
        <Label htmlFor={`a-${customer.id}`} className="text-xs">
          Address
        </Label>
        <Textarea
          id={`a-${customer.id}`}
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mt-1 bg-card"
        />
      </div>
      <div>
        <Label htmlFor={`m-${customer.id}`} className="text-xs">
          Google Maps link or lat,lon
        </Label>
        <Input
          id={`m-${customer.id}`}
          value={mapsLink}
          onChange={(e) => setMapsLink(e.target.value)}
          className="mt-1 bg-card"
        />
      </div>
      <div>
        <Label className="text-xs">House photo</Label>
        <label className="mt-1 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-medium text-foreground">
          <Camera className="h-4 w-4" />
          {houseImage ? "Replace photo" : "Take / upload photo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
      </div>
      <Button
        className="h-11 w-full"
        onClick={() => {
          updateCustomer(
            customer.id,
            {
              phone: phone.trim(),
              address: address.trim(),
              mapsLink: mapsLink.trim() ? normaliseMapsLink(mapsLink) : "",
              houseImage: houseImage || undefined,
            },
            by,
          );
          toast.success("Customer details updated");
        }}
      >
        Save changes
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Quantities and pricing can only be changed by the admin. Every change is logged.
      </p>
    </div>
  );
}
