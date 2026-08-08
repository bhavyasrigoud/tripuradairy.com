import milkImg from "@/assets/product-milk.jpg";
import curdImg from "@/assets/product-curd.jpg";
import gheeImg from "@/assets/product-ghee.jpg";
import paneerImg from "@/assets/product-paneer.jpg";

export type Product = {
  id: string;
  name: string;
  label: string;
  image: string;
  price: string;
  quantity: string;
  sizes: string[];
  sizePrices: Record<string, number>;
  note?: string;
  /** Where the card / image click takes the user */
  href: string;
};

export const products: Product[] = [
  {
    id: "milk",
    name: "Tripura Fresh Buffalo Milk",
    label: "Milk",
    image: milkImg,
    price: "₹50",
    quantity: "from 500 ml",
    sizes: ["500 ml", "1 Litre"],
    sizePrices: { "500 ml": 50, "1 Litre": 100 },
    note: "Available for subscription only (No single-day delivery).",
    href: "/subscription",
  },
  {
    id: "curd",
    name: "Fresh Curd",
    label: "Curd",
    image: curdImg,
    price: "₹110",
    quantity: "from 1 kg",
    sizes: ["1 kg", "5 kg", "10 kg", "20 kg"],
    sizePrices: { "1 kg": 110, "5 kg": 550, "10 kg": 1100, "20 kg": 2200 },
    note: "Pre-orders must be placed 1 day in advance.",
    href: "/preorder",
  },
  {
    id: "ghee",
    name: "Pure Ghee",
    label: "Ghee",
    image: gheeImg,
    price: "₹899",
    quantity: "1 Litre",
    sizes: ["250 ml", "500 ml", "1 Litre"],
    sizePrices: { "250 ml": 225, "500 ml": 450, "1 Litre": 899 },
    note: "Slow-cooked the traditional way for pure aroma.",
    href: "/order",
  },
  {
    id: "paneer",
    name: "Fresh Paneer",
    label: "Paneer",
    image: paneerImg,
    price: "₹449",
    quantity: "1 kg",
    sizes: ["250 g", "500 g", "1 kg"],
    sizePrices: { "250 g": 112, "500 g": 225, "1 kg": 449 },
    note: "Soft, milky and made fresh in biodegradable covers.",
    href: "/paneer",
  },
];

export function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}
