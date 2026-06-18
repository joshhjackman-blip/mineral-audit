"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = "info" | "upload" | "submitting" | "submitted";

interface LeaseInfo {
  ownerName: string;
  ownerEmail: string;
  leaseName: string;
  districtNo: string;
  leaseNo: string;
  apiNumber: string;
  royaltyFraction: string;
  decimalInterest: string;
  operatorName: string;
  countyName: string;
  leaseDate: string;
  auditPeriodStart: string;
  auditPeriodEnd: string;
  additionalNotes: string;
}

interface UploadedFiles {
  lease: File | null;
  divisionOrder: File | null;
  checkStubs: File[];
  taxForms: File[];
}

const EMPTY_INFO: LeaseInfo = {
  ownerName: "",
  ownerEmail: "",
  leaseName: "",
  districtNo: "",
  leaseNo: "",
  apiNumber: "",
  royaltyFraction: "",
  decimalInterest: "",
  operatorName: "",
  countyName: "",
  leaseDate: "",
  auditPeriodStart: "",
  auditPeriodEnd: "",
  additionalNotes: "",
};

const DISTRICTS = [
  { value: "01", label: "01 — Austin" },
  { value: "02", label: "02 — Corpus Christi" },
  { value: "03", label: "03 — East Texas" },
  { value: "04", label: "04 — Lubbock" },
  { value: "05", label: "05 — Midland" },
  { value: "06", label: "06 — Odessa" },
  { value: "07", label: "07 — San Angelo" },
  { value: "07B", label: "07B — Abilene" },
  { value: "08", label: "08 — Amarillo" },
  { value: "09", label: "09 — Wichita Falls" },
  { value: "10", label: "10 — Kilgore" },
];

export default function StartPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [info, setInfo] = useState<LeaseInfo>(EMPTY_INFO);
  const [files, setFiles] = useState<UploadedFiles>({
    lease: null,
    divisionOrder: null,
    checkStubs: [],
    taxForms: [],
  });
  const [errors, setErrors] = useState<Partial<LeaseInfo>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function updateInfo(field: keyof LeaseInfo, value: string) {
    setInfo((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validateInfo(): boolean {
    const required: (keyof LeaseInfo)[] = [
      "ownerName", "ownerEmail", "leaseName", "districtNo",
      "leaseNo", "operatorName", "countyName",
    ];
    const newErrors: Partial<LeaseInfo> = {};
    required.forEach((f) => {
      if (!info[f].trim()) newErrors[f] = "This field is required";
    });
    if (info.ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.ownerEmail)) {
      newErrors.ownerEmail = "Enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validateInfo()) setStep("upload");
  }

  function handleFileChange(
    field: "lease" | "divisionOrder",
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0] ?? null;
    setFiles((prev) => ({ ...prev, [field]: file }));
  }

  function handleMultiFileChange(
    field: "checkStubs" | "taxForms",
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const incoming = Array.from(e.target.files ?? []);
    setFiles((prev) => ({ ...prev, [field]: [...prev[field], ...incoming] }));
  }

  function removeMultiFile(field: "checkStubs" | "taxForms", index: number) {
    setFiles((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitUpload) return;

    setStep("submitting");
    setSubmitError(null);

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: info.ownerName,
          ownerEmail: info.ownerEmail,
          leaseName: info.leaseName,
          operatorName: info.operatorName,
          countyName: info.countyName,
          districtNo: info.districtNo,
          leaseNo: info.leaseNo,
          apiNumber: info.apiNumber,
          royaltyFraction: info.royaltyFraction,
          decimalInterest: info.decimalInterest,
          leaseDate: info.leaseDate,
          auditPeriodStart: info.auditPeriodStart,
          auditPeriodEnd: info.auditPeriodEnd,
          additionalNotes: info.additionalNotes,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Failed to submit case");
      }

      const { caseId } = await res.json();

      const allFiles: { file: File; path: string }[] = [];
      if (files.lease) allFiles.push({ file: files.lease, path: `${caseId}/lease/${files.lease.name}` });
      if (files.divisionOrder) allFiles.push({ file: files.divisionOrder, path: `${caseId}/division-order/${files.divisionOrder.name}` });
      files.checkStubs.forEach((f) => allFiles.push({ file: f, path: `${caseId}/check-stubs/${f.name}` }));
      files.taxForms.forEach((f) => allFiles.push({ file: f, path: `${caseId}/tax-forms/${f.name}` }));

      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      await Promise.all(
        allFiles.map(({ file, path }) =>
          supabase.storage.from("case-documents").upload(path, file)
        )
      );

      router.push(`/summary/${caseId}`);
    } catch (err) {
      console.error("Submit error:", err);
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setStep("upload");
    }
  }

  const canSubmitUpload =
    files.lease !== null &&
    files.divisionOrder !== null &&
    files.checkStubs.length > 0;

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-[var(--line)] px-6 sm:px-10">
        <div className="mx-auto flex h-16 max-w-[760px] items-center justify-between">
          <Link href="/" className="font-serif-doc text-[17px] font-semibold text-[var(--ink)] hover:opacity-75">
            ← Mineral Audit
          </Link>
          {step !== "submitting" && step !== "submitted" && (
            <div className="flex items-center gap-3 text-[13px]">
              <StepPip active={step === "info"} done={["upload", "submitting", "submitted"].includes(step)} label="Lease info" />
              <div className="h-px w-6 bg-[var(--line)]" />
              <StepPip active={step === "upload"} done={["submitting", "submitted"].includes(step)} label="Documents" />
            </div>
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-[760px] px-6 py-12 sm:px-10">

        {/* Step 1: Lease info */}
        {step === "info" && (
          <form onSubmit={handleInfoSubmit} noValidate>
            <div className="mb-10">
              <div className="mb-2 text-[12px] uppercase tracking-wide text-[var(--ink-faint)]">Step 1 of 2</div>
              <h1 className="font-serif-doc text-[32px] font-semibold text-[var(--ink)]">About your lease</h1>
              <p className="mt-2 text-[15px] text-[var(--ink-soft)]">
                All of this information appears on your division order. If you do not have it handy, locate your division order before continuing.
              </p>
            </div>

            <Section title="Your information">
              <Row>
                <Field label="Your full name" required error={errors.ownerName}>
                  <Input value={info.ownerName} onChange={(v) => updateInfo("ownerName", v)} placeholder="Jane Smith" />
                </Field>
                <Field label="Email address" required error={errors.ownerEmail}>
                  <Input value={info.ownerEmail} onChange={(v) => updateInfo("ownerEmail", v)} placeholder="jane@example.com" type="email" />
                </Field>
              </Row>
            </Section>

            <Section title="Lease details">
              <Row>
                <Field label="Lease name" required error={errors.leaseName} hint="Printed on your division order, e.g. 'Smith A Unit'">
                  <Input value={info.leaseName} onChange={(v) => updateInfo("leaseName", v)} placeholder="Smith A Unit" />
                </Field>
                <Field label="Operator name" required error={errors.operatorName}>
                  <Input value={info.operatorName} onChange={(v) => updateInfo("operatorName", v)} placeholder="Pioneer Natural Resources" />
                </Field>
              </Row>
              <Row>
                <Field label="County" required error={errors.countyName}>
                  <Input value={info.countyName} onChange={(v) => updateInfo("countyName", v)} placeholder="Howard County" />
                </Field>
                <Field label="RRC District" required error={errors.districtNo} hint="2-character code on your division order">
                  <select
                    value={info.districtNo}
                    onChange={(e) => updateInfo("districtNo", e.target.value)}
                    className="w-full rounded-sm border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2.5 text-[14px] text-[var(--ink)] focus:border-[var(--ink)] focus:outline-none"
                  >
                    <option value="">Select district</option>
                    {DISTRICTS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </Field>
              </Row>
              <Row>
                <Field label="RRC Lease number" required error={errors.leaseNo} hint="Numeric, e.g. 054321">
                  <Input value={info.leaseNo} onChange={(v) => updateInfo("leaseNo", v)} placeholder="054321" mono />
                </Field>
                <Field label="API number" hint="Optional — 14-digit number on well completion reports">
                  <Input value={info.apiNumber} onChange={(v) => updateInfo("apiNumber", v)} placeholder="42-211-38845-0000" mono />
                </Field>
              </Row>
            </Section>

            <Section title="Royalty interest">
              <Row>
                <Field label="Royalty fraction" hint="From your lease, e.g. 1/8, 3/16, 1/5">
                  <Input value={info.royaltyFraction} onChange={(v) => updateInfo("royaltyFraction", v)} placeholder="3/16" />
                </Field>
                <Field label="Decimal interest" hint="From your division order, e.g. 0.03750000">
                  <Input value={info.decimalInterest} onChange={(v) => updateInfo("decimalInterest", v)} placeholder="0.03750000" mono />
                </Field>
              </Row>
              <Row>
                <Field label="Lease execution date" hint="Date the lease was signed">
                  <Input value={info.leaseDate} onChange={(v) => updateInfo("leaseDate", v)} type="date" />
                </Field>
              </Row>
            </Section>

            <Section title="Audit period">
              <p className="mb-4 text-[14px] text-[var(--ink-soft)]">
                Which months do you want audited? We can review up to 4 years back — the Texas statute of limitations on royalty recovery.
              </p>
              <Row>
                <Field label="From">
                  <Input value={info.auditPeriodStart} onChange={(v) => updateInfo("auditPeriodStart", v)} type="month" />
                </Field>
                <Field label="To">
                  <Input value={info.auditPeriodEnd} onChange={(v) => updateInfo("auditPeriodEnd", v)} type="month" />
                </Field>
              </Row>
            </Section>

            <Section title="Anything else we should know">
              <textarea
                value={info.additionalNotes}
                onChange={(e) => updateInfo("additionalNotes", e.target.value)}
                placeholder="Any concerns about specific deductions, months where payments seemed off, or other context that might help..."
                rows={4}
                className="w-full resize-none rounded-sm border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2.5 text-[14px] text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--ink)] focus:outline-none"
              />
            </Section>

            <div className="flex items-center justify-between pt-2">
              <Link href="/" className="text-[13.5px] text-[var(--ink-soft)] hover:text-[var(--ink)]">Cancel</Link>
              <button type="submit" className="rounded-sm bg-[var(--ink)] px-6 py-2.5 text-[13.5px] font-medium text-[var(--paper)] transition-opacity hover:opacity-85">
                Continue to documents →
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Document upload */}
        {step === "upload" && (
          <form onSubmit={handleUploadSubmit}>
            <div className="mb-10">
              <div className="mb-2 text-[12px] uppercase tracking-wide text-[var(--ink-faint)]">Step 2 of 2</div>
              <h1 className="font-serif-doc text-[32px] font-semibold text-[var(--ink)]">Upload your documents</h1>
              <p className="mt-2 text-[15px] text-[var(--ink-soft)]">
                Upload PDFs or images. Scanned documents are fine — legibility matters more than scan quality.
              </p>
            </div>

            {submitError && (
              <div className="mb-6 rounded-sm border border-[var(--alert-border)] bg-[var(--alert-tint)] px-4 py-3 text-[14px] text-[var(--alert)]">
                {submitError}
              </div>
            )}

            <div className="mb-6 rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] px-5 py-4 text-[14px] text-[var(--ink-soft)]">
              Auditing: <span className="font-semibold text-[var(--ink)]">{info.leaseName}</span>
              {" · "}District {info.districtNo}
              {" · "}Lease {info.leaseNo}
              {" · "}
              <button type="button" onClick={() => setStep("info")} className="text-[var(--ink)] underline underline-offset-2">Edit</button>
            </div>

            <div className="flex flex-col gap-4">
              <UploadZone label="Oil and gas lease" required hint="The original lease document containing the royalty clause." file={files.lease} onChange={(e) => handleFileChange("lease", e)} accept=".pdf,.jpg,.jpeg,.png,.tiff" />
              <UploadZone label="Division order" required hint="States your decimal interest per well." file={files.divisionOrder} onChange={(e) => handleFileChange("divisionOrder", e)} accept=".pdf,.jpg,.jpeg,.png,.tiff" />
              <MultiUploadZone label="Check stubs / owner statements" required hint="Upload one file per month, or a combined PDF. The more months the better." files={files.checkStubs} onChange={(e) => handleMultiFileChange("checkStubs", e)} onRemove={(i) => removeMultiFile("checkStubs", i)} accept=".pdf,.jpg,.jpeg,.png,.tiff" />
              <MultiUploadZone label="1099-MISC tax forms" hint="Optional. Useful as a cross-check on annual totals." files={files.taxForms} onChange={(e) => handleMultiFileChange("taxForms", e)} onRemove={(i) => removeMultiFile("taxForms", i)} accept=".pdf,.jpg,.jpeg,.png" />
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button type="button" onClick={() => setStep("info")} className="text-[13.5px] text-[var(--ink-soft)] hover:text-[var(--ink)]">← Back</button>
              <button type="submit" disabled={!canSubmitUpload} className="rounded-sm bg-[var(--ink)] px-6 py-2.5 text-[13.5px] font-medium text-[var(--paper)] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40">
                Submit for audit
              </button>
            </div>
            {!canSubmitUpload && (
              <p className="mt-3 text-right text-[13px] text-[var(--ink-faint)]">
                Upload your lease, division order, and at least one check stub to continue.
              </p>
            )}
          </form>
        )}

        {/* Submitting state */}
        {step === "submitting" && (
          <div className="py-20 text-center">
            <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--ink)]" />
            <h1 className="font-serif-doc text-[24px] font-semibold text-[var(--ink)]">Saving your documents</h1>
            <p className="mt-3 text-[15px] text-[var(--ink-soft)]">This will only take a moment.</p>
          </div>
        )}

      </div>
    </div>
  );
}

// ---- Sub-components (identical to previous version) ----

function StepPip({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${active ? "text-[var(--ink)]" : done ? "text-[var(--resolved)]" : "text-[var(--ink-faint)]"}`}>
      <div className={`h-2 w-2 rounded-full ${active ? "bg-[var(--ink)]" : done ? "bg-[var(--resolved)]" : "bg-[var(--line-strong)]"}`} />
      {label}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="mb-4 border-b border-[var(--line)] pb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{title}</div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--ink)]">
        {label}
        {required && <span className="text-[var(--alert)]">*</span>}
      </label>
      {hint && <p className="text-[12px] text-[var(--ink-faint)]">{hint}</p>}
      {children}
      {error && <p className="text-[12px] text-[var(--alert)]">{error}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", mono = false }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-sm border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2.5 text-[14px] text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--ink)] focus:outline-none ${mono ? "font-data" : ""}`}
    />
  );
}

function UploadZone({ label, required, hint, file, onChange, accept }: { label: string; required?: boolean; hint?: string; file: File | null; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; accept: string }) {
  return (
    <div className="rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[14.5px] font-semibold text-[var(--ink)]">{label}</span>
        {required && <span className="rounded-sm bg-[var(--ink)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--paper)]">Required</span>}
      </div>
      {hint && <p className="mb-3 text-[13px] text-[var(--ink-soft)]">{hint}</p>}
      {file ? (
        <div className="flex items-center gap-3 rounded-sm border border-[var(--resolved-border)] bg-[var(--resolved-tint)] px-3 py-2">
          <span className="text-[13px] font-medium text-[var(--resolved)]">✓</span>
          <span className="font-data text-[13px] text-[var(--ink)]">{file.name}</span>
          <span className="ml-auto text-[12px] text-[var(--ink-faint)]">{(file.size / 1024).toFixed(0)} KB</span>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center rounded-sm border border-dashed border-[var(--line-strong)] px-4 py-6 text-center transition-colors hover:border-[var(--ink)]">
          <div>
            <p className="text-[14px] font-medium text-[var(--ink)]">Click to upload</p>
            <p className="mt-1 text-[12px] text-[var(--ink-faint)]">PDF, JPG, PNG, TIFF</p>
          </div>
          <input type="file" accept={accept} onChange={onChange} className="hidden" />
        </label>
      )}
    </div>
  );
}

function MultiUploadZone({ label, required, hint, files, onChange, onRemove, accept }: { label: string; required?: boolean; hint?: string; files: File[]; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onRemove: (index: number) => void; accept: string }) {
  return (
    <div className="rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-[14.5px] font-semibold text-[var(--ink)]">{label}</span>
        {required && <span className="rounded-sm bg-[var(--ink)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--paper)]">Required</span>}
      </div>
      {hint && <p className="mb-3 text-[13px] text-[var(--ink-soft)]">{hint}</p>}
      {files.length > 0 && (
        <div className="mb-3 flex flex-col gap-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 rounded-sm border border-[var(--resolved-border)] bg-[var(--resolved-tint)] px-3 py-2">
              <span className="text-[13px] font-medium text-[var(--resolved)]">✓</span>
              <span className="font-data text-[13px] text-[var(--ink)]">{f.name}</span>
              <span className="ml-auto text-[12px] text-[var(--ink-faint)]">{(f.size / 1024).toFixed(0)} KB</span>
              <button type="button" onClick={() => onRemove(i)} className="text-[12px] text-[var(--ink-faint)] hover:text-[var(--alert)]">Remove</button>
            </div>
          ))}
        </div>
      )}
      <label className="flex cursor-pointer items-center justify-center rounded-sm border border-dashed border-[var(--line-strong)] px-4 py-5 text-center transition-colors hover:border-[var(--ink)]">
        <div>
          <p className="text-[14px] font-medium text-[var(--ink)]">{files.length > 0 ? "Add more files" : "Click to upload"}</p>
          <p className="mt-1 text-[12px] text-[var(--ink-faint)]">PDF, JPG, PNG, TIFF — multiple files allowed</p>
        </div>
        <input type="file" accept={accept} onChange={onChange} className="hidden" multiple />
      </label>
    </div>
  );
}
