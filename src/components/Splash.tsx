import { useEffect, useState } from "react";
import { Logo } from "./Logo";

export function Splash() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("tripura_splash_seen")) {
      setDone(true);
      return;
    }
    const t = setTimeout(() => {
      sessionStorage.setItem("tripura_splash_seen", "1");
      setDone(true);
    }, 2800);
    return () => clearTimeout(t);
  }, []);

  if (done) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-cream"
      style={{ animation: "splash-fade-out 2.8s ease forwards" }}
    >
      <div className="relative animate-scale-in">
        <Logo className="h-56 w-56 sm:h-72 sm:w-72" />
        <div className="splash-shine pointer-events-none absolute inset-0" />
      </div>
    </div>
  );
}