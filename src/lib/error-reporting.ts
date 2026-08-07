export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "production") {
    console.error("[error-boundary]", error, context);
  }
}
