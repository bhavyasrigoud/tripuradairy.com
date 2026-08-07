import { createFileRoute } from "@tanstack/react-router";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/lib/products";

export const Route = createFileRoute("/products")({
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <div className="mb-10 text-center">
        <h1 className="font-serif text-4xl font-bold text-foreground">Our Products</h1>
        <p className="mt-3 text-muted-foreground">Premium dairy, delivered fresh daily.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}