"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">

      {/* Nav */}
      <nav className="border-b border-[var(--line)] px-6 sm:px-10">
        <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif-doc text-[18px] font-semibold text-[var(--ink)]">
              Mineral Audit
            </span>
            <span className="rounded-sm bg-[var(--paper-raised)] px-2 py-0.5 text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">
              Texas
            </span>
          </div>
          <Link
            href="/start"
            className="rounded-sm bg-[var(--ink)] px-4 py-2 text-[13px] font-medium text-[var(--paper)] transition-opacity hover:opacity-85"
          >
            Start your audit
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-[var(--line)] px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-[960px]">
          <div className="mb-4 text-[12px] uppercase tracking-wide text-[var(--ink-faint)]">
            For Texas mineral and royalty owners
          </div>
          <h1 className="font-serif-doc text-[40px] font-semibold leading-tight text-[var(--ink)] sm:text-[54px]">
            Are you being paid<br className="hidden sm:block" /> what your lease says you are?
          </h1>
          <p className="mt-6 max-w-[580px] text-[17px] leading-relaxed text-[var(--ink-soft)]">
            Most mineral owners never check. Operators routinely deduct gathering,
            transportation, and processing fees from royalty checks — often without
            the legal right to do so. Mineral Audit compares your lease terms against
            actual Texas production records and tells you exactly where you stand.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/start"
              className="rounded-sm bg-[var(--ink)] px-6 py-3 text-[14px] font-medium text-[var(--paper)] transition-opacity hover:opacity-85"
            >
              Start your free audit
            </Link>
            <a
              href="#how-it-works"
              className="rounded-sm border border-[var(--line-strong)] px-6 py-3 text-[14px] font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink)]"
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-[var(--line)] px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-[960px]">
          <div className="grid gap-10 sm:grid-cols-3">
            <Stat figure="~40%" label="Of royalty checks contain at least one pricing or deduction error" />
            <Stat figure="4 years" label="The Texas statute of limitations on recovering unpaid royalties" />
            <Stat figure="$0" label="What most mineral owners spend verifying their payments today" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-[var(--line)] px-6 py-16 sm:px-10" id="how-it-works">
        <div className="mx-auto max-w-[960px]">
          <div className="mb-12">
            <div className="mb-2 text-[12px] uppercase tracking-wide text-[var(--ink-faint)]">The process</div>
            <h2 className="font-serif-doc text-[30px] font-semibold text-[var(--ink)]">How a Mineral Audit works</h2>
          </div>
          <div className="ml-4 flex flex-col">
            <Step number="01" title="You tell us about your lease" body="Enter your lease name, district, and lease number — all of which appear on your division order. No guesswork required. This takes about two minutes." />
            <Step number="02" title="Upload your documents" body="Upload your lease, division order, and recent check stubs. We read the royalty clause from your actual lease — not a generic template — so the analysis reflects your specific terms." />
            <Step number="03" title="We compare your payments against state records" body="We cross-reference what you were paid against what the Texas Railroad Commission says your lease actually produced. If deductions were taken that your lease does not allow, we flag them with the specific case law that applies." />
            <Step number="04" title="You get a case file with clear next steps" body="You receive a month-by-month variance report showing exactly where discrepancies exist and how long you have to act before the statute of limitations closes. High-confidence findings come with a citation. Anything requiring an attorney is clearly labeled." last />
          </div>
        </div>
      </section>

      {/* What we look for */}
      <section className="border-b border-[var(--line)] px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-[960px]">
          <div className="mb-10">
            <div className="mb-2 text-[12px] uppercase tracking-wide text-[var(--ink-faint)]">What we check</div>
            <h2 className="font-serif-doc text-[30px] font-semibold text-[var(--ink)]">The most common ways mineral owners are underpaid</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FindingCard title="Improper deductions" body="Gathering, transportation, compression, and processing fees deducted from your check when your lease says they should not be. This is the most common source of underpayment." />
            <FindingCard title="Wrong decimal interest" body="Your division order states your exact ownership share. If the operator uses a different number, every payment is wrong. Often a small error, but it compounds over years." />
            <FindingCard title="Below-market pricing" body="Operators sometimes sell production to affiliated companies at below-market prices, which lowers your royalty base. We compare reported prices against published Texas benchmarks." />
            <FindingCard title="Late payments" body="Texas law requires royalty payments within 60 to 90 days of the end of each production month. Late payments may entitle you to interest. We flag every month paid outside that window." />
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="border-b border-[var(--line)] px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-[960px]">
          <div className="mb-10">
            <div className="mb-2 text-[12px] uppercase tracking-wide text-[var(--ink-faint)]">What to have ready</div>
            <h2 className="font-serif-doc text-[30px] font-semibold text-[var(--ink)]">Documents you will need</h2>
          </div>
          <div className="flex flex-col gap-3">
            <DocumentItem required title="Your oil and gas lease" body="The original lease document. The royalty clause tells us whether deductions are permitted and how your royalty is calculated. Scanned PDFs are fine." />
            <DocumentItem required title="Division order" body="States your exact decimal interest per well. Usually a one or two page document from the operator. This is where your ownership percentage is formally recorded." />
            <DocumentItem required title="Check stubs or owner statements" body="Monthly royalty statements from the operator, covering the period you want audited. The last 12 to 24 months is a good starting point." />
            <DocumentItem title="1099-MISC tax forms" body="Optional but helpful as a cross-check against your monthly statements. Not required to start an audit." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 sm:px-10">
        <div className="mx-auto max-w-[960px] text-center">
          <h2 className="font-serif-doc text-[32px] font-semibold text-[var(--ink)]">Ready to find out what you are owed?</h2>
          <p className="mx-auto mt-4 max-w-[480px] text-[16px] text-[var(--ink-soft)]">
            Start by telling us about your lease. The intake form takes about two minutes, then you upload your documents and we handle the rest.
          </p>
          <Link href="/start" className="mt-8 inline-block rounded-sm bg-[var(--ink)] px-8 py-3.5 text-[14px] font-medium text-[var(--paper)] transition-opacity hover:opacity-85">
            Start your free audit
          </Link>
          <p className="mt-4 text-[13px] text-[var(--ink-faint)]">Your documents are used only to run your audit and are never shared.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] px-6 py-10 sm:px-10">
        <div className="mx-auto flex max-w-[960px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-serif-doc text-[16px] font-semibold text-[var(--ink)]">Mineral Audit</span>
          <p className="max-w-[480px] text-[13px] leading-relaxed text-[var(--ink-faint)]">
            Mineral Audit is a document analysis tool, not a law firm. Results flagged as low confidence or involving add-back provisions should be reviewed by a licensed oil and gas attorney before taking any action.
          </p>
          <a href="mailto:joshjackman@de-minimis.ai" className="text-[13px] text-[var(--ink-soft)] hover:text-[var(--ink)]">
            joshjackman@de-minimis.ai
          </a>
        </div>
      </footer>

    </div>
  );
}

function Stat({ figure, label }: { figure: string; label: string }) {
  return (
    <div>
      <div className="font-serif-doc text-[38px] font-semibold text-[var(--alert)]">{figure}</div>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-soft)]">{label}</p>
    </div>
  );
}

function Step({
  number,
  title,
  body,
  last = false,
}: {
  number: string;
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <div className={`relative flex gap-8 pb-10 pl-6 ${last ? "" : "border-l border-[var(--line)]"}`}>
      <div className="absolute -left-4 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper)] font-data text-[12px] text-[var(--ink-faint)]">
        {number}
      </div>
      <div>
        <h3 className="font-serif-doc text-[19px] font-semibold text-[var(--ink)]">{title}</h3>
        <p className="mt-2 max-w-[580px] text-[15px] leading-relaxed text-[var(--ink-soft)]">{body}</p>
      </div>
    </div>
  );
}

function FindingCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] p-5">
      <h3 className="font-serif-doc text-[17px] font-semibold text-[var(--ink)]">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-soft)]">{body}</p>
    </div>
  );
}

function DocumentItem({
  title,
  body,
  required = false,
}: {
  title: string;
  body: string;
  required?: boolean;
}) {
  return (
    <div className="flex gap-4 rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] p-5">
      <div className="mt-0.5 flex-shrink-0">
        {required ? (
          <span className="inline-block rounded-sm bg-[var(--ink)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--paper)]">Required</span>
        ) : (
          <span className="inline-block rounded-sm border border-[var(--line-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Optional</span>
        )}
      </div>
      <div>
        <h3 className="font-serif-doc text-[17px] font-semibold text-[var(--ink)]">{title}</h3>
        <p className="mt-1 text-[14px] leading-relaxed text-[var(--ink-soft)]">{body}</p>
      </div>
    </div>
  );
}
