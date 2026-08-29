"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Offering, Enrollment } from "@/lib/types";
import { connectWallet, readContract, writeContract, configuredAddress } from "@/lib/genlayer";

export default function AdjudicationPage() {
  const [account, setAccount] = useState("");
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const activeAddress = configuredAddress();

  const fetchState = useCallback(async () => {
    if (!activeAddress || activeAddress === "0x0000000000000000000000000000000000000000") return false;
    setIsRefreshing(true);
    try {
      const countsRes = await readContract("get_counts");
      if (countsRes.success && countsRes.data) {
        const counts = countsRes.data as { offering_count: number; enrollment_count: number };
        const offCount = counts.offering_count || 0;
        const enrCount = counts.enrollment_count || 0;

        let complete = true;
        const fetchedOfferings: Offering[] = [];
        for (let i = 0; i < offCount; i++) {
          const offRes = await readContract("get_offering", [BigInt(i)]);
          if (offRes.success && offRes.data) fetchedOfferings.push(offRes.data as Offering);
          else complete = false;
        }
        setOfferings(fetchedOfferings);

        const fetchedEnrollments: Enrollment[] = [];
        for (let i = 0; i < enrCount; i++) {
          const enrRes = await readContract("get_enrollment", [BigInt(i)]);
          if (enrRes.success && enrRes.data) fetchedEnrollments.push(enrRes.data as Enrollment);
          else complete = false;
        }
        setEnrollments(fetchedEnrollments);
        return complete;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [activeAddress]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleConnectWallet = async () => {
    const res = await connectWallet();
    if (res.success && typeof res.data === "string") {
      setAccount(res.data);
      fetchState();
    }
  };

  const selectedEnrollment = enrollments.find((item) => item.id === selectedEnrollmentId) ?? enrollments[0] ?? null;
  const selectedOffering = selectedEnrollment ? offerings.find((item) => item.id === selectedEnrollment.offering_id) ?? null : null;

  const handleTriggerAdjudication = async () => {
    if (!selectedEnrollment) return;
    setLoading(true);
    setErrorMsg("");
    setStatusMsg("Executing GenLayer LLM equivalence consensus deliberation...");

    try {
      const res = await writeContract("adjudicate", [BigInt(selectedEnrollment.id)]);
      if (res.success) {
        const verified = await fetchState();
        if (verified) setStatusMsg("Consensus verdict recorded and verified from contract state.");
        else setErrorMsg("Adjudication was accepted, but authoritative read-back failed.");
      } else {
        setErrorMsg(res.error || "Adjudication failed to reach consensus.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error triggering adjudication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfaf7] text-[#1c1917]">
      <Header
        account={account}
        onConnectWallet={handleConnectWallet}
        onRefresh={fetchState}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b">
          <div>
            <span className="text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider block">
              Jury Review
            </span>
            <h1 className="font-serif text-3xl font-bold text-[#1c1917] tracking-tight">
              AI Consensus Adjudication
            </h1>
            <p className="text-xs sm:text-sm text-[#57534e] mt-1">
              GenLayer LLM nodes evaluate raw session proofs against locked syllabus commitments.
            </p>
          </div>

          {enrollments.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[#78716c]">Case:</label>
              <select
                value={selectedEnrollmentId}
                onChange={(e) => setSelectedEnrollmentId(parseInt(e.target.value, 10))}
                className="input-academic text-xs"
              >
                {enrollments.map((enrollment) => {
                  const offering = offerings.find((item) => item.id === enrollment.offering_id);
                  return <option key={enrollment.id} value={enrollment.id}>
                    Enrollment #{enrollment.id} - {offering?.title ?? `Offering #${enrollment.offering_id}`}
                  </option>;
                })}
              </select>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="notice-danger text-xs">
            {errorMsg}
          </div>
        )}

        {statusMsg && !errorMsg && (
          <div className="notice-info text-xs font-mono">
            {statusMsg}
          </div>
        )}

        {selectedOffering && selectedEnrollment ? (
          <div className="space-y-6">
            {/* Comparison Column Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card-ledger p-4 space-y-2">
                <span className="text-[11px] font-semibold text-[#78716c] uppercase block">
                  1. Locked Syllabus Terms
                </span>
                <h4 className="font-bold text-xs text-[#1c1917]">{selectedOffering.title}</h4>
                <div className="text-[12px] text-[#57534e] space-y-1">
                  <div>Instructor: <span className="font-semibold text-[#1c1917]">{selectedOffering.instructor}</span></div>
                  <div>Hours: <span className="font-semibold text-[#1c1917]">{selectedOffering.duration_hours}h</span></div>
                </div>
              </div>

              <div className="card-ledger p-4 space-y-2">
                <span className="text-[11px] font-semibold text-[#78716c] uppercase block">
                  2. Organizer Delivery Proof
                </span>
                <h4 className="font-bold text-xs text-[#1c1917]">
                  {selectedEnrollment.status === "FUNDED" ? "Pending Submission" : "Evidence Locked"}
                </h4>
                <p className="text-[12px] text-[#57534e] leading-normal">
                  Fetched and re-hashed by jury nodes before prompt comparative execution.
                </p>
              </div>

              <div className="card-ledger p-4 space-y-2">
                <span className="text-[11px] font-semibold text-[#78716c] uppercase block">
                  3. Student Challenge Packet
                </span>
                <h4 className="font-bold text-xs text-[#1c1917]">
                  {selectedEnrollment.status === "CHALLENGE_WINDOW" ? "Window Open" : "Challenge Concluded"}
                </h4>
                <p className="text-[12px] text-[#57534e] leading-normal">
                  Dispute packet detailing any missing modules or unapproved instructor change.
                </p>
              </div>
            </div>

            {/* Verdict or Trigger Box */}
            {selectedEnrollment.status === "ADJUDICATED" || selectedEnrollment.status === "SETTLED" ? (
              <div className="card-ledger p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b">
                  <h3 className="font-serif text-lg font-bold text-[#1c1917]">Official Jury Ruling</h3>
                  <span className="badge-academic badge-verified font-mono text-xs">
                    {selectedEnrollment.decision}
                  </span>
                </div>

                <p className="text-xs text-[#57534e] leading-relaxed">
                  <strong>Consensus Rationale:</strong> {selectedEnrollment.reason}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-[#f6f3eb] rounded border border-[#eae5d9] text-xs">
                    <span className="text-[#78716c] block">Curriculum Fulfillment:</span>
                    <strong className="text-[#1c1917]">{selectedEnrollment.curriculum_fidelity}</strong>
                  </div>
                  <div className="p-3 bg-[#f6f3eb] rounded border border-[#eae5d9] text-xs">
                    <span className="text-[#78716c] block">Instructor Continuity:</span>
                    <strong className="text-[#1c1917]">{selectedEnrollment.instructor_fidelity}</strong>
                  </div>
                </div>

                <div className="pt-3 border-t flex justify-end">
                  <Link href="/settlement" className="btn-academic text-xs">
                    Proceed to Escrow Settlement →
                  </Link>
                </div>
              </div>
            ) : selectedEnrollment.status === "READY_FOR_REVIEW" ? (
              <div className="card-ledger p-8 text-center space-y-4">
                <h3 className="font-serif text-lg font-bold text-[#1c1917]">Ready for AI Adjudication</h3>
                <p className="text-xs text-[#57534e] max-w-md mx-auto leading-relaxed">
                  All delivery and dispute evidence packets are locked. Trigger GenLayer LLM equivalence consensus to evaluate pedagogical fulfillment.
                </p>
                <button
                  onClick={handleTriggerAdjudication}
                  disabled={loading}
                  className="btn-academic text-xs"
                >
                  {loading ? "Deliberating..." : "Trigger GenLayer AI Consensus"}
                </button>
              </div>
            ) : (
              <div className="card-ledger p-8 text-center space-y-3">
                <p className="text-xs text-[#57534e]">
                  Current status is <strong>{selectedEnrollment.status}</strong>. Evidence must be locked and challenge window concluded before adjudication.
                </p>
                <Link href="/workspace" className="btn-secondary text-xs">
                  Go to workspace
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="card-ledger p-12 text-center max-w-md mx-auto space-y-2">
            <h3 className="font-serif text-base font-bold text-[#1c1917]">No Offering Selected</h3>
            <p className="text-xs text-[#57534e]">Select a case to inspect adjudication status.</p>
          </div>
        )}
      </main>

      <footer className="border-t bg-[#ffffff] py-8 text-xs text-[#78716c]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-serif font-bold text-[#1c1917]">SyllabusBond</span> — Course delivery escrow protocol
          </div>
          <div className="font-mono text-[11px]">Status: LIVE · STUDIONET</div>
        </div>
      </footer>
    </div>
  );
}
