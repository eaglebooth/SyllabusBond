"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { ContractTotals } from "@/lib/types";
import { connectWallet, readContract, configuredAddress } from "@/lib/genlayer";

export default function VerifyPage() {
  const [account, setAccount] = useState("");
  const [totals, setTotals] = useState<ContractTotals>({
    total_received: 0,
    total_held: 0,
    total_paid_to_organizers: 0,
    total_refunded_to_students: 0,
  });
  const [counts, setCounts] = useState({ offering_count: 0, enrollment_count: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const activeAddress = configuredAddress();

  const fetchState = useCallback(async () => {
    if (!activeAddress || activeAddress === "0x0000000000000000000000000000000000000000") return;
    setIsRefreshing(true);
    try {
      const countsRes = await readContract("get_counts");
      if (countsRes.success && countsRes.data) {
        setCounts(countsRes.data as { offering_count: number; enrollment_count: number });
      }
      const totalsRes = await readContract("get_totals");
      if (totalsRes.success && totalsRes.data) {
        setTotals(totalsRes.data as ContractTotals);
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

  const invariantHolds =
    totals.total_received ===
    totals.total_held + totals.total_paid_to_organizers + totals.total_refunded_to_students;

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfaf7] text-[#1c1917]">
      <Header
        account={account}
        onConnectWallet={handleConnectWallet}
        onRefresh={fetchState}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b">
          <div>
            <span className="text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider block">
              Audit & Invariants
            </span>
            <h1 className="font-serif text-3xl font-bold text-[#1c1917] tracking-tight">
              Protocol Verification Ledger
            </h1>
            <p className="text-xs sm:text-sm text-[#57534e] mt-1">
              Transparent mathematical accounting and on-chain contract custody verification.
            </p>
          </div>

          <button
            onClick={fetchState}
            disabled={isRefreshing}
            className="btn-secondary text-xs self-start sm:self-auto"
          >
            {isRefreshing ? "Syncing..." : "Sync state"}
          </button>
        </div>

        {/* Invariant Equation Card */}
        <div className="card-ledger p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#1c1917]">
                Value Conservation Invariant
              </h2>
              <p className="font-mono text-xs text-[#78716c] mt-0.5">
                Received == Held + Paid + Refunded
              </p>
            </div>

            <span
              className={`badge-academic ${
                invariantHolds ? "badge-verified" : "badge-danger"
              }`}
            >
              {invariantHolds ? "Equation Holds (Exact Match)" : "Invariant Discrepancy"}
            </span>
          </div>

          {/* Breakdown Table */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-3 bg-[#f6f3eb] rounded border border-[#eae5d9]">
              <span className="font-medium text-[#44403c]">1. Total Funds Received from Enrollments:</span>
              <span className="font-mono font-bold text-[#1c1917]">{(totals.total_received / 1e18).toFixed(4)} GEN</span>
            </div>

            <div className="flex justify-between p-3 bg-[#f6f3eb] rounded border border-[#eae5d9]">
              <span className="font-medium text-[#1e3a8a]">2. Currently Held in Escrow:</span>
              <span className="font-mono font-bold text-[#1e3a8a]">{(totals.total_held / 1e18).toFixed(4)} GEN</span>
            </div>

            <div className="flex justify-between p-3 bg-[#f6f3eb] rounded border border-[#eae5d9]">
              <span className="font-medium text-[#166534]">3. Disbursed to Course Organizers:</span>
              <span className="font-mono font-bold text-[#166534]">{(totals.total_paid_to_organizers / 1e18).toFixed(4)} GEN</span>
            </div>

            <div className="flex justify-between p-3 bg-[#f6f3eb] rounded border border-[#eae5d9]">
              <span className="font-medium text-[#44403c]">4. Refunded to Enrolled Students:</span>
              <span className="font-mono font-bold text-[#1c1917]">{(totals.total_refunded_to_students / 1e18).toFixed(4)} GEN</span>
            </div>
          </div>
        </div>

        {/* Contract Inspection Table */}
        <div className="card-ledger p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-lg font-bold text-[#1c1917] border-b pb-3">
            On-Chain Deployment Parameters
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-[#f6f3eb] rounded border border-[#eae5d9] gap-1">
              <span className="font-medium text-[#44403c]">Contract Address:</span>
              <span className="font-mono text-[#1c1917] break-all font-semibold">{activeAddress || "Unset"}</span>
            </div>

            <div className="flex justify-between p-3 bg-[#f6f3eb] rounded border border-[#eae5d9]">
              <span className="font-medium text-[#44403c]">Consensus Network:</span>
              <span className="font-mono font-semibold text-[#1c1917]">GenLayer Studionet (Chain 61999)</span>
            </div>

            <div className="flex justify-between p-3 bg-[#f6f3eb] rounded border border-[#eae5d9]">
              <span className="font-medium text-[#44403c]">Contract Class:</span>
              <span className="font-mono font-semibold text-[#1c1917]">SyllabusBond (gl.Contract)</span>
            </div>

            <div className="flex justify-between p-3 bg-[#f6f3eb] rounded border border-[#eae5d9]">
              <span className="font-medium text-[#44403c]">Registered Cases:</span>
              <span className="font-mono font-semibold text-[#1c1917]">
                {counts.offering_count} Offerings • {counts.enrollment_count} Enrollments
              </span>
            </div>
          </div>

          {activeAddress && activeAddress !== "0x0000000000000000000000000000000000000000" && (
            <div className="pt-2">
              <a
                href={`https://studio.genlayer.com/explorer/address/${activeAddress}`}
                target="_blank"
                rel="noreferrer"
                className="btn-academic text-xs"
              >
                Inspect on GenLayer Explorer ↗
              </a>
            </div>
          )}
        </div>
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
