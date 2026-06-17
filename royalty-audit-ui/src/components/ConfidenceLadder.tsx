// ConfidenceLadder.tsx
// The signature element of this app. A HIGH confidence result is shown
// settled and clean. A LOW confidence result is structurally unsettled —
// bordered, annotated, visually distinct — so it is never possible to
// mistake a flagged-for-review figure for a certain one at a glance.

import { ConfidenceLevel } from "@/lib/types";

interface ConfidenceLadderProps {
  level: ConfidenceLevel;
  compact?: boolean;
}

const CONFIG: Record<
  ConfidenceLevel,
  { label: string; description: string }
> = {
  high: {
    label: "High confidence",
    description: "Matches a clearly decided case pattern",
  },
  medium: {
    label: "Medium confidence",
    description: "Clause language partially matches precedent",
  },
  low: {
    label: "Low confidence",
    description: "Requires manual review before relying on this figure",
  },
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const cfg = CONFIG[level];

  if (level === "high") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--resolved-border)] bg-[var(--resolved-tint)] px-2.5 py-1 text-[12px] font-medium text-[var(--resolved)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--resolved)]" />
        {cfg.label}
      </span>
    );
  }

  if (level === "medium") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--caution-border)] bg-[var(--caution-tint)] px-2.5 py-1 text-[12px] font-medium text-[var(--caution)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--caution)]" />
        {cfg.label}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border-2 border-dashed border-[var(--alert-border)] bg-[var(--alert-tint)] px-2.5 py-1 text-[12px] font-semibold text-[var(--alert)]"
      role="status"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--alert)]" />
      {cfg.label}
    </span>
  );
}

// The full-width banner version used at the top of a figure that should
// never be read at a glance as certain. This is the "unsettled" treatment:
// a dashed border and hatch pattern, deliberately uncomfortable to look at
// as a finished number.
export function ConfidenceGate({
  level,
  children,
}: {
  level: ConfidenceLevel;
  children: React.ReactNode;
}) {
  if (level === "high") {
    return <div className="border-l-2 border-[var(--resolved)] pl-4">{children}</div>;
  }

  if (level === "medium") {
    return (
      <div className="border-l-2 border-[var(--caution)] pl-4">{children}</div>
    );
  }

  return (
    <div className="relative rounded-sm border-2 border-dashed border-[var(--alert-border)] bg-[repeating-linear-gradient(135deg,var(--alert-tint)_0px,var(--alert-tint)_8px,transparent_8px,transparent_16px)] p-4">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--alert)]">
        <span aria-hidden>⚠</span>
        Not a finished figure — manual review required
      </div>
      {children}
    </div>
  );
}

export function ConfidenceLegend() {
  return (
    <div className="flex flex-col gap-2 text-[13px] text-[var(--ink-soft)]">
      {(["high", "medium", "low"] as ConfidenceLevel[]).map((level) => (
        <div key={level} className="flex items-center gap-3">
          <ConfidenceBadge level={level} />
          <span>{CONFIG[level].description}</span>
        </div>
      ))}
    </div>
  );
}
