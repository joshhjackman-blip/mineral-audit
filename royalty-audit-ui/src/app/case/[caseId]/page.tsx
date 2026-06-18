"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { CaseRow } from "@/lib/case-store";
import { CaseFileView } from "@/components/CaseFileView";
import type { CaseFile } from "@/lib/types";

export default function CasePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get("payment") === "success";

  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCase() {
      try {
        const res = await fetch(`/api/cases/${caseId}`);
        if (res.status === 403) {
          setError("payment_required");
          return;
        }
        if (!res.ok) throw new Error("Case not found");
        const data = await res.json();
        setCaseRow(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load case");
      } finally {
        setLoading(false);
      }
    }
    fetchCase();
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--ink)]" />
      </div>
    );
  }

  if (error === "payment_required") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <p className="font-serif-doc text-[20px] font-semibold text-[var(--ink)]">Payment required</p>
        <p className="text-[14px] text-[var(--ink-soft)]">This report has not been unlocked yet.</p>
        <Link href={`/summary/${caseId}`} className="rounded-sm bg-[var(--ink)] px-6 py-2.5 text-[13.5px] font-medium text-[var(--paper)] hover:opacity-85">
          View your audit summary
        </Link>
      </div>
    );
  }

  if (error || !caseRow) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-[var(--alert)]">{error || "Case not found"}</p>
        <Link href="/" className="text-[13.5px] text-[var(--ink-soft)] hover:text-[var(--ink)]">← Back to home</Link>
      </div>
    );
  }

  const caseFile: CaseFile = {
    id: caseRow.id,
    ownerName: caseRow.owner_name,
    leaseName: caseRow.lease_name,
    districtNo: caseRow.district_no,
    leaseNo: caseRow.lease_no,
    apiNumber: caseRow.api_number,
    uploadedAt: caseRow.created_at.split("T")[0],
    extractionNotes: caseRow.extraction_notes ?? "",
    leaseFields: caseRow.lease_fields as CaseFile["leaseFields"],
    classification: caseRow.classification as CaseFile["classification"],
    monthlyResults: (caseRow.monthly_results as CaseFile["monthlyResults"]) ?? [],
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[860px] px-6 py-3 sm:px-10">
          <Link href="/" className="text-[13.5px] text-[var(--ink-soft)] hover:text-[var(--ink)]">
            ← Mineral Audit
          </Link>
        </div>
      </div>

      {paymentSuccess && (
        <div className="border-b border-[var(--resolved-border)] bg-[var(--resolved-tint)] px-6 py-3 text-center text-[14px] font-medium text-[var(--resolved)]">
          Payment confirmed — your full case file is now unlocked.
        </div>
      )}

      <CaseFileView caseFile={caseFile} />
    </div>
  );
}
