import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Recycle, Leaf, Milk } from "lucide-react";
import { fetchImpact, type ImpactStats } from "@/lib/impact";
import { cn } from "@/lib/utils";
import globeBadge from "@/assets/globe-badge.png";
import globeBanner from "@/assets/globe-banner.png";
import footerGlobe from "@/assets/footer-globe.png";
import togetherCard from "@/assets/together-card.png";

const FONT_SCRIPT = "'Allura', 'Brittany Signature', 'Dancing Script', cursive";
const FONT_BODY = "'Inter', 'Poppins', system-ui, sans-serif";

function useTween(target: number, durationMs = 1400): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = value;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}

function Swoosh({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 12"
      fill="none"
      className={cn("h-2 w-12 sm:h-2.5 sm:w-14", className)}
      aria-hidden="true"
    >
      <path
        d="M2 8C2 8 18 2 32 6C46 10 54 2 68 6C74 7.5 78 6 78 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MetricCard({
  icon: Icon,
  value,
  unit,
  label,
}: {
  icon: typeof Milk;
  value: string;
  unit?: string;
  label: string;
}) {
  return (
    <div className="group flex h-full flex-col items-start rounded-2xl border border-gold/15 bg-card px-3 py-3 shadow-[0_4px_20px_-8px_rgba(184,134,11,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-10px_rgba(184,134,11,0.35)] sm:rounded-[22px] sm:px-4 sm:py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/40 sm:h-11 sm:w-11">
        <Icon className="h-5 w-5 text-gold-deep sm:h-6 sm:w-6" strokeWidth={1.6} />
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span
          className="text-[30px] leading-none tracking-tight text-foreground sm:text-[40px] font-bold"
          aria-live="polite"
        >
          {value}
        </span>
        {unit && (
          <span className="text-base text-foreground/85 sm:text-lg font-semibold">
            {unit}
          </span>
        )}
      </div>
      <p
        className="mt-1 text-[10px] tracking-wide text-foreground/70 sm:text-xs"
        style={{ fontFamily: FONT_BODY, fontWeight: 600 }}
      >
        {label}
      </p>
      <Swoosh className="mt-1 text-gold/60" />
    </div>
  );
}

export function ImpactCounter({
  heading = "Small Choices, Big Impact",
  compact = false,
}: {
  heading?: string;
  compact?: boolean;
}) {
  const { data, isLoading } = useQuery<ImpactStats>({
    queryKey: ["impact"],
    queryFn: fetchImpact,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const stats =
    data ?? {
      bottles: 0,
      plasticGrams: 0,
      co2Grams: 0,
      source: "fallback" as const,
    };
  const bottles = useTween(stats.bottles);
  const plastic = useTween(stats.plasticGrams);
  const co2 = useTween(stats.co2Grams);

  const isLive = data?.source === "live";

  const plasticKg = isLoading ? "…" : (plastic / 1000).toFixed(1);
  const co2Kg = isLoading ? "…" : (co2 / 1000).toFixed(1);
  const bottlesDisplay = isLoading ? "…" : bottles.toLocaleString();

  const metrics = [
    { icon: Milk, label: "Bottles Saved", value: bottlesDisplay, unit: undefined },
    { icon: Recycle, label: "Plastic Avoided", value: plasticKg, unit: "kg" },
    { icon: Leaf, label: "CO\u2082 Avoided", value: co2Kg, unit: "kg" },
  ];

  const LivePill = (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-card px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-emerald-700 shadow-sm sm:text-[10px]"
      style={{ fontFamily: FONT_BODY, fontWeight: 700 }}
    >
      <span className="relative inline-flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full bg-emerald-500",
            isLive ? "animate-ping opacity-60" : "opacity-0"
          )}
          aria-hidden
        />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
      </span>
      Live Impact
    </span>
  );

  const inner = (
    <div className="relative mx-auto w-full sm:max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="leading-[1.02]">
            <span
              className="block text-2xl tracking-tight text-foreground sm:text-3xl"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 }}
            >
              Small Choices,
            </span>
            <span
              className="block text-[44px] leading-[0.95] tracking-tight text-gold sm:text-[60px]"
              style={{ fontFamily: FONT_SCRIPT, fontWeight: 400 }}
            >
              Big Impact
            </span>
            <Swoosh className="mt-0.5 text-gold/70" />
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p
              className="text-[11px] leading-snug text-foreground/75 sm:text-xs"
              style={{ fontFamily: FONT_BODY, fontWeight: 400 }}
            >
              Every delivery you receive helps build a{" "}
              <span style={{ fontWeight: 600 }} className="text-gold-deep">
                cleaner, healthier planet.
              </span>
            </p>
            {LivePill}
          </div>
        </div>
        <img
          src={globeBadge}
          alt="Good for you, good for earth"
          width={180}
          height={180}
          className="h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24"
        />
      </div>

      {/* Metrics */}
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {metrics.map((m) => (
          <MetricCard key={m.label} icon={m.icon} value={m.value} unit={m.unit} label={m.label} />
        ))}
      </div>

      {/* Story Banner */}
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-700/10 bg-gradient-to-br from-emerald-50/50 via-card to-accent/30 px-3 py-2.5 shadow-[0_2px_12px_-6px_rgba(16,128,80,0.18)] sm:gap-4 sm:px-4 sm:py-3">
        <img
          src={globeBanner}
          alt=""
          width={120}
          height={120}
          loading="lazy"
          className="hidden h-16 w-16 shrink-0 object-contain sm:block sm:h-20 sm:w-20"
        />
        <p
          className="min-w-0 flex-1 text-sm leading-snug text-foreground/80 sm:text-base"
          style={{ fontFamily: FONT_BODY, fontWeight: 400 }}
        >
          We serve our dairy in{" "}
          <span style={{ fontWeight: 700 }} className="text-gold-deep">
            reusable glass bottles
          </span>{" "}
          instead of{" "}
          <span style={{ fontWeight: 700 }} className="text-gold-deep">
            single-use plastic
          </span>{" "}
          — every delivery is one small step toward a{" "}
          <span style={{ fontWeight: 700 }} className="text-emerald-700">
            cleaner, healthier
          </span>{" "}
          environment.
        </p>
        {/* Together card image */}
        <img
          src={togetherCard}
          alt="Together, we make a difference"
          width={220}
          height={140}
          loading="lazy"
          className="hidden h-20 w-32 shrink-0 rounded-xl object-contain sm:block sm:h-24 sm:w-36"
        />
      </div>

      {/* Footer */}
      <div
        className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-full border border-gold/10 bg-card px-4 py-2 text-center shadow-sm sm:gap-x-6"
        style={{ fontFamily: FONT_BODY }}
      >
        <span className="inline-flex items-center gap-1.5 text-sm text-foreground/70" style={{ fontWeight: 500 }}>
          <Leaf className="h-4 w-4 text-emerald-600" strokeWidth={1.8} />
          Thank you for choosing better.
        </span>
        <span className="hidden h-4 w-px bg-gold/25 sm:inline-block" aria-hidden />
        <span className="text-sm text-foreground/70" style={{ fontWeight: 500 }}>
          For you. For tomorrow.
        </span>
        <span className="hidden h-4 w-px bg-gold/25 sm:inline-block" aria-hidden />
        <span className="inline-flex items-center gap-1.5 text-sm text-foreground/70" style={{ fontWeight: 500 }}>
          For our planet.
          <img
            src={footerGlobe}
            alt=""
            width={32}
            height={32}
            className="h-5 w-5 object-contain"
          />
        </span>
      </div>
    </div>
  );

  return (
    <section
      aria-label={heading}
      className={cn(
        "relative overflow-hidden",
        compact ? "px-4 py-2 sm:px-6 sm:py-3" : "mx-auto max-w-6xl px-4 py-8 sm:py-12"
      )}
    >
      {/* Decorative leaf — top right */}
      <svg
        className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 opacity-[0.07] sm:-right-2 sm:-top-2 sm:h-32 sm:w-32"
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M85 10 C70 5, 55 15, 50 30 C45 45, 55 60, 70 65 C85 70, 95 55, 90 40 C88 30, 90 20, 85 10Z"
          fill="currentColor"
          className="text-gold-deep"
        />
      </svg>
      {inner}
    </section>
  );
}
