// CaseFileView.tsx
// The core screen: one lease's audit, presented as a sequence of stages
// (intake -> extraction -> classification -> calculation) rather than a
// dashboard of disconnected cards. Each stage is traceable back to the
// one before it.

import { CaseFile, flaggedMonthCount, rulingLabel, totalVariance } from "@/lib/types";
import { ConfidenceBadge, ConfidenceGate } from "./ConfidenceLadder";
import { ClauseCard } from "./ClauseCard";
import { Money, formatDate, formatMonth } from "./DataFigure";

export function CaseFileView({ caseFile }: { caseFile: CaseFile }) {
  const total = totalVariance(caseFile.monthlyResults);
  const flaggedCount = flaggedMonthCount(caseFile.monthlyResults);
  const isLowConfidence = caseFile.classification.confidence === "low";

  return (
    <div className="mx-auto max-w-[860px] px-6 py-12 sm:px-10">
      {/* Case header — reads like a document header, not a dashboard title */}
      <header className="mb-10 border-b border-[var(--line)] pb-8">
        <div className="mb-2 text-[12px] uppercase tracking-wide text-[var(--ink-faint)]">
          Case file {caseFile.id.toUpperCase()} · Opened {formatDate(caseFile.uploadedAt)}
        </div>
        <h1 className="font-serif-doc text-[32px] font-semibold leading-tight text-[var(--ink)] sm:text-[38px]">
          {caseFile.leaseName}
        </h1>
        <p className="mt-1 text-[15px] text-[var(--ink-soft)]">
          Mineral owner: {caseFile.ownerName}
        </p>
        <div className="mt-5 flex flex-wrap gap-6">
          <DocFact label="RRC District" value={caseFile.districtNo} />
          <DocFact label="Lease Number" value={caseFile.leaseNo} />
          <DocFact label="API Number" value={caseFile.apiNumber ?? "—"} />
          <DocFact
            label="Royalty Fraction"
            value={fractionLabel(caseFile.leaseFields.royalty_fraction)}
          />
        </div>
      </header>

      {/* Stage 1: Extraction */}
      <Stage number="01" title="Document Extraction">
        <p className="mb-4 text-[14.5px] text-[var(--ink-soft)]">
          The royalty clause was read from the uploaded lease and addendum.
          Quoted text is shown below for verification against the source
          document.
        </p>
        <div className="flex flex-col gap-3">
          <ClauseCard title="Base lease clause" clause={caseFile.leaseFields.base_clause} />
          {caseFile.leaseFields.addendum_clause && (
            <ClauseCard title="Addendum clause" clause={caseFile.leaseFields.addendum_clause} />
          )}
        </div>
        {caseFile.leaseFields.add_back_provision_present && (
          <div className="mt-3 rounded-sm border border-[var(--alert-border)] bg-[var(--alert-tint)] p-4">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--alert)]">
              Add-back provision detected
            </span>
            <blockquote className="mt-2 font-serif-doc text-[14px] italic text-[var(--ink-soft)]">
              &ldquo;{caseFile.leaseFields.add_back_provision_text}&rdquo;
            </blockquote>
          </div>
        )}
        <details className="mt-4 text-[13px] text-[var(--ink-soft)]">
          <summary className="cursor-pointer select-none font-medium text-[var(--ink)]">
            Extraction notes
          </summary>
          <p className="mt-2 leading-relaxed">{caseFile.extractionNotes}</p>
        </details>
      </Stage>

      {/* Stage 2: Classification */}
      <Stage number="02" title="Deduction Classification">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="font-serif-doc text-[20px] font-semibold text-[var(--ink)]">
            {rulingLabel(caseFile.classification.ruling)}
          </span>
          <ConfidenceBadge level={caseFile.classification.confidence} />
        </div>

        {caseFile.classification.citation && (
          <p className="mb-4 text-[13.5px] text-[var(--ink-soft)]">
            Citation: <span className="italic">{caseFile.classification.citation}</span>
          </p>
        )}

        <div className="flex flex-col gap-2">
          {caseFile.classification.notes.map((note, i) => (
            <p key={i} className="text-[14px] leading-relaxed text-[var(--ink-soft)]">
              {note}
            </p>
          ))}
        </div>

        {caseFile.classification.flags.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {caseFile.classification.flags.map((flag, i) => (
              <div
                key={i}
                className="rounded-sm border border-[var(--alert-border)] bg-[var(--alert-tint)] p-3 text-[13.5px] leading-relaxed text-[var(--alert)]"
              >
                {flag}
              </div>
            ))}
          </div>
        )}
      </Stage>

      {/* Stage 3: Calculation */}
      <Stage number="03" title="Monthly Calculation">
        <ConfidenceGate level={caseFile.classification.confidence}>
          <div className="mb-1 text-[13px] uppercase tracking-wide text-[var(--ink-faint)]">
            {isLowConfidence ? "Floor figure — true entitlement may differ" : "Cumulative variance"}
          </div>
          <div className="font-serif-doc text-[36px] font-semibold">
            <Money
              value={Math.abs(total)}
              emphasis={total > 0 ? "alert" : total < 0 ? "normal" : "resolved"}
            />
          </div>
          <p className="mt-1 text-[14px] text-[var(--ink-soft)]">
            {total > 0
              ? `Possible underpayment across ${flaggedCount} of ${caseFile.monthlyResults.length} months reviewed.`
              : "No underpayment detected across the months reviewed."}
          </p>
        </ConfidenceGate>

        <div className="mt-6 overflow-hidden rounded-sm border border-[var(--line)]">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--paper-raised)] text-left">
                <Th>Period</Th>
                <Th>Commodity</Th>
                <Th align="right">Expected</Th>
                <Th align="right">Actual</Th>
                <Th align="right">Variance</Th>
                <Th>Notes</Th>
              </tr>
            </thead>
            <tbody>
              {caseFile.monthlyResults.map((m, i) => {
                const hasFlag = m.flags.length > 0;
                return (
                  <tr
                    key={i}
                    className={`border-b border-[var(--line)] last:border-b-0 ${
                      hasFlag ? "bg-[var(--alert-tint)]" : ""
                    }`}
                  >
                    <Td>{formatMonth(m.period)}</Td>
                    <Td className="capitalize">{m.commodity}</Td>
                    <Td align="right" mono>
                      <Money value={m.expected_payment} />
                    </Td>
                    <Td align="right" mono>
                      <Money value={m.actual_payment} />
                    </Td>
                    <Td align="right" mono>
                      <Money
                        value={m.variance}
                        emphasis={m.variance > 0 ? "alert" : m.variance < 0 ? "normal" : "resolved"}
                      />
                    </Td>
                    <Td className="max-w-[220px]">
                      {m.flags.map((f, fi) => (
                        <div key={fi} className="text-[12.5px] text-[var(--alert)]">
                          {f}
                        </div>
                      ))}
                      {m.payment_was_late && (
                        <div className="text-[12.5px] text-[var(--caution)]">
                          Paid {m.days_late} days late
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Stage>

      {/* Stage 4: Next steps */}
      <Stage number="04" title="Next Steps" last>
        <NextSteps caseFile={caseFile} />
      </Stage>
    </div>
  );
}

function NextSteps({ caseFile }: { caseFile: CaseFile }) {
  const confidence = caseFile.classification.confidence;

  if (confidence === "low") {
    return (
      <div className="rounded-sm border-2 border-dashed border-[var(--alert-border)] bg-[var(--alert-tint)] p-5">
        <p className="text-[14.5px] leading-relaxed text-[var(--ink)]">
          This case involves lease language that does not cleanly match
          settled precedent, or includes a provision that may entitle you
          to more than the figures shown above. The numbers in this case
          file are a floor, not a final answer.
        </p>
        <p className="mt-3 text-[14.5px] font-medium text-[var(--alert)]">
          Recommended: have an oil and gas attorney or Certified Professional
          Landman review this case before taking any action.
        </p>
      </div>
    );
  }

  const nearestDeadline = caseFile.monthlyResults
    .map((m) => m.statute_of_limitations_deadline)
    .sort()[0];

  return (
    <div className="rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] p-5">
      <p className="text-[14.5px] leading-relaxed text-[var(--ink-soft)]">
        This classification matches a clearly decided case pattern. The
        figures above are a reasonable basis for raising the discrepancy
        with the operator directly, or for a more formal review.
      </p>
      <div className="mt-4 flex items-center gap-2 text-[13.5px]">
        <span className="text-[var(--ink-faint)]">Earliest statute of limitations deadline:</span>
        <span className="font-data text-[var(--ink)]">
          {formatDate(nearestDeadline)}
        </span>
      </div>
    </div>
  );
}

function Stage({
  number,
  title,
  children,
  last = false,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section className={`relative pl-10 ${last ? "pb-2" : "pb-12"}`}>
      {!last && (
        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-[var(--line)]" />
      )}
      <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] font-data text-[12px] text-[var(--ink-soft)]">
        {number}
      </div>
      <h2 className="mb-4 font-serif-doc text-[20px] font-semibold text-[var(--ink)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function DocFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">
        {label}
      </span>
      <span className="font-data text-[14px] text-[var(--ink)]">{value}</span>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  mono = false,
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-2.5 ${align === "right" ? "text-right" : "text-left"} ${
        mono ? "font-data" : ""
      } ${className}`}
    >
      {children}
    </td>
  );
}

function fractionLabel(fraction: number): string {
  // Render common oil & gas fractions in their conventional form
  const known: Record<number, string> = {
    0.125: "1/8",
    0.1875: "3/16",
    0.2: "1/5",
    0.25: "1/4",
  };
  const label = known[fraction];
  return label ? `${label} (${(fraction * 100).toFixed(2)}%)` : `${(fraction * 100).toFixed(2)}%`;
}
