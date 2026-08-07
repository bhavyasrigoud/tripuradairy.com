import logoUrl from "@/assets/tripura-logo.png";

export function Logo({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Tripura Dairy logo"
      className={`${className} object-contain`}
    />
  );
}

export { logoUrl };
