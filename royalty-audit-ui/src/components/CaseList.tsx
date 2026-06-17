// CaseList.tsx
// The landing screen: a register of case files, not a dashboard of
// metric cards. Each row is scannable for the one thing that matters —
// is this settled or does it need a human.

import { CaseFile, totalVariance, rulingLabel } from "@/lib/types";
import { ConfidenceBadge } from "./ConfidenceLadder";
import { Money, formatDate } from "./DataFigure";

export function CaseList({
  cases,
  onSelect,
}: {
  cases: CaseFile[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mx-auto max-w-[860px] px-6 py-12 sm:px-10">
      <header className="mb-10">
        <div className="mb-2 text-[12px] uppercase tracking-wide text-[var(--ink-faint)]">
          De Minimis Audit
        </div>
        <h1 className="font-serif-doc text-[34px] font-semibold leading-tight text-[var(--ink)] sm:text-[40px]">
          Your royalty case files
        </h1>
        <p className="mt-2 max-w-[560px] text-[15.5px] text-[var(--ink-soft)]">
          Each case compares what your lease entitles you to against
          what Texas production records and your check stubs show you
          were actually paid.
        </p>
      </header>

      <div className="mb-8 rounded-sm border border-dashed border-[var(--line-strong)] p-6 text-center">
        <p className="mb-3 text-[14.5px] text-[var(--ink-soft)]">
          Have a lease, division order, or check stubs to review?
        </p>
        <button className="rounded-sm border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-[13.5px] font-medium text-[var(--paper)] transition-opacity hover:opacity-90">
          Upload documents to start a new case
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {cases.map((c) => {
          const total = totalVariance(c.monthlyResults);
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="group flex w-full items-center justify-between rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] p-5 text-left transition-colors hover:border-[var(--line-strong)]"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-[12px] uppercase tracking-wide text-[var(--ink-faint)]">
                  Opened {formatDate(c.uploadedAt)} · {c.monthlyResults.length} months reviewed
                </div>
                <div className="font-serif-doc text-[18px] font-semibold text-[var(--ink)]">
                  {c.leaseName}
                </div>
                <div className="mt-1 text-[13.5px] text-[var(--ink-soft)]">
                  {rulingLabel(c.classification.ruling)}
                </div>
              </div>
              <div className="ml-6 flex flex-shrink-0 flex-col items-end gap-2">
                <span className="font-serif-doc text-[22px] font-semibold">
                  <Money
                    value={Math.abs(total)}
                    emphasis={total > 0 ? "alert" : total < 0 ? "normal" : "resolved"}
                  />
                </span>
                <ConfidenceBadge level={c.classification.confidence} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
