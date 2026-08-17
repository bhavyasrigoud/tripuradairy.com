import { createFileRoute } from "@tanstack/react-router";
import { Truck, ShieldCheck, Leaf, Clock } from "lucide-react";
import { logoUrl } from "@/components/Logo";
import { ImpactCounter } from "@/components/ImpactCounter";
import { AdminPortalLogin } from "@/components/PortalLogin";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-[0.05]"
        style={{ backgroundImage: `url(${logoUrl})`, backgroundSize: "min(70vw, 600px)" }}
        aria-hidden
      />
      <section className="relative mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-center font-serif text-4xl font-bold text-foreground">Our Story</h1>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground">
          Tripura Dairy has been providing fresh dairy products with traditional quality and
          purity. From farm-fresh buffalo milk to pure ghee and curd, every product carries our
          promise — Pure Milk. Pure Goodness.
        </p>

        <h2 className="mt-16 text-center font-serif text-3xl font-bold text-foreground">
          Why Choose Tripura
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {[
            { icon: Clock, title: "Fresh Daily", text: "Delivered fresh every single morning." },
            { icon: ShieldCheck, title: "Hygienic Packaging", text: "Sealed and safe for your family." },
            { icon: Leaf, title: "Pure Ingredients", text: "No additives — just pure, natural dairy." },
            { icon: Truck, title: "Home Delivery", text: "Convenient doorstep delivery." },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ImpactCounter heading="Our Impact So Far" />

      <div className="relative pb-12 text-center">
        <AdminPortalLogin />
      </div>
    </div>
  );
}