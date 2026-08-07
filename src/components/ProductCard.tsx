import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  const ctaText =
    product.id === "milk"
      ? "Subscribe"
      : product.id === "curd"
        ? "Pre-order"
        : "Order Now";
  const ctaTo =
    product.id === "ghee"
      ? "/order"
      : (product.href as "/subscription" | "/preorder" | "/paneer");
  const ctaSearch = product.id === "ghee" ? { product: product.id } : undefined;


  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:shadow-[var(--shadow-elegant)]">
      <Link to={ctaTo} search={product.id === "ghee" ? { product: product.id } : undefined}>
        <div className="relative aspect-square overflow-hidden bg-secondary/30">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            width={1024}
            height={1024}
            className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-lg font-semibold text-foreground">{product.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{product.quantity}</p>
        <p className="mt-2 text-2xl font-bold text-gold-deep">{product.price}</p>
        <div className="mt-2 flex min-h-[3.25rem] flex-1 items-start">
          {product.note && (
            <p className="inline-flex items-center rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium leading-snug text-amber-800">
              {product.note}
            </p>
          )}
        </div>
        <Button
          asChild
          className="mt-4 w-full bg-gradient-to-r from-gold to-gold-deep text-primary-foreground hover:opacity-90"
        >
          <Link
            to={ctaTo}
            search={product.id === "ghee" ? { product: product.id } : undefined}
          >
            {ctaText}
          </Link>
        </Button>
      </div>
    </div>
  );
}
