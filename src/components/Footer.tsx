import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { CONTACT_PHONE, CONTACT_PHONE_ALT, CONTACT_EMAIL, BUSINESS_ADDRESS } from "@/lib/whatsapp";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/60 bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-12" />
            <span className="font-serif text-2xl font-bold text-gold-deep">TRIPURA</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Premium Dairy Products. Premium quality milk, curd and ghee from Tripura Dairy.
          </p>
        </div>
        <div>
          <h3 className="font-serif text-lg font-semibold text-foreground">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-gold-deep">Home</Link></li>
            <li><Link to="/products" className="hover:text-gold-deep">Products</Link></li>
            <li><Link to="/subscription" className="hover:text-gold-deep">Subscription</Link></li>
            <li><Link to="/about" className="hover:text-gold-deep">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-gold-deep">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-serif text-lg font-semibold text-foreground">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>{CONTACT_PHONE}</li>
            <li>{CONTACT_PHONE_ALT}</li>
            <li>{CONTACT_EMAIL}</li>
            <li>{BUSINESS_ADDRESS}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Tripura Dairy. All rights reserved.
      </div>
    </footer>
  );
}