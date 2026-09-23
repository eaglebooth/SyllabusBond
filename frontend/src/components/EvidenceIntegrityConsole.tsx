"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, FileWarning, LoaderCircle, ShieldCheck, XCircle } from "lucide-react";
import type { EnrollmentEvidence, Offering } from "@/lib/types";
import { formatCountdown, type IntegrityState, verifyRemoteSha256 } from "@/lib/integrity";

type EvidenceItem = {
  label: string;
  url: string;
  digest: string;
};

const stateMeta: Record<IntegrityState, { label: string; className: string }> = {
  "not-provided": { label: "Not provided", className: "badge-pending" },
  checking: { label: "Checking", className: "badge-pending" },
  verified: { label: "SHA-256 verified", className: "badge-verified" },
  mismatch: { label: "Digest mismatch", className: "badge-danger" },
  unavailable: { label: "Browser unavailable", className: "badge-pending" },
};

function EvidenceRow({ item }: { item: EvidenceItem }) {
  const [result, setResult] = useState<{ state: IntegrityState; actualDigest?: string; detail: string }>({
    state: item.url ? "checking" : "not-provided",
    detail: item.url ? "Fetching immutable source bytes…" : "No evidence committed for this source.",
  });

  useEffect(() => {
    let active = true;
    setResult({ state: item.url ? "checking" : "not-provided", detail: item.url ? "Fetching immutable source bytes…" : "No evidence committed for this source." });
    verifyRemoteSha256(item.url, item.digest).then((next) => active && setResult(next));
    return () => { active = false; };
  }, [item.url, item.digest]);

  const meta = stateMeta[result.state];
  const Icon = result.state === "verified" ? CheckCircle2 : result.state === "mismatch" ? XCircle : result.state === "checking" ? LoaderCircle : FileWarning;

  return (
    <article className="rounded-lg border border-[#e7e1d4] bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-xs text-[#1c1917]">{item.label}</strong>
        <span className={`badge-academic ${meta.className} inline-flex items-center gap-1`}>
          <Icon size={12} className={result.state === "checking" ? "animate-spin" : ""} /> {meta.label}
        </span>
      </div>
      {item.url ? (
        <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-mono text-[#1e3a8a] break-all hover:underline">
          {item.url} <ExternalLink size={11} className="shrink-0" />
        </a>
      ) : <p className="text-[11px] text-[#78716c]">No immutable URL committed.</p>}
      <div className="rounded bg-[#f6f3eb] px-3 py-2 font-mono text-[10px] break-all text-[#57534e]">
        Expected: {item.digest || "—"}
      </div>
      {result.actualDigest && result.state === "mismatch" && (
        <div className="rounded bg-red-50 px-3 py-2 font-mono text-[10px] break-all text-red-800">Actual: {result.actualDigest}</div>
      )}
      <p className="text-[11px] leading-relaxed text-[#78716c]">{result.detail}</p>
    </article>
  );
}

export function EvidenceIntegrityConsole({ offering, evidence, nowSeconds }: { offering: Offering; evidence: EnrollmentEvidence | null; nowSeconds: number }) {
  const items = useMemo<EvidenceItem[]>(() => [
    { label: "Locked offering terms", url: offering.terms_url, digest: offering.terms_digest },
    { label: "Organizer delivery packet", url: evidence?.delivery_url ?? "", digest: evidence?.delivery_digest ?? "" },
    { label: "Student dispute packet", url: evidence?.dispute_url ?? "", digest: evidence?.dispute_digest ?? "" },
    { label: "Stake-backed appeal packet", url: evidence?.appeal_url ?? "", digest: evidence?.appeal_digest ?? "" },
  ], [offering, evidence]);
  const deadlines = [
    ["Delivery deadline", offering.delivery_deadline],
    ["Challenge deadline", offering.challenge_deadline],
    ["Recovery deadline", offering.recovery_deadline],
  ] as const;

  return (
    <section className="card-ledger p-6 space-y-5" aria-labelledby="integrity-console-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-700">Independent verification</p>
          <h3 id="integrity-console-title" className="font-serif text-lg font-bold text-[#1c1917]">Evidence integrity & deadline console</h3>
          <p className="mt-1 text-xs text-[#57534e]">Browser checks are advisory; GenLayer validators re-fetch and hash the same bytes during adjudication.</p>
        </div>
        <ShieldCheck className="text-violet-700" size={24} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {deadlines.map(([label, deadline]) => (
          <div key={label} className="rounded-lg bg-[#f6f3eb] p-3 border border-[#e7e1d4]">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#78716c]">{label}</span>
            <strong className="mt-1 block font-mono text-sm text-[#1c1917]">{formatCountdown(nowSeconds, deadline)}</strong>
            <span className="mt-1 block text-[10px] text-[#78716c]">{new Date(deadline * 1000).toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">{items.map((item) => <EvidenceRow key={item.label} item={item} />)}</div>
    </section>
  );
}
