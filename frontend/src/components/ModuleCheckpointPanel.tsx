"use client";

import { useEffect, useState } from "react";
import type { Enrollment, ModuleCheckpoint, ModuleProgress, Offering } from "@/lib/types";
import { formatGen } from "@/lib/amount";
import { moduleProgressPercent, moduleTranche } from "@/lib/modules";
import { writeContract } from "@/lib/genlayer";

type Props = {
  offering: Offering;
  enrollment: Enrollment;
  progress: ModuleProgress;
  checkpoints: ModuleCheckpoint[];
  account: string;
  onRefresh: () => Promise<boolean>;
};

export function ModuleCheckpointPanel({ offering, enrollment, progress, checkpoints, account, onRefresh }: Props) {
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceDigest, setEvidenceDigest] = useState("");
  const [disputeUrl, setDisputeUrl] = useState("");
  const [disputeDigest, setDisputeDigest] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000));
  const isOrganizer = account.toLowerCase() === offering.organizer.toLowerCase();
  const isStudent = account.toLowerCase() === enrollment.student.toLowerCase();
  const current = checkpoints[progress.next_module];
  const complete = progress.next_module >= progress.module_count;
  const percent = moduleProgressPercent(progress.next_module, progress.module_count);
  const recoveryDue = progress.recovery_deadline > 0 && nowSeconds >= progress.recovery_deadline;
  const nextActor = complete ? "Complete" : current?.status === "REVIEW" ? "Student review" : current?.status === "DISPUTED" ? "Either party runs jury" : "Organizer submits evidence";
  const recoverySeconds = Math.max(0, progress.recovery_deadline - nowSeconds);

  useEffect(() => {
    const timer = window.setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function act(name: string, args: unknown[]) {
    setBusy(true);
    setMessage(`Submitting ${name}…`);
    const result = await writeContract(name, args);
    if (!result.success) setMessage(result.error || `${name} failed.`);
    else {
      const verified = await onRefresh();
      setMessage(verified ? "Transaction accepted and checkpoint state verified." : "Accepted, but state read-back is pending.");
    }
    setBusy(false);
  }

  return <section className="card-ledger p-6 space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#1e3a8a]">Progressive escrow</span>
        <h3 className="font-serif text-xl font-bold">Module checkpoints</h3>
        <p className="text-xs text-[#57534e]">Each accepted checkpoint releases only its earned tuition tranche.</p>
      </div>
      <div className="text-sm font-mono font-bold text-[#1e3a8a]">{progress.next_module}/{progress.module_count} · {percent}%</div>
    </div>
    <div className="h-2 rounded-full bg-[#e7e5e4] overflow-hidden"><div className="h-full bg-[#1e3a8a]" style={{ width: `${percent}%` }} /></div>
    <div className="grid sm:grid-cols-3 gap-3 text-xs">
      <div className="p-3 bg-[#f6f3eb] rounded"><span className="text-[#78716c] block">Released</span><strong>{formatGen(progress.released_amount)}</strong></div>
      <div className="p-3 bg-[#f6f3eb] rounded"><span className="text-[#78716c] block">Still protected</span><strong>{formatGen(progress.remaining_amount)}</strong></div>
      <div className="p-3 bg-[#f6f3eb] rounded"><span className="text-[#78716c] block">Next tranche</span><strong>{complete ? "Complete" : formatGen(moduleTranche(enrollment.fee, progress.next_module, progress.module_count))}</strong></div>
    </div>
    <div className="flex flex-wrap justify-between gap-2 rounded border border-[#e7e5e4] p-3 text-xs">
      <span><span className="text-[#78716c]">Next actor:</span> <strong>{nextActor}</strong></span>
      <span><span className="text-[#78716c]">Recovery:</span> <strong>{recoveryDue ? "available now" : `${recoverySeconds}s`}</strong></span>
    </div>
    <div className="grid gap-2 sm:grid-cols-3">
      {checkpoints.map((item) => <div key={item.module_index} className={`rounded border p-3 text-xs ${item.module_index === progress.next_module ? "border-[#1e3a8a] bg-blue-50" : "border-[#e7e5e4]"}`}>
        <strong>Module {item.module_index + 1}</strong><span className="block mt-1 text-[#57534e]">{item.status}</span>
      </div>)}
    </div>
    {!complete && isOrganizer && (!current || current.status === "NOT_SUBMITTED") && <div className="space-y-3 border-t pt-4">
      <h4 className="text-xs font-bold">Submit module {progress.next_module + 1} proof</h4>
      <input className="input-academic font-mono text-xs" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="Immutable IPFS or Arweave URL" />
      <input className="input-academic font-mono text-xs" value={evidenceDigest} onChange={(e) => setEvidenceDigest(e.target.value)} placeholder="sha256:…" />
      <button disabled={busy || !evidenceUrl || !evidenceDigest} className="btn-academic text-xs" onClick={() => act("submit_module_checkpoint", [BigInt(enrollment.id), BigInt(progress.next_module), evidenceUrl, evidenceDigest])}>Submit checkpoint</button>
    </div>}
    {!complete && isStudent && current?.status === "REVIEW" && <div className="space-y-3 border-t pt-4">
      <div className="flex gap-2"><button disabled={busy} className="btn-academic text-xs" onClick={() => act("accept_module_checkpoint", [BigInt(enrollment.id), BigInt(progress.next_module)])}>Accept & release tranche</button></div>
      <input className="input-academic font-mono text-xs" value={disputeUrl} onChange={(e) => setDisputeUrl(e.target.value)} placeholder="Immutable dispute URL" />
      <input className="input-academic font-mono text-xs" value={disputeDigest} onChange={(e) => setDisputeDigest(e.target.value)} placeholder="sha256:…" />
      <button disabled={busy || !disputeUrl || !disputeDigest} className="btn-secondary text-xs" onClick={() => act("dispute_module_checkpoint", [BigInt(enrollment.id), BigInt(progress.next_module), disputeUrl, disputeDigest])}>Dispute checkpoint</button>
    </div>}
    {!complete && (current?.status === "DISPUTED" || (current?.status === "REVIEW" && nowSeconds > current.review_deadline)) && <button disabled={busy} className="btn-academic text-xs" onClick={() => act("adjudicate_module_checkpoint", [BigInt(enrollment.id), BigInt(progress.next_module)])}>Run GenLayer module jury</button>}
    {!complete && isStudent && ["FUNDED", "MODULE_AWAITING"].includes(progress.status) && <button disabled={busy} className="btn-secondary text-xs" onClick={() => act("cancel_enrollment", [BigInt(enrollment.id)])}>Cancel and refund undelivered escrow</button>}
    {!complete && (isOrganizer || isStudent) && recoveryDue && !["ADJUDICATED", "APPEAL_PENDING", "APPEAL_RESOLVED"].includes(progress.status) && <button disabled={busy} className="btn-secondary text-xs" onClick={() => act("claim_recovery", [BigInt(enrollment.id)])}>Recover remaining timed-out escrow</button>}
    {message && <div className="notice-info text-xs">{message}</div>}
  </section>;
}
