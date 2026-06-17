// DataFigure.tsx
// Anything that is a number, date, decimal interest, or identifier gets
// this treatment — monospace, tabular figures. This is the visual signal
// that distinguishes "data you can verify" from ordinary prose.

export function Money({
  value,
  emphasis = "normal",
}: {
  value: number;
  emphasis?: "normal" | "alert" | "resolved";
}) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

  const colorClass =
    emphasis === "alert"
      ? "text-[var(--alert)]"
      : emphasis === "resolved"
      ? "text-[var(--resolved)]"
      : "text-[var(--ink)]";

  return <span className={`font-data ${colorClass}`}>{formatted}</span>;
}

export function DataLabel({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">
        {label}
      </span>
      <span className="font-data text-[14px] text-[var(--ink)]">{value}</span>
    </div>
  );
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatMonth(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}
