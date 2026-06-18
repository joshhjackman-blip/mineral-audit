// Shared formatting utilities used across summary and case file pages.

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function confidenceLabel(level: string | null): string {
  switch (level) {
    case "high": return "High confidence";
    case "medium": return "Medium confidence";
    case "low": return "Low confidence — manual review required";
    default: return "Pending";
  }
}

export function confidenceColor(level: string | null): string {
  switch (level) {
    case "high": return "text-[var(--resolved)]";
    case "medium": return "text-[var(--caution)]";
    case "low": return "text-[var(--alert)]";
    default: return "text-[var(--ink-faint)]";
  }
}
