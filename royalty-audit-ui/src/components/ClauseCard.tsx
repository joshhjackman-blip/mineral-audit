// ClauseCard.tsx
// Shows an extracted lease clause as a real quoted document excerpt,
// not a summarized abstraction — reinforcing that this is auditable
// against the actual source text.

import { LeaseClause, methodLabel, pointLabel } from "@/lib/types";

export function ClauseCard({
  title,
  clause,
}: {
  title: string;
  clause: LeaseClause;
}) {
  return (
    <div className="rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
          {title}
        </span>
        <div className="flex gap-1.5">
          <span className="rounded-sm bg-[var(--paper)] px-2 py-0.5 font-data text-[11px] text-[var(--ink-soft)]">
            {methodLabel(clause.valuation_method)}
          </span>
          <span className="rounded-sm bg-[var(--paper)] px-2 py-0.5 font-data text-[11px] text-[var(--ink-soft)]">
            {pointLabel(clause.valuation_point)}
          </span>
        </div>
      </div>
      <blockquote className="font-serif-doc text-[14.5px] leading-relaxed text-[var(--ink-soft)] italic">
        &ldquo;{clause.raw_text}&rdquo;
      </blockquote>
    </div>
  );
}
