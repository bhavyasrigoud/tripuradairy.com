import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { products, formatINR } from "@/lib/products";
import { openWhatsApp, fullOrderMessage, tomorrowISO } from "@/lib/whatsapp";
import {
  emptyAddress,
  fullAddress,
  isAddressComplete,
  buildMapsLinkFromAddress,
  saveAddress as persistAddress,
  type AddressParts,
} from "@/lib/location";
import { AddressFields, SaveAddressToggle } from "@/components/AddressFields";

export const Route = createFileRoute("/paneer")({
  component: PaneerPage,
});

function PaneerPage() {
  const product = products.find((p) => p.id === "paneer")!;

  const [size, setSize] = useState(product.sizes[0]);
  const [count, setCount] = useState(1);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    preferredDate: tomorrowISO(),
    deliveryTime: "",
  });
  const minDate = tomorrowISO();
  const [address, setAddress] = useState<AddressParts>(emptyAddress);
  const [mapsLink, setMapsLink] = useState("");
  const [saveFlag, setSaveFlag] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const unitPrice = product.sizePrices[size] ?? 0;
  const totalAmount = unitPrice * count;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Please fill in your name and phone number.");
      return;
    }
    if (!form.preferredDate.trim()) {
      toast.error("Please select a preferred delivery date.");
      return;
    }
    if (!form.deliveryTime.trim()) {
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
    openWhatsApp(
      fullOrderMessage({
        product: product.name,
        size,
        count,
        amount: formatINR(totalAmount),
        name: form.name,
        phone: form.phone,
        address: fullAddress(address),
        mapsLink: finalMapsLink || undefined,
        preferredDate: form.preferredDate,
        deliveryTime: form.deliveryTime,
      }),
    );
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-14">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold text-foreground">Order Fresh Paneer</h1>
      </div>


      <form
        onSubmit={handleSubmit}
        className="mt-10 space-y-6 rounded-2xl border border-border/60 bg-card p-6"
      >
        <div className="space-y-5 rounded-xl border border-border/60 bg-secondary/30 p-5">
          <div className="flex items-center gap-4">
            <img
              src={product.image}
              alt={product.name}
              className="h-20 w-20 rounded-lg object-cover"
            />
            <div>
              <h2 className="font-serif text-xl font-semibold text-foreground">{product.name}</h2>
              <p className="text-gold-deep">₹449 per kg</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Weight</Label>
            <div className="flex flex-wrap gap-3">
              {product.sizes.map((s) => {
                const active = size === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`relative rounded-lg border px-4 py-2 text-sm transition-all ${
                      active
                        ? "border-gold-deep bg-accent font-semibold"
                        : "border-border/60 bg-card hover:border-gold"
                    }`}
                  >
                    {active && <Check className="mr-1 inline h-3.5 w-3.5 text-gold-deep" />}
                    {s}
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

          <div className="flex items-center justify-between border-t border-border/60 pt-4">
            <span className="text-sm text-muted-foreground">Total Amount</span>
            <span className="text-2xl font-bold text-gold-deep">{formatINR(totalAmount)}</span>
          </div>
        </div>

        <h2 className="font-serif text-xl font-semibold text-foreground">Your Details</h2>
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

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="preferredDate">Preferred Delivery Date</Label>
            <Input
              id="preferredDate"
              type="date"
              required
              min={minDate}
              value={form.preferredDate}
              onChange={(e) => update("preferredDate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliveryTime">Preferred Delivery Time</Label>
            <Input
              id="deliveryTime"
              type="time"
              required
              value={form.deliveryTime}
              onChange={(e) => update("deliveryTime", e.target.value)}
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

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-gold to-gold-deep text-primary-foreground hover:opacity-90"
        >
          Order Now on WhatsApp
        </Button>
      </form>
    </section>
  );
}
