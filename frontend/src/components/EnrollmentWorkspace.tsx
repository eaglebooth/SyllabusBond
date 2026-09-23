"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Offering, Enrollment, EnrollmentEvidence } from "@/lib/types";
import { transactionExplorerUrl, writeContract } from "@/lib/genlayer";
import { asGenBigInt, formatGen } from "@/lib/amount";
import { EvidenceIntegrityConsole } from "@/components/EvidenceIntegrityConsole";

type EnrollmentWorkspaceProps = {
  offering: Offering;
  enrollment: Enrollment;
  evidence: EnrollmentEvidence | null;
  account: string;
  onRefresh: () => Promise<boolean>;
  onBack: () => void;
};

export const EnrollmentWorkspace: React.FC<EnrollmentWorkspaceProps> = ({
  offering,
  enrollment,
  evidence,
  account,
  onRefresh,
  onBack,
}) => {
  const isOrganizer = account.toLowerCase() === offering.organizer.toLowerCase();
  const isStudent = account.toLowerCase() === enrollment.student.toLowerCase();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [lastTxHash, setLastTxHash] = useState("");
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = window.setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Evidence Inputs - Clear, clean empty defaults with valid placeholders
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [deliveryDigest, setDeliveryDigest] = useState("");

  const [disputeUrl, setDisputeUrl] = useState("");
  const [disputeDigest, setDisputeDigest] = useState("");
  const [appealUrl, setAppealUrl] = useState("");
  const [appealDigest, setAppealDigest] = useState("");

  const feeFormatted = formatGen(enrollment.fee);
  const challengeDue = nowSeconds >= offering.challenge_deadline;
  const effectiveRecoveryDeadline = asGenBigInt(enrollment.appeal_stake) > BigInt(0)
    ? enrollment.appeal_recovery_deadline
    : offering.recovery_deadline;
  const recoveryDue = nowSeconds >= effectiveRecoveryDeadline;
  const appealWindowOpen = enrollment.appeal_deadline > 0 && nowSeconds <= enrollment.appeal_deadline;
  const deliveryOpen = nowSeconds <= offering.delivery_deadline;
  const appealStake = (() => {
    return (asGenBigInt(enrollment.fee) + BigInt(9)) / BigInt(10);
  })();
  const txExplorerUrl = lastTxHash ? transactionExplorerUrl(lastTxHash) : "";

  const handleAction = async (fnName: string, args: unknown[] = [], val = BigInt(0)) => {
    setLoading(true);
    setErrorMsg("");
    setStatusMsg(`Submitting transaction: ${fnName}...`);
    setLastTxHash("");

    try {
      const res = await writeContract(fnName, args, val);
      if (res.success) {
        if (res.hash) setLastTxHash(res.hash);
        setStatusMsg("Transaction accepted. Verifying authoritative state...");
        const verified = await onRefresh();
        if (!verified) {
          setErrorMsg("Transaction was accepted, but authoritative read-back failed. Verify the transaction before continuing.");
          return;
        }
        setStatusMsg("Transaction accepted and state read back from the contract.");
      } else {
        if (res.hash) setLastTxHash(res.hash);
        setErrorMsg(res.error || `Failed to execute ${fnName}.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : `Error during ${fnName}.`);
    } finally {
      setLoading(false);
    }
  };

  // State Timeline Definition
  const timelineStages = [
    { key: "FUNDED", label: "Tuition Escrowed" },
    { key: "CHALLENGE_WINDOW", label: "Evidence & Challenge" },
    { key: "READY_FOR_REVIEW", label: "Ready for Jury" },
    { key: "ADJUDICATED", label: "AI Verdict" },
    { key: "SETTLED", label: "Settlement" },
  ];

  const getStageIndex = (st: string) => {
    switch (st) {
      case "FUNDED": return 0;
      case "CHALLENGE_WINDOW": return 1;
      case "READY_FOR_REVIEW": return 2;
      case "ADJUDICATED": return 3;
      case "APPEAL_PENDING": return 3;
      case "APPEAL_RESOLVED": return 3;
      case "RECOVERY_WAIT": return 3;
      case "SETTLED":
      case "RECOVERED":
      case "CANCELLED": return 4;
      default: return 0;
    }
  };

  const currentStageIdx = getStageIndex(enrollment.status);

  return (
    <div className="space-y-6 w-full">
      {/* Top Header Card */}
      <div className="card-ledger p-6 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-xs font-semibold text-[#1e3a8a] hover:underline cursor-pointer"
          >
            ← Back to all offerings
          </button>
          <span
            className={`badge-academic ${
              enrollment.status === "SETTLED" || enrollment.status === "RECOVERED"
                ? "badge-verified"
                : enrollment.status === "CANCELLED"
                ? "badge-danger"
                : "badge-pending"
            }`}
          >
            Status: {enrollment.status}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t">
          <div>
            <span className="font-mono text-xs text-[#78716c] uppercase">
              Enrollment #{enrollment.id} • Offering #{offering.id} ({offering.course_id})
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#1c1917] mt-0.5">
              {offering.title}
            </h2>
          </div>

          <div className="text-left md:text-right">
            <span className="text-[11px] text-[#78716c] uppercase font-semibold block">
              Held in Escrow
            </span>
            <span className="font-mono text-xl font-bold text-[#1e3a8a]">
              {feeFormatted}
            </span>
          </div>
        </div>

        {/* User Role Banner */}
        <div className="p-3 bg-[#f6f3eb] rounded border border-[#eae5d9] text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[#78716c]">Active Session:</span>
            <span className="font-semibold text-[#1c1917]">
              {isOrganizer
                ? "Organizer (Authorized)"
                : isStudent
                ? "Enrolled Student (Authorized)"
                : "Observer Mode (Read-Only)"}
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#78716c]">
            {account ? `${account.slice(0, 10)}...${account.slice(-6)}` : "Wallet Not Connected"}
          </span>
        </div>
      </div>

      {/* Horizontal Lifecycle Timeline */}
      <div className="card-ledger p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
          Escrow Progress Timeline
        </h3>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          {timelineStages.map((stage, idx) => {
            const isCompleted = idx < currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            return (
              <div key={stage.key} className="timeline-step">
                <div
                  className={`timeline-dot ${
                    isCompleted
                      ? "timeline-dot-completed"
                      : isCurrent
                      ? "timeline-dot-current"
                      : "timeline-dot-upcoming"
                  }`}
                >
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isCurrent
                      ? "text-[#1e3a8a] font-bold"
                      : isCompleted
                      ? "text-[#166534]"
                      : "text-[#78716c]"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction Feedback */}
      {errorMsg && (
        <div className="notice-danger space-y-1">
          <strong className="font-semibold block">Action Error</strong>
          <p>{errorMsg}</p>
          {lastTxHash && <a href={txExplorerUrl} target="_blank" rel="noreferrer" className="font-mono text-[11px] block mt-1 underline">Inspect transaction: {lastTxHash}</a>}
        </div>
      )}

      {statusMsg && !errorMsg && (
        <div className="notice-info space-y-1">
          <p className="font-mono text-xs">{statusMsg}</p>
          {lastTxHash && <a href={txExplorerUrl} target="_blank" rel="noreferrer" className="font-mono text-[11px] block text-[#1e3a8a] underline">Inspect transaction: {lastTxHash}</a>}
        </div>
      )}

      {/* Primary Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Action Panel (2 Columns) */}
        <div className="lg:col-span-2 card-ledger p-6 space-y-5">
          <h3 className="font-serif text-lg font-bold text-[#1c1917] border-b pb-3">
            Lifecycle Action Required
          </h3>

          {/* Phase 1: FUNDED */}
          {enrollment.status === "FUNDED" && (
            <div className="space-y-4">
              <p className="text-xs text-[#57534e] leading-relaxed">
                Tuition deposit is locked in escrow. The organizer must complete scheduled course sessions and submit the public delivery proof packet to open the challenge window.
              </p>

              {isOrganizer ? (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1">
                      Delivery Proof Document URL (IPFS or Arweave)
                    </label>
                    <input
                      type="text"
                      placeholder="https://arweave.net/... or https://ipfs.io/ipfs/..."
                      value={deliveryUrl}
                      onChange={(e) => setDeliveryUrl(e.target.value)}
                      className="input-academic font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1">
                      Delivery Evidence SHA-256 Digest
                    </label>
                    <input
                      type="text"
                      placeholder="sha256:..."
                      value={deliveryDigest}
                      onChange={(e) => setDeliveryDigest(e.target.value)}
                      className="input-academic font-mono text-xs"
                    />
                    <p className="text-[12px] text-[#78716c] mt-1">
                      Digest of raw delivery proof. GenLayer re-verifies these bytes before consensus evaluation.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      handleAction("submit_delivery_evidence", [
                        BigInt(enrollment.id),
                        deliveryUrl,
                        deliveryDigest,
                      ])
                    }
                    disabled={loading || !deliveryOpen || !deliveryUrl || !deliveryDigest}
                    className="btn-academic text-xs w-full mt-2"
                  >
                    {loading ? "Submitting Evidence..." : !deliveryOpen ? "Delivery deadline has passed" : "Submit Delivery Evidence & Open Challenge"}
                  </button>
                </div>
              ) : isStudent ? (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-[#f6f3eb] rounded border border-[#eae5d9] text-xs text-[#57534e]">
                    Awaiting organizer delivery. You have the right to cancel your enrollment and recover full tuition before delivery proof is submitted.
                  </div>
                  <button
                    onClick={() => handleAction("cancel_enrollment", [BigInt(enrollment.id)])}
                    disabled={loading}
                    className="btn-danger text-xs w-full"
                  >
                    Cancel Enrollment & Reclaim Full Tuition
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-[#f6f3eb] rounded text-xs text-[#78716c]">
                  Observer Mode: Awaiting organizer to complete sessions and submit delivery proof.
                </div>
              )}
            </div>
          )}

          {/* Phase 2: CHALLENGE_WINDOW */}
          {enrollment.status === "CHALLENGE_WINDOW" && (
            <div className="space-y-4">
              <div className="notice-warning">
                <strong>Challenge Window Open</strong>
                <p className="mt-0.5 text-xs">
                  Delivery proof submitted. The student may submit dispute documentation if topics were dropped or the instructor was changed without consent.
                </p>
              </div>

              {isStudent ? (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1">
                      Dispute Evidence URL (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="https://arweave.net/... or https://ipfs.io/ipfs/..."
                      value={disputeUrl}
                      onChange={(e) => setDisputeUrl(e.target.value)}
                      className="input-academic font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1">
                      Dispute Evidence Digest (SHA-256)
                    </label>
                    <input
                      type="text"
                      placeholder="sha256:..."
                      value={disputeDigest}
                      onChange={(e) => setDisputeDigest(e.target.value)}
                      className="input-academic font-mono text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() =>
                        handleAction("submit_dispute_evidence", [
                          BigInt(enrollment.id),
                          disputeUrl,
                          disputeDigest,
                        ])
                      }
                      disabled={loading || !disputeUrl || !disputeDigest}
                      className="btn-secondary text-xs"
                    >
                      Attach Dispute Packet
                    </button>

                    <button
                      onClick={() => handleAction("confirm_ready_for_review", [BigInt(enrollment.id)])}
                      disabled={loading || !challengeDue}
                      className="btn-academic text-xs"
                    >
                      {challengeDue ? "Accept Proof & Send to Review" : "Available after challenge deadline"}
                    </button>
                  </div>
                </div>
              ) : isOrganizer ? (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-[#57534e]">
                    Challenge window is active. You can conclude the challenge window once the student confirms.
                  </p>
                  <button
                    onClick={() => handleAction("confirm_ready_for_review", [BigInt(enrollment.id)])}
                    disabled={loading || !challengeDue}
                    className="btn-academic text-xs w-full"
                  >
                    {challengeDue ? "Conclude Challenge & Mark Ready for Review" : "Challenge window is still active"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[#78716c]">Challenge window in progress.</p>
              )}
            </div>
          )}

          {/* Phase 3: READY_FOR_REVIEW */}
          {enrollment.status === "READY_FOR_REVIEW" && (
            <div className="space-y-4">
              <p className="text-xs text-[#57534e] leading-relaxed">
                Evidence packets are permanently locked. Trigger GenLayer decentralized LLM equivalence consensus to evaluate pedagogical delivery against locked syllabus promises.
              </p>

              <button
                onClick={() => handleAction("adjudicate", [BigInt(enrollment.id)])}
                disabled={loading || !challengeDue}
                className="btn-academic text-xs w-full py-3"
              >
                {loading ? "Deliberating On-Chain..." : !challengeDue ? "Available after challenge deadline" : "Trigger GenLayer AI Consensus Deliberation"}
              </button>
            </div>
          )}

          {/* Phase 4: ADJUDICATED */}
          {enrollment.status === "ADJUDICATED" && (
            <div className="space-y-4">
              <div className="p-4 bg-[#f6f3eb] rounded border border-[#eae5d9] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1c1917] uppercase">Jury Ruling:</span>
                  <span className="badge-academic badge-verified font-mono">{enrollment.decision}</span>
                </div>
                <p className="text-xs text-[#57534e] leading-relaxed">{enrollment.reason}</p>
                <div className="pt-2 border-t border-[#eae5d9] grid grid-cols-2 text-xs">
                  <div>Curriculum: <strong>{enrollment.curriculum_fidelity}</strong></div>
                  <div>Instructor: <strong>{enrollment.instructor_fidelity}</strong></div>
                </div>
              </div>

              {(isOrganizer || isStudent) && (
                <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 space-y-3">
                  <div>
                    <strong className="text-xs text-violet-950">Challenge the ruling with a stake-backed appeal</strong>
                    <p className="mt-1 text-[11px] text-violet-800">Stake: 10% of tuition, rounded up ({formatGen(appealStake)}). An overturned appeal returns it; an upheld appeal awards it to the counterparty. Window: {appealWindowOpen ? new Date(enrollment.appeal_deadline * 1000).toLocaleString() : "closed"}.</p>
                  </div>
                  <input value={appealUrl} onChange={(event) => setAppealUrl(event.target.value)} placeholder="Immutable appeal evidence URL" className="input-academic font-mono text-xs" />
                  <input value={appealDigest} onChange={(event) => setAppealDigest(event.target.value)} placeholder="sha256:..." className="input-academic font-mono text-xs" />
                  <button
                    onClick={() => handleAction("open_appeal", [BigInt(enrollment.id), appealUrl, appealDigest], appealStake)}
                    disabled={loading || !appealWindowOpen || !appealUrl || !appealDigest}
                    className="btn-secondary text-xs w-full"
                  >
                    {appealWindowOpen ? "Open Appeal & Lock Stake" : "Appeal window closed"}
                  </button>
                </div>
              )}
              <button onClick={() => handleAction("settle", [BigInt(enrollment.id)])} disabled={loading || appealWindowOpen} className="btn-academic text-xs w-full py-3">
                {loading ? "Settling..." : appealWindowOpen ? "Settlement unlocks after appeal window" : "Accept Verdict & Execute Settlement"}
              </button>
            </div>
          )}

          {enrollment.status === "APPEAL_PENDING" && (
            <div className="space-y-4">
              <div className="notice-warning">
                <strong>Appeal evidence and stake are locked</strong>
                <p className="text-xs mt-1">Trigger a fresh GenLayer consensus round over the complete record. The original verdict cannot settle while this appeal is pending.</p>
              </div>
              {recoveryDue ? (
                <button onClick={() => handleAction("claim_recovery", [BigInt(enrollment.id)])} disabled={loading} className="btn-academic text-xs w-full py-3">Recover Timed-Out Appeal</button>
              ) : (
                <button onClick={() => handleAction("adjudicate_appeal", [BigInt(enrollment.id)])} disabled={loading} className="btn-academic text-xs w-full py-3">
                  {loading ? "Re-adjudicating…" : "Trigger Appeal Re-adjudication"}
                </button>
              )}
            </div>
          )}

          {enrollment.status === "APPEAL_RESOLVED" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#e7e1d4] bg-[#f6f3eb] p-4 text-xs space-y-2">
                <div className="flex justify-between gap-3"><span>Appeal result</span><strong>{enrollment.appeal_result}</strong></div>
                <div className="flex justify-between gap-3"><span>Original verdict</span><strong>{enrollment.pre_appeal_decision}</strong></div>
                <div className="flex justify-between gap-3"><span>Final verdict</span><strong>{enrollment.decision}</strong></div>
                <div className="flex justify-between gap-3"><span>Appeal stake</span><strong>{formatGen(enrollment.appeal_stake)}</strong></div>
              </div>
              <button onClick={() => handleAction("settle", [BigInt(enrollment.id)])} disabled={loading} className="btn-academic text-xs w-full py-3">Execute Appeal-Aware Settlement</button>
            </div>
          )}

          {/* Phase 5: RECOVERY_WAIT */}
          {enrollment.status === "RECOVERY_WAIT" && (
            <div className="space-y-4">
              <div className="notice-warning">
                <strong>Recovery Mode Active</strong>
                <p className="text-xs mt-0.5">
                  Evidence was unavailable or failed verification. Either party can trigger the non-vetoable recovery split after {new Date(effectiveRecoveryDeadline * 1000).toLocaleString()}.
                </p>
              </div>

              <button
                onClick={() => handleAction("claim_recovery", [BigInt(enrollment.id)])}
                disabled={loading || !recoveryDue}
                className="btn-academic text-xs w-full"
              >
                {recoveryDue ? "Execute 50/50 Recovery Split" : "Available after recovery deadline"}
              </button>
            </div>
          )}

          {/* Terminal Finalized States */}
          {(enrollment.status === "SETTLED" ||
            enrollment.status === "RECOVERED" ||
            enrollment.status === "CANCELLED") && (
            <div className="p-5 bg-[#f0fdf4] border border-[#bbf7d0] rounded space-y-3">
              <div className="text-xs font-bold text-[#166534]">
                ✓ Escrow Reconciled & Closed ({enrollment.status})
              </div>
              <p className="text-xs text-[#57534e]">{enrollment.reason}</p>

              <div className="pt-3 border-t border-[#bbf7d0] grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[#78716c] block text-[11px]">Paid to Organizer:</span>
                  <span className="font-bold text-[#1c1917]">
                    {formatGen(enrollment.organizer_paid)}
                  </span>
                </div>
                <div>
                  <span className="text-[#78716c] block text-[11px]">Refunded to Student:</span>
                  <span className="font-bold text-[#1c1917]">
                    {formatGen(enrollment.student_refunded)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Commitments & Parties (1 Column) */}
        <div className="card-ledger p-5 space-y-4 text-xs h-fit">
          <h4 className="font-serif text-sm font-bold text-[#1c1917] border-b pb-2">
            Case Parameters & Parties
          </h4>

          <div className="space-y-1">
            <span className="text-[#78716c] block">Organizer Address:</span>
            <span className="font-mono text-[#1c1917] break-all">{offering.organizer}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[#78716c] block">Enrolled Student:</span>
            <span className="font-mono text-[#1c1917] break-all">{enrollment.student}</span>
          </div>

          <div className="space-y-1 pt-2 border-t">
            <span className="text-[#78716c] block">Committed Instructor:</span>
            <span className="font-semibold text-[#1c1917]">{offering.instructor}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[#78716c] block">Committed Duration:</span>
            <span className="font-semibold text-[#1c1917]">{offering.duration_hours} Hours</span>
          </div>

          <div className="space-y-1">
            <span className="text-[#78716c] block">Syllabus Digest:</span>
            <span className="font-mono text-[11px] text-[#57534e] break-all">
              {offering.terms_digest || "Unset"}
            </span>
          </div>
        </div>
      </div>

      <EvidenceIntegrityConsole offering={offering} evidence={evidence} nowSeconds={nowSeconds} />
    </div>
  );
};
