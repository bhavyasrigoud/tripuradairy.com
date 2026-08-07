import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import curdImg from "@/assets/product-curd.jpg";
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

export const Route = createFileRoute("/preorder")({
  component: PreOrderPage,
});

// Price: ₹130 per kg. Available packs: 1 kg, 5 kg, 10 kg, 20 kg.
const PRICE_PER_KG = 130;
const PACKS = [1, 5, 10, 20] as const;


function PreOrderPage() {
  const [kgStr, setKgStr] = useState(String(PACKS[0]));
  const [count, setCount] = useState(1);
  const [form, setForm] = useState({ name: "", phone: "", date: tomorrowISO() });
  const [address, setAddress] = useState<AddressParts>(emptyAddress);
  const [mapsLink, setMapsLink] = useState("");
  const [saveFlag, setSaveFlag] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const minDate = tomorrowISO();

  const kg = parseInt(kgStr, 10) || 0;
  const total = kg * PRICE_PER_KG * count;
  const display = `${kg} kg × ${count}`;

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Please fill in your name and phone number.");
      return;
    }
    if (!form.date.trim()) {
      toast.error("Please select a preferred delivery date.");
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
      "I would like to pre-order Curd:",
      `Quantity: ${display}`,
      `Total Amount: ${formatINR(total)}`,
      "",
      `Name: ${form.name}`,
      `Phone: ${form.phone}`,
      `Preferred Date: ${form.date || "—"}`,
      `Address: ${fullAddress(address)}`,
    ];
    if (finalMapsLink) lines.push(`Location: ${finalMapsLink}`);
    openWhatsApp(lines.join("\n"));
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-14">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold text-foreground">
          Pre-order Fresh Curd
        </h1>
        <p className="mt-3 text-muted-foreground">
          Pre-orders must be placed 1 day in advance · Set fresh, made to order
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="grid gap-0 sm:grid-cols-2">
          <div className="relative aspect-square bg-secondary/30">
            <img
              src={curdImg}
              alt="Fresh Curd"
              className="h-full w-full object-contain p-3"
            />
          </div>
          <div className="flex flex-col justify-center p-6">
            <span className="inline-flex w-fit rounded-md bg-accent/60 px-2.5 py-1 text-xs font-semibold text-gold-deep">
              Pre-orders must be placed 1 day in advance
            </span>
            <h2 className="mt-3 font-serif text-2xl font-bold text-foreground">
              Pricing
            </h2>
            <div className="mt-3 flex items-center justify-between text-foreground">
              <span>1 kg</span>
              <span className="font-bold text-gold-deep">
                {formatINR(PRICE_PER_KG)}
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              ₹130 per kg · Choose your pack below.
            </p>

          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6 rounded-2xl border border-border/60 bg-card p-6"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Choose Weight</Label>
            <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
              {PACKS.map((k) => {
                const active = kg === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKgStr(String(k))}
                    className={`relative shrink-0 snap-start rounded-lg border px-6 py-3 text-sm transition-all ${
                      active
                        ? "border-gold-deep bg-accent font-semibold"
                        : "border-border/60 bg-card hover:border-gold"
                    }`}
                  >
                    {active && <Check className="mr-1 inline h-3.5 w-3.5 text-gold-deep" />}
                    {k} kg
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setCount((c) => Math.max(1, c - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center text-lg font-semibold">{count}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setCount((c) => c + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-end justify-between rounded-xl bg-secondary/30 px-5 py-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Total
              </div>
              <div className="text-xs text-muted-foreground">{display}</div>
            </div>
            <div className="text-2xl font-bold text-gold-deep">
              {formatINR(total)}
            </div>
          </div>
        </div>



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
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              required
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Preferred Delivery Date</Label>
          <Input
            id="date"
            type="date"
            required
            min={minDate}
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
          />
        </div>

        <AddressFields address={address} onChange={setAddress} onMapsLink={setMapsLink} />
        <SaveAddressToggle
          saveAddress={saveFlag}
          onToggle={setSaveFlag}
          label={saveLabel}
          onLabelChange={setSaveLabel}
        />

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-gold to-gold-deep text-primary-foreground hover:opacity-90"
        >
          Pre-order on WhatsApp
        </Button>
      </form>
    </section>
  );
}
