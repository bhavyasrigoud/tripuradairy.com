import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

export function StickyOrder() {
  return (
    <Link
      to="/order"
      className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-deep px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-lg lg:hidden"
    >
      <MessageCircle className="h-5 w-5" />
      Order Now
    </Link>
  );
}