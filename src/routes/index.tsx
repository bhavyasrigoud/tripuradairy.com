import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Splash } from "@/components/Splash";
import { ProductCard } from "@/components/ProductCard";
import { ImpactCounter } from "@/components/ImpactCounter";
import { products } from "@/lib/products";
import { logoUrl } from "@/components/Logo";
import { Truck, ShieldCheck, Leaf, Clock } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <>
      <Splash />

      {/* Compact Live Impact strip — above the fold */}
      <ImpactCounter compact />

      {/* Hero with watermark background */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-[0.13]"
          style={{
            backgroundImage: `url(${logoUrl})`,
            backgroundSize: "min(80vw, 720px)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:py-28">
          <p className="font-medium uppercase tracking-[0.3em] text-gold-deep">
            Premium Dairy Products
          </p>
          <h1 className="mx-auto mt-5 max-w-4xl font-serif text-4xl font-bold leading-tight text-foreground sm:text-6xl">
            Fresh Milk. Pure Ghee. Traditional Quality.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Delivered fresh from Tripura Dairy to your doorstep every day.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-gold to-gold-deep px-8 text-primary-foreground hover:opacity-90"
            >
              <Link to="/products">Order Now</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-gold-deep px-8 text-gold-deep hover:bg-accent">
              <Link to="/subscription">Start Subscription</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Product highlights */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-10 text-center">
          <h2 className="font-serif text-3xl font-bold text-foreground">Our Premium Products</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild variant="outline" className="border-gold-deep text-gold-deep hover:bg-accent">
            <Link to="/products">View Full Catalog</Link>
          </Button>
        </div>
      </section>

      {/* Why choose */}
      <section className="bg-secondary/40 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center font-serif text-3xl font-bold text-foreground">
            Why Choose Tripura
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Clock, title: "Fresh Daily", text: "Delivered fresh every morning." },
              { icon: ShieldCheck, title: "Hygienic Packaging", text: "Sealed for purity and safety." },
              { icon: Leaf, title: "Pure Ingredients", text: "No additives, just pure dairy." },
              { icon: Truck, title: "Home Delivery", text: "Right to your doorstep." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border/60 bg-card p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep">
                  <f.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
