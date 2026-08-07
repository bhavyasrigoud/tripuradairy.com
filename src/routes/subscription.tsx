import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { toast } from "sonner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { openWhatsApp, tomorrowISO } from "@/lib/whatsapp";
import {
  emptyAddress,
  fullAddress,
  isAddressComplete,
  buildMapsLinkFromAddress,
  saveAddress as persistAddress,
  type AddressParts,
} from "@/lib/location";
import { AddressFields, SaveAddressToggle } from "@/components/AddressFields";
import { formatINR } from "@/lib/products";

export const Route = createFileRoute("/subscription")({
  component: SubscriptionPage,
});

const plans = [
  { id: "500ml", label: "500 ml", perDay: 50 },
  { id: "1L", label: "1 Litre", perDay: 100 },
];

const durations = [
  { id: "1week", label: "1 Week", days: 7, discount: 0 },
  { id: "1month", label: "1 Month", days: 30, discount: 0.02 },
  { id: "2months", label: "2 Months", days: 60, discount: 0.03 },
  { id: "3months", label: "3 Months", days: 90, discount: 0.05 },
];

function deliveriesFor(frequency: string, days: number) {
  switch (frequency) {
    case "Alternate Days":
      return Math.ceil(days / 2);
    case "Weekly":
      return Math.ceil(days / 7);
    case "Daily":
    default:
      return days;
  }
}

function SubscriptionPage() {
  const [plan, setPlan] = useState("1L");
  const [duration, setDuration] = useState("1month");
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    time: "",
    startDate: tomorrowISO(),
    frequency: "Daily",
  });
  const [address, setAddress] = useState<AddressParts>(emptyAddress);
  const [mapsLink, setMapsLink] = useState("");
  const [saveFlag, setSaveFlag] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const minDate = tomorrowISO();

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const selectedPlan = plans.find((p) => p.id === plan)!;
  const selectedDuration = durations.find((d) => d.id === duration) ?? null;
  const deliveries = selectedDuration
    ? deliveriesFor(form.frequency, selectedDuration.days)
    : 0;
  const original = selectedPlan.perDay * deliveries;
  const discounted = selectedDuration
    ? Math.round(original * (1 - selectedDuration.discount))
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDuration) {
      toast.error("Please select a subscription plan.");
      return;
    }
    if (!form.name.trim() || !form.mobile.trim()) {
      toast.error("Please fill in your name and mobile number.");
      return;
    }
    if (!form.startDate.trim()) {
      toast.error("Please select a subscription start date.");
      return;
    }
    if (!form.time.trim()) {
      toast.error("Please select a preferred delivery time.");
      return;
    }
    if (!isAddressComplete(address)) {
      toast.error("Please fill in your full address (street, city, state, pincode).");
      return;
    }
    const finalMapsLink = mapsLink || buildMapsLinkFromAddress(address);
    if (saveFlag) {
      persistAddress({ label: saveLabel.trim() || "Saved", address, mapsLink: finalMapsLink });
    }
    const lines = [
      "Hello Tripura,",
      "",
      "I would like to start a Daily Milk Subscription.",
      "",
      `Plan: ${selectedPlan.label} (₹${selectedPlan.perDay} / day)`,
      `Duration: ${selectedDuration.label} (${selectedDuration.days} days)`,
      `Frequency: ${form.frequency}`,
      `Deliveries: ${deliveries}`,
      `Original Price: ${formatINR(original)}`,
      `Discount: ${(selectedDuration.discount * 100).toFixed(0)}%`,
      `Total Amount: ${formatINR(discounted)}`,
      "",
      `Name: ${form.name}`,
      `Mobile: ${form.mobile}`,
      `Address: ${fullAddress(address)}`,
      `Preferred Delivery Time: ${form.time}`,
      `Start Date: ${form.startDate}`,
    ];
    if (finalMapsLink) lines.push(`Location: ${finalMapsLink}`);
    openWhatsApp(lines.join("\n"));
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-14">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold text-foreground">
          Daily Milk Subscription
        </h1>
        <p className="mt-3 text-muted-foreground">
          Fresh buffalo milk, delivered to your door every morning.
        </p>
      </div>

      {/* Size selector */}
      <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
        {plans.map((p) => {
          const active = plan === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`relative rounded-2xl border p-6 text-center transition-all ${
                active
                  ? "border-gold-deep bg-accent shadow-[var(--shadow-elegant)]"
                  : "border-border/60 bg-card hover:border-gold"
              }`}
            >
              {active && (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </span>
              )}
              <div className="font-serif text-2xl font-bold text-foreground">
                {p.label}
              </div>
              <div className="mt-2 text-gold-deep">₹{p.perDay} / day</div>
            </button>
          );
        })}
      </div>

      {/* Carousel: pricing by duration */}
      <div className="mt-12">
        <h2 className="text-center font-serif text-2xl font-semibold text-foreground">
          Choose Your Plan
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Longer commitments — bigger savings
        </p>
        <div className="mt-6 px-10">
          <Carousel opts={{ align: "start" }} className="w-full">
            <CarouselContent>
              {durations.map((d) => {
                const dDeliveries = deliveriesFor(form.frequency, d.days);
                const orig = selectedPlan.perDay * dDeliveries;
                const disc = Math.round(orig * (1 - d.discount));
                const active = duration === d.id;
                return (
                  <CarouselItem
                    key={d.id}
                    className="sm:basis-1/2 lg:basis-1/3"
                  >
                    <button
                      type="button"
                      onClick={() => setDuration((cur) => (cur === d.id ? "" : d.id))}
                      className={`relative h-full w-full rounded-2xl border p-6 text-left transition-all ${
                        active
                          ? "border-gold-deep bg-accent shadow-[var(--shadow-elegant)]"
                          : "border-border/60 bg-card hover:border-gold"
                      }`}
                    >
                      {active && (
                        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </span>
                      )}
                      {d.discount > 0 && (
                        <span className="inline-block rounded-full bg-gold-deep px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
                          {(d.discount * 100).toFixed(0)}% OFF
                        </span>
                      )}
                      <div className="mt-3 font-serif text-xl font-bold text-foreground">
                        {d.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {d.days} days · {dDeliveries} deliveries · {form.frequency}
                      </div>
                      <div className="mt-4 space-y-1">
                        {d.discount > 0 && (
                          <div className="text-sm text-muted-foreground line-through">
                            {formatINR(orig)}
                          </div>
                        )}
                        <div className="text-3xl font-bold text-gold-deep">
                          {formatINR(disc)}
                        </div>
                        {d.discount > 0 && (
                          <div className="text-xs font-medium text-green-700">
                            You save {formatINR(orig - disc)}
                          </div>
                        )}
                      </div>
                    </button>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-2xl items-center justify-between rounded-2xl border border-border/60 bg-secondary/30 px-6 py-4">
        <div className="text-sm text-muted-foreground">
          {selectedPlan.label} ·{" "}
          {selectedDuration ? selectedDuration.label : "No plan selected"}
        </div>
        <div className="text-right">
          {selectedDuration && selectedDuration.discount > 0 && (
            <div className="text-xs text-muted-foreground line-through">
              {formatINR(original)}
            </div>
          )}
          <div className="text-2xl font-bold text-gold-deep">
            {selectedDuration ? formatINR(discounted) : "—"}
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-10 max-w-2xl space-y-5 rounded-2xl border border-border/60 bg-card p-6"
      >
        <h2 className="font-serif text-xl font-semibold text-foreground">
          Customer Details
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              type="tel"
              required
              value={form.mobile}
              onChange={(e) => update("mobile", e.target.value)}
            />
          </div>
        </div>
        <AddressFields address={address} onChange={setAddress} onMapsLink={setMapsLink} />
        <SaveAddressToggle
          saveAddress={saveFlag}
          onToggle={setSaveFlag}
          label={saveLabel}
          onLabelChange={setSaveLabel}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="time">Preferred Delivery Time</Label>
            <Input
              id="time"
              type="time"
              required
              value={form.time}
              onChange={(e) => update("time", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              required
              min={minDate}
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Frequency</Label>
          <div className="flex flex-wrap gap-4 pt-1">
            {["Daily", "Alternate Days", "Weekly"].map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="frequency"
                  value={opt}
                  checked={form.frequency === opt}
                  onChange={(e) => update("frequency", e.target.value)}
                  className="h-4 w-4 accent-[oklch(0.6_0.12_75)]"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-gold to-gold-deep text-primary-foreground hover:opacity-90"
        >
          Submit & Send on WhatsApp
        </Button>
      </form>
    </section>
  );
}
