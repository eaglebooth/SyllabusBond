"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Offering, Enrollment } from "@/lib/types";
import { connectWallet, readContract, writeContract, configuredAddress } from "@/lib/genlayer";

export default function SettlementPage() {
  const [account, setAccount] = useState("");
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [enrollments, setEnrollments] = useState<Record<number, Enrollment>>({});
  const [selectedOfferingId, setSelectedOfferingId] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const activeAddress = configuredAddress();

  const fetchState = useCallback(async () => {
    if (!activeAddress || activeAddress === "0x0000000000000000000000000000000000000000") return;
    setIsRefreshing(true);
    try {
      const countsRes = await readContract("get_counts");
      if (countsRes.success && countsRes.data) {
        const counts = countsRes.data as { offering_count: number; enrollment_count: number };
        const offCount = counts.offering_count || 0;
        const enrCount = counts.enrollment_count || 0;

        const fetchedOfferings: Offering[] = [];
        for (let i = 0; i < offCount; i++) {
          const offRes = await readContract("get_offering", [BigInt(i)]);
          if (offRes.success && offRes.data) fetchedOfferings.push(offRes.data as Offering);
        }
        setOfferings(fetchedOfferings);

        const fetchedEnrollments: Record<number, Enrollment> = {};
        for (let i = 0; i < enrCount; i++) {
          const enrRes = await readContract("get_enrollment", [BigInt(i)]);
          if (enrRes.success && enrRes.data) {
            const enr = enrRes.data as Enrollment;
            fetchedEnrollments[enr.offering_id] = enr;
          }
        }
        setEnrollments(fetchedEnrollments);
      }
    } catch {
      // Clean catch
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

  const selectedOffering = offerings.find((o) => o.id === selectedOfferingId) || offerings[0];
  const selectedEnrollment = selectedOffering ? enrollments[selectedOffering.id] : null;

  const handleSettle = async () => {
    if (!selectedEnrollment) return;
    setLoading(true);
    setErrorMsg("");
    setStatusMsg("Executing escrow settlement transfer...");

    try {
      const res = await writeContract("settle", [BigInt(selectedEnrollment.id)]);
      if (res.success) {
        setStatusMsg("Settlement transfer completed.");
        fetchState();
      } else {
        setErrorMsg(res.error || "Settlement execution failed.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error executing settlement.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async () => {
    if (!selectedEnrollment) return;
    setLoading(true);
    setErrorMsg("");
    setStatusMsg("Executing non-vetoable 50/50 recovery transfer...");

    try {
      const res = await writeContract("claim_recovery", [BigInt(selectedEnrollment.id)]);
      if (res.success) {
        setStatusMsg("Recovery split completed.");
        fetchState();
      } else {
        setErrorMsg(res.error || "Recovery execution failed.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error executing recovery.");
    } finally {
      setLoading(false);
    }
  };

  const feeWei = selectedEnrollment ? selectedEnrollment.fee : 0;
  const feeEth = (feeWei / 1e18).toFixed(4);

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
              Settlement Vault
            </span>
            <h1 className="font-serif text-3xl font-bold text-[#1c1917] tracking-tight">
              Escrow Disbursement Execution
            </h1>
            <p className="text-xs sm:text-sm text-[#57534e] mt-1">
              Deterministic disbursement execution based on official jury verdicts.
            </p>
          </div>

          {offerings.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[#78716c]">Case:</label>
              <select
                value={selectedOfferingId}
                onChange={(e) => setSelectedOfferingId(parseInt(e.target.value, 10))}
                className="input-academic text-xs"
              >
                {offerings.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.id} - {o.title}
                  </option>
                ))}
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
          <div className="card-ledger p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1c1917]">{selectedOffering.title}</h3>
                <p className="text-xs text-[#78716c] font-mono mt-0.5">
                  Enrollment #{selectedEnrollment.id} • Status: {selectedEnrollment.status}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#78716c] uppercase font-semibold block">Escrow Amount</span>
                <span className="font-mono text-lg font-bold text-[#1e3a8a]">{feeEth} GEN</span>
              </div>
            </div>

            {selectedEnrollment.status === "ADJUDICATED" && (
              <div className="space-y-5">
                <div className="p-4 bg-[#f6f3eb] rounded border border-[#eae5d9] space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-[#1c1917]">
                    <span>Ruling: {selectedEnrollment.decision}</span>
                  </div>
                  <p className="text-[#57534e]">{selectedEnrollment.reason}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#f6f3eb] rounded border border-[#eae5d9] space-y-1">
                    <span className="text-[11px] font-semibold text-[#166534] uppercase block">
                      Organizer Payout
                    </span>
                    <p className="text-base font-bold font-mono text-[#166534]">
                      {selectedEnrollment.decision === "DELIVERED"
                        ? `${feeEth} GEN (100%)`
                        : selectedEnrollment.decision === "MATERIALLY_REDUCED"
                        ? `${((feeWei / 2) / 1e18).toFixed(4)} GEN (50%)`
                        : "0.0000 GEN (0%)"}
                    </p>
                  </div>

                  <div className="p-4 bg-[#f6f3eb] rounded border border-[#eae5d9] space-y-1">
                    <span className="text-[11px] font-semibold text-[#1e3a8a] uppercase block">
                      Student Refund
                    </span>
                    <p className="text-base font-bold font-mono text-[#1e3a8a]">
                      {selectedEnrollment.decision === "NOT_DELIVERED"
                        ? `${feeEth} GEN (100%)`
                        : selectedEnrollment.decision === "MATERIALLY_REDUCED"
                        ? `${((feeWei - Math.floor(feeWei / 2)) / 1e18).toFixed(4)} GEN (50% + rem)`
                        : "0.0000 GEN (0%)"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSettle}
                  disabled={loading}
                  className="btn-academic text-xs w-full py-3"
                >
                  {loading ? "Executing Transfers..." : "Execute Settlement Transfers on GenLayer"}
                </button>
              </div>
            )}

            {selectedEnrollment.status === "RECOVERY_WAIT" && (
              <div className="space-y-4">
                <div className="notice-warning">
                  <strong>Recovery Mode Active</strong>
                  <p className="text-xs mt-0.5">
                    Evidence was unavailable. Either party can claim the deterministic 50/50 recovery split.
                  </p>
                </div>
                <button
                  onClick={handleRecovery}
                  disabled={loading}
                  className="btn-academic text-xs w-full"
                >
                  Execute 50/50 Recovery Split Transfer
                </button>
              </div>
            )}

            {(selectedEnrollment.status === "SETTLED" ||
              selectedEnrollment.status === "RECOVERED" ||
              selectedEnrollment.status === "CANCELLED") && (
              <div className="p-5 bg-[#f0fdf4] border border-[#bbf7d0] rounded space-y-3">
                <div className="text-xs font-bold text-[#166534]">
                  ✓ Escrow Finalized ({selectedEnrollment.status})
                </div>
                <p className="text-xs text-[#57534e]">{selectedEnrollment.reason}</p>
                <div className="pt-3 border-t border-[#bbf7d0] grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[#78716c] block text-[11px]">Paid to Organizer:</span>
                    <span className="font-bold text-[#1c1917]">{(selectedEnrollment.organizer_paid / 1e18).toFixed(4)} GEN</span>
                  </div>
                  <div>
                    <span className="text-[#78716c] block text-[11px]">Refunded to Student:</span>
                    <span className="font-bold text-[#1c1917]">{(selectedEnrollment.student_refunded / 1e18).toFixed(4)} GEN</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card-ledger p-12 text-center max-w-md mx-auto space-y-2">
            <h3 className="font-serif text-base font-bold text-[#1c1917]">No Offering Selected</h3>
            <p className="text-xs text-[#57534e]">Select a case to inspect settlement status.</p>
          </div>
        )}
      </main>

      <footer className="border-t bg-[#ffffff] py-8 text-xs text-[#78716c]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-serif font-bold text-[#1c1917]">SyllabusBond</span> — Course delivery escrow protocol
          </div>
          <div className="font-mono text-[11px]">Status: LOCAL_ONLY</div>
        </div>
      </footer>
    </div>
  );
}
