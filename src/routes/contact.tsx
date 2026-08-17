import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, MessageCircle, ExternalLink } from "lucide-react";
import {
  openWhatsApp,
  CONTACT_PHONE,
  CONTACT_PHONE_ALT,
  CONTACT_EMAIL,
  BUSINESS_ADDRESS,
} from "@/lib/whatsapp";
import { StaffPortalLogin } from "@/components/PortalLogin";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

const GOOGLE_MAPS_LINK =
  "https://www.google.co.in/maps/place/Tripura+dairy/@17.4116573,78.5679951,17.14z/data=!4m6!3m5!1s0x3bcb9f001ace8785:0x58bce4f6e58c3147!8m2!3d17.4117709!4d78.5704023!16s%2Fg%2F11zcv2j_gv";

const GOOGLE_MAPS_EMBED =
  "https://www.google.com/maps?q=17.4117709,78.5704023&z=17&output=embed";

function ContactPage() {
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openWhatsApp(
      `Hello Tripura,\n\nName: ${form.name}\nPhone: ${form.phone}\n\nMessage:\n${form.message}`,
    );
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold text-foreground">Contact Us</h1>
        <p className="mt-3 text-muted-foreground">We'd love to hear from you.</p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <ContactItem icon={Phone} label="Primary Phone" value={CONTACT_PHONE} />
          <ContactItem icon={Phone} label="Alternate Phone" value={CONTACT_PHONE_ALT} />
          <ContactItem icon={MessageCircle} label="WhatsApp" value={CONTACT_PHONE_ALT} />
          <ContactItem icon={Mail} label="Email" value={CONTACT_EMAIL} />
          <ContactItem icon={MapPin} label="Address" value={BUSINESS_ADDRESS} />

          <div className="overflow-hidden rounded-2xl border border-border/60">
            <iframe
              title="Tripura Dairy location"
              src={GOOGLE_MAPS_EMBED}
              className="h-64 w-full sm:h-80"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>

          <a
            href={GOOGLE_MAPS_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-gold to-gold-deep px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            aria-label="View Tripura Dairy on Google Maps in a new tab"
          >
            <ExternalLink className="h-4 w-4" />
            View on Google Maps
          </a>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="font-serif text-xl font-semibold text-foreground">Send a Message</h2>
          <div className="space-y-2">
            <Label htmlFor="cname">Name</Label>
            <Input id="cname" required value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cphone">Phone</Label>
            <Input id="cphone" type="tel" required value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cmsg">Message</Label>
            <Textarea id="cmsg" rows={5} required value={form.message} onChange={(e) => update("message", e.target.value)} />
          </div>
          <Button type="submit" className="w-full bg-gradient-to-r from-gold to-gold-deep text-primary-foreground hover:opacity-90">
            Send on WhatsApp
          </Button>
        </form>
      </div>

      <div className="mt-14 max-w-md">
        <StaffPortalLogin />
      </div>
    </section>
  );
}

function ContactItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep">
        <Icon className="h-6 w-6 text-primary-foreground" />
      </div>
      <div>
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}
