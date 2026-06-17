"use client";

import { useState } from "react";
import { allCases } from "@/lib/mock-data";
import { CaseList } from "@/components/CaseList";
import { CaseFileView } from "@/components/CaseFileView";

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedCase = selectedId
    ? allCases.find((c) => c.id === selectedId) ?? null
    : null;

  return (
    <div className="min-h-screen">
      {selectedCase && (
        <div className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-sm">
          <div className="mx-auto max-w-[860px] px-6 py-3 sm:px-10">
            <button
              onClick={() => setSelectedId(null)}
              className="text-[13.5px] text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              ← All case files
            </button>
          </div>
        </div>
      )}

      {selectedCase ? (
        <CaseFileView caseFile={selectedCase} />
      ) : (
        <CaseList cases={allCases} onSelect={setSelectedId} />
      )}
    </div>
  );
}
