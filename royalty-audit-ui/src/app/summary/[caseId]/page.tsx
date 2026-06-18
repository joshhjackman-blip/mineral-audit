"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { confidenceLabel, confidenceColor, formatDate } from "@/lib/format";
import type { CaseSummary } from "@/lib/case-store";

export default function SummaryPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentCancelled = searchParams.get("payment") === "cancelled";

  const [summary, setSummary] = useState<CaseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch(`/api/cases/${caseId}/summary`);
        if (!res.ok) throw new Error("Case not found");
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load case");
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, [caseId]);

  useEffect(() => {
    if (summary?.payment_status === "paid") {
      router.replace(`/case/${caseId}`);
    }
  }, [summary, caseId, router]);

  async function handleUnlock() {
    setCheckingOut(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const { url, error: checkoutError } = await res.json();
      if (checkoutError) throw new Error(checkoutError);
      if (!url) throw new Error("Checkout URL missing from response");

      window.location.href = url;
    } catch (err) {
      console.error("Checkout error:", err);
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--ink)]" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-[var(--alert)]">{error || "Case not found"}</p>
        <Link href="/" className="text-[13.5px] text-[var(--ink-soft)] hover:text-[var(--ink)]">← Back to home</Link>
      </div>
    );
  }

  const varianceFound = summary.variance_detected === true;

  return (
    <div className="min-h-screen">
      <nav className="border-b border-[var(--line)] px-6 sm:px-10">
        <div className="mx-auto flex h-16 max-w-[760px] items-center">
          <Link href="/" className="font-serif-doc text-[17px] font-semibold text-[var(--ink)] hover:opacity-75">
            Mineral Audit
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-[760px] px-6 py-12 sm:px-10">

        {paymentCancelled && (
          <div className="mb-8 rounded-sm border border-[var(--caution-border)] bg-[var(--caution-tint)] px-4 py-3 text-[14px] text-[var(--caution)]">
            Payment was not completed. Your audit results are still here whenever you are ready.
          </div>
        )}

        {/* Header */}
        <div className="mb-8 border-b border-[var(--line)] pb-8">
          <div className="mb-2 text-[12px] uppercase tracking-wide text-[var(--ink-faint)]">
            Audit summary
          </div>
          <h1 className="font-serif-doc text-[32px] font-semibold leading-tight text-[var(--ink)]">
            {summary.lease_name}
          </h1>
          <p className="mt-1 text-[14px] text-[var(--ink-soft)]">
            {summary.months_reviewed} months reviewed
          </p>
        </div>

        {/* Free summary — what we found */}
        <div className="mb-8 flex flex-col gap-4">

          {/* Variance detected */}
          <div className={`rounded-sm border p-5 ${varianceFound ? "border-[var(--alert-border)] bg-[var(--alert-tint)]" : "border-[var(--resolved-border)] bg-[var(--resolved-tint)]"}`}>
            <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
              Variance detected
            </div>
            <div className={`font-serif-doc text-[24px] font-semibold ${varianceFound ? "text-[var(--alert)]" : "text-[var(--resolved)]"}`}>
              {varianceFound ? "Yes — a discrepancy was found" : "No discrepancy detected"}
            </div>
            <p className="mt-2 text-[14px] text-[var(--ink-soft)]">
              {varianceFound
                ? "Our analysis found a difference between what your lease entitles you to and what the production records show you were paid. Unlock the full report to see the month-by-month breakdown and the exact dollar amount."
                : "Based on the documents provided, your payments appear to match what your lease and the state production records support for the period reviewed."}
            </p>
          </div>

          {/* Confidence level */}
          <div className="rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] p-5">
            <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Confidence level</div>
            <div className={`font-serif-doc text-[20px] font-semibold ${confidenceColor(summary.confidence_level)}`}>
              {confidenceLabel(summary.confidence_level)}
            </div>
            <p className="mt-2 text-[14px] text-[var(--ink-soft)]">
              {summary.confidence_level === "high" && "Your lease language closely matches settled Texas case law. The full report includes the specific case citation behind this finding."}
              {summary.confidence_level === "medium" && "Your lease language partially matches prior case patterns. The full report explains where it deviates and what that means."}
              {summary.confidence_level === "low" && "Your lease contains a provision that may entitle you to more than a standard calculation shows. The full report flags this for attorney review."}
              {!summary.confidence_level && "Analysis is pending."}
            </p>
          </div>

          {/* Statute of limitations */}
          {summary.earliest_sol_deadline && (
            <div className="rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] p-5">
              <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Statute of limitations deadline</div>
              <div className="font-data text-[20px] font-semibold text-[var(--ink)]">
                {formatDate(summary.earliest_sol_deadline)}
              </div>
              <p className="mt-2 text-[14px] text-[var(--ink-soft)]">
                Under Texas law, you have 4 years from the date a payment was due to recover unpaid royalties. After this date, the right to collect is gone regardless of the amount owed.
              </p>
            </div>
          )}
        </div>

        {/* Paywall */}
        {varianceFound && (
          <div className="rounded-sm border-2 border-[var(--ink)] p-6">
            <div className="mb-4">
              <div className="font-serif-doc text-[22px] font-semibold text-[var(--ink)]">
                Unlock your full case file
              </div>
              <p className="mt-2 text-[14px] text-[var(--ink-soft)]">
                See exactly how much you may be owed, month by month, with the lease language and case law that supports the finding.
              </p>
            </div>
            <ul className="mb-6 flex flex-col gap-2">
              {[
                "Month-by-month variance breakdown with exact dollar figures",
                "The specific lease clause and case law citation",
                "Late payment identification with dates",
                "Pre-populated demand letter ready to send",
                "Attorney referral if you want professional representation",
                "Downloadable PDF of the complete case file",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13.5px] text-[var(--ink-soft)]">
                  <span className="mt-0.5 text-[var(--resolved)]">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={handleUnlock}
                disabled={checkingOut}
                className="rounded-sm bg-[var(--ink)] px-8 py-3 text-[14px] font-semibold text-[var(--paper)] transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                {checkingOut ? "Redirecting to payment…" : "Unlock for $79"}
              </button>
              <span className="text-[13px] text-[var(--ink-faint)]">One-time payment · No subscription</span>
            </div>
          </div>
        )}

        {/* No variance — still offer full report */}
        {!varianceFound && (
          <div className="rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] p-6">
            <div className="font-serif-doc text-[18px] font-semibold text-[var(--ink)] mb-2">
              Want the full documentation?
            </div>
            <p className="text-[14px] text-[var(--ink-soft)] mb-4">
              The full case file includes the complete month-by-month breakdown confirming your payments, the lease clause analysis, and a signed PDF you can keep on file.
            </p>
            <button
              onClick={handleUnlock}
              disabled={checkingOut}
              className="rounded-sm border border-[var(--ink)] px-6 py-2.5 text-[13.5px] font-medium text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)] disabled:opacity-50"
            >
              {checkingOut ? "Redirecting…" : "Get full report for $79"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
